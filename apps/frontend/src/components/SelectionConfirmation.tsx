import { useEffect, useState } from 'react';

export interface SelectionConfirmationProps {
  screenType: 'screen' | 'window' | 'tab';
  sourceName: string;
  autoHideAfterMs?: number;
  onDismiss?: () => void;
}

/**
 * Selection Confirmation Banner Component
 *
 * Implements Story 2.2 acceptance criteria:
 * - AC#3: Selection Confirmation banner displaying selected source name
 *
 * Displays a confirmation banner at the top of the recording interface
 * showing which screen/window/tab is being recorded.
 *
 * @param screenType - Type of screen source (screen, window, or tab)
 * @param sourceName - Name of the selected source from video track label
 * @param autoHideAfterMs - Optional auto-hide delay in milliseconds (default: 5000ms)
 * @param onDismiss - Optional callback when banner is dismissed
 */
export function SelectionConfirmation({
  screenType,
  sourceName,
  autoHideAfterMs = 5000,
  onDismiss,
}: SelectionConfirmationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (autoHideAfterMs > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideAfterMs);

      return () => clearTimeout(timer);
    }
  }, [autoHideAfterMs]);

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    }, 300); // Match animation duration
  };

  if (!isVisible) {
    return null;
  }

  // Get icon based on screen type
  const getScreenTypeIcon = () => {
    switch (screenType) {
      case 'screen':
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        );
      case 'window':
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        );
      case 'tab':
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
        );
    }
  };

  const getScreenTypeLabel = () => {
    switch (screenType) {
      case 'screen':
        return 'screen';
      case 'window':
        return 'window';
      case 'tab':
        return 'tab';
    }
  };

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300 ease-in-out
        ${isAnimatingOut ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}
      `}
    >
      <div className="bg-green-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Success Checkmark */}
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              {/* Screen Type Icon */}
              <div className="flex-shrink-0">{getScreenTypeIcon()}</div>

              {/* Message */}
              <div>
                <p className="text-sm font-semibold">
                  Recording started successfully
                </p>
                <p className="text-xs opacity-90">
                  {getScreenTypeLabel()}: {sourceName}
                </p>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 ml-4 p-1 rounded hover:bg-green-700 transition-colors"
              aria-label="Dismiss confirmation"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
