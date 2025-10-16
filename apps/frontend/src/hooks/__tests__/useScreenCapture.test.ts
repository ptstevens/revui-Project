/**
 * Unit tests for useScreenCapture hook
 *
 * Tests Story 2.1 acceptance criteria:
 * - AC#2: MediaRecorder API Integration with getDisplayMedia
 * - AC#4: Recording Constraints (1920x1080, 30fps)
 * - AC#5: Error Handling for permissions and interruptions
 *
 * Tests Story 2.2 acceptance criteria:
 * - AC#1: Screen type detection from displaySurface property
 * - AC#3: Source name extraction from video track label
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useScreenCapture } from '../useScreenCapture';
import type { ScreenCaptureOptions } from '../useScreenCapture';

describe('useScreenCapture', () => {
  let mockStream: MediaStream;
  let mockVideoTrack: MediaStreamTrack;

  beforeEach(() => {
    // Create mock video track
    mockVideoTrack = {
      kind: 'video',
      id: 'mock-video-track',
      label: 'Mock Screen Capture',
      enabled: true,
      muted: false,
      readyState: 'live',
      onended: null,
      getSettings: vi.fn().mockReturnValue({
        width: 1920,
        height: 1080,
        frameRate: 30,
        displaySurface: 'monitor',
      }),
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      clone: vi.fn(),
      getCapabilities: vi.fn(),
      getConstraints: vi.fn(),
      applyConstraints: vi.fn(),
    } as any;

    // Create mock media stream
    mockStream = {
      id: 'mock-stream',
      active: true,
      getVideoTracks: vi.fn().mockReturnValue([mockVideoTrack]),
      getAudioTracks: vi.fn().mockReturnValue([]),
      getTracks: vi.fn().mockReturnValue([mockVideoTrack]),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
      clone: vi.fn(),
      getTrackById: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as any;

    // Mock getDisplayMedia
    vi.spyOn(navigator.mediaDevices, 'getDisplayMedia').mockResolvedValue(mockStream);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test 1: Successful screen capture with mock getDisplayMedia
   * Verifies that the hook successfully captures screen when getDisplayMedia resolves
   */
  it('should successfully start screen capture', async () => {
    const { result } = renderHook(() => useScreenCapture());

    // Initially, stream should be null
    expect(result.current.stream).toBeNull();
    expect(result.current.screenType).toBeNull();
    expect(result.current.error).toBeNull();

    const options: ScreenCaptureOptions = {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };

    // Start capture
    await act(async () => {
      const captureResult = await result.current.startCapture(options);
      expect(captureResult.stream).toBe(mockStream);
      expect(captureResult.screenType).toBe('screen');
    });

    // Verify state is updated
    expect(result.current.stream).toBe(mockStream);
    expect(result.current.screenType).toBe('screen');
    expect(result.current.error).toBeNull();
  });

  /**
   * Test 2: Video constraints are applied correctly
   * Verifies that the specified video constraints (1920x1080, 30fps) are passed to getDisplayMedia
   */
  it('should apply video constraints correctly', async () => {
    const { result } = renderHook(() => useScreenCapture());

    const options: ScreenCaptureOptions = {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };

    await act(async () => {
      await result.current.startCapture(options);
    });

    // Verify getDisplayMedia was called with correct constraints
    expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    });
  });

  /**
   * Test 3: Audio constraints are applied correctly
   * Verifies that audio capture flag is correctly passed to getDisplayMedia
   */
  it('should apply audio constraints correctly', async () => {
    const { result } = renderHook(() => useScreenCapture());

    const optionsWithAudio: ScreenCaptureOptions = {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: true, // Enable system audio
    };

    await act(async () => {
      await result.current.startCapture(optionsWithAudio);
    });

    // Verify getDisplayMedia was called with audio enabled
    expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: true,
    });
  });

  /**
   * Test 4: Screen type detection for monitor/window/browser
   * Verifies that the hook correctly detects screen type from displaySurface property
   */
  it('should detect screen type correctly', async () => {
    // Test 4a: Monitor (full screen)
    mockVideoTrack.getSettings = vi.fn().mockReturnValue({
      displaySurface: 'monitor',
    });

    const { result: result1 } = renderHook(() => useScreenCapture());
    await act(async () => {
      const captureResult = await result1.current.startCapture({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      expect(captureResult.screenType).toBe('screen');
    });

    // Test 4b: Window
    mockVideoTrack.getSettings = vi.fn().mockReturnValue({
      displaySurface: 'window',
    });

    const { result: result2 } = renderHook(() => useScreenCapture());
    await act(async () => {
      const captureResult = await result2.current.startCapture({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      expect(captureResult.screenType).toBe('window');
    });

    // Test 4c: Browser tab
    mockVideoTrack.getSettings = vi.fn().mockReturnValue({
      displaySurface: 'browser',
    });

    const { result: result3 } = renderHook(() => useScreenCapture());
    await act(async () => {
      const captureResult = await result3.current.startCapture({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      expect(captureResult.screenType).toBe('tab');
    });
  });

  /**
   * Test 5: Permission denied error handling
   * Verifies that NotAllowedError is enhanced with user-friendly message
   */
  it('should handle permission denied error', async () => {
    // Mock getDisplayMedia to reject with permission denied error
    const permissionError = new Error('Permission denied by system');
    (permissionError as any).name = 'NotAllowedError';
    vi.spyOn(navigator.mediaDevices, 'getDisplayMedia').mockRejectedValue(permissionError);

    const { result } = renderHook(() => useScreenCapture());

    const options: ScreenCaptureOptions = {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };

    // Attempt to start capture
    await act(async () => {
      try {
        await result.current.startCapture(options);
      } catch (error) {
        const err = error as Error;
        expect(err.message).toBe('Permission denied: Please allow screen sharing in browser settings');
      }
    });

    // Verify error state is set
    expect(result.current.stream).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Permission denied: Please allow screen sharing in browser settings');
  });

  /**
   * Test 6: Stream ended event handling
   * Verifies that onended event is handled when user stops sharing via browser UI
   */
  it('should handle stream ended event', async () => {
    const { result } = renderHook(() => useScreenCapture());

    const options: ScreenCaptureOptions = {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };

    // Start capture
    await act(async () => {
      await result.current.startCapture(options);
    });

    // Verify capture started successfully
    expect(result.current.stream).toBe(mockStream);

    // Simulate user stopping screen sharing via browser UI
    await act(async () => {
      // Trigger onended callback
      if (mockVideoTrack.onended) {
        mockVideoTrack.onended(new Event('ended'));
      }
    });

    // Verify state is updated with error
    await waitFor(() => {
      expect(result.current.stream).toBeNull();
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toContain('Recording interrupted');
    });
  });

  /**
   * Test 7: Stop capture cleans up resources
   * Verifies that stopCapture releases all tracks and resets state
   */
  it('should stop capture and clean up resources', async () => {
    const { result } = renderHook(() => useScreenCapture());

    const options: ScreenCaptureOptions = {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };

    // Start capture
    await act(async () => {
      await result.current.startCapture(options);
    });

    // Stop capture
    act(() => {
      result.current.stopCapture();
    });

    // Verify track was stopped
    expect(mockVideoTrack.stop).toHaveBeenCalled();

    // Verify state is reset
    expect(result.current.stream).toBeNull();
    expect(result.current.screenType).toBeNull();
    expect(result.current.error).toBeNull();
  });

  /**
   * Test 8: Handle NotFoundError (no screen available)
   * Verifies that NotFoundError is enhanced with user-friendly message
   */
  it('should handle no screen available error', async () => {
    const notFoundError = new Error('No screen found');
    (notFoundError as any).name = 'NotFoundError';
    vi.spyOn(navigator.mediaDevices, 'getDisplayMedia').mockRejectedValue(notFoundError);

    const { result } = renderHook(() => useScreenCapture());

    const options: ScreenCaptureOptions = {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };

    await act(async () => {
      try {
        await result.current.startCapture(options);
      } catch (error) {
        const err = error as Error;
        expect(err.message).toBe('No screen available for capture');
      }
    });
  });

  /**
   * Test 9: Handle AbortError (capture cancelled)
   * Verifies that AbortError is enhanced with user-friendly message
   */
  it('should handle capture cancelled error', async () => {
    const abortError = new Error('User cancelled');
    (abortError as any).name = 'AbortError';
    vi.spyOn(navigator.mediaDevices, 'getDisplayMedia').mockRejectedValue(abortError);

    const { result } = renderHook(() => useScreenCapture());

    const options: ScreenCaptureOptions = {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };

    await act(async () => {
      try {
        await result.current.startCapture(options);
      } catch (error) {
        const err = error as Error;
        expect(err.message).toBe('Screen capture was cancelled');
      }
    });
  });

  /**
   * Test 10: Source name extraction (Story 2.2 AC#3)
   * Verifies that source name is correctly extracted from video track label
   */
  it('should extract source name from video track label', async () => {
    // Test with different source names
    const testCases = [
      { label: 'Screen 1', expectedName: 'Screen 1' },
      { label: 'Google Chrome - Revui Recording', expectedName: 'Google Chrome - Revui Recording' },
      { label: 'Tab: https://app.revui.com', expectedName: 'Tab: https://app.revui.com' },
      { label: 'Firefox - Mozilla Firefox', expectedName: 'Firefox - Mozilla Firefox' },
    ];

    for (const testCase of testCases) {
      mockVideoTrack.label = testCase.label;
      mockVideoTrack.getSettings = vi.fn().mockReturnValue({
        displaySurface: 'monitor',
      });

      const { result } = renderHook(() => useScreenCapture());
      await act(async () => {
        const captureResult = await result.current.startCapture({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
          audio: false,
        });
        expect(captureResult.sourceName).toBe(testCase.expectedName);
      });

      expect(result.current.sourceName).toBe(testCase.expectedName);
    }
  });

  /**
   * Test 11: Fallback source name (Story 2.2 AC#3)
   * Verifies that 'Unknown Source' is used when track label is empty
   */
  it('should use fallback source name when label is empty', async () => {
    mockVideoTrack.label = '';
    mockVideoTrack.getSettings = vi.fn().mockReturnValue({
      displaySurface: 'monitor',
    });

    const { result } = renderHook(() => useScreenCapture());
    await act(async () => {
      const captureResult = await result.current.startCapture({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      expect(captureResult.sourceName).toBe('Unknown Source');
    });

    expect(result.current.sourceName).toBe('Unknown Source');
  });

  /**
   * Test 12: Combined screen type and source name (Story 2.2)
   * Verifies that both screenType and sourceName are correctly captured together
   */
  it('should capture both screen type and source name together', async () => {
    const testCases = [
      { displaySurface: 'monitor', label: 'Screen 1', expectedType: 'screen', expectedName: 'Screen 1' },
      { displaySurface: 'window', label: 'Google Chrome', expectedType: 'window', expectedName: 'Google Chrome' },
      { displaySurface: 'browser', label: 'Tab: localhost:3000', expectedType: 'tab', expectedName: 'Tab: localhost:3000' },
    ];

    for (const testCase of testCases) {
      mockVideoTrack.label = testCase.label;
      mockVideoTrack.getSettings = vi.fn().mockReturnValue({
        displaySurface: testCase.displaySurface,
      });

      const { result } = renderHook(() => useScreenCapture());
      await act(async () => {
        const captureResult = await result.current.startCapture({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
          audio: false,
        });
        expect(captureResult.screenType).toBe(testCase.expectedType);
        expect(captureResult.sourceName).toBe(testCase.expectedName);
      });

      expect(result.current.screenType).toBe(testCase.expectedType);
      expect(result.current.sourceName).toBe(testCase.expectedName);
    }
  });
});
