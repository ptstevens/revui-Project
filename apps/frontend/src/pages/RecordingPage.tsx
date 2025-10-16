import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useScreenCapture } from '../hooks/useScreenCapture';
import { useWebRTCRecorder } from '../hooks/useWebRTCRecorder';
import { useRecordingWorkflow } from '../hooks/useRecordingWorkflow';
import { checkBrowserSupport, isMobile, getRecordingConfig, getUnsupportedBrowserMessage } from '../utils/browser-detection';
import { ScreenSelector } from '../components/ScreenSelector';
import { SelectionConfirmation } from '../components/SelectionConfirmation';
import { PreviewVideoTutorial } from '../components/PreviewVideoTutorial';
import type { RecordingPhase, WebRTCSupportInfo } from '../types/recording';

/**
 * RecordingPage Component
 *
 * Implements Story 2.1, 2.2, and 2.3 acceptance criteria:
 * - Story 2.3 AC#1: Tutorial auto-shows for first-time users
 * - Story 2.3 AC#5: "Watch Tutorial" button available in header
 * - Story 2.1 AC#1: Browser Compatibility Check on page load
 * - Story 2.1 AC#2: MediaRecorder API Integration with screen capture
 * - Story 2.1 AC#3: Recording Data Handling (chunk collection and Blob creation)
 * - Story 2.1 AC#4: Recording Constraints (1080p, 30fps, 2500kbps)
 * - Story 2.1 AC#5: Error Handling for all failure scenarios
 * - Story 2.2 AC#1: Native Browser Picker via ScreenSelector component
 * - Story 2.2 AC#2: Selection Guidance and privacy notice
 * - Story 2.2 AC#3: Selection Confirmation banner with source name
 * - Story 2.2 AC#4: Re-Selection flow with data loss prevention
 * - Story 2.2 AC#5: Audio Source Selection (system + microphone)
 *
 * Main recording orchestration component that:
 * 1. Checks browser compatibility on mount
 * 2. Shows ScreenSelector for user to choose screen/window/tab
 * 3. Displays confirmation banner after selection
 * 4. Initiates screen capture with proper constraints
 * 5. Manages recording state (setup → recording → review)
 * 6. Supports re-selection with data loss prevention
 * 7. Shows contextual error messages
 */
export const RecordingPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  // Browser compatibility state
  const [browserSupport, setBrowserSupport] = useState<WebRTCSupportInfo | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Recording phase state
  const [phase, setPhase] = useState<RecordingPhase>('setup');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Screen selection state (Story 2.2)
  const [selectedStream, setSelectedStream] = useState<MediaStream | null>(null);
  const [selectedScreenType, setSelectedScreenType] = useState<'screen' | 'window' | 'tab' | null>(null);
  const [selectedSourceName, setSelectedSourceName] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showReselectionDialog, setShowReselectionDialog] = useState(false);

  // Initialize hooks
  const screenCapture = useScreenCapture();
  const recorder = useWebRTCRecorder();

  // Story 2.3: Tutorial workflow integration
  const workflow = useRecordingWorkflow({
    sessionId,
    tenantId: 'default', // TODO: Get from auth context when available
    userId: 'default', // TODO: Get from auth context when available
  });

  // Check browser compatibility on mount
  useEffect(() => {
    const support = checkBrowserSupport();
    setBrowserSupport(support);
    setIsMobileDevice(isMobile());

    console.log('Browser Support:', support);
    console.log('Is Mobile:', isMobile());
  }, []);

  // Monitor screen capture errors (e.g., user stops sharing via browser)
  useEffect(() => {
    if (screenCapture.error) {
      setErrorMessage(screenCapture.error.message);
      // Stop recording if it was in progress
      if (phase === 'recording') {
        recorder.stopRecording();
        setPhase('review');
      }
    }
  }, [screenCapture.error, phase, recorder]);

  /**
   * Handle screen selection from ScreenSelector component (Story 2.2)
   * Stores selected stream and metadata, then starts recording
   */
  const handleScreenSelected = async (
    stream: MediaStream,
    screenType: 'screen' | 'window' | 'tab',
    sourceName: string
  ) => {
    try {
      setErrorMessage(null);

      // Store selection metadata (Story 2.2 AC#3)
      setSelectedStream(stream);
      setSelectedScreenType(screenType);
      setSelectedSourceName(sourceName);
      setShowConfirmation(true);

      // Get recording config based on browser
      const config = getRecordingConfig(browserSupport?.browser || 'Chrome');

      // Start recording with selected stream
      await recorder.startRecording(
        stream,
        null, // No microphone for Story 2.1/2.2
        null, // No webcam for Story 2.1/2.2
        config
      );

      setPhase('recording');
    } catch (error) {
      const err = error as Error;
      setErrorMessage(err.message);
      console.error('Failed to start recording:', err);
    }
  };

  /**
   * Handle re-selection request (Story 2.2 AC#4)
   * Shows confirmation dialog to prevent accidental data loss
   */
  const handleRequestReselection = () => {
    setShowReselectionDialog(true);
  };

  /**
   * Confirm re-selection and discard current recording (Story 2.2 AC#4)
   */
  const handleConfirmReselection = () => {
    // Stop current recording and discard data
    if (selectedStream) {
      selectedStream.getTracks().forEach(track => track.stop());
    }
    recorder.stopRecording();
    recorder.reset();

    // Reset selection state
    setSelectedStream(null);
    setSelectedScreenType(null);
    setSelectedSourceName(null);
    setShowConfirmation(false);
    setShowReselectionDialog(false);
    setErrorMessage(null);

    // Return to setup phase for new selection
    setPhase('setup');
  };

  /**
   * Cancel re-selection and continue with current recording
   */
  const handleCancelReselection = () => {
    setShowReselectionDialog(false);
  };

  /**
   * Handle Stop Recording button click
   * Stops screen capture and MediaRecorder
   */
  const handleStopRecording = () => {
    try {
      recorder.stopRecording();
      screenCapture.stopCapture();
      setPhase('review');
    } catch (error) {
      const err = error as Error;
      setErrorMessage(`Failed to stop recording: ${err.message}`);
      console.error('Failed to stop recording:', err);
    }
  };

  /**
   * Handle Pause Recording button click
   */
  const handlePauseRecording = () => {
    try {
      recorder.pauseRecording();
    } catch (error) {
      const err = error as Error;
      setErrorMessage(`Failed to pause recording: ${err.message}`);
    }
  };

  /**
   * Handle Resume Recording button click
   */
  const handleResumeRecording = () => {
    try {
      recorder.resumeRecording();
      setErrorMessage(null);
    } catch (error) {
      const err = error as Error;
      setErrorMessage(`Failed to resume recording: ${err.message}`);
    }
  };

  /**
   * Format duration seconds to MM:SS
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Format bytes to human-readable size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Show mobile browser warning
  if (isMobileDevice) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Mobile Not Supported</h1>
          <p className="text-gray-700 mb-4">
            Screen recording on mobile devices is not currently supported. Please use a desktop or laptop computer.
          </p>
          <button
            onClick={() => {
              window.location.href = `mailto:?subject=Revui Recording Session&body=Complete this recording on your desktop: ${window.location.href}`;
            }}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Email me this link
          </button>
        </div>
      </div>
    );
  }

  // Show unsupported browser message
  if (browserSupport && !browserSupport.isSupported) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Browser Not Supported</h1>
          <pre className="text-gray-700 mb-4 whitespace-pre-wrap">
            {getUnsupportedBrowserMessage(browserSupport)}
          </pre>
          <a
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center"
          >
            Download Chrome
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Story 2.3: Preview Video Tutorial Modal */}
      {workflow.shouldShowTutorial && (
        <PreviewVideoTutorial
          onComplete={workflow.completeTutorial}
          onSkip={(neverShowAgain) => {
            console.log('Tutorial skipped, never show again:', neverShowAgain);
            workflow.completeTutorial();
          }}
          tenantId={workflow.sessionInfo?.tenantId || 'default'}
          userId={workflow.sessionInfo?.userId || 'default'}
          isOpen={workflow.shouldShowTutorial}
        />
      )}

      {/* Selection Confirmation Banner (Story 2.2 AC#3) */}
      {showConfirmation && selectedScreenType && selectedSourceName && (
        <SelectionConfirmation
          screenType={selectedScreenType}
          sourceName={selectedSourceName}
          autoHideAfterMs={5000}
          onDismiss={() => setShowConfirmation(false)}
        />
      )}

      {/* Re-Selection Confirmation Dialog (Story 2.2 AC#4) */}
      {showReselectionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Change Recording Source?
            </h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to re-select your screen source? Your current recording will be discarded.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleCancelReselection}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReselection}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700"
              >
                Yes, Change Source
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header with Watch Tutorial button (Story 2.3 AC#5) */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Screen Recording Session</h1>
            <button
              data-testid="watch-tutorial-button"
              onClick={workflow.showTutorial}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
              aria-label="Watch tutorial video"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Watch Tutorial
            </button>
          </div>

        {/* Browser Info */}
        {browserSupport && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h2 className="text-lg font-semibold mb-2">Browser Information</h2>
            <p className="text-gray-700">
              {browserSupport.browser} {browserSupport.version} - {browserSupport.isSupported ? '✓ Supported' : '✗ Not Supported'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Supported formats: {browserSupport.supportedMimeTypes.join(', ') || 'None'}
            </p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {errorMessage}
          </div>
        )}

        {/* Screen Selection - Setup Phase (Story 2.2 AC#1, AC#2) */}
        {phase === 'setup' && (
          <ScreenSelector
            onScreenSelected={handleScreenSelected}
            onError={(error) => setErrorMessage(error.message)}
          />
        )}

        {/* Recording Controls - Recording Phase */}
        {phase === 'recording' && (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-red-600 flex items-center">
                  <span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-2 animate-pulse"></span>
                  Recording in Progress
                </h2>
                {selectedScreenType && (
                  <p className="text-gray-600 mt-1">
                    Screen Type: {selectedScreenType}
                  </p>
                )}
                {selectedSourceName && (
                  <p className="text-gray-600">
                    Source: {selectedSourceName}
                  </p>
                )}
              </div>
            </div>

            {/* Recording Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Duration</p>
                <p className="text-3xl font-bold">{formatDuration(recorder.duration)}</p>
              </div>
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Estimated Size</p>
                <p className="text-3xl font-bold">{formatFileSize(recorder.getEstimatedSize())}</p>
              </div>
            </div>

            {/* Recording State */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Status</p>
              <p className="text-lg font-semibold capitalize">{recorder.state}</p>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-4">
              {recorder.state === 'recording' && (
                <button
                  onClick={handlePauseRecording}
                  className="bg-yellow-600 text-white px-6 py-2 rounded hover:bg-yellow-700"
                >
                  Pause
                </button>
              )}
              {recorder.state === 'paused' && (
                <button
                  onClick={handleResumeRecording}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                >
                  Resume
                </button>
              )}
              <button
                onClick={handleStopRecording}
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
              >
                Stop Recording
              </button>
              {/* Re-Selection Button (Story 2.2 AC#4) */}
              <button
                onClick={handleRequestReselection}
                className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
              >
                Change Source
              </button>
            </div>
          </div>
        )}

        {/* Review Phase */}
        {phase === 'review' && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold mb-4">Recording Complete</h2>
            <div className="mb-6">
              <p className="text-gray-700">
                Duration: <strong>{formatDuration(recorder.duration)}</strong>
              </p>
              <p className="text-gray-700">
                File Size: <strong>{formatFileSize(recorder.getRecordedBlob()?.size || 0)}</strong>
              </p>
              <p className="text-gray-700">
                Format: <strong>{recorder.getRecordedBlob()?.type || 'Unknown'}</strong>
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  recorder.reset();
                  setPhase('setup');
                }}
                className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
              >
                Record Again
              </button>
              <button
                onClick={() => {
                  const blob = recorder.getRecordedBlob();
                  if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `recording-${Date.now()}.webm`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Download Recording
              </button>
            </div>
          </div>
        )}

          {/* Session Info */}
          {sessionId && (
            <div className="mt-4 text-sm text-gray-600">
              Session ID: {sessionId}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
