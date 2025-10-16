/**
 * Unit tests for useWebRTCRecorder hook
 *
 * Tests Story 2.1 acceptance criteria:
 * - AC#2: MediaRecorder API Integration with WebM format and chunk collection
 * - AC#3: Recording Data Handling (chunk storage and Blob creation)
 * - AC#4: Recording Constraints (2500kbps video, 128kbps audio)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebRTCRecorder, type RecordingConfig } from '../useWebRTCRecorder';

describe('useWebRTCRecorder', () => {
  let mockMediaRecorder: any;
  let mockScreenStream: MediaStream;
  let mockMicStream: MediaStream;
  let dataAvailableCallback: ((event: BlobEvent) => void) | null;
  let stopCallback: (() => void) | null;
  let errorCallback: ((event: Event) => void) | null;

  beforeEach(() => {
    // Reset callbacks
    dataAvailableCallback = null;
    stopCallback = null;
    errorCallback = null;

    // Create mock streams
    mockScreenStream = {
      id: 'screen-stream',
      active: true,
      getVideoTracks: vi.fn().mockReturnValue([{
        kind: 'video',
        id: 'video-track',
        stop: vi.fn(),
      }]),
      getAudioTracks: vi.fn().mockReturnValue([]),
      getTracks: vi.fn().mockReturnValue([{
        kind: 'video',
        id: 'video-track',
        stop: vi.fn(),
      }]),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as any;

    mockMicStream = {
      id: 'mic-stream',
      active: true,
      getVideoTracks: vi.fn().mockReturnValue([]),
      getAudioTracks: vi.fn().mockReturnValue([{
        kind: 'audio',
        id: 'audio-track',
        stop: vi.fn(),
      }]),
      getTracks: vi.fn().mockReturnValue([{
        kind: 'audio',
        id: 'audio-track',
        stop: vi.fn(),
      }]),
    } as any;

    // Mock MediaRecorder constructor
    mockMediaRecorder = {
      state: 'inactive',
      mimeType: 'video/webm;codecs=vp9,opus',
      ondataavailable: null,
      onstop: null,
      onerror: null,
      start: vi.fn(function(this: any) {
        this.state = 'recording';
      }),
      stop: vi.fn(function(this: any) {
        this.state = 'inactive';
        if (this.onstop) this.onstop();
      }),
      pause: vi.fn(function(this: any) {
        this.state = 'paused';
      }),
      resume: vi.fn(function(this: any) {
        this.state = 'recording';
      }),
    };

    // Mock MediaRecorder constructor
    global.MediaRecorder = vi.fn().mockImplementation((_stream, config) => {
      mockMediaRecorder.mimeType = config.mimeType;
      mockMediaRecorder.videoBitsPerSecond = config.videoBitsPerSecond;
      mockMediaRecorder.audioBitsPerSecond = config.audioBitsPerSecond;

      // Capture callbacks
      Object.defineProperty(mockMediaRecorder, 'ondataavailable', {
        set(callback: any) {
          dataAvailableCallback = callback;
        },
        get() {
          return dataAvailableCallback;
        },
      });

      Object.defineProperty(mockMediaRecorder, 'onstop', {
        set(callback: any) {
          stopCallback = callback;
        },
        get() {
          return stopCallback;
        },
      });

      Object.defineProperty(mockMediaRecorder, 'onerror', {
        set(callback: any) {
          errorCallback = callback;
        },
        get() {
          return errorCallback;
        },
      });

      return mockMediaRecorder;
    }) as any;

    // Mock MediaRecorder.isTypeSupported
    MediaRecorder.isTypeSupported = vi.fn((type: string) => {
      return type.includes('video/webm');
    });

    // Mock setInterval
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  /**
   * Test 1: MediaRecorder initialization with correct format
   * Verifies that MediaRecorder is initialized with VP9 codec and proper bitrates
   */
  it('should initialize MediaRecorder with correct format and bitrates', async () => {
    const { result } = renderHook(() => useWebRTCRecorder());

    const config: RecordingConfig = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    await act(async () => {
      await result.current.startRecording(mockScreenStream, mockMicStream, null, config);
    });

    // Verify MediaRecorder was created
    expect(global.MediaRecorder).toHaveBeenCalled();

    // Verify configuration
    expect(mockMediaRecorder.mimeType).toBe('video/webm;codecs=vp9,opus');
    expect(mockMediaRecorder.videoBitsPerSecond).toBe(2500000);
    expect(mockMediaRecorder.audioBitsPerSecond).toBe(128000);

    // Verify start was called
    expect(mockMediaRecorder.start).toHaveBeenCalledWith(1000); // 1-second timeslice
  });

  /**
   * Test 2: Chunk collection during recording
   * Verifies that data chunks are collected via ondataavailable event
   */
  it('should collect chunks during recording', async () => {
    const { result } = renderHook(() => useWebRTCRecorder());

    const config: RecordingConfig = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    await act(async () => {
      await result.current.startRecording(mockScreenStream, mockMicStream, null, config);
    });

    // Simulate data available events
    const chunk1 = new Blob(['chunk1'], { type: 'video/webm' });
    const chunk2 = new Blob(['chunk2'], { type: 'video/webm' });
    const chunk3 = new Blob(['chunk3'], { type: 'video/webm' });

    act(() => {
      if (dataAvailableCallback) {
        dataAvailableCallback(new BlobEvent('dataavailable', { data: chunk1 }));
      }
    });

    act(() => {
      if (dataAvailableCallback) {
        dataAvailableCallback(new BlobEvent('dataavailable', { data: chunk2 }));
      }
    });

    act(() => {
      if (dataAvailableCallback) {
        dataAvailableCallback(new BlobEvent('dataavailable', { data: chunk3 }));
      }
    });

    // Verify chunks were collected
    expect(result.current.recordedChunks).toHaveLength(3);
  });

  /**
   * Test 3: Blob creation when recording stops
   * Verifies that all chunks are combined into a single Blob
   */
  it('should create Blob from chunks when recording stops', async () => {
    const { result } = renderHook(() => useWebRTCRecorder());

    const config: RecordingConfig = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    await act(async () => {
      await result.current.startRecording(mockScreenStream, mockMicStream, null, config);
    });

    // Simulate data available events
    const chunk1 = new Blob(['chunk1'], { type: 'video/webm' });
    const chunk2 = new Blob(['chunk2'], { type: 'video/webm' });

    act(() => {
      if (dataAvailableCallback) {
        dataAvailableCallback(new BlobEvent('dataavailable', { data: chunk1 }));
        dataAvailableCallback(new BlobEvent('dataavailable', { data: chunk2 }));
      }
    });

    // Stop recording
    act(() => {
      result.current.stopRecording();
    });

    // Get final Blob
    const blob = result.current.getRecordedBlob();

    // Verify Blob was created
    expect(blob).not.toBeNull();
    expect(blob?.type).toBe('video/webm;codecs=vp9,opus');
  });

  /**
   * Test 4: Recording state transitions
   * Verifies state machine: idle → recording → paused → recording → stopped
   */
  it('should transition through recording states correctly', async () => {
    const { result } = renderHook(() => useWebRTCRecorder());

    const config: RecordingConfig = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    // Initial state: idle
    expect(result.current.state).toBe('idle');

    // Start recording: idle → recording
    await act(async () => {
      await result.current.startRecording(mockScreenStream, mockMicStream, null, config);
    });
    expect(result.current.state).toBe('recording');

    // Pause recording: recording → paused
    act(() => {
      result.current.pauseRecording();
    });
    expect(result.current.state).toBe('paused');

    // Resume recording: paused → recording
    act(() => {
      result.current.resumeRecording();
    });
    expect(result.current.state).toBe('recording');

    // Stop recording: recording → stopped
    act(() => {
      result.current.stopRecording();
    });
    expect(result.current.state).toBe('stopped');
  });

  /**
   * Test 5: Duration and file size calculations
   * Verifies that duration timer increments and estimated size is calculated correctly
   */
  it('should calculate duration and estimated file size correctly', async () => {
    const { result } = renderHook(() => useWebRTCRecorder());

    const config: RecordingConfig = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    await act(async () => {
      await result.current.startRecording(mockScreenStream, mockMicStream, null, config);
    });

    // Initial duration
    expect(result.current.duration).toBe(0);

    // Advance timer by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Verify duration updated
    expect(result.current.duration).toBe(5);

    // Verify estimated size calculation
    // Formula: (2628kbps * duration) / 8 * 1024 bytes
    // For 5 seconds: (2628 * 5) / 8 * 1024 = 1,683,840 bytes
    const estimatedSize = result.current.getEstimatedSize();
    expect(estimatedSize).toBeGreaterThan(1000000); // > 1MB for 5 seconds
  });

  /**
   * Test 6: Codec fallback from VP9 to VP8
   * Verifies that if VP9 is not supported, the recorder falls back to VP8
   */
  it('should fallback from VP9 to VP8 if VP9 not supported', async () => {
    // Mock VP9 as unsupported, VP8 as supported
    MediaRecorder.isTypeSupported = vi.fn((type: string) => {
      if (type.includes('vp9')) return false;
      if (type.includes('vp8')) return true;
      return false;
    });

    const { result } = renderHook(() => useWebRTCRecorder());

    const config: RecordingConfig = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    await act(async () => {
      await result.current.startRecording(mockScreenStream, mockMicStream, null, config);
    });

    // Verify MediaRecorder was initialized with VP8 fallback
    expect(mockMediaRecorder.mimeType).toContain('vp8');
  });

  /**
   * Test 7: Handle codec unsupported error
   * Verifies that an error is thrown if no codecs are supported
   */
  it('should throw error if no codecs are supported', async () => {
    // Mock all codecs as unsupported
    MediaRecorder.isTypeSupported = vi.fn(() => false);

    const { result } = renderHook(() => useWebRTCRecorder());

    const config: RecordingConfig = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    await act(async () => {
      try {
        await result.current.startRecording(mockScreenStream, mockMicStream, null, config);
      } catch (error) {
        const err = error as Error;
        expect(err.message).toContain('No supported video codec');
      }
    });

    // Verify error state
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain('No supported video codec');
  });

  /**
   * Test 8: Pause stops duration timer
   * Verifies that duration timer stops when recording is paused
   */
  it('should stop duration timer when paused', async () => {
    const { result } = renderHook(() => useWebRTCRecorder());

    const config: RecordingConfig = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    await act(async () => {
      await result.current.startRecording(mockScreenStream, mockMicStream, null, config);
    });

    // Advance 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.duration).toBe(3);

    // Pause recording
    act(() => {
      result.current.pauseRecording();
    });

    // Advance another 3 seconds while paused
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Duration should not have changed
    expect(result.current.duration).toBe(3);
  });

  /**
   * Test 9: Resume restarts duration timer
   * Verifies that duration timer resumes when recording is resumed
   */
  it('should resume duration timer when recording resumes', async () => {
    const { result } = renderHook(() => useWebRTCRecorder());

    const config: RecordingConfig = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    await act(async () => {
      await result.current.startRecording(mockScreenStream, mockMicStream, null, config);
    });

    // Advance 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.duration).toBe(2);

    // Pause
    act(() => {
      result.current.pauseRecording();
    });

    // Advance 2 seconds while paused
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.duration).toBe(2);

    // Resume
    act(() => {
      result.current.resumeRecording();
    });

    // Advance 2 more seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.duration).toBe(4);
  });

  /**
   * Test 10: Reset clears all state
   * Verifies that reset() clears chunks, duration, and resets to idle
   */
  it('should reset all state when reset is called', async () => {
    const { result } = renderHook(() => useWebRTCRecorder());

    const config: RecordingConfig = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    await act(async () => {
      await result.current.startRecording(mockScreenStream, mockMicStream, null, config);
    });

    // Add some chunks
    act(() => {
      if (dataAvailableCallback) {
        dataAvailableCallback(new BlobEvent('dataavailable', {
          data: new Blob(['chunk'], { type: 'video/webm' })
        }));
      }
    });

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Stop recording
    act(() => {
      result.current.stopRecording();
    });

    // Verify state before reset
    expect(result.current.duration).toBe(5);
    expect(result.current.recordedChunks.length).toBeGreaterThan(0);
    expect(result.current.state).toBe('stopped');

    // Reset
    act(() => {
      result.current.reset();
    });

    // Verify state after reset
    expect(result.current.duration).toBe(0);
    expect(result.current.recordedChunks).toHaveLength(0);
    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  /**
   * Test 11: Handle MediaRecorder error event
   * Verifies that MediaRecorder errors are caught and state is updated
   */
  it('should handle MediaRecorder error event', async () => {
    const { result } = renderHook(() => useWebRTCRecorder());

    const config: RecordingConfig = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    await act(async () => {
      await result.current.startRecording(mockScreenStream, mockMicStream, null, config);
    });

    // Simulate MediaRecorder error
    const mockError = new Error('Recording failed');
    act(() => {
      if (errorCallback) {
        errorCallback(Object.assign(new Event('error'), { error: mockError }));
      }
    });

    // Verify error state (error callback updates state synchronously)
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain('Recording failed');
    expect(result.current.state).toBe('stopped');
  });

  /**
   * Test 12: No video track error
   * Verifies that error is thrown if screen stream has no video track
   */
  it('should throw error if screen stream has no video track', async () => {
    // Mock stream with no video tracks
    const emptyStream = {
      ...mockScreenStream,
      getVideoTracks: vi.fn().mockReturnValue([]),
    } as any;

    const { result } = renderHook(() => useWebRTCRecorder());

    const config: RecordingConfig = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    let caughtError: Error | null = null;

    await act(async () => {
      try {
        await result.current.startRecording(emptyStream, null, null, config);
      } catch (error) {
        caughtError = error as Error;
      }
    });

    // Verify error was thrown
    // Verify error was thrown
    expect(caughtError).not.toBeNull();
    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError!.message).toContain('No video track available');
    expect(result.current.error).not.toBeNull();
  });
});
