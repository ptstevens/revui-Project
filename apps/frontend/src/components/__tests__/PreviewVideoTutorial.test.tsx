import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PreviewVideoTutorial } from '../PreviewVideoTutorial';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('PreviewVideoTutorial', () => {
  const mockOnComplete = vi.fn();
  const mockOnSkip = vi.fn();
  const tenantId = 'test-tenant';
  const userId = 'test-user';
  const storageKey = `revui_tutorial_skip_${tenantId}_${userId}`;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    mockOnComplete.mockClear();
    mockOnSkip.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render tutorial modal when isOpen is true', () => {
    render(
      <PreviewVideoTutorial
        onComplete={mockOnComplete}
        tenantId={tenantId}
        userId={userId}
        isOpen={true}
      />
    );

    expect(screen.getByText('Quick Recording Tutorial')).toBeInTheDocument();
    expect(screen.getByText(/Learn how to create a great screen recording/i)).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(
      <PreviewVideoTutorial
        onComplete={mockOnComplete}
        tenantId={tenantId}
        userId={userId}
        isOpen={false}
      />
    );

    expect(screen.queryByText('Quick Recording Tutorial')).not.toBeInTheDocument();
  });

  it('should auto-complete if skip preference exists in localStorage', () => {
    localStorage.setItem(storageKey, 'true');

    render(
      <PreviewVideoTutorial
        onComplete={mockOnComplete}
        tenantId={tenantId}
        userId={userId}
        isOpen={true}
      />
    );

    // Should call onComplete immediately
    waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('should render video player with controls', () => {
    render(
      <PreviewVideoTutorial
        onComplete={mockOnComplete}
        tenantId={tenantId}
        userId={userId}
        isOpen={true}
      />
    );

    const video = screen.getByRole('application'); // video element
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('preload', 'auto');
  });

  it('should render Skip and Continue buttons', () => {
    render(
      <PreviewVideoTutorial
        onComplete={mockOnComplete}
        tenantId={tenantId}
        userId={userId}
        isOpen={true}
      />
    );

    expect(screen.getByText('Skip')).toBeInTheDocument();
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('should render "Don\'t show this again" checkbox', () => {
    render(
      <PreviewVideoTutorial
        onComplete={mockOnComplete}
        tenantId={tenantId}
        userId={userId}
        isOpen={true}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(screen.getByText(/Don't show this tutorial again/i)).toBeInTheDocument();
  });

  it('should call onComplete when Continue button is clicked', () => {
    render(
      <PreviewVideoTutorial
        onComplete={mockOnComplete}
        tenantId={tenantId}
        userId={userId}
        isOpen={true}
      />
    );

    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('should call onSkip when Skip button is clicked', () => {
    render(
      <PreviewVideoTutorial
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        tenantId={tenantId}
        userId={userId}
        isOpen={true}
      />
    );

    const skipButton = screen.getByText('Skip');
    fireEvent.click(skipButton);

    expect(mockOnSkip).toHaveBeenCalledWith(false); // Not checked
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('should save preference to localStorage when "never show again" is checked and Skip is clicked', () => {
    render(
      <PreviewVideoTutorial
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        tenantId={tenantId}
        userId={userId}
        isOpen={true}
      />
    );

    // Check the "never show again" checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Click Skip
    const skipButton = screen.getByText('Skip');
    fireEvent.click(skipButton);

    // Verify localStorage was set
    expect(localStorage.getItem(storageKey)).toBe('true');
    expect(mockOnSkip).toHaveBeenCalledWith(true);
  });

  it('should save preference to localStorage when "never show again" is checked and Got it is clicked', () => {
    render(
      <PreviewVideoTutorial
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        tenantId={tenantId}
        userId={userId}
        isOpen={true}
      />
    );

    // Check the "never show again" checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Click Continue (which becomes "Got it!" after video ends)
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    // Verify localStorage was set
    expect(localStorage.getItem(storageKey)).toBe('true');
  });

  it('should change button text to "Got it!" when video ends', () => {
    render(
      <PreviewVideoTutorial
        onComplete={mockOnComplete}
        tenantId={tenantId}
        userId={userId}
        isOpen={true}
      />
    );

    // Initially shows "Continue"
    expect(screen.getByText('Continue')).toBeInTheDocument();

    // Simulate video ended event
    const video = screen.getByRole('application') as HTMLVideoElement;
    fireEvent.ended(video);

    // Should now show "Got it!"
    waitFor(() => {
      expect(screen.getByText('Got it!')).toBeInTheDocument();
    });
  });

  it('should use custom video URL when provided', () => {
    const customUrl = '/custom/tutorial.mp4';

    render(
      <PreviewVideoTutorial
        onComplete={mockOnComplete}
        tenantId={tenantId}
        userId={userId}
        videoUrl={customUrl}
        isOpen={true}
      />
    );

    const video = screen.getByRole('application') as HTMLVideoElement;
    const source = video.querySelector('source');
    expect(source).toHaveAttribute('src', customUrl);
  });

  it('should use default video URL when not provided', () => {
    render(
      <PreviewVideoTutorial
        onComplete={mockOnComplete}
        tenantId={tenantId}
        userId={userId}
        isOpen={true}
      />
    );

    const video = screen.getByRole('application') as HTMLVideoElement;
    const source = video.querySelector('source');
    expect(source).toHaveAttribute('src', '/videos/recording-tutorial.mp4');
  });

  it('should have proper ARIA attributes for accessibility', () => {
    render(
      <PreviewVideoTutorial
        onComplete={mockOnComplete}
        tenantId={tenantId}
        userId={userId}
        isOpen={true}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'tutorial-title');
  });
});
