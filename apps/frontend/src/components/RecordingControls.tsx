import React from 'react';
import type { RecordingState } from '../hooks/useWebRTCRecorder';

/**
 * RecordingControls Component
 *
 * Implements Story 2.4: Recording Controls (Start/Pause/Resume/Stop)
 *
 * Acceptance Criteria:
 * - AC#1: Start button initiates recording (handled by parent component)
 * - AC#2: Pause button suspends recording, maintaining all data
 * - AC#3: Resume button continues from paused state
 * - AC#4: Stop button ends recording, triggers review phase
 * - AC#5: Visual feedback for each state (pulsing indicator, timer, file size)
 * - AC#6: Keyboard shortcuts (Space for pause/resume, Esc for stop)
 * - AC#7: Recording timer displays duration in MM:SS format
 * - AC#8: Estimated file size displayed during recording
 *
 * Features:
 * - Conditional button rendering based on recording state
 * - Real-time duration and file size display
 * - Animated recording indicator (pulsing red dot)
 * - Keyboard shortcut support for accessibility
 * - Screen type and source name display
 * - Change source button for re-selection workflow
 */

export interface RecordingControlsProps {
  // Recording state from useWebRTCRecorder hook
  recordingState: RecordingState;
  duration: number; // seconds
  estimatedSize: number; // bytes

  // Optional metadata
  screenType?: 'screen' | 'window' | 'tab' | null;
  sourceName?: string | null;

  // Control callbacks
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onChangeSource?: () => void;

  // Optional UI customization
  showMetadata?: boolean;
  showChangeSource?: boolean;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  recordingState,
  duration,
  estimatedSize,
  screenType,
  sourceName,
  onPause,
  onResume,
  onStop,
  onChangeSource,
  showMetadata = true,
  showChangeSource = true,
}) => {
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

  /**
   * Handle keyboard shortcuts (AC#6)
   * Space: Pause/Resume
   * Escape: Stop
   */
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore keyboard shortcuts if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        if (recordingState === 'recording') {
          onPause();
        } else if (recordingState === 'paused') {
          onResume();
        }
      } else if (event.code === 'Escape') {
        event.preventDefault();
        onStop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordingState, onPause, onResume, onStop]);

  return (
    <div
      className="bg-white rounded-lg shadow p-8"
      data-testid="recording-controls"
      role="region"
      aria-label="Recording controls"
    >
      {/* Recording Header with Status Indicator (AC#5) */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            {recordingState === 'recording' && (
              <>
                <span
                  className="inline-block w-3 h-3 bg-red-600 rounded-full mr-2 animate-pulse"
                  data-testid="recording-indicator"
                  aria-label="Recording active"
                ></span>
                <span className="text-red-600">Recording in Progress</span>
              </>
            )}
            {recordingState === 'paused' && (
              <>
                <span
                  className="inline-block w-3 h-3 bg-yellow-600 rounded-full mr-2"
                  data-testid="paused-indicator"
                  aria-label="Recording paused"
                ></span>
                <span className="text-yellow-600">Recording Paused</span>
              </>
            )}
          </h2>

          {/* Optional Screen Metadata */}
          {showMetadata && (
            <>
              {screenType && (
                <p className="text-gray-600 mt-1" data-testid="screen-type">
                  Screen Type: {screenType}
                </p>
              )}
              {sourceName && (
                <p className="text-gray-600" data-testid="source-name">
                  Source: {sourceName}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Recording Stats (AC#7, AC#8) */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-100 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Duration</p>
          <p
            className="text-3xl font-bold"
            data-testid="duration-display"
            aria-live="polite"
            aria-label={`Recording duration: ${formatDuration(duration)}`}
          >
            {formatDuration(duration)}
          </p>
        </div>
        <div className="bg-gray-100 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Estimated Size</p>
          <p
            className="text-3xl font-bold"
            data-testid="file-size-display"
            aria-live="polite"
            aria-label={`Estimated file size: ${formatFileSize(estimatedSize)}`}
          >
            {formatFileSize(estimatedSize)}
          </p>
        </div>
      </div>

      {/* Recording State Display */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">Status</p>
        <p
          className="text-lg font-semibold capitalize"
          data-testid="recording-state"
          aria-live="polite"
        >
          {recordingState}
        </p>
      </div>

      {/* Control Buttons (AC#2, AC#3, AC#4) */}
      <div className="flex gap-4 flex-wrap">
        {recordingState === 'recording' && (
          <button
            onClick={onPause}
            data-testid="pause-button"
            className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            aria-label="Pause recording (Spacebar)"
          >
            ⏸ Pause
          </button>
        )}

        {recordingState === 'paused' && (
          <button
            onClick={onResume}
            data-testid="resume-button"
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label="Resume recording (Spacebar)"
          >
            ▶ Resume
          </button>
        )}

        <button
          onClick={onStop}
          data-testid="stop-button"
          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          aria-label="Stop recording (Escape)"
        >
          ⏹ Stop Recording
        </button>

        {showChangeSource && onChangeSource && (
          <button
            onClick={onChangeSource}
            data-testid="change-source-button"
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            aria-label="Change recording source"
          >
            🔄 Change Source
          </button>
        )}
      </div>

      {/* Keyboard Shortcut Hints */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          <strong>Keyboard Shortcuts:</strong> Space to pause/resume, Escape to stop
        </p>
      </div>
    </div>
  );
};
