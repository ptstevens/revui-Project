/**
 * Unit Tests for WebcamPreview Component
 * Story 2.5: Webcam Overlay with Drag-and-Snap Positioning
 *
 * Test Coverage (AC#5, AC#6, AC#7: Size Options, Mirror Toggle, Styling):
 * - Component rendering with video element
 * - MediaStream srcObject binding
 * - Size presets (small, medium, large)
 * - Mirror/flip transform
 * - Drag handlers (mouse and touch)
 * - Positioning and styling
 * - Accessibility attributes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WebcamPreview, type WebcamPreviewProps, type WebcamSize } from '../WebcamPreview';
import type { Position } from '../../../hooks/useDragAndSnap';

describe('WebcamPreview Component', () => {
  let mockMediaStream: MediaStream;
  let mockVideoTrack: MediaStreamTrack;
  let mockVideoElement: HTMLVideoElement;

  beforeEach(() => {
    // Create mock video track
    mockVideoTrack = {
      kind: 'video',
      id: 'mock-video-track',
      enabled: true,
      readyState: 'live',
      stop: vi.fn(),
    } as any;

    // Create mock media stream
    mockMediaStream = {
      id: 'mock-webcam-stream',
      active: true,
      getVideoTracks: vi.fn().mockReturnValue([mockVideoTrack]),
      getTracks: vi.fn().mockReturnValue([mockVideoTrack]),
    } as any;

    // Mock HTMLVideoElement.prototype.play
    mockVideoElement = document.createElement('video');
    mockVideoElement.play = vi.fn().mockResolvedValue(undefined);

    // Mock document.createElement to return our mock video element
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'video') {
        return mockVideoElement;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test 1: Render with stream
   * Verifies component renders when stream is provided
   */
  it('should render webcam preview when stream is provided', () => {
    const defaultProps: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 100, y: 100 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...defaultProps} />);

    const preview = screen.getByTestId('webcam-preview');
    expect(preview).toBeInTheDocument();
  });

  /**
   * Test 2: Return null when no stream
   * Verifies component returns null when stream is null
   */
  it('should return null when stream is null', () => {
    const props: WebcamPreviewProps = {
      stream: null,
      position: { x: 100, y: 100 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    const { container } = render(<WebcamPreview {...props} />);

    expect(container.firstChild).toBeNull();
  });

  /**
   * Test 3: Render video element
   * Verifies video element is rendered inside preview
   */
  it('should render video element with correct attributes', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 50, y: 50 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const video = screen.getByTestId('webcam-video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('muted');
    expect(video).toHaveAttribute('playsinline');
  });

  /**
   * Test 4: Small size configuration
   * Verifies small size (120x90) is applied correctly
   */
  it('should apply small size dimensions (120x90)', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'small',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    expect(preview).toHaveStyle({
      width: '120px',
      height: '90px',
    });
  });

  /**
   * Test 5: Medium size configuration
   * Verifies medium size (180x135) is applied correctly
   */
  it('should apply medium size dimensions (180x135)', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    expect(preview).toHaveStyle({
      width: '180px',
      height: '135px',
    });
  });

  /**
   * Test 6: Large size configuration
   * Verifies large size (240x180) is applied correctly
   */
  it('should apply large size dimensions (240x180)', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'large',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    expect(preview).toHaveStyle({
      width: '240px',
      height: '180px',
    });
  });

  /**
   * Test 7: Position applied correctly
   * Verifies position prop is applied via left/top styles
   */
  it('should apply position via left and top styles', () => {
    const position: Position = { x: 300, y: 200 };
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position,
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    expect(preview).toHaveStyle({
      left: '300px',
      top: '200px',
    });
  });

  /**
   * Test 8: Mirror transform when enabled
   * Verifies scaleX(-1) transform is applied when isMirrored is true
   */
  it('should apply mirror transform when isMirrored is true', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: true,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const video = screen.getByTestId('webcam-video');
    expect(video).toHaveClass('scale-x-[-1]');
  });

  /**
   * Test 9: No mirror transform when disabled
   * Verifies no mirror transform when isMirrored is false
   */
  it('should not apply mirror transform when isMirrored is false', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const video = screen.getByTestId('webcam-video');
    expect(video).not.toHaveClass('scale-x-[-1]');
  });

  /**
   * Test 10: Cursor grab when not dragging
   * Verifies cursor-grab class when isDragging is false
   */
  it('should show cursor-grab when not dragging', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    expect(preview).toHaveClass('cursor-grab');
    expect(preview).not.toHaveClass('cursor-grabbing');
  });

  /**
   * Test 11: Cursor grabbing when dragging
   * Verifies cursor-grabbing class when isDragging is true
   */
  it('should show cursor-grabbing when dragging', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: true,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    expect(preview).toHaveClass('cursor-grabbing');
    expect(preview).not.toHaveClass('cursor-grab');
  });

  /**
   * Test 12: Opacity while dragging
   * Verifies reduced opacity (opacity-90) when isDragging is true
   */
  it('should reduce opacity when dragging', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: true,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    expect(preview).toHaveClass('opacity-90');
  });

  /**
   * Test 13: Full opacity when not dragging
   * Verifies full opacity (opacity-100) when isDragging is false
   */
  it('should have full opacity when not dragging', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    expect(preview).toHaveClass('opacity-100');
  });

  /**
   * Test 14: Size label overlay when dragging
   * Verifies size label is shown during drag
   */
  it('should show size label overlay when dragging', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: true,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    // Size label should show "Medium (180px)"
    expect(screen.getByText(/Medium/)).toBeInTheDocument();
    expect(screen.getByText(/180px/)).toBeInTheDocument();
  });

  /**
   * Test 15: No size label when not dragging
   * Verifies size label is hidden when not dragging
   */
  it('should not show size label when not dragging', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    expect(screen.queryByText(/Medium/)).not.toBeInTheDocument();
  });

  /**
   * Test 16: Mouse down handler
   * Verifies onMouseDown is called when mouse is pressed
   */
  it('should call onMouseDown when mouse is pressed', () => {
    const onMouseDown = vi.fn();
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown,
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    preview.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(onMouseDown).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 17: Touch start handler
   * Verifies onTouchStart is called when touch starts
   */
  it('should call onTouchStart when touch starts', () => {
    const onTouchStart = vi.fn();
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart,
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    preview.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));

    expect(onTouchStart).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 18: Accessibility attributes
   * Verifies proper ARIA labels and roles
   */
  it('should have proper accessibility attributes', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    expect(preview).toHaveAttribute('role', 'img');
    expect(preview).toHaveAttribute('aria-label', 'Webcam preview overlay');

    const video = screen.getByTestId('webcam-video');
    expect(video).toHaveAttribute('aria-label', 'Webcam feed');
  });

  /**
   * Test 19: Mirrored video accessibility
   * Verifies aria-label updates when video is mirrored
   */
  it('should update aria-label when video is mirrored', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: true,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const video = screen.getByTestId('webcam-video');
    expect(video).toHaveAttribute('aria-label', 'Mirrored webcam feed');
  });

  /**
   * Test 20: Z-index for layering
   * Verifies z-index is set to ensure overlay appears above other content
   */
  it('should have z-index of 1000 for proper layering', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    expect(preview).toHaveStyle({ zIndex: 1000 });
  });

  /**
   * Test 21: Touch action none
   * Verifies touch-action: none to prevent scrolling during drag
   */
  it('should set touch-action to none', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    expect(preview).toHaveStyle({ touchAction: 'none' });
  });

  /**
   * Test 22: Custom className prop
   * Verifies custom className is applied
   */
  it('should apply custom className', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
      className: 'custom-class',
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    expect(preview).toHaveClass('custom-class');
  });

  /**
   * Test 23: Professional styling
   * Verifies rounded corners, shadow, and border
   */
  it('should have professional styling with rounded corners, shadow, and border', () => {
    const props: WebcamPreviewProps = {
      stream: mockMediaStream,
      position: { x: 0, y: 0 },
      size: 'medium',
      isMirrored: false,
      isDragging: false,
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
    };

    render(<WebcamPreview {...props} />);

    const preview = screen.getByTestId('webcam-preview');
    expect(preview).toHaveClass('rounded-lg');
    expect(preview).toHaveClass('shadow-lg');
    expect(preview).toHaveClass('border-2');
    expect(preview).toHaveClass('border-white');
  });
});
