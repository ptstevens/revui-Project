import React, { useRef, useEffect } from 'react';
import type { Position } from '../../hooks/useDragAndSnap';

/**
 * Webcam size presets
 */
export type WebcamSize = 'small' | 'medium' | 'large';

/**
 * Props for WebcamPreview component
 */
export interface WebcamPreviewProps {
  /** MediaStream from webcam capture */
  stream: MediaStream | null;
  /** Current position from drag-and-snap hook */
  position: Position;
  /** Size preset (small: 120px, medium: 180px, large: 240px) */
  size: WebcamSize;
  /** Whether to mirror (flip horizontally) the video */
  isMirrored: boolean;
  /** Whether user is currently dragging */
  isDragging: boolean;
  /** Mouse down handler to initiate drag */
  onMouseDown: (e: React.MouseEvent) => void;
  /** Touch start handler to initiate drag */
  onTouchStart: (e: React.TouchEvent) => void;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Size configurations for webcam preview
 * - Small: 120px width (4:3 aspect ratio = 120x90)
 * - Medium: 180px width (4:3 aspect ratio = 180x135)
 * - Large: 240px width (4:3 aspect ratio = 240x180)
 */
const SIZE_CONFIG: Record<WebcamSize, { width: number; height: number }> = {
  small: { width: 120, height: 90 },
  medium: { width: 180, height: 135 },
  large: { width: 240, height: 180 },
};

/**
 * WebcamPreview Component
 *
 * Implements Story 2.5 acceptance criteria:
 * - AC#1: Webcam Capture and Display
 *   - Displays webcam MediaStream in HTML video element
 *   - Auto-plays and mutes video (no audio feedback needed)
 *
 * - AC#5: Webcam Size Options
 *   - Three size presets: Small (120px), Medium (180px), Large (240px)
 *   - Maintains 4:3 aspect ratio
 *
 * - AC#6: Mirror/Flip Toggle
 *   - Applies CSS transform: scaleX(-1) when mirrored
 *   - Creates natural "selfie view" effect
 *
 * - AC#7: Professional Styling
 *   - Rounded corners (border-radius)
 *   - Drop shadow for depth
 *   - Border for definition
 *
 * Features:
 * - Draggable via onMouseDown and onTouchStart handlers
 * - Smooth transitions for size and position changes
 * - Cursor changes on hover to indicate draggability
 * - Accessibility attributes (role, aria-label)
 *
 * @param props - Webcam preview configuration
 */
export const WebcamPreview: React.FC<WebcamPreviewProps> = ({
  stream,
  position,
  size,
  isMirrored,
  isDragging,
  onMouseDown,
  onTouchStart,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  /**
   * Attach MediaStream to video element when stream changes
   */
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((error) => {
        console.error('Failed to play webcam video:', error);
      });
    }

    // Cleanup: remove srcObject on unmount or stream change
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  // If no stream, don't render
  if (!stream) {
    return null;
  }

  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className={`
        absolute
        rounded-lg
        shadow-lg
        border-2
        border-white
        overflow-hidden
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        ${isDragging ? 'opacity-90' : 'opacity-100'}
        transition-opacity
        ${className}
      `}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${sizeConfig.width}px`,
        height: `${sizeConfig.height}px`,
        zIndex: 1000,
        touchAction: 'none', // Prevent browser touch gestures
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      data-testid="webcam-preview"
      role="img"
      aria-label="Webcam preview overlay"
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`
          w-full
          h-full
          object-cover
          ${isMirrored ? 'scale-x-[-1]' : ''}
          transition-transform
          duration-200
        `}
        data-testid="webcam-video"
        aria-label={isMirrored ? 'Mirrored webcam feed' : 'Webcam feed'}
      />

      {/* Size indicator (visible during drag) */}
      {isDragging && (
        <div
          className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 text-center"
          data-testid="size-indicator"
        >
          {size.charAt(0).toUpperCase() + size.slice(1)} ({sizeConfig.width}px)
        </div>
      )}
    </div>
  );
};
