/**
 * Unit Tests for RecordingControls Component
 * Story 2.4: Recording Controls (Start/Pause/Resume/Stop)
 *
 * Test Coverage:
 * - Component rendering with different recording states
 * - Button visibility based on state (pause/resume/stop)
 * - Callback invocation on button clicks
 * - Duration and file size formatting
 * - Visual indicators (recording pulse, paused state)
 * - Keyboard shortcuts (Space, Escape)
 * - Accessibility attributes (ARIA labels, role)
 * - Optional metadata display (screen type, source name)
 * - Optional change source button
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecordingControls, RecordingControlsProps } from '../RecordingControls';
import type { RecordingState } from '../../hooks/useWebRTCRecorder';

describe('RecordingControls Component', () => {
  // Default props for testing
  const defaultProps: RecordingControlsProps = {
    recordingState: 'recording' as RecordingState,
    duration: 0,
    estimatedSize: 0,
    onPause: vi.fn(),
    onResume: vi.fn(),
    onStop: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render recording controls container', () => {
      render(<RecordingControls {...defaultProps} />);
      const container = screen.getByTestId('recording-controls');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('role', 'region');
      expect(container).toHaveAttribute('aria-label', 'Recording controls');
    });

    it('should render with recording state', () => {
      render(<RecordingControls {...defaultProps} recordingState="recording" />);
      expect(screen.getByText('Recording in Progress')).toBeInTheDocument();
      expect(screen.getByTestId('recording-indicator')).toBeInTheDocument();
    });

    it('should render with paused state', () => {
      render(<RecordingControls {...defaultProps} recordingState="paused" />);
      expect(screen.getByText('Recording Paused')).toBeInTheDocument();
      expect(screen.getByTestId('paused-indicator')).toBeInTheDocument();
    });

    it('should render duration display', () => {
      render(<RecordingControls {...defaultProps} duration={125} />);
      const durationDisplay = screen.getByTestId('duration-display');
      expect(durationDisplay).toHaveTextContent('02:05');
    });

    it('should render file size display', () => {
      render(<RecordingControls {...defaultProps} estimatedSize={1048576} />);
      const fileSizeDisplay = screen.getByTestId('file-size-display');
      expect(fileSizeDisplay).toHaveTextContent('1.00 MB');
    });

    it('should render recording state text', () => {
      render(<RecordingControls {...defaultProps} recordingState="recording" />);
      const stateDisplay = screen.getByTestId('recording-state');
      expect(stateDisplay).toHaveTextContent('recording');
    });
  });

  describe('Button Visibility and State', () => {
    it('should show pause button when recording', () => {
      render(<RecordingControls {...defaultProps} recordingState="recording" />);
      expect(screen.getByTestId('pause-button')).toBeInTheDocument();
      expect(screen.queryByTestId('resume-button')).not.toBeInTheDocument();
    });

    it('should show resume button when paused', () => {
      render(<RecordingControls {...defaultProps} recordingState="paused" />);
      expect(screen.getByTestId('resume-button')).toBeInTheDocument();
      expect(screen.queryByTestId('pause-button')).not.toBeInTheDocument();
    });

    it('should always show stop button', () => {
      const { rerender } = render(<RecordingControls {...defaultProps} recordingState="recording" />);
      expect(screen.getByTestId('stop-button')).toBeInTheDocument();

      rerender(<RecordingControls {...defaultProps} recordingState="paused" />);
      expect(screen.getByTestId('stop-button')).toBeInTheDocument();
    });

    it('should show change source button when onChangeSource is provided', () => {
      const onChangeSource = vi.fn();
      render(<RecordingControls {...defaultProps} onChangeSource={onChangeSource} showChangeSource={true} />);
      expect(screen.getByTestId('change-source-button')).toBeInTheDocument();
    });

    it('should not show change source button when showChangeSource is false', () => {
      const onChangeSource = vi.fn();
      render(<RecordingControls {...defaultProps} onChangeSource={onChangeSource} showChangeSource={false} />);
      expect(screen.queryByTestId('change-source-button')).not.toBeInTheDocument();
    });
  });

  describe('Button Click Handlers', () => {
    it('should call onPause when pause button is clicked', () => {
      const onPause = vi.fn();
      render(<RecordingControls {...defaultProps} recordingState="recording" onPause={onPause} />);
      fireEvent.click(screen.getByTestId('pause-button'));
      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it('should call onResume when resume button is clicked', () => {
      const onResume = vi.fn();
      render(<RecordingControls {...defaultProps} recordingState="paused" onResume={onResume} />);
      fireEvent.click(screen.getByTestId('resume-button'));
      expect(onResume).toHaveBeenCalledTimes(1);
    });

    it('should call onStop when stop button is clicked', () => {
      const onStop = vi.fn();
      render(<RecordingControls {...defaultProps} onStop={onStop} />);
      fireEvent.click(screen.getByTestId('stop-button'));
      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('should call onChangeSource when change source button is clicked', () => {
      const onChangeSource = vi.fn();
      render(<RecordingControls {...defaultProps} onChangeSource={onChangeSource} />);
      fireEvent.click(screen.getByTestId('change-source-button'));
      expect(onChangeSource).toHaveBeenCalledTimes(1);
    });
  });

  describe('Duration Formatting', () => {
    it('should format 0 seconds as 00:00', () => {
      render(<RecordingControls {...defaultProps} duration={0} />);
      expect(screen.getByTestId('duration-display')).toHaveTextContent('00:00');
    });

    it('should format 59 seconds as 00:59', () => {
      render(<RecordingControls {...defaultProps} duration={59} />);
      expect(screen.getByTestId('duration-display')).toHaveTextContent('00:59');
    });

    it('should format 60 seconds as 01:00', () => {
      render(<RecordingControls {...defaultProps} duration={60} />);
      expect(screen.getByTestId('duration-display')).toHaveTextContent('01:00');
    });

    it('should format 3661 seconds as 61:01', () => {
      render(<RecordingControls {...defaultProps} duration={3661} />);
      expect(screen.getByTestId('duration-display')).toHaveTextContent('61:01');
    });
  });

  describe('File Size Formatting', () => {
    it('should format 0 bytes as 0 B', () => {
      render(<RecordingControls {...defaultProps} estimatedSize={0} />);
      expect(screen.getByTestId('file-size-display')).toHaveTextContent('0 B');
    });

    it('should format bytes (< 1 KB)', () => {
      render(<RecordingControls {...defaultProps} estimatedSize={512} />);
      expect(screen.getByTestId('file-size-display')).toHaveTextContent('512.00 B');
    });

    it('should format kilobytes', () => {
      render(<RecordingControls {...defaultProps} estimatedSize={1024} />);
      expect(screen.getByTestId('file-size-display')).toHaveTextContent('1.00 KB');
    });

    it('should format megabytes', () => {
      render(<RecordingControls {...defaultProps} estimatedSize={1048576} />);
      expect(screen.getByTestId('file-size-display')).toHaveTextContent('1.00 MB');
    });

    it('should format gigabytes', () => {
      render(<RecordingControls {...defaultProps} estimatedSize={1073741824} />);
      expect(screen.getByTestId('file-size-display')).toHaveTextContent('1.00 GB');
    });
  });

  describe('Metadata Display', () => {
    it('should show screen type when provided and showMetadata is true', () => {
      render(
        <RecordingControls
          {...defaultProps}
          screenType="window"
          showMetadata={true}
        />
      );
      expect(screen.getByTestId('screen-type')).toHaveTextContent('Screen Type: window');
    });

    it('should show source name when provided and showMetadata is true', () => {
      render(
        <RecordingControls
          {...defaultProps}
          sourceName="Google Chrome - Revui Recording"
          showMetadata={true}
        />
      );
      expect(screen.getByTestId('source-name')).toHaveTextContent('Source: Google Chrome - Revui Recording');
    });

    it('should not show metadata when showMetadata is false', () => {
      render(
        <RecordingControls
          {...defaultProps}
          screenType="window"
          sourceName="Test Source"
          showMetadata={false}
        />
      );
      expect(screen.queryByTestId('screen-type')).not.toBeInTheDocument();
      expect(screen.queryByTestId('source-name')).not.toBeInTheDocument();
    });
  });

  describe('Visual Indicators', () => {
    it('should show pulsing red indicator when recording', () => {
      render(<RecordingControls {...defaultProps} recordingState="recording" />);
      const indicator = screen.getByTestId('recording-indicator');
      expect(indicator).toHaveClass('bg-red-600');
      expect(indicator).toHaveClass('animate-pulse');
    });

    it('should show yellow indicator when paused (no pulse)', () => {
      render(<RecordingControls {...defaultProps} recordingState="paused" />);
      const indicator = screen.getByTestId('paused-indicator');
      expect(indicator).toHaveClass('bg-yellow-600');
      expect(indicator).not.toHaveClass('animate-pulse');
    });

    it('should show red text for recording state', () => {
      render(<RecordingControls {...defaultProps} recordingState="recording" />);
      const heading = screen.getByText('Recording in Progress');
      expect(heading).toHaveClass('text-red-600');
    });

    it('should show yellow text for paused state', () => {
      render(<RecordingControls {...defaultProps} recordingState="paused" />);
      const heading = screen.getByText('Recording Paused');
      expect(heading).toHaveClass('text-yellow-600');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should call onPause when Space is pressed while recording', async () => {
      const onPause = vi.fn();
      render(<RecordingControls {...defaultProps} recordingState="recording" onPause={onPause} />);

      fireEvent.keyDown(window, { code: 'Space' });
      await waitFor(() => expect(onPause).toHaveBeenCalledTimes(1));
    });

    it('should call onResume when Space is pressed while paused', async () => {
      const onResume = vi.fn();
      render(<RecordingControls {...defaultProps} recordingState="paused" onResume={onResume} />);

      fireEvent.keyDown(window, { code: 'Space' });
      await waitFor(() => expect(onResume).toHaveBeenCalledTimes(1));
    });

    it('should call onStop when Escape is pressed', async () => {
      const onStop = vi.fn();
      render(<RecordingControls {...defaultProps} onStop={onStop} />);

      fireEvent.keyDown(window, { code: 'Escape' });
      await waitFor(() => expect(onStop).toHaveBeenCalledTimes(1));
    });

    it('should not trigger shortcuts when typing in input field', async () => {
      const onPause = vi.fn();
      const { container } = render(
        <div>
          <input type="text" data-testid="test-input" />
          <RecordingControls {...defaultProps} recordingState="recording" onPause={onPause} />
        </div>
      );

      const input = screen.getByTestId('test-input');
      input.focus();
      fireEvent.keyDown(input, { code: 'Space' });

      await waitFor(() => expect(onPause).not.toHaveBeenCalled());
    });

    it('should not trigger shortcuts when typing in textarea', async () => {
      const onStop = vi.fn();
      const { container } = render(
        <div>
          <textarea data-testid="test-textarea" />
          <RecordingControls {...defaultProps} onStop={onStop} />
        </div>
      );

      const textarea = screen.getByTestId('test-textarea');
      textarea.focus();
      fireEvent.keyDown(textarea, { code: 'Escape' });

      await waitFor(() => expect(onStop).not.toHaveBeenCalled());
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for buttons', () => {
      render(<RecordingControls {...defaultProps} recordingState="recording" />);
      expect(screen.getByLabelText(/Pause recording/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Stop recording/i)).toBeInTheDocument();
    });

    it('should have aria-live regions for dynamic content', () => {
      render(<RecordingControls {...defaultProps} duration={60} estimatedSize={1024} />);
      expect(screen.getByTestId('duration-display')).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByTestId('file-size-display')).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByTestId('recording-state')).toHaveAttribute('aria-live', 'polite');
    });

    it('should have descriptive aria-label for indicators', () => {
      render(<RecordingControls {...defaultProps} recordingState="recording" />);
      const indicator = screen.getByTestId('recording-indicator');
      expect(indicator).toHaveAttribute('aria-label', 'Recording active');
    });

    it('should have focus indicators on buttons', () => {
      render(<RecordingControls {...defaultProps} recordingState="recording" />);
      const pauseButton = screen.getByTestId('pause-button');
      expect(pauseButton).toHaveClass('focus:ring-2');
    });
  });

  describe('Real-time Updates', () => {
    it('should update duration display when duration prop changes', () => {
      const { rerender } = render(<RecordingControls {...defaultProps} duration={0} />);
      expect(screen.getByTestId('duration-display')).toHaveTextContent('00:00');

      rerender(<RecordingControls {...defaultProps} duration={65} />);
      expect(screen.getByTestId('duration-display')).toHaveTextContent('01:05');
    });

    it('should update file size display when estimatedSize prop changes', () => {
      const { rerender } = render(<RecordingControls {...defaultProps} estimatedSize={0} />);
      expect(screen.getByTestId('file-size-display')).toHaveTextContent('0 B');

      rerender(<RecordingControls {...defaultProps} estimatedSize={2097152} />);
      expect(screen.getByTestId('file-size-display')).toHaveTextContent('2.00 MB');
    });

    it('should update buttons when recording state changes', () => {
      const { rerender } = render(<RecordingControls {...defaultProps} recordingState="recording" />);
      expect(screen.getByTestId('pause-button')).toBeInTheDocument();

      rerender(<RecordingControls {...defaultProps} recordingState="paused" />);
      expect(screen.getByTestId('resume-button')).toBeInTheDocument();
      expect(screen.queryByTestId('pause-button')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional props gracefully', () => {
      render(
        <RecordingControls
          recordingState="recording"
          duration={0}
          estimatedSize={0}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onStop={vi.fn()}
        />
      );
      expect(screen.getByTestId('recording-controls')).toBeInTheDocument();
    });

    it('should handle very large duration values', () => {
      render(<RecordingControls {...defaultProps} duration={36000} />);
      expect(screen.getByTestId('duration-display')).toHaveTextContent('600:00');
    });

    it('should handle very large file size values', () => {
      render(<RecordingControls {...defaultProps} estimatedSize={10737418240} />);
      const display = screen.getByTestId('file-size-display');
      expect(display.textContent).toContain('GB');
    });
  });
});
