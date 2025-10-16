import { useState } from 'react';

export interface ScreenSelectorProps {
  onScreenSelected: (stream: MediaStream, screenType: 'screen' | 'window' | 'tab', sourceName: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Screen/Window/Tab Selection Component
 *
 * Implements Story 2.2 acceptance criteria:
 * - AC#2: Selection Guidance with helpful text and privacy notice
 * - AC#4: Re-Selection Option with "Try Again" button
 *
 * This component triggers the native browser picker for screen selection.
 * The actual picker UI is provided by the browser and cannot be customized.
 *
 * @param onScreenSelected - Callback when user selects a screen source
 * @param onError - Optional callback for error handling
 */
export function ScreenSelector({ onScreenSelected, onError }: ScreenSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartRecording = async () => {
    setIsSelecting(true);
    setError(null);

    try {
      // Request screen capture with video and audio options
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true, // System audio capture
      });

      // Detect screen type from stream settings
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();

      let screenType: 'screen' | 'window' | 'tab' = 'screen';
      if ('displaySurface' in settings) {
        const displaySurface = (settings as any).displaySurface;
        if (displaySurface === 'monitor') screenType = 'screen';
        else if (displaySurface === 'window') screenType = 'window';
        else if (displaySurface === 'browser') screenType = 'tab';
      }

      // Extract source name from video track label
      const sourceName = videoTrack.label || 'Unknown Source';

      // Notify parent component of successful selection
      onScreenSelected(stream, screenType, sourceName);
    } catch (err) {
      const error = err as Error;
      let errorMessage = 'Failed to start screen capture. Please try again.';

      // Provide user-friendly error messages
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permission denied: Please allow screen sharing in browser settings';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No screen source available for capture.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Screen selection was cancelled. Click "Start Recording" to try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Screen sharing is not supported in your browser';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Cannot access screen - it may be in use by another application';
      }

      setError(errorMessage);
      if (onError) {
        onError(new Error(errorMessage));
      }
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Choose what to share
          </h1>
          <p className="text-lg text-gray-600">
            Choose your entire screen, application window, or browser tab. We recommend selecting the application window with the task you'll demonstrate.
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Privacy Notice
              </h3>
              <p className="text-sm text-blue-800">
                Your other windows and tabs will not be visible unless you explicitly share them.
                Only the source you select will be recorded.
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            What happens next?
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Click "Start Recording" to open the browser's screen selection dialog</li>
            <li>Choose to share your entire screen, a specific window, or a browser tab</li>
            <li>Select whether to include system audio and microphone audio</li>
            <li>Click "Share" in the browser dialog to begin recording</li>
          </ol>
        </div>

        {/* Action Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleStartRecording}
            disabled={isSelecting}
            className={`
              px-8 py-4 rounded-lg text-lg font-semibold
              transition-all duration-200 transform
              ${
                isSelecting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer'
              }
              text-white shadow-lg hover:shadow-xl
              disabled:transform-none
            `}
          >
            {isSelecting ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Waiting for selection...
              </span>
            ) : (
              'Start Recording'
            )}
          </button>

          {error && (
            <button
              onClick={handleStartRecording}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              Try Again
            </button>
          )}
        </div>

        {/* Browser Support Note */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Supported browsers: Chrome 49+, Edge 79+, Safari 14.1+, Firefox 96+
          </p>
        </div>
      </div>
    </div>
  );
}
