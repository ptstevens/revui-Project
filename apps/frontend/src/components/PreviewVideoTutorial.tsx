import { useState, useEffect, useRef } from 'react';

export interface PreviewVideoTutorialProps {
  onComplete: () => void;
  onSkip?: (neverShowAgain: boolean) => void;
  tenantId?: string;
  userId?: string;
  videoUrl?: string;
  isOpen?: boolean;
}

/**
 * Preview Video Tutorial Component
 *
 * Implements Story 2.3: 10-Second Preview Video Tutorial
 *
 * Acceptance Criteria:
 * - AC#1: Video modal auto-shows for first-time users (before first recording)
 * - AC#2: HTML5 video player with standard controls (play, pause, replay)
 * - AC#3: Skip button with "Don't show this again" checkbox
 * - AC#4: Preference persisted in localStorage (revui_tutorial_skip_{tenantId}_{userId})
 * - AC#5: "Watch Tutorial" button available in workflow header at any time
 *
 * Duration: ~10 seconds instructional video
 * Video path: /videos/recording-tutorial.mp4
 *
 * @param onComplete - Callback when video completes or user clicks "Got it"
 * @param onSkip - Optional callback when user skips with preference flag
 * @param tenantId - Tenant ID for localStorage key
 * @param userId - User ID for localStorage key
 * @param videoUrl - Optional custom video URL (defaults to /videos/recording-tutorial.mp4)
 * @param isOpen - Optional controlled state for modal visibility
 */
export function PreviewVideoTutorial({
  onComplete,
  onSkip,
  tenantId = 'default',
  userId = 'default',
  videoUrl = '/videos/recording-tutorial.mp4',
  isOpen = true,
}: PreviewVideoTutorialProps) {
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Storage key for skip preference
  const storageKey = `revui_tutorial_skip_${tenantId}_${userId}`;

  // Check localStorage on mount to see if user has opted out
  useEffect(() => {
    const skipPreference = localStorage.getItem(storageKey);
    if (skipPreference === 'true') {
      // User has previously chosen to never show again, auto-complete
      onComplete();
    }
  }, [storageKey, onComplete]);

  // Handle video ended
  const handleVideoEnded = () => {
    setVideoEnded(true);
    setIsPlaying(false);
  };

  // Handle video play/pause state
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  // Handle "Got it" button click (video completed)
  const handleGotIt = () => {
    if (neverShowAgain) {
      localStorage.setItem(storageKey, 'true');
      if (onSkip) {
        onSkip(true);
      }
    }
    onComplete();
  };

  // Handle "Skip" button click
  const handleSkip = () => {
    if (neverShowAgain) {
      localStorage.setItem(storageKey, 'true');
    }
    if (onSkip) {
      onSkip(neverShowAgain);
    }
    onComplete();
  };

  // Handle replay video
  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setVideoEnded(false);
    }
  };

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div
      data-testid="tutorial-modal"
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-labelledby="tutorial-title"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4">
          <h2
            id="tutorial-title"
            className="text-2xl font-bold text-white flex items-center"
          >
            <svg
              className="w-6 h-6 mr-2"
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
            Quick Recording Tutorial
          </h2>
          <p className="text-blue-100 mt-1">
            Learn how to create a great screen recording in just 10 seconds
          </p>
        </div>

        {/* Video Player */}
        <div className="relative bg-black">
          <video
            ref={videoRef}
            data-testid="tutorial-video"
            className="w-full max-h-96 object-contain"
            controls
            onEnded={handleVideoEnded}
            onPlay={handlePlay}
            onPause={handlePause}
            controlsList="nodownload"
            preload="auto"
          >
            <source src={videoUrl} type="video/mp4" />
            <track kind="captions" />
            Your browser does not support the video tag.
          </video>

          {/* Replay overlay (shown when video ends) */}
          {videoEnded && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <button
                data-testid="tutorial-replay-button"
                onClick={handleReplay}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-6 transition-all transform hover:scale-110"
                aria-label="Replay video"
              >
                <svg
                  className="w-12 h-12 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Footer with actions */}
        <div className="px-6 py-5 bg-gray-50">
          {/* Skip preference checkbox */}
          <div className="mb-4">
            <label className="flex items-start cursor-pointer">
              <input
                data-testid="tutorial-dont-show-checkbox"
                type="checkbox"
                checked={neverShowAgain}
                onChange={(e) => setNeverShowAgain(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700">
                Don't show this tutorial again
              </span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end">
            <button
              data-testid="tutorial-skip-button"
              onClick={handleSkip}
              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Skip
            </button>
            <button
              data-testid="tutorial-close-button"
              onClick={handleGotIt}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              {videoEnded ? 'Got it!' : 'Continue'}
            </button>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="px-6 py-3 bg-gray-100 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            <span className="font-semibold">Tip:</span> Use spacebar to play/pause, or click Skip to begin recording
          </p>
        </div>
      </div>
    </div>
  );
}
