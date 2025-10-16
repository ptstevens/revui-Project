import { useState, useCallback, useRef } from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface RecordingConfig {
  mimeType: string;
  videoBitsPerSecond: number;
  audioBitsPerSecond?: number;
}

/**
 * Custom hook for WebRTC recording using MediaRecorder API
 *
 * Implements Story 2.1 acceptance criteria:
 * - AC#2: MediaRecorder API Integration with WebM format
 * - AC#3: Recording Data Handling (chunk collection and Blob creation)
 * - AC#4: Recording Constraints (2500kbps video, 128kbps audio)
 *
 * @returns Recording controls and state management
 */
export function useWebRTCRecorder() {
  const [state, setState] = useState<RecordingState>('idle');
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [duration, setDuration] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  /**
   * Start recording by combining screen, microphone, and webcam streams
   *
   * @param screenStream - Screen capture stream from useScreenCapture
   * @param micStream - Microphone stream for voice narration (optional)
   * @param webcamStream - Webcam stream for overlay (optional, not mixed into recording)
   * @param config - Recording format and bitrate configuration
   * @throws Error if MediaRecorder initialization fails
   */
  const startRecording = useCallback(async (
    screenStream: MediaStream,
    micStream: MediaStream | null,
    _webcamStream: MediaStream | null, // Not used in recording, rendered as UI overlay
    config: RecordingConfig
  ) => {
    try {
      // Combine streams
      const combinedStream = new MediaStream();

      // Add screen video track
      const screenVideoTrack = screenStream.getVideoTracks()[0];
      if (!screenVideoTrack) {
        throw new Error('No video track available from screen capture');
      }
      combinedStream.addTrack(screenVideoTrack);

      // Add microphone audio track (voice narration)
      if (micStream) {
        const micAudioTrack = micStream.getAudioTracks()[0];
        if (micAudioTrack) {
          combinedStream.addTrack(micAudioTrack);
        }
      }

      // Note: Webcam overlay is handled separately in UI canvas composition
      // We don't mix webcam into MediaRecorder stream to maintain clean recording
      // Instead, webcam is rendered as HTML overlay during recording

      // Check if mimeType is supported, fallback to alternatives
      let mimeType = config.mimeType;
      const supportedTypes = [
        config.mimeType,
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];

      let typeSupported = false;
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          typeSupported = true;
          break;
        }
      }

      if (!typeSupported) {
        throw new Error('No supported video codec available (VP9/VP8 required)');
      }

      // Initialize MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: config.videoBitsPerSecond,
        audioBitsPerSecond: config.audioBitsPerSecond,
      });

      const chunks: Blob[] = [];

      // Handle data available event - collect chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };

      // Handle stop event
      mediaRecorder.onstop = () => {
        setState('stopped');
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      // Handle errors
      mediaRecorder.onerror = (event: Event) => {
        console.error('MediaRecorder error:', event);
        const errorEvent = event as MediaRecorderErrorEvent;
        const errorMessage = errorEvent.error?.message || 'Recording failed';
        const recordingError = new Error(errorMessage);
        setError(recordingError);
        setState('stopped');
      };

      // Start recording with 1-second timeslice for chunk collection
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setState('recording');
      setError(null);

      // Start duration timer
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  /**
   * Pause recording
   * Timer is stopped until recording is resumed
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, []);

  /**
   * Resume recording from paused state
   * Timer resumes counting
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');

      // Resume timer
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
  }, []);

  /**
   * Stop recording
   * Combines all chunks into final Blob ready for upload
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, []);

  /**
   * Get final recorded Blob from collected chunks
   * Combines all chunks into single Blob for S3 upload
   *
   * @returns Blob containing complete recording, or null if no chunks
   */
  const getRecordedBlob = useCallback((): Blob | null => {
    if (recordedChunks.length === 0) return null;
    return new Blob(recordedChunks, {
      type: mediaRecorderRef.current?.mimeType || 'video/webm',
    });
  }, [recordedChunks]);

  /**
   * Calculate estimated file size based on duration and bitrate
   *
   * @returns Estimated size in bytes
   */
  const getEstimatedSize = useCallback((): number => {
    if (!mediaRecorderRef.current) return 0;
    // Estimate: (videoBitrate + audioBitrate) * duration / 8
    // Example: 2500kbps + 128kbps = 2628kbps = 328.5 KB/s
    // For 1 hour: 328.5 * 3600 = 1,182,600 KB ≈ 1.18 GB
    const totalBitrate = 2628; // kbps (2500 video + 128 audio)
    return Math.round((totalBitrate * duration) / 8 * 1024); // bytes
  }, [duration]);

  /**
   * Reset recording state
   * Clears all chunks and resets to idle
   */
  const reset = useCallback(() => {
    setRecordedChunks([]);
    setDuration(0);
    setState('idle');
    setError(null);
  }, []);

  return {
    state,
    duration,
    error,
    recordedChunks,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    getRecordedBlob,
    getEstimatedSize,
    reset,
  };
}

// TypeScript interface for MediaRecorder error event
interface MediaRecorderErrorEvent extends Event {
  error?: Error;
}
