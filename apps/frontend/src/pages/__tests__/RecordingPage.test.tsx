/**
 * Integration tests for RecordingPage component
 *
 * Tests Story 2.1 acceptance criteria:
 * - AC#1: Browser Compatibility Check on page load
 * - AC#2: MediaRecorder API Integration with screen capture
 * - AC#5: Error Handling for all failure scenarios
 *
 * Tests Story 2.2 acceptance criteria:
 * - AC#1: Screen type detection from displaySurface property
 * - AC#2: ScreenSelector component with guidance and privacy notice
 * - AC#3: Source name extraction from video track label
 * - AC#4: SelectionConfirmation banner display and auto-hide
 * - AC#5: Re-selection flow with data loss prevention
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { RecordingPage } from '../RecordingPage';
import * as browserDetection from '../../utils/browser-detection';
import * as useScreenCaptureModule from '../../hooks/useScreenCapture';
import * as useWebRTCRecorderModule from '../../hooks/useWebRTCRecorder';
import type { BrowserSupport } from '../../utils/browser-detection';

// Mock the hooks and utilities
vi.mock('../../utils/browser-detection');
vi.mock('../../hooks/useScreenCapture');
vi.mock('../../hooks/useWebRTCRecorder');

/**
 * Helper function to create mock MediaStream for Story 2.2 tests
 * Simulates browser's getDisplayMedia API returning different screen types
 */
function createMockMediaStream(
  screenType: 'monitor' | 'window' | 'browser',
  label: string
): MediaStream {
  const mockVideoTrack = {
    kind: 'video',
    id: 'mock-track-id',
    label: label,
    enabled: true,
    muted: false,
    readyState: 'live',
    onended: null,
    getSettings: () => ({
      width: 1920,
      height: 1080,
      frameRate: 30,
      displaySurface: screenType,
    }),
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
    clone: vi.fn(),
    getCapabilities: () => ({}),
    getConstraints: () => ({}),
    applyConstraints: vi.fn(() => Promise.resolve()),
  } as any;

  const mockStream = {
    id: 'mock-stream-id',
    active: true,
    getVideoTracks: () => [mockVideoTrack],
    getAudioTracks: () => [],
    getTracks: () => [mockVideoTrack],
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    clone: vi.fn(),
    getTrackById: vi.fn(() => mockVideoTrack),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as any;

  return mockStream;
}

describe('RecordingPage Integration Tests', () => {
  let mockScreenCapture: any;
  let mockRecorder: any;
  let originalNavigator: any;

  beforeEach(() => {
    // Store original navigator
    originalNavigator = global.navigator;

    // Create mock screen capture hook
    mockScreenCapture = {
      stream: null,
      screenType: null,
      error: null,
      startCapture: vi.fn(),
      stopCapture: vi.fn(),
    };

    // Create mock recorder hook
    mockRecorder = {
      state: 'idle',
      duration: 0,
      recordedChunks: [],
      error: null,
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      pauseRecording: vi.fn(),
      resumeRecording: vi.fn(),
      reset: vi.fn(),
      getRecordedBlob: vi.fn(),
      getEstimatedSize: vi.fn().mockReturnValue(0),
    };

    // Mock hook returns
    vi.spyOn(useScreenCaptureModule, 'useScreenCapture').mockReturnValue(mockScreenCapture);
    vi.spyOn(useWebRTCRecorderModule, 'useWebRTCRecorder').mockReturnValue(mockRecorder);

    // Mock navigator with desktop user agent and mediaDevices API
    // Story 2.2: ScreenSelector calls navigator.mediaDevices.getDisplayMedia directly
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      mediaDevices: {
        getDisplayMedia: vi.fn(),
      },
    };
    global.navigator = mockNavigator as any;
  });

  afterEach(() => {
    // Restore navigator
    global.navigator = originalNavigator;
    vi.clearAllMocks();
  });

  /**
   * Test 1: Browser compatibility check on page load
   * Verifies that checkBrowserSupport() is called when component mounts
   */
  it('should check browser compatibility on page load', () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);

    render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Verify browser compatibility check was called
    expect(browserDetection.checkBrowserSupport).toHaveBeenCalled();
    expect(browserDetection.isMobile).toHaveBeenCalled();

    // Verify browser info is displayed
    expect(screen.getByText(/Chrome 120/)).toBeInTheDocument();
    expect(screen.getByText(/✓ Supported/)).toBeInTheDocument();
  });

  /**
   * Test 2: Display compatibility error when browser is not supported
   * Verifies that unsupported browser error is shown with appropriate message
   */
  it('should display compatibility error when browser is not supported', () => {
    const mockSupport: BrowserSupport = {
      isSupported: false,
      hasScreenCapture: false,
      hasMediaRecorder: true,
      supportedMimeTypes: [],
      browser: 'Chrome',
      version: '48',
    };

    const errorMessage = `Your browser doesn't support screen recording.

Please upgrade to one of these browsers:
• Chrome 49 or later
• Edge 79 or later (Chromium-based)
• Safari 14.1 or later
• Firefox 96 or later

You are currently using: Chrome 48`;

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);
    vi.spyOn(browserDetection, 'getUnsupportedBrowserMessage').mockReturnValue(errorMessage);

    render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Verify error message is displayed
    expect(screen.getByText('Browser Not Supported')).toBeInTheDocument();
    expect(screen.getByText(/Your browser doesn't support screen recording/)).toBeInTheDocument();
    expect(screen.getByText(/Chrome 49 or later/)).toBeInTheDocument();
    expect(screen.getByText(/Chrome 48/)).toBeInTheDocument();

    // Verify download link is shown
    expect(screen.getByRole('link', { name: /Download Chrome/i })).toBeInTheDocument();
  });

  /**
   * Test 3: Display mobile device error
   * Verifies that mobile device error is shown when isMobile returns true
   */
  it('should display mobile device error when on mobile', () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(true);

    render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Verify mobile error message is displayed
    expect(screen.getByText('Mobile Not Supported')).toBeInTheDocument();
    expect(screen.getByText(/Screen recording on mobile devices is not currently supported/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Email me this link/i })).toBeInTheDocument();
  });

  /**
   * Test 4: Story 2.2 - "Start Recording" button initiates screen selection
   * Verifies that clicking "Start Recording" calls navigator.mediaDevices.getDisplayMedia
   * and starts recording with the selected stream
   */
  it('should initiate screen capture when Start Recording button is clicked', async () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    // Create mock MediaStream with proper video track (Story 2.2)
    const mockStream = createMockMediaStream('monitor', 'Screen 1');

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);
    vi.spyOn(browserDetection, 'getRecordingConfig').mockReturnValue({
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    // Mock navigator.mediaDevices.getDisplayMedia to return our mock stream (Story 2.2)
    (global.navigator.mediaDevices.getDisplayMedia as any).mockResolvedValue(mockStream);

    mockRecorder.state = 'recording';
    mockRecorder.startRecording.mockResolvedValue(undefined);

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Find and click the "Start Recording" button
    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    expect(startButton).toBeInTheDocument();

    await act(async () => {
      await user.click(startButton);
    });

    // Verify getDisplayMedia was called with correct constraints (Story 2.2)
    await waitFor(() => {
      expect(global.navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true, // System audio capture in Story 2.2
      });
    });

    // Verify recording was started with the stream from getDisplayMedia
    expect(mockRecorder.startRecording).toHaveBeenCalledWith(
      mockStream,
      null,
      null,
      {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000,
      }
    );
  });

  /**
   * Test 5: Recording status indicators update correctly
   * Verifies that recording duration, file size, and state are displayed during recording
   */
  it('should display recording status indicators correctly during recording', async () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    // Create mock MediaStream with proper video track (Story 2.2)
    const mockStream = createMockMediaStream('monitor', 'Screen 1');

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);
    vi.spyOn(browserDetection, 'getRecordingConfig').mockReturnValue({
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    // Mock navigator.mediaDevices.getDisplayMedia (Story 2.2)
    (global.navigator.mediaDevices.getDisplayMedia as any).mockResolvedValue(mockStream);

    mockRecorder.startRecording.mockResolvedValue(undefined);

    const user = userEvent.setup();

    const { rerender } = render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Start recording
    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    await act(async () => {
      await user.click(startButton);
    });

    // Update recorder state to recording
    mockRecorder.state = 'recording';
    mockRecorder.duration = 65; // 1 minute 5 seconds
    mockRecorder.getEstimatedSize.mockReturnValue(10485760); // 10 MB

    await act(async () => {
      rerender(
        <BrowserRouter>
          <RecordingPage />
        </BrowserRouter>
      );
    });

    // Verify recording indicators are displayed
    await waitFor(() => {
      expect(screen.getByText('Recording in Progress')).toBeInTheDocument();
      expect(screen.getByText(/Screen Type: screen/)).toBeInTheDocument();

      // Check duration formatting (65 seconds = 01:05)
      expect(screen.getByText('01:05')).toBeInTheDocument();

      // Check file size formatting (10 MB)
      expect(screen.getByText('10.00 MB')).toBeInTheDocument();

      // Check recording state
      expect(screen.getByText('recording')).toBeInTheDocument();
    });
  });

  /**
   * Test 6: Pause and Resume functionality
   * Verifies that pause and resume buttons work correctly
   */
  it('should handle pause and resume recording', async () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    // Create mock MediaStream with proper video track (Story 2.2)
    const mockStream = createMockMediaStream('monitor', 'Screen 1');

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);
    vi.spyOn(browserDetection, 'getRecordingConfig').mockReturnValue({
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    // Mock navigator.mediaDevices.getDisplayMedia (Story 2.2)
    (global.navigator.mediaDevices.getDisplayMedia as any).mockResolvedValue(mockStream);

    mockRecorder.startRecording.mockResolvedValue(undefined);
    mockRecorder.state = 'recording';

    const user = userEvent.setup();

    const { rerender } = render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Start recording
    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    await act(async () => {
      await user.click(startButton);
    });

    await act(async () => {
      rerender(
        <BrowserRouter>
          <RecordingPage />
        </BrowserRouter>
      );
    });

    // Click pause button
    const pauseButton = await screen.findByRole('button', { name: /Pause/i });
    await act(async () => {
      await user.click(pauseButton);
    });

    expect(mockRecorder.pauseRecording).toHaveBeenCalled();

    // Update state to paused
    mockRecorder.state = 'paused';

    await act(async () => {
      rerender(
        <BrowserRouter>
          <RecordingPage />
        </BrowserRouter>
      );
    });

    // Click resume button
    const resumeButton = await screen.findByRole('button', { name: /Resume/i });
    await act(async () => {
      await user.click(resumeButton);
    });

    expect(mockRecorder.resumeRecording).toHaveBeenCalled();
  });

  /**
   * Test 7: Story 2.2 - Display error message when screen capture fails
   * Verifies that error messages are shown when getDisplayMedia fails
   */
  it('should display error message when screen capture fails', async () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);
    vi.spyOn(browserDetection, 'getRecordingConfig').mockReturnValue({
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    // Mock getDisplayMedia failure (Story 2.2)
    const error = new Error('Permission denied by system');
    (error as any).name = 'NotAllowedError';
    (global.navigator.mediaDevices.getDisplayMedia as any).mockRejectedValue(error);

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Click start button
    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    await act(async () => {
      await user.click(startButton);
    });

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Permission denied: Please allow screen sharing in browser settings/)).toBeInTheDocument();
    });
  });

  /**
   * Test 8: Story 2.2 - Display contextual error messages for different error types
   * Verifies that Story 2.2 ScreenSelector shows appropriate error messages
   */
  it('should display contextual error messages for different error types', async () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);
    vi.spyOn(browserDetection, 'getRecordingConfig').mockReturnValue({
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    const user = userEvent.setup();

    // Test 8a: NotSupportedError
    const notSupportedError = new Error('Screen sharing is not supported');
    (notSupportedError as any).name = 'NotSupportedError';
    (global.navigator.mediaDevices.getDisplayMedia as any).mockRejectedValue(notSupportedError);

    const { rerender } = render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    await act(async () => {
      await user.click(startButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Screen sharing is not supported in your browser/)).toBeInTheDocument();
    });

    // Test 8b: NotReadableError
    const notReadableError = new Error('Cannot access screen');
    (notReadableError as any).name = 'NotReadableError';
    (global.navigator.mediaDevices.getDisplayMedia as any).mockRejectedValue(notReadableError);

    await act(async () => {
      rerender(
        <BrowserRouter>
          <RecordingPage />
        </BrowserRouter>
      );
    });

    await act(async () => {
      await user.click(startButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Cannot access screen - it may be in use by another application/)).toBeInTheDocument();
    });

    // Test 8c: User cancelled selection (AbortError)
    const abortError = new Error('User cancelled');
    (abortError as any).name = 'AbortError';
    (global.navigator.mediaDevices.getDisplayMedia as any).mockRejectedValue(abortError);

    await act(async () => {
      rerender(
        <BrowserRouter>
          <RecordingPage />
        </BrowserRouter>
      );
    });

    await act(async () => {
      await user.click(startButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Screen selection was cancelled/)).toBeInTheDocument();
    });
  });

  /**
   * Test 9: Stop recording and show review phase
   * Verifies that stopping recording shows the review phase with recording details
   */
  it('should stop recording and show review phase', async () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    // Create mock MediaStream with proper video track (Story 2.2)
    const mockStream = createMockMediaStream('monitor', 'Screen 1');
    const mockBlob = new Blob(['mock video data'], { type: 'video/webm' });

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);
    vi.spyOn(browserDetection, 'getRecordingConfig').mockReturnValue({
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    // Mock navigator.mediaDevices.getDisplayMedia (Story 2.2)
    (global.navigator.mediaDevices.getDisplayMedia as any).mockResolvedValue(mockStream);

    mockRecorder.startRecording.mockResolvedValue(undefined);
    mockRecorder.state = 'recording';
    mockRecorder.duration = 125; // 2 minutes 5 seconds
    mockRecorder.getRecordedBlob.mockReturnValue(mockBlob);

    const user = userEvent.setup();

    const { rerender } = render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Start recording
    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    await act(async () => {
      await user.click(startButton);
    });

    await act(async () => {
      rerender(
        <BrowserRouter>
          <RecordingPage />
        </BrowserRouter>
      );
    });

    // Stop recording
    const stopButton = await screen.findByRole('button', { name: /Stop Recording/i });
    await act(async () => {
      await user.click(stopButton);
    });

    expect(mockRecorder.stopRecording).toHaveBeenCalled();
    expect(mockScreenCapture.stopCapture).toHaveBeenCalled();

    // Update to review phase
    mockRecorder.state = 'stopped';

    await act(async () => {
      rerender(
        <BrowserRouter>
          <RecordingPage />
        </BrowserRouter>
      );
    });

    // Verify review phase is shown
    await waitFor(() => {
      expect(screen.getByText('Recording Complete')).toBeInTheDocument();
      expect(screen.getByText('02:05')).toBeInTheDocument(); // Duration formatted
      expect(screen.getByRole('button', { name: /Record Again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Download Recording/i })).toBeInTheDocument();
    });
  });

  /**
   * Test 10: Session ID is displayed when provided in route params
   * Verifies that session ID from URL params is displayed
   */
  it('should display session ID when provided in route params', () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/recording/test-session-123']}>
        <Routes>
          <Route path="/recording/:sessionId" element={<RecordingPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify session ID is displayed
    expect(screen.getByText(/Session ID: test-session-123/)).toBeInTheDocument();
  });

  /**
   * Test 11: Story 2.2 - ScreenSelector component renders with guidance
   * Verifies that ScreenSelector shows guidance text and privacy notice in setup phase
   */
  it('should display ScreenSelector with guidance and privacy notice', () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);

    render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Verify ScreenSelector guidance text is displayed
    expect(screen.getByText(/Choose what to share/)).toBeInTheDocument();
    expect(screen.getByText(/entire screen, application window, or browser tab/)).toBeInTheDocument();

    // Verify privacy notice is displayed
    expect(screen.getByText(/Your other windows and tabs will not be visible/)).toBeInTheDocument();

    // Verify Start Recording button exists
    expect(screen.getByRole('button', { name: /Start Recording/i })).toBeInTheDocument();
  });

  /**
   * Test 12: Story 2.2 - Screen selection captures metadata
   * Verifies that screen type and source name are captured and displayed
   */
  it('should capture and display screen metadata after selection', async () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    // Create mock MediaStream with proper video track (Story 2.2)
    const mockStream = createMockMediaStream('window', 'Google Chrome - Revui App');

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);
    vi.spyOn(browserDetection, 'getRecordingConfig').mockReturnValue({
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    // Mock navigator.mediaDevices.getDisplayMedia (Story 2.2)
    (global.navigator.mediaDevices.getDisplayMedia as any).mockResolvedValue(mockStream);

    mockRecorder.state = 'recording';
    mockRecorder.startRecording.mockResolvedValue(undefined);

    const user = userEvent.setup();

    const { rerender } = render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Start recording
    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    await act(async () => {
      await user.click(startButton);
    });

    await act(async () => {
      rerender(
        <BrowserRouter>
          <RecordingPage />
        </BrowserRouter>
      );
    });

    // Verify screen metadata is displayed
    await waitFor(() => {
      expect(screen.getByText('Recording in Progress')).toBeInTheDocument();
      expect(screen.getByText(/Screen Type: window/)).toBeInTheDocument();
      expect(screen.getByText(/Source: Google Chrome - Revui App/)).toBeInTheDocument();
    });

    // Verify recorder was called with correct arguments
    expect(mockRecorder.startRecording).toHaveBeenCalledWith(
      mockStream,
      null, // No microphone for Story 2.1/2.2
      null, // No webcam for Story 2.1/2.2
      expect.any(Object)
    );
  });

  /**
   * Test 13: Story 2.2 - SelectionConfirmation banner displays after selection
   * Verifies that confirmation banner shows with correct screen info
   */
  it('should display SelectionConfirmation banner after screen selection', async () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    // Create mock MediaStream with proper video track (Story 2.2)
    const mockStream = createMockMediaStream('monitor', 'Screen 1');

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);
    vi.spyOn(browserDetection, 'getRecordingConfig').mockReturnValue({
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    // Mock navigator.mediaDevices.getDisplayMedia (Story 2.2)
    (global.navigator.mediaDevices.getDisplayMedia as any).mockResolvedValue(mockStream);

    mockRecorder.state = 'recording';
    mockRecorder.startRecording.mockResolvedValue(undefined);

    const user = userEvent.setup();

    const { rerender } = render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Start recording
    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    await act(async () => {
      await user.click(startButton);
    });

    await act(async () => {
      rerender(
        <BrowserRouter>
          <RecordingPage />
        </BrowserRouter>
      );
    });

    // Verify SelectionConfirmation banner is displayed
    await waitFor(() => {
      expect(screen.getByText(/Recording started successfully/)).toBeInTheDocument();
      expect(screen.getByText(/screen: Screen 1/)).toBeInTheDocument();
    });
  });

  /**
   * Test 14: Story 2.2 - Re-selection button shows during recording
   * Verifies that re-selection button is available during active recording
   */
  it('should display re-selection button during recording', async () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    // Create mock MediaStream with proper video track (Story 2.2)
    const mockStream = createMockMediaStream('browser', 'Tab: https://app.revui.com');

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);
    vi.spyOn(browserDetection, 'getRecordingConfig').mockReturnValue({
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    // Mock navigator.mediaDevices.getDisplayMedia (Story 2.2)
    (global.navigator.mediaDevices.getDisplayMedia as any).mockResolvedValue(mockStream);

    mockRecorder.state = 'recording';
    mockRecorder.startRecording.mockResolvedValue(undefined);

    const user = userEvent.setup();

    const { rerender } = render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Start recording
    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    await act(async () => {
      await user.click(startButton);
    });

    await act(async () => {
      rerender(
        <BrowserRouter>
          <RecordingPage />
        </BrowserRouter>
      );
    });

    // Verify re-selection button is displayed
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Change Source/i })).toBeInTheDocument();
    });
  });

  /**
   * Test 15: Story 2.2 - Re-selection shows confirmation dialog
   * Verifies that clicking re-selection button shows data loss warning
   */
  it('should show confirmation dialog when re-selecting during recording', async () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    // Create mock MediaStream with proper video track (Story 2.2)
    const mockStream = createMockMediaStream('monitor', 'Screen 1');

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);
    vi.spyOn(browserDetection, 'getRecordingConfig').mockReturnValue({
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    // Mock navigator.mediaDevices.getDisplayMedia (Story 2.2)
    (global.navigator.mediaDevices.getDisplayMedia as any).mockResolvedValue(mockStream);

    mockRecorder.state = 'recording';
    mockRecorder.duration = 30;
    mockRecorder.startRecording.mockResolvedValue(undefined);

    const user = userEvent.setup();

    const { rerender } = render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Start recording
    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    await act(async () => {
      await user.click(startButton);
    });

    await act(async () => {
      rerender(
        <BrowserRouter>
          <RecordingPage />
        </BrowserRouter>
      );
    });

    // Click re-selection button
    const changeSourceButton = await screen.findByRole('button', { name: /Change Source/i });
    await act(async () => {
      await user.click(changeSourceButton);
    });

    // Verify confirmation dialog is displayed
    await waitFor(() => {
      expect(screen.getByText(/Change Recording Source?/)).toBeInTheDocument();
      expect(screen.getByText(/Your current recording will be discarded/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Yes, Change Source/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
  });

  /**
   * Test 16: Story 2.2 - Confirming re-selection discards recording
   * Verifies that confirming re-selection resets to setup phase
   */
  it('should discard recording and return to setup when re-selection confirmed', async () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    // Create mock MediaStream with proper video track (Story 2.2)
    const mockStream = createMockMediaStream('window', 'Google Chrome');

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);
    vi.spyOn(browserDetection, 'getRecordingConfig').mockReturnValue({
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    // Mock navigator.mediaDevices.getDisplayMedia (Story 2.2)
    (global.navigator.mediaDevices.getDisplayMedia as any).mockResolvedValue(mockStream);

    mockRecorder.state = 'recording';
    mockRecorder.startRecording.mockResolvedValue(undefined);

    const user = userEvent.setup();

    const { rerender } = render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Start recording
    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    await act(async () => {
      await user.click(startButton);
    });

    await act(async () => {
      rerender(
        <BrowserRouter>
          <RecordingPage />
        </BrowserRouter>
      );
    });

    // Click re-selection button
    const changeSourceButton = await screen.findByRole('button', { name: /Change Source/i });
    await act(async () => {
      await user.click(changeSourceButton);
    });

    // Confirm re-selection
    const confirmButton = await screen.findByRole('button', { name: /Yes, Change Source/i });
    await act(async () => {
      await user.click(confirmButton);
    });

    // Verify recorder was stopped/reset (Story 2.2: stream stopped directly, not via screenCapture)
    expect(mockRecorder.stopRecording).toHaveBeenCalled();
    expect(mockRecorder.reset).toHaveBeenCalled();

    // Update state to idle
    mockRecorder.state = 'idle';
    mockScreenCapture.screenType = null;
    mockScreenCapture.sourceName = null;

    await act(async () => {
      rerender(
        <BrowserRouter>
          <RecordingPage />
        </BrowserRouter>
      );
    });

    // Verify we're back in setup phase
    await waitFor(() => {
      expect(screen.getByText(/Choose what to share/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Start Recording/i })).toBeInTheDocument();
    });
  });

  /**
   * Test 17: Story 2.2 - Canceling re-selection continues recording
   * Verifies that canceling confirmation dialog closes it and continues recording
   */
  it('should continue recording when re-selection is cancelled', async () => {
    const mockSupport: BrowserSupport = {
      isSupported: true,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm;codecs=vp9,opus'],
      browser: 'Chrome',
      version: '120',
    };

    // Create mock MediaStream with proper video track (Story 2.2)
    const mockStream = createMockMediaStream('browser', 'Tab: localhost:3000');

    vi.spyOn(browserDetection, 'checkBrowserSupport').mockReturnValue(mockSupport);
    vi.spyOn(browserDetection, 'isMobile').mockReturnValue(false);
    vi.spyOn(browserDetection, 'getRecordingConfig').mockReturnValue({
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    // Mock navigator.mediaDevices.getDisplayMedia (Story 2.2)
    (global.navigator.mediaDevices.getDisplayMedia as any).mockResolvedValue(mockStream);

    mockRecorder.state = 'recording';
    mockRecorder.duration = 45;
    mockRecorder.startRecording.mockResolvedValue(undefined);

    const user = userEvent.setup();

    const { rerender } = render(
      <BrowserRouter>
        <RecordingPage />
      </BrowserRouter>
    );

    // Start recording
    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    await act(async () => {
      await user.click(startButton);
    });

    await act(async () => {
      rerender(
        <BrowserRouter>
          <RecordingPage />
        </BrowserRouter>
      );
    });

    // Click re-selection button
    const changeSourceButton = await screen.findByRole('button', { name: /Change Source/i });
    await act(async () => {
      await user.click(changeSourceButton);
    });

    // Cancel re-selection
    const cancelButton = await screen.findByRole('button', { name: /Cancel/i });
    await act(async () => {
      await user.click(cancelButton);
    });

    // Verify stopRecording and reset were NOT called
    expect(mockRecorder.stopRecording).not.toHaveBeenCalled();
    expect(mockScreenCapture.stopCapture).not.toHaveBeenCalled();
    expect(mockRecorder.reset).not.toHaveBeenCalled();

    // Verify dialog is closed and recording continues
    await waitFor(() => {
      expect(screen.queryByText(/Change Recording Source?/)).not.toBeInTheDocument();
      expect(screen.getByText('Recording in Progress')).toBeInTheDocument();
      expect(screen.getByText(/Source: Tab: localhost:3000/)).toBeInTheDocument();
    });
  });
});
