import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWebcamCapture } from '../hooks/useWebcamCapture';
import { useDragAndSnap } from '../hooks/useDragAndSnap';
import { WebcamPreview, type WebcamSize } from './webcam/WebcamPreview';
import { WebcamControls } from './webcam/WebcamControls';

/**
 * Props for WebcamOverlay component
 */
export interface WebcamOverlayProps {
  /** Whether recording is currently in progress */
  isRecording: boolean;
  /** Callback when webcam is toggled on/off (optional for analytics) */
  onWebcamToggle?: (enabled: boolean) => void;
  /** Optional className for controls container */
  className?: string;
}

/**
 * localStorage keys for persisting user preferences
 */
const STORAGE_KEYS = {
  ENABLED: 'webcam-enabled',
  SIZE: 'webcam-size',
  MIRROR: 'webcam-mirror',
  POSITION: 'webcam-position',
} as const;

/**
 * WebcamOverlay Component
 *
 * Implements Story 2.5: Webcam Overlay with Drag-and-Snap Positioning
 *
 * Complete Acceptance Criteria:
 * - ✅ AC#1: Webcam Capture and Display
 *   - Captures webcam using getUserMedia API
 *   - Displays as HTML overlay during recording
 *   - Not mixed into MediaRecorder stream
 *
 * - ✅ AC#2: Toggle Webcam On/Off
 *   - Enable/disable button in controls
 *   - Preference persisted to localStorage
 *
 * - ✅ AC#3: Drag-and-Drop Positioning
 *   - Smooth mouse and touch drag support
 *   - Stays within window boundaries
 *   - Position persisted to localStorage
 *
 * - ✅ AC#4: Snap-to-Corner Grid
 *   - Four corner positions (TL, TR, BL, BR)
 *   - 50px snap threshold
 *   - Smooth snap animation (200ms)
 *   - Default: bottom-right corner
 *
 * - ✅ AC#5: Webcam Size Options
 *   - Three presets: Small (120px), Medium (180px), Large (240px)
 *   - Size persisted to localStorage
 *   - Default: Medium
 *
 * - ✅ AC#6: Mirror/Flip Toggle
 *   - Horizontal flip via CSS transform
 *   - Preference persisted to localStorage
 *   - Default: Enabled (natural selfie view)
 *
 * - ✅ AC#7: Professional Styling
 *   - Rounded corners
 *   - Drop shadow
 *   - White border
 *   - Smooth transitions
 *
 * - ✅ AC#8: Full Accessibility
 *   - ARIA labels on all interactive elements
 *   - Keyboard navigation support
 *   - Screen reader announcements
 *   - Focus indicators
 *
 * Architecture:
 * - useWebcamCapture: Manages getUserMedia and stream lifecycle
 * - useDragAndSnap: Handles drag-drop and snap-to-corner logic
 * - WebcamPreview: Renders video element with styling
 * - WebcamControls: Control panel UI for settings
 *
 * @param props - Webcam overlay configuration
 */
export const WebcamOverlay: React.FC<WebcamOverlayProps> = ({
  isRecording,
  onWebcamToggle,
  className = '',
}) => {
  // Container ref for drag-and-snap boundaries
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved preferences from localStorage
  const getSavedPreference = useCallback(<T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved) as T;
      } catch (e) {
        console.warn(`Failed to parse localStorage key "${key}":`, e);
      }
    }
    return defaultValue;
  }, []);

  // Webcam state
  const [isEnabled, setIsEnabled] = useState<boolean>(() => getSavedPreference(STORAGE_KEYS.ENABLED, false));
  const [size, setSize] = useState<WebcamSize>(() => getSavedPreference<WebcamSize>(STORAGE_KEYS.SIZE, 'medium'));
  const [isMirrored, setIsMirrored] = useState<boolean>(() => getSavedPreference(STORAGE_KEYS.MIRROR, true));

  // Webcam capture hook
  const { webcamStream, isLoading, error, startWebcam, stopWebcam, isWebcamAvailable } = useWebcamCapture();

  // Size configurations for drag-and-snap calculations
  const SIZE_CONFIG = {
    small: { width: 120, height: 90 },
    medium: { width: 180, height: 135 },
    large: { width: 240, height: 180 },
  };

  // Drag-and-snap hook
  const { position, isDragging, snapZone, handleMouseDown, handleTouchStart } = useDragAndSnap({
    containerRef,
    snapThreshold: 50,
    snapAnimationDuration: 200,
    storageKey: STORAGE_KEYS.POSITION,
    elementSize: SIZE_CONFIG[size],
  });

  /**
   * Handle webcam toggle
   */
  const handleToggle = useCallback(async () => {
    if (isEnabled) {
      // Disable webcam
      stopWebcam();
      setIsEnabled(false);
      localStorage.setItem(STORAGE_KEYS.ENABLED, JSON.stringify(false));
      onWebcamToggle?.(false);
    } else {
      // Enable webcam
      try {
        await startWebcam();
        setIsEnabled(true);
        localStorage.setItem(STORAGE_KEYS.ENABLED, JSON.stringify(true));
        onWebcamToggle?.(true);
      } catch (err) {
        console.error('Failed to start webcam:', err);
        // Error already handled by useWebcamCapture hook
      }
    }
  }, [isEnabled, startWebcam, stopWebcam, onWebcamToggle]);

  /**
   * Handle size change
   */
  const handleSizeChange = useCallback((newSize: WebcamSize) => {
    setSize(newSize);
    localStorage.setItem(STORAGE_KEYS.SIZE, JSON.stringify(newSize));
  }, []);

  /**
   * Handle mirror toggle
   */
  const handleMirrorToggle = useCallback(() => {
    setIsMirrored((prev) => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEYS.MIRROR, JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  /**
   * Auto-stop webcam when recording ends
   */
  useEffect(() => {
    if (!isRecording && isEnabled) {
      stopWebcam();
      setIsEnabled(false);
      localStorage.setItem(STORAGE_KEYS.ENABLED, JSON.stringify(false));
    }
  }, [isRecording, isEnabled, stopWebcam]);

  /**
   * Cleanup: Stop webcam on unmount
   */
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  // Don't show overlay if not recording
  if (!isRecording) {
    return null;
  }

  return (
    <div ref={containerRef} data-testid="webcam-overlay-container">
      {/* Webcam Preview (only shown when enabled and stream is available) */}
      {isEnabled && webcamStream && !error && (
        <WebcamPreview
          stream={webcamStream}
          position={position}
          size={size}
          isMirrored={isMirrored}
          isDragging={isDragging}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />
      )}

      {/* Snap Zone Indicator (visual feedback during drag) */}
      {isDragging && snapZone && (
        <div
          className="fixed pointer-events-none z-[999]"
          data-testid="snap-zone-indicator"
          style={{
            top: snapZone === 'tl' || snapZone === 'tr' ? '20px' : 'auto',
            bottom: snapZone === 'bl' || snapZone === 'br' ? '20px' : 'auto',
            left: snapZone === 'tl' || snapZone === 'bl' ? '20px' : 'auto',
            right: snapZone === 'tr' || snapZone === 'br' ? '20px' : 'auto',
            width: `${SIZE_CONFIG[size].width}px`,
            height: `${SIZE_CONFIG[size].height}px`,
            border: '2px dashed #3b82f6',
            borderRadius: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          }}
          aria-hidden="true"
        />
      )}

      {/* Webcam Controls Panel */}
      <div className={`fixed bottom-4 left-4 z-[1001] ${className}`}>
        <WebcamControls
          isEnabled={isEnabled}
          size={size}
          isMirrored={isMirrored}
          isLoading={isLoading}
          error={error}
          onToggle={handleToggle}
          onSizeChange={handleSizeChange}
          onMirrorToggle={handleMirrorToggle}
        />
      </div>

      {/* Browser Compatibility Warning */}
      {!isWebcamAvailable && (
        <div
          className="fixed bottom-4 left-4 z-[1001] bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded shadow-lg max-w-md"
          role="alert"
          data-testid="browser-compatibility-warning"
        >
          <strong>Webcam Not Supported:</strong> Your browser does not support webcam access. Please use a modern browser like Chrome, Firefox, or Edge.
        </div>
      )}
    </div>
  );
};
