import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Return type for useWebcamCapture hook
 */
export interface UseWebcamCaptureReturn {
  /** Current webcam MediaStream or null if not started */
  webcamStream: MediaStream | null;
  /** Loading state while requesting webcam access */
  isLoading: boolean;
  /** Error if webcam capture fails */
  error: Error | null;
  /** Start webcam capture and request permissions */
  startWebcam: () => Promise<void>;
  /** Stop webcam capture and release stream */
  stopWebcam: () => void;
  /** Whether getUserMedia API is available in this browser */
  isWebcamAvailable: boolean;
}

/**
 * Custom hook for webcam capture using getUserMedia API
 *
 * Implements Story 2.5 acceptance criteria:
 * - AC#1: Webcam Capture and Display
 *   - Captures webcam stream using `navigator.mediaDevices.getUserMedia({ video: true })`
 *   - Returns MediaStream for rendering in HTML video element
 *   - Handles permission requests and errors gracefully
 *
 * Error Handling:
 * - NotAllowedError: User denied camera permission
 * - NotFoundError: No camera device found
 * - NotReadableError: Camera is in use by another application
 * - OverconstrainedError: Requested constraints cannot be satisfied
 *
 * Cleanup:
 * - Automatically stops all tracks on component unmount
 * - Releases camera resources properly
 *
 * @returns Webcam controls and state management
 */
export function useWebcamCapture(): UseWebcamCaptureReturn {
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isWebcamAvailable, setIsWebcamAvailable] = useState<boolean>(false);

  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Check if getUserMedia API is available on mount
   */
  useEffect(() => {
    const checkAvailability = () => {
      const isAvailable =
        typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices !== 'undefined' &&
        typeof navigator.mediaDevices.getUserMedia === 'function';

      setIsWebcamAvailable(isAvailable);

      if (!isAvailable) {
        console.warn('getUserMedia is not supported in this browser');
      }
    };

    checkAvailability();
  }, []);

  /**
   * Start webcam capture
   * Requests camera permission and starts video stream
   *
   * @throws Error if getUserMedia is not available
   * @throws Error if user denies permission (NotAllowedError)
   * @throws Error if no camera is found (NotFoundError)
   * @throws Error if camera is in use (NotReadableError)
   */
  const startWebcam = useCallback(async (): Promise<void> => {
    // Check if getUserMedia is available
    if (!isWebcamAvailable) {
      const err = new Error(
        'Camera access is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.'
      );
      setError(err);
      throw err;
    }

    // Don't start if already running
    if (streamRef.current) {
      console.warn('Webcam is already running');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Request webcam access with video constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user', // Front-facing camera preferred
        },
        audio: false, // No audio needed for webcam overlay
      });

      // Store stream reference
      streamRef.current = stream;
      setWebcamStream(stream);
      setIsLoading(false);

      console.log('Webcam started successfully:', {
        videoTracks: stream.getVideoTracks().length,
        trackSettings: stream.getVideoTracks()[0]?.getSettings(),
      });
    } catch (err) {
      const error = err as DOMException;
      setIsLoading(false);

      // Handle specific getUserMedia errors
      let errorMessage: string;

      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = 'Camera access denied. Please grant camera permission to use webcam overlay.';
          break;
        case 'NotFoundError':
          errorMessage = 'No camera found. Please connect a webcam to use this feature.';
          break;
        case 'NotReadableError':
          errorMessage = 'Camera is in use by another application. Please close other apps using the camera.';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Camera does not support the required video quality. Try a different camera.';
          break;
        case 'SecurityError':
          errorMessage = 'Camera access is blocked by your browser security settings.';
          break;
        default:
          errorMessage = `Failed to start webcam: ${error.message}`;
      }

      const webcamError = new Error(errorMessage);
      webcamError.name = error.name;
      setError(webcamError);

      console.error('Webcam capture failed:', {
        errorName: error.name,
        errorMessage: error.message,
      });

      throw webcamError;
    }
  }, [isWebcamAvailable]);

  /**
   * Stop webcam capture
   * Stops all video tracks and releases camera resources
   */
  const stopWebcam = useCallback((): void => {
    if (streamRef.current) {
      // Stop all video tracks
      streamRef.current.getVideoTracks().forEach(track => {
        track.stop();
        console.log('Stopped webcam track:', track.label);
      });

      streamRef.current = null;
      setWebcamStream(null);
      setError(null);
    }
  }, []);

  /**
   * Cleanup: Stop webcam when component unmounts
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(track => track.stop());
        console.log('Webcam cleaned up on unmount');
      }
    };
  }, []);

  return {
    webcamStream,
    isLoading,
    error,
    startWebcam,
    stopWebcam,
    isWebcamAvailable,
  };
}
