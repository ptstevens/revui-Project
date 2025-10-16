/**
 * Unit Tests for WebcamControls Component
 * Story 2.5: Webcam Overlay with Drag-and-Snap Positioning
 *
 * Test Coverage (AC#2, AC#8: Toggle Controls, Accessibility):
 * - Enable/disable toggle button
 * - Size selection (Small/Medium/Large)
 * - Mirror toggle button
 * - Error display
 * - Loading states
 * - Button callbacks
 * - Accessibility attributes (ARIA, roles, keyboard)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WebcamControls, type WebcamControlsProps, type WebcamSize } from '../WebcamControls';

describe('WebcamControls Component', () => {
  let defaultProps: WebcamControlsProps;

  beforeEach(() => {
    defaultProps = {
      isEnabled: false,
      size: 'medium' as WebcamSize,
      isMirrored: true,
      isLoading: false,
      error: null,
      onToggle: vi.fn(),
      onSizeChange: vi.fn(),
      onMirrorToggle: vi.fn(),
    };

    vi.clearAllMocks();
  });

  /**
   * Test 1: Component rendering
   * Verifies controls container renders with correct role and label
   */
  it('should render webcam controls container', () => {
    render(<WebcamControls {...defaultProps} />);

    const controls = screen.getByTestId('webcam-controls');
    expect(controls).toBeInTheDocument();
    expect(controls).toHaveAttribute('role', 'region');
    expect(controls).toHaveAttribute('aria-label', 'Webcam overlay controls');
  });

  /**
   * Test 2: Heading display
   * Verifies heading with emoji icon is present
   */
  it('should display heading with webcam icon', () => {
    render(<WebcamControls {...defaultProps} />);

    expect(screen.getByText(/Webcam Overlay/)).toBeInTheDocument();
  });

  /**
   * Test 3: Enable button when disabled
   * Verifies button shows "Enable Webcam" when isEnabled is false
   */
  it('should show enable button when webcam is disabled', () => {
    render(<WebcamControls {...defaultProps} isEnabled={false} />);

    const toggleButton = screen.getByTestId('webcam-toggle-button');
    expect(toggleButton).toHaveTextContent('Enable Webcam');
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
  });

  /**
   * Test 4: Disable button when enabled
   * Verifies button shows "Webcam Enabled" when isEnabled is true
   */
  it('should show disable button when webcam is enabled', () => {
    render(<WebcamControls {...defaultProps} isEnabled={true} />);

    const toggleButton = screen.getByTestId('webcam-toggle-button');
    expect(toggleButton).toHaveTextContent('Webcam Enabled');
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
  });

  /**
   * Test 5: Loading state
   * Verifies loading indicator when isLoading is true
   */
  it('should show loading indicator when loading', () => {
    render(<WebcamControls {...defaultProps} isLoading={true} />);

    const toggleButton = screen.getByTestId('webcam-toggle-button');
    expect(toggleButton).toHaveTextContent('Loading Webcam...');
    expect(toggleButton).toBeDisabled();
  });

  /**
   * Test 6: Error display
   * Verifies error message is shown when error exists
   */
  it('should display error message when error exists', () => {
    const error = new Error('Camera access denied');
    render(<WebcamControls {...defaultProps} error={error} />);

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent('Camera access denied');
  });

  /**
   * Test 7: No error display
   * Verifies no error message when error is null
   */
  it('should not display error message when error is null', () => {
    render(<WebcamControls {...defaultProps} error={null} />);

    const errorAlert = screen.queryByRole('alert');
    expect(errorAlert).not.toBeInTheDocument();
  });

  /**
   * Test 8: Size controls visibility when enabled
   * Verifies size selection buttons appear when webcam is enabled
   */
  it('should show size controls when webcam is enabled', () => {
    render(<WebcamControls {...defaultProps} isEnabled={true} error={null} />);

    expect(screen.getByTestId('size-small-button')).toBeInTheDocument();
    expect(screen.getByTestId('size-medium-button')).toBeInTheDocument();
    expect(screen.getByTestId('size-large-button')).toBeInTheDocument();
  });

  /**
   * Test 9: Size controls hidden when disabled
   * Verifies size controls are hidden when webcam is disabled
   */
  it('should hide size controls when webcam is disabled', () => {
    render(<WebcamControls {...defaultProps} isEnabled={false} />);

    expect(screen.queryByTestId('size-small-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('size-medium-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('size-large-button')).not.toBeInTheDocument();
  });

  /**
   * Test 10: Size controls hidden when error
   * Verifies size controls are hidden when there's an error
   */
  it('should hide size controls when there is an error', () => {
    const error = new Error('Test error');
    render(<WebcamControls {...defaultProps} isEnabled={true} error={error} />);

    expect(screen.queryByTestId('size-small-button')).not.toBeInTheDocument();
  });

  /**
   * Test 11: Small size selected
   * Verifies small button has selected styling when size is small
   */
  it('should highlight small button when size is small', () => {
    render(<WebcamControls {...defaultProps} isEnabled={true} size="small" />);

    const smallButton = screen.getByTestId('size-small-button');
    expect(smallButton).toHaveClass('bg-blue-600');
    expect(smallButton).toHaveAttribute('aria-checked', 'true');

    const mediumButton = screen.getByTestId('size-medium-button');
    expect(mediumButton).toHaveClass('bg-gray-200');
    expect(mediumButton).toHaveAttribute('aria-checked', 'false');
  });

  /**
   * Test 12: Medium size selected
   * Verifies medium button has selected styling when size is medium
   */
  it('should highlight medium button when size is medium', () => {
    render(<WebcamControls {...defaultProps} isEnabled={true} size="medium" />);

    const mediumButton = screen.getByTestId('size-medium-button');
    expect(mediumButton).toHaveClass('bg-blue-600');
    expect(mediumButton).toHaveAttribute('aria-checked', 'true');
  });

  /**
   * Test 13: Large size selected
   * Verifies large button has selected styling when size is large
   */
  it('should highlight large button when size is large', () => {
    render(<WebcamControls {...defaultProps} isEnabled={true} size="large" />);

    const largeButton = screen.getByTestId('size-large-button');
    expect(largeButton).toHaveClass('bg-blue-600');
    expect(largeButton).toHaveAttribute('aria-checked', 'true');
  });

  /**
   * Test 14: Mirror toggle visibility
   * Verifies mirror toggle appears when webcam is enabled
   */
  it('should show mirror toggle when webcam is enabled', () => {
    render(<WebcamControls {...defaultProps} isEnabled={true} error={null} />);

    const mirrorButton = screen.getByTestId('mirror-toggle-button');
    expect(mirrorButton).toBeInTheDocument();
  });

  /**
   * Test 15: Mirror toggle hidden when disabled
   * Verifies mirror toggle is hidden when webcam is disabled
   */
  it('should hide mirror toggle when webcam is disabled', () => {
    render(<WebcamControls {...defaultProps} isEnabled={false} />);

    expect(screen.queryByTestId('mirror-toggle-button')).not.toBeInTheDocument();
  });

  /**
   * Test 16: Mirror on state
   * Verifies mirror button shows "Mirror: On" when isMirrored is true
   */
  it('should show "Mirror: On" when mirrored', () => {
    render(<WebcamControls {...defaultProps} isEnabled={true} isMirrored={true} />);

    const mirrorButton = screen.getByTestId('mirror-toggle-button');
    expect(mirrorButton).toHaveTextContent('Mirror: On');
    expect(mirrorButton).toHaveClass('bg-purple-600');
    expect(mirrorButton).toHaveAttribute('aria-pressed', 'true');
  });

  /**
   * Test 17: Mirror off state
   * Verifies mirror button shows "Mirror: Off" when isMirrored is false
   */
  it('should show "Mirror: Off" when not mirrored', () => {
    render(<WebcamControls {...defaultProps} isEnabled={true} isMirrored={false} />);

    const mirrorButton = screen.getByTestId('mirror-toggle-button');
    expect(mirrorButton).toHaveTextContent('Mirror: Off');
    expect(mirrorButton).toHaveClass('bg-gray-200');
    expect(mirrorButton).toHaveAttribute('aria-pressed', 'false');
  });

  /**
   * Test 18: Toggle callback
   * Verifies onToggle is called when toggle button is clicked
   */
  it('should call onToggle when toggle button is clicked', () => {
    const onToggle = vi.fn();
    render(<WebcamControls {...defaultProps} onToggle={onToggle} />);

    const toggleButton = screen.getByTestId('webcam-toggle-button');
    fireEvent.click(toggleButton);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 19: Size change callback - small
   * Verifies onSizeChange is called with 'small' when small button is clicked
   */
  it('should call onSizeChange with "small" when small button is clicked', () => {
    const onSizeChange = vi.fn();
    render(<WebcamControls {...defaultProps} isEnabled={true} onSizeChange={onSizeChange} />);

    const smallButton = screen.getByTestId('size-small-button');
    fireEvent.click(smallButton);

    expect(onSizeChange).toHaveBeenCalledTimes(1);
    expect(onSizeChange).toHaveBeenCalledWith('small');
  });

  /**
   * Test 20: Size change callback - medium
   * Verifies onSizeChange is called with 'medium' when medium button is clicked
   */
  it('should call onSizeChange with "medium" when medium button is clicked', () => {
    const onSizeChange = vi.fn();
    render(<WebcamControls {...defaultProps} isEnabled={true} onSizeChange={onSizeChange} />);

    const mediumButton = screen.getByTestId('size-medium-button');
    fireEvent.click(mediumButton);

    expect(onSizeChange).toHaveBeenCalledTimes(1);
    expect(onSizeChange).toHaveBeenCalledWith('medium');
  });

  /**
   * Test 21: Size change callback - large
   * Verifies onSizeChange is called with 'large' when large button is clicked
   */
  it('should call onSizeChange with "large" when large button is clicked', () => {
    const onSizeChange = vi.fn();
    render(<WebcamControls {...defaultProps} isEnabled={true} onSizeChange={onSizeChange} />);

    const largeButton = screen.getByTestId('size-large-button');
    fireEvent.click(largeButton);

    expect(onSizeChange).toHaveBeenCalledTimes(1);
    expect(onSizeChange).toHaveBeenCalledWith('large');
  });

  /**
   * Test 22: Mirror toggle callback
   * Verifies onMirrorToggle is called when mirror button is clicked
   */
  it('should call onMirrorToggle when mirror button is clicked', () => {
    const onMirrorToggle = vi.fn();
    render(<WebcamControls {...defaultProps} isEnabled={true} onMirrorToggle={onMirrorToggle} />);

    const mirrorButton = screen.getByTestId('mirror-toggle-button');
    fireEvent.click(mirrorButton);

    expect(onMirrorToggle).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 23: Toggle button disabled when loading
   * Verifies toggle button is disabled during loading
   */
  it('should disable toggle button when loading', () => {
    render(<WebcamControls {...defaultProps} isLoading={true} />);

    const toggleButton = screen.getByTestId('webcam-toggle-button');
    expect(toggleButton).toBeDisabled();
    expect(toggleButton).toHaveClass('cursor-not-allowed');
  });

  /**
   * Test 24: Toggle button enabled when not loading
   * Verifies toggle button is enabled when not loading
   */
  it('should enable toggle button when not loading', () => {
    render(<WebcamControls {...defaultProps} isLoading={false} />);

    const toggleButton = screen.getByTestId('webcam-toggle-button');
    expect(toggleButton).not.toBeDisabled();
  });

  /**
   * Test 25: Accessibility - toggle button ARIA label
   * Verifies toggle button has proper ARIA label
   */
  it('should have proper ARIA label for toggle button when disabled', () => {
    render(<WebcamControls {...defaultProps} isEnabled={false} />);

    const toggleButton = screen.getByLabelText('Enable webcam overlay');
    expect(toggleButton).toBeInTheDocument();
  });

  /**
   * Test 26: Accessibility - toggle button ARIA label when enabled
   * Verifies toggle button has proper ARIA label when enabled
   */
  it('should have proper ARIA label for toggle button when enabled', () => {
    render(<WebcamControls {...defaultProps} isEnabled={true} />);

    const toggleButton = screen.getByLabelText('Disable webcam overlay');
    expect(toggleButton).toBeInTheDocument();
  });

  /**
   * Test 27: Accessibility - size selection radiogroup
   * Verifies size buttons are in a radiogroup
   */
  it('should have radiogroup for size selection', () => {
    render(<WebcamControls {...defaultProps} isEnabled={true} />);

    const radiogroup = screen.getByRole('radiogroup', { name: /Webcam size selection/i });
    expect(radiogroup).toBeInTheDocument();
  });

  /**
   * Test 28: Accessibility - size buttons have radio role
   * Verifies size buttons have correct role and aria-checked
   */
  it('should have radio role and aria-checked for size buttons', () => {
    render(<WebcamControls {...defaultProps} isEnabled={true} size="medium" />);

    const mediumButton = screen.getByTestId('size-medium-button');
    expect(mediumButton).toHaveAttribute('role', 'radio');
    expect(mediumButton).toHaveAttribute('aria-checked', 'true');

    const smallButton = screen.getByTestId('size-small-button');
    expect(smallButton).toHaveAttribute('role', 'radio');
    expect(smallButton).toHaveAttribute('aria-checked', 'false');
  });

  /**
   * Test 29: Focus indicators on buttons
   * Verifies focus ring classes are present
   */
  it('should have focus indicators on all buttons', () => {
    render(<WebcamControls {...defaultProps} isEnabled={true} />);

    const toggleButton = screen.getByTestId('webcam-toggle-button');
    expect(toggleButton).toHaveClass('focus:ring-2');

    const smallButton = screen.getByTestId('size-small-button');
    expect(smallButton).toHaveClass('focus:ring-2');

    const mirrorButton = screen.getByTestId('mirror-toggle-button');
    expect(mirrorButton).toHaveClass('focus:ring-2');
  });

  /**
   * Test 30: Custom className prop
   * Verifies custom className is applied to container
   */
  it('should apply custom className to container', () => {
    render(<WebcamControls {...defaultProps} className="custom-controls" />);

    const controls = screen.getByTestId('webcam-controls');
    expect(controls).toHaveClass('custom-controls');
  });

  /**
   * Test 31: Error message styling
   * Verifies error alert has red styling
   */
  it('should style error message with red background and border', () => {
    const error = new Error('Test error');
    render(<WebcamControls {...defaultProps} error={error} />);

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveClass('bg-red-100');
    expect(errorAlert).toHaveClass('border-red-400');
    expect(errorAlert).toHaveClass('text-red-700');
  });

  /**
   * Test 32: Toggle button color when enabled
   * Verifies toggle button has green styling when enabled
   */
  it('should show green button when webcam is enabled', () => {
    render(<WebcamControls {...defaultProps} isEnabled={true} />);

    const toggleButton = screen.getByTestId('webcam-toggle-button');
    expect(toggleButton).toHaveClass('bg-green-600');
  });

  /**
   * Test 33: Toggle button color when disabled
   * Verifies toggle button has gray styling when disabled
   */
  it('should show gray button when webcam is disabled', () => {
    render(<WebcamControls {...defaultProps} isEnabled={false} />);

    const toggleButton = screen.getByTestId('webcam-toggle-button');
    expect(toggleButton).toHaveClass('bg-gray-600');
  });
});
