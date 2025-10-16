/**
 * Unit Tests for useWebcamCapture Hook
 * Story 2.5: Webcam Overlay with Drag-and-Snap Positioning
 *
 * Test Coverage (AC#1: Webcam Capture and Display):
 * - getUserMedia API integration and stream management
 * - Permission handling (granted, denied, not found)
 * - Error states (NotAllowedError, NotFoundError, NotReadableError)
 * - Browser compatibility check
 * - Stream cleanup on unmount
 * - Loading states during webcam initialization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebcamCapture } from '../useWebcamCapture';

describe('useWebcamCapture', () => {
  let mockGetUserMedia: any;
  let mockMediaStream: MediaStream;
  let mockVideoTrack: MediaStreamTrack;

  beforeEach(() => {
    // Create mock video track
    mockVideoTrack = {
      kind: 'video',
      id: 'mock-video-track',
      enabled: true,
      readyState: 'live',
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    // Create mock media stream
    mockMediaStream = {
      id: 'mock-webcam-stream',
      active: true,
      getVideoTracks: vi.fn().mockReturnValue([mockVideoTrack]),
      getTracks: vi.fn().mockReturnValue([mockVideoTrack]),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as any;

    // Mock getUserMedia
    mockGetUserMedia = vi.fn().mockResolvedValue(mockMediaStream);

    // Setup navigator.mediaDevices
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: mockGetUserMedia,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test 1: Initial state values
   * Verifies hook returns correct initial values
   */
  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useWebcamCapture());

    expect(result.current.webcamStream).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isWebcamAvailable).toBe(true);
    expect(typeof result.current.startWebcam).toBe('function');
    expect(typeof result.current.stopWebcam).toBe('function');
  });

  /**
   * Test 2: Browser compatibility check
   * Verifies that isWebcamAvailable is false when getUserMedia is not supported
   */
  it('should detect when getUserMedia is not available', () => {
    // Remove getUserMedia support
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useWebcamCapture());

    expect(result.current.isWebcamAvailable).toBe(false);
  });

  /**
   * Test 3: Start webcam successfully
   * Verifies successful webcam initialization with getUserMedia
   */
  it('should start webcam successfully and return stream', async () => {
    const { result } = renderHook(() => useWebcamCapture());

    expect(result.current.webcamStream).toBeNull();

    await act(async () => {
      await result.current.startWebcam();
    });

    // Verify getUserMedia was called with correct constraints
    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: false,
    });

    // Verify stream is set
    expect(result.current.webcamStream).toBe(mockMediaStream);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  /**
   * Test 4: Loading state during webcam start
   * Verifies isLoading is true while getUserMedia is pending
   */
  it('should set loading state while starting webcam', async () => {
    const { result } = renderHook(() => useWebcamCapture());

    // Create a promise that we can control
    let resolveGetUserMedia: any;
    const getUserMediaPromise = new Promise<MediaStream>((resolve) => {
      resolveGetUserMedia = resolve;
    });
    mockGetUserMedia.mockReturnValue(getUserMediaPromise);

    // Start webcam (don't await yet)
    let startPromise: Promise<void>;
    act(() => {
      startPromise = result.current.startWebcam();
    });

    // Verify loading state is true
    expect(result.current.isLoading).toBe(true);

    // Resolve the getUserMedia promise
    await act(async () => {
      resolveGetUserMedia(mockMediaStream);
      await startPromise!;
    });

    // Verify loading state is now false
    expect(result.current.isLoading).toBe(false);
  });

  /**
   * Test 5: Handle NotAllowedError (permission denied)
   * Verifies proper error handling when user denies camera permission
   */
  it('should handle NotAllowedError when permission is denied', async () => {
    const permissionError = new DOMException('Permission denied', 'NotAllowedError');
    mockGetUserMedia.mockRejectedValue(permissionError);

    const { result } = renderHook(() => useWebcamCapture());

    await act(async () => {
      try {
        await result.current.startWebcam();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Camera access denied. Please grant camera permission.');
    expect(result.current.error?.name).toBe('NotAllowedError');
    expect(result.current.webcamStream).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  /**
   * Test 6: Handle NotFoundError (no camera found)
   * Verifies proper error handling when no camera is available
   */
  it('should handle NotFoundError when no camera is found', async () => {
    const notFoundError = new DOMException('No camera found', 'NotFoundError');
    mockGetUserMedia.mockRejectedValue(notFoundError);

    const { result } = renderHook(() => useWebcamCapture());

    await act(async () => {
      try {
        await result.current.startWebcam();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('No camera found. Please connect a webcam.');
    expect(result.current.error?.name).toBe('NotFoundError');
  });

  /**
   * Test 7: Handle NotReadableError (camera in use)
   * Verifies proper error handling when camera is already in use
   */
  it('should handle NotReadableError when camera is in use', async () => {
    const notReadableError = new DOMException('Camera in use', 'NotReadableError');
    mockGetUserMedia.mockRejectedValue(notReadableError);

    const { result } = renderHook(() => useWebcamCapture());

    await act(async () => {
      try {
        await result.current.startWebcam();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Camera is in use by another application.');
    expect(result.current.error?.name).toBe('NotReadableError');
  });

  /**
   * Test 8: Handle OverconstrainedError (constraints not supported)
   * Verifies proper error handling when constraints are not supported
   */
  it('should handle OverconstrainedError when constraints not supported', async () => {
    const overconstrainedError = new DOMException('Constraints not satisfied', 'OverconstrainedError');
    mockGetUserMedia.mockRejectedValue(overconstrainedError);

    const { result } = renderHook(() => useWebcamCapture());

    await act(async () => {
      try {
        await result.current.startWebcam();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Camera does not support the requested settings.');
    expect(result.current.error?.name).toBe('OverconstrainedError');
  });

  /**
   * Test 9: Handle generic errors
   * Verifies proper error handling for unknown errors
   */
  it('should handle generic errors', async () => {
    const genericError = new DOMException('Unknown error', 'UnknownError');
    mockGetUserMedia.mockRejectedValue(genericError);

    const { result } = renderHook(() => useWebcamCapture());

    await act(async () => {
      try {
        await result.current.startWebcam();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Failed to access camera. Please try again.');
  });

  /**
   * Test 10: Stop webcam
   * Verifies that stopWebcam stops all tracks and clears stream
   */
  it('should stop webcam and clean up tracks', async () => {
    const { result } = renderHook(() => useWebcamCapture());

    // Start webcam first
    await act(async () => {
      await result.current.startWebcam();
    });

    expect(result.current.webcamStream).toBe(mockMediaStream);

    // Stop webcam
    act(() => {
      result.current.stopWebcam();
    });

    // Verify track was stopped
    expect(mockVideoTrack.stop).toHaveBeenCalledTimes(1);

    // Verify stream is cleared
    expect(result.current.webcamStream).toBeNull();
    expect(result.current.error).toBeNull();
  });

  /**
   * Test 11: Multiple start/stop cycles
   * Verifies that webcam can be started and stopped multiple times
   */
  it('should handle multiple start/stop cycles', async () => {
    const { result } = renderHook(() => useWebcamCapture());

    // First cycle
    await act(async () => {
      await result.current.startWebcam();
    });
    expect(result.current.webcamStream).toBe(mockMediaStream);

    act(() => {
      result.current.stopWebcam();
    });
    expect(result.current.webcamStream).toBeNull();

    // Second cycle
    await act(async () => {
      await result.current.startWebcam();
    });
    expect(result.current.webcamStream).toBe(mockMediaStream);

    act(() => {
      result.current.stopWebcam();
    });
    expect(result.current.webcamStream).toBeNull();

    // Verify stop was called twice
    expect(mockVideoTrack.stop).toHaveBeenCalledTimes(2);
  });

  /**
   * Test 12: Cleanup on unmount
   * Verifies that stream is stopped when hook unmounts
   */
  it('should stop webcam on unmount', async () => {
    const { result, unmount } = renderHook(() => useWebcamCapture());

    // Start webcam
    await act(async () => {
      await result.current.startWebcam();
    });

    expect(result.current.webcamStream).toBe(mockMediaStream);

    // Unmount hook
    unmount();

    // Verify track was stopped
    expect(mockVideoTrack.stop).toHaveBeenCalled();
  });

  /**
   * Test 13: Error when browser not supported
   * Verifies that error is thrown when getUserMedia is not available
   */
  it('should throw error when starting webcam on unsupported browser', async () => {
    // Remove getUserMedia support
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useWebcamCapture());

    expect(result.current.isWebcamAvailable).toBe(false);

    await act(async () => {
      try {
        await result.current.startWebcam();
      } catch (error) {
        const err = error as Error;
        expect(err.message).toBe('Camera access is not supported in this browser.');
      }
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Camera access is not supported in this browser.');
  });

  /**
   * Test 14: Stop when no stream is active
   * Verifies that stopWebcam is safe to call when no stream is active
   */
  it('should handle stopWebcam when no stream is active', () => {
    const { result } = renderHook(() => useWebcamCapture());

    // Call stop without starting
    act(() => {
      result.current.stopWebcam();
    });

    // Should not throw and state should remain null
    expect(result.current.webcamStream).toBeNull();
    expect(result.current.error).toBeNull();
  });

  /**
   * Test 15: Error clears on successful start after failure
   * Verifies that previous errors are cleared when webcam starts successfully
   */
  it('should clear error on successful start after previous failure', async () => {
    const { result } = renderHook(() => useWebcamCapture());

    // First attempt fails
    const permissionError = new DOMException('Permission denied', 'NotAllowedError');
    mockGetUserMedia.mockRejectedValueOnce(permissionError);

    await act(async () => {
      try {
        await result.current.startWebcam();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).not.toBeNull();

    // Second attempt succeeds
    mockGetUserMedia.mockResolvedValueOnce(mockMediaStream);

    await act(async () => {
      await result.current.startWebcam();
    });

    // Error should be cleared
    expect(result.current.error).toBeNull();
    expect(result.current.webcamStream).toBe(mockMediaStream);
  });
});
