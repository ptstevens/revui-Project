import React from 'react';
import type { WebcamSize } from './WebcamPreview';

/**
 * Props for WebcamControls component
 */
export interface WebcamControlsProps {
  /** Whether webcam is currently enabled */
  isEnabled: boolean;
  /** Current size setting */
  size: WebcamSize;
  /** Whether video is mirrored */
  isMirrored: boolean;
  /** Whether webcam is loading */
  isLoading: boolean;
  /** Error message if webcam failed to start */
  error: Error | null;
  /** Callback when webcam is toggled on/off */
  onToggle: () => void;
  /** Callback when size is changed */
  onSizeChange: (size: WebcamSize) => void;
  /** Callback when mirror toggle is clicked */
  onMirrorToggle: () => void;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * WebcamControls Component
 *
 * Implements Story 2.5 acceptance criteria:
 * - AC#2: Toggle Webcam On/Off
 *   - Button to enable/disable webcam overlay
 *   - Visual indication of enabled state
 *
 * - AC#5: Webcam Size Options
 *   - Three size buttons: Small (S), Medium (M), Large (L)
 *   - Active size highlighted
 *   - Persists via parent component's localStorage
 *
 * - AC#6: Mirror/Flip Toggle
 *   - Button to toggle horizontal flip
 *   - Icon indicates mirrored state
 *
 * - AC#8: Accessibility
 *   - ARIA labels for all buttons
 *   - Keyboard navigation support (Tab, Enter, Space)
 *   - Focus indicators
 *   - Screen reader announcements
 *
 * Features:
 * - Compact control panel design
 * - Loading state indication
 * - Error message display
 * - Professional styling consistent with RecordingControls
 * - Responsive button sizing
 *
 * @param props - Webcam control configuration
 */
export const WebcamControls: React.FC<WebcamControlsProps> = ({
  isEnabled,
  size,
  isMirrored,
  isLoading,
  error,
  onToggle,
  onSizeChange,
  onMirrorToggle,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow p-4 ${className}`}
      data-testid="webcam-controls"
      role="region"
      aria-label="Webcam overlay controls"
    >
      {/* Header */}
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <span className="mr-2">📹</span>
        Webcam Overlay
      </h3>

      {/* Error Message */}
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm"
          data-testid="webcam-error"
          role="alert"
        >
          <strong>Error:</strong> {error.message}
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="mb-4">
        <button
          onClick={onToggle}
          disabled={isLoading}
          data-testid="webcam-toggle-button"
          className={`
            w-full px-4 py-3 rounded-lg font-semibold
            focus:outline-none focus:ring-2 focus:ring-offset-2
            transition-colors
            ${
              isEnabled
                ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                : 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500'
            }
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label={isEnabled ? 'Disable webcam overlay' : 'Enable webcam overlay'}
          aria-pressed={isEnabled}
        >
          {isLoading ? (
            <>
              <span className="inline-block animate-spin mr-2">⏳</span>
              Loading Webcam...
            </>
          ) : (
            <>
              <span className="mr-2">{isEnabled ? '✅' : '❌'}</span>
              {isEnabled ? 'Webcam Enabled' : 'Enable Webcam'}
            </>
          )}
        </button>
      </div>

      {/* Size Controls (only shown when webcam is enabled) */}
      {isEnabled && !error && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Size
            </label>
            <div
              className="grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-label="Webcam size selection"
            >
              {(['small', 'medium', 'large'] as const).map((sizeOption) => (
                <button
                  key={sizeOption}
                  onClick={() => onSizeChange(sizeOption)}
                  data-testid={`size-${sizeOption}-button`}
                  className={`
                    px-4 py-2 rounded-lg font-semibold text-sm
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    transition-colors
                    ${
                      size === sizeOption
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }
                  `}
                  aria-label={`Set webcam size to ${sizeOption}`}
                  aria-pressed={size === sizeOption}
                  role="radio"
                  aria-checked={size === sizeOption}
                >
                  {sizeOption === 'small' && 'S'}
                  {sizeOption === 'medium' && 'M'}
                  {sizeOption === 'large' && 'L'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {size === 'small' && 'Small: 120px'}
              {size === 'medium' && 'Medium: 180px'}
              {size === 'large' && 'Large: 240px'}
            </p>
          </div>

          {/* Mirror Toggle */}
          <div className="mb-4">
            <button
              onClick={onMirrorToggle}
              data-testid="mirror-toggle-button"
              className={`
                w-full px-4 py-2 rounded-lg font-semibold text-sm
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
                transition-colors
                ${
                  isMirrored
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }
              `}
              aria-label={isMirrored ? 'Disable mirror mode' : 'Enable mirror mode'}
              aria-pressed={isMirrored}
            >
              <span className="mr-2">🪞</span>
              {isMirrored ? 'Mirror: On' : 'Mirror: Off'}
            </button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-600 border-t border-gray-200 pt-3">
            <p className="mb-1">
              <strong>Tip:</strong> Drag the webcam to reposition it.
            </p>
            <p>
              Webcam will snap to corners when dragged near the edges.
            </p>
          </div>
        </>
      )}

      {/* Instructions when webcam is disabled */}
      {!isEnabled && !isLoading && !error && (
        <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
          <p className="mb-2">
            Enable webcam overlay to appear in your recording screen (not recorded in video).
          </p>
          <p className="text-xs text-gray-500">
            Your webcam will be visible only to you during recording.
          </p>
        </div>
      )}
    </div>
  );
};
