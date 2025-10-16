import { useState, useCallback } from 'react';

export interface ScreenCaptureOptions {
  video: {
    width: { ideal: number };
    height: { ideal: number };
    frameRate: { ideal: number };
  };
  audio: boolean; // System audio capture
}

export interface ScreenCaptureResult {
  stream: MediaStream | null;
  screenType: 'screen' | 'window' | 'tab' | null;
  sourceName: string | null;
  error: Error | null;
}

/**
 * Custom hook for WebRTC screen capture using getDisplayMedia API
 *
 * Implements Story 2.1 & 2.2 acceptance criteria:
 * - Story 2.1 AC#2: MediaRecorder API Integration with getDisplayMedia
 * - Story 2.1 AC#4: Recording Constraints (1920x1080, 30fps, 2500kbps)
 * - Story 2.1 AC#5: Error Handling for permissions and interruptions
 * - Story 2.2 AC#1: Screen type detection from displaySurface property
 * - Story 2.2 AC#3: Source name extraction from video track label
 *
 * @returns Screen capture controls and state
 */
export function useScreenCapture() {
  const [captureResult, setCaptureResult] = useState<ScreenCaptureResult>({
    stream: null,
    screenType: null,
    sourceName: null,
    error: null,
  });

  /**
   * Start screen capture with specified video/audio constraints
   * Detects screen type (monitor/window/tab) from displaySurface settings
   * Extracts source name from video track label for confirmation banner
   *
   * @param options - Video and audio capture constraints
   * @returns Promise resolving to stream, screen type, and source name
   * @throws Error if permission denied or capture fails
   */
  const startCapture = useCallback(async (options: ScreenCaptureOptions) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: options.video,
        audio: options.audio,
      });

      // Detect screen type from stream settings
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();

      let screenType: 'screen' | 'window' | 'tab' = 'screen';
      // Chrome/Edge: displaySurface property
      if ('displaySurface' in settings) {
        const displaySurface = (settings as any).displaySurface;
        if (displaySurface === 'monitor') screenType = 'screen';
        else if (displaySurface === 'window') screenType = 'window';
        else if (displaySurface === 'browser') screenType = 'tab';
      }

      // Extract source name from video track label
      // Examples: "Screen 1", "Google Chrome - Revui Recording", "Tab: https://app.revui.com"
      const sourceName = videoTrack.label || 'Unknown Source';

      // Handle stream ended event (user stops sharing via browser UI)
      videoTrack.onended = () => {
        setCaptureResult({ stream: null, screenType: null, sourceName: null, error: new Error('Recording interrupted: User stopped screen sharing') });
      };

      setCaptureResult({ stream, screenType, sourceName, error: null });
      return { stream, screenType, sourceName };
    } catch (error) {
      const err = error as Error;

      // Enhance error message for common scenarios
      let enhancedError = err;
      if (err.name === 'NotAllowedError') {
        enhancedError = new Error('Permission denied: Please allow screen sharing in browser settings');
      } else if (err.name === 'NotFoundError') {
        enhancedError = new Error('No screen available for capture');
      } else if (err.name === 'AbortError') {
        enhancedError = new Error('Screen capture was cancelled');
      }

      setCaptureResult({ stream: null, screenType: null, sourceName: null, error: enhancedError });
      throw enhancedError;
    }
  }, []);

  /**
   * Stop screen capture and release all media tracks
   * Cleans up resources and resets state
   */
  const stopCapture = useCallback(() => {
    if (captureResult.stream) {
      captureResult.stream.getTracks().forEach(track => track.stop());
      setCaptureResult({ stream: null, screenType: null, sourceName: null, error: null });
    }
  }, [captureResult.stream]);

  return {
    ...captureResult,
    startCapture,
    stopCapture,
  };
}
