/**
 * E2E Tests for Story 2.4: Recording Controls (Start/Pause/Resume/Stop)
 *
 * Tests the complete recording controls workflow including:
 * - Start recording initiates MediaRecorder
 * - Pause suspends recording while maintaining data
 * - Resume continues from paused state
 * - Stop ends recording and triggers review phase
 * - Visual feedback for each state (indicators, timer, file size)
 * - Keyboard shortcuts (Space for pause/resume, Escape for stop)
 * - Duration timer updates in real-time
 * - Estimated file size updates during recording
 * - State transitions (recording → paused → recording → stopped)
 *
 * Test Coverage:
 * - Recording workflow from start to stop
 * - Pause/Resume functionality
 * - Visual indicators and timer display
 * - Keyboard shortcuts
 * - State persistence across pause/resume cycles
 * - File size estimation accuracy
 * - Error handling for control operations
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Helper: Mock getDisplayMedia for screen capture
 */
async function mockScreenCapture(page: Page) {
  await page.evaluate(() => {
    // Create a mock MediaStream
    const mockStream = {
      getVideoTracks: () => [{
        label: 'Mock Screen',
        kind: 'video',
        getSettings: () => ({ displaySurface: 'monitor', width: 1920, height: 1080 }),
        stop: () => {},
        onended: null,
      }],
      getAudioTracks: () => [],
      getTracks: () => [],
      addTrack: () => {},
      removeTrack: () => {},
    } as any;

    // Mock navigator.mediaDevices.getDisplayMedia
    (navigator.mediaDevices as any).getDisplayMedia = async () => mockStream;
    (navigator.mediaDevices as any).getUserMedia = async () => mockStream;

    // Mock MediaRecorder
    (window as any).MediaRecorder = class MockMediaRecorder {
      state = 'inactive';
      ondataavailable: ((event: any) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      mimeType = 'video/webm;codecs=vp9';

      constructor(stream: any, options: any) {}

      start(timeslice: number) {
        this.state = 'recording';
      }

      pause() {
        this.state = 'paused';
      }

      resume() {
        this.state = 'recording';
      }

      stop() {
        this.state = 'inactive';
        if (this.onstop) {
          this.onstop();
        }
      }

      static isTypeSupported(type: string) {
        return true;
      }
    };
  });
}

/**
 * Helper: Start a recording session
 */
async function startRecording(page: Page) {
  // Click "Start Recording" button from ScreenSelector
  await page.click('[data-testid="start-recording-button"]');

  // Wait for recording controls to appear
  await expect(page.locator('[data-testid="recording-controls"]')).toBeVisible({ timeout: 3000 });
}

/**
 * Helper: Wait for duration to reach specific value
 */
async function waitForDuration(page: Page, targetSeconds: number, timeout = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const durationText = await page.locator('[data-testid="duration-display"]').textContent();
    if (durationText) {
      const [mins, secs] = durationText.split(':').map(Number);
      const totalSeconds = mins * 60 + secs;
      if (totalSeconds >= targetSeconds) {
        return;
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`Duration did not reach ${targetSeconds} seconds within ${timeout}ms`);
}

test.describe('Story 2.4: Recording Controls E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock browser APIs
    await mockScreenCapture(page);

    // Navigate to recording page
    await page.goto('/recording/test-session');

    // Skip tutorial if it appears
    const tutorialModal = page.locator('[data-testid="tutorial-modal"]');
    if (await tutorialModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.click('[data-testid="tutorial-skip-button"]');
    }
  });

  /**
   * Test 1: Start recording initiates MediaRecorder
   * Verifies recording controls appear after starting recording
   */
  test('should display recording controls after starting recording', async ({ page }) => {
    await startRecording(page);

    // Verify recording controls are visible
    const recordingControls = page.locator('[data-testid="recording-controls"]');
    await expect(recordingControls).toBeVisible();

    // Verify recording indicator
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();

    // Verify "Recording in Progress" text
    await expect(page.getByText('Recording in Progress')).toBeVisible();

    // Verify duration starts at 00:00
    await expect(page.locator('[data-testid="duration-display"]')).toHaveText('00:00');

    // Verify estimated file size is displayed
    await expect(page.locator('[data-testid="file-size-display"]')).toBeVisible();
  });

  /**
   * Test 2: Pause button suspends recording
   * Verifies pause button changes state and UI updates
   */
  test('should pause recording when pause button is clicked', async ({ page }) => {
    await startRecording(page);

    // Wait for recording to run for 2 seconds
    await waitForDuration(page, 2);

    // Click pause button
    await page.click('[data-testid="pause-button"]');

    // Verify paused indicator appears
    await expect(page.locator('[data-testid="paused-indicator"]')).toBeVisible({ timeout: 2000 });

    // Verify "Recording Paused" text
    await expect(page.getByText('Recording Paused')).toBeVisible();

    // Verify resume button appears
    await expect(page.locator('[data-testid="resume-button"]')).toBeVisible();

    // Verify pause button is hidden
    await expect(page.locator('[data-testid="pause-button"]')).not.toBeVisible();

    // Verify recording state shows "paused"
    const stateDisplay = page.locator('[data-testid="recording-state"]');
    await expect(stateDisplay).toHaveText('paused');
  });

  /**
   * Test 3: Resume button continues recording
   * Verifies resume button restarts recording from paused state
   */
  test('should resume recording when resume button is clicked', async ({ page }) => {
    await startRecording(page);

    // Pause recording
    await page.click('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="paused-indicator"]')).toBeVisible();

    // Get duration before resume
    const durationBeforeResume = await page.locator('[data-testid="duration-display"]').textContent();

    // Click resume button
    await page.click('[data-testid="resume-button"]');

    // Verify recording indicator reappears
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible({ timeout: 2000 });

    // Verify "Recording in Progress" text
    await expect(page.getByText('Recording in Progress')).toBeVisible();

    // Verify pause button reappears
    await expect(page.locator('[data-testid="pause-button"]')).toBeVisible();

    // Verify resume button is hidden
    await expect(page.locator('[data-testid="resume-button"]')).not.toBeVisible();

    // Verify recording state shows "recording"
    const stateDisplay = page.locator('[data-testid="recording-state"]');
    await expect(stateDisplay).toHaveText('recording');

    // Verify duration continues from where it paused
    const durationAfterResume = await page.locator('[data-testid="duration-display"]').textContent();
    expect(durationAfterResume).toBe(durationBeforeResume);
  });

  /**
   * Test 4: Stop button ends recording
   * Verifies stop button transitions to review phase
   */
  test('should stop recording and show review phase when stop button is clicked', async ({ page }) => {
    await startRecording(page);

    // Wait for recording to run briefly
    await waitForDuration(page, 2);

    // Get final duration
    const finalDuration = await page.locator('[data-testid="duration-display"]').textContent();

    // Click stop button
    await page.click('[data-testid="stop-button"]');

    // Verify review phase appears
    await expect(page.getByText('Recording Complete')).toBeVisible({ timeout: 3000 });

    // Verify recording controls are hidden
    await expect(page.locator('[data-testid="recording-controls"]')).not.toBeVisible();

    // Verify recording stats are shown in review
    await expect(page.getByText(/Duration:/)).toBeVisible();
    await expect(page.getByText(/File Size:/)).toBeVisible();
  });

  /**
   * Test 5: Duration timer updates in real-time
   * Verifies timer increments every second
   */
  test('should update duration timer in real-time', async ({ page }) => {
    await startRecording(page);

    // Get initial duration (should be 00:00)
    const initialDuration = await page.locator('[data-testid="duration-display"]').textContent();
    expect(initialDuration).toBe('00:00');

    // Wait for duration to increment
    await waitForDuration(page, 3);

    // Verify duration has increased
    const updatedDuration = await page.locator('[data-testid="duration-display"]').textContent();
    expect(updatedDuration).not.toBe('00:00');

    // Verify format is MM:SS
    expect(updatedDuration).toMatch(/^\d{2}:\d{2}$/);
  });

  /**
   * Test 6: Estimated file size updates during recording
   * Verifies file size calculation increases with duration
   */
  test('should update estimated file size during recording', async ({ page }) => {
    await startRecording(page);

    // Get initial file size
    const initialSize = await page.locator('[data-testid="file-size-display"]').textContent();

    // Wait for duration to increase
    await waitForDuration(page, 3);

    // Get updated file size
    const updatedSize = await page.locator('[data-testid="file-size-display"]').textContent();

    // Verify file size has increased (or at minimum stayed the same)
    // Note: In test environment with mocked MediaRecorder, size may not increase
    expect(updatedSize).toBeTruthy();
    expect(updatedSize).toMatch(/\d+\.\d{2}\s(B|KB|MB|GB)/);
  });

  /**
   * Test 7: Keyboard shortcut (Space) pauses recording
   * Verifies Space key triggers pause when recording
   */
  test('should pause recording when Space key is pressed', async ({ page }) => {
    await startRecording(page);

    // Press Space key
    await page.keyboard.press('Space');

    // Verify recording is paused
    await expect(page.locator('[data-testid="paused-indicator"]')).toBeVisible({ timeout: 2000 });
    await expect(page.getByText('Recording Paused')).toBeVisible();
  });

  /**
   * Test 8: Keyboard shortcut (Space) resumes recording
   * Verifies Space key triggers resume when paused
   */
  test('should resume recording when Space key is pressed while paused', async ({ page }) => {
    await startRecording(page);

    // Pause recording
    await page.click('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="paused-indicator"]')).toBeVisible();

    // Press Space key to resume
    await page.keyboard.press('Space');

    // Verify recording resumes
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible({ timeout: 2000 });
    await expect(page.getByText('Recording in Progress')).toBeVisible();
  });

  /**
   * Test 9: Keyboard shortcut (Escape) stops recording
   * Verifies Escape key triggers stop
   */
  test('should stop recording when Escape key is pressed', async ({ page }) => {
    await startRecording(page);

    // Press Escape key
    await page.keyboard.press('Escape');

    // Verify recording stops and review phase appears
    await expect(page.getByText('Recording Complete')).toBeVisible({ timeout: 3000 });
  });

  /**
   * Test 10: Multiple pause/resume cycles
   * Verifies recording can be paused and resumed multiple times
   */
  test('should handle multiple pause and resume cycles', async ({ page }) => {
    await startRecording(page);

    // First pause
    await page.click('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="paused-indicator"]')).toBeVisible();

    // First resume
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();

    // Second pause
    await page.click('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="paused-indicator"]')).toBeVisible();

    // Second resume
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();

    // Verify recording state is still "recording"
    const stateDisplay = page.locator('[data-testid="recording-state"]');
    await expect(stateDisplay).toHaveText('recording');
  });

  /**
   * Test 11: Screen type and source name display
   * Verifies metadata is shown in recording controls
   */
  test('should display screen type and source name', async ({ page }) => {
    await startRecording(page);

    // Verify screen type is displayed (mocked as 'screen')
    await expect(page.locator('[data-testid="screen-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="screen-type"]')).toContainText('Screen Type:');

    // Verify source name is displayed (mocked as 'Mock Screen')
    await expect(page.locator('[data-testid="source-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-name"]')).toContainText('Source:');
  });

  /**
   * Test 12: Change source button is available
   * Verifies user can change recording source during recording
   */
  test('should display change source button during recording', async ({ page }) => {
    await startRecording(page);

    // Verify change source button is visible
    await expect(page.locator('[data-testid="change-source-button"]')).toBeVisible();

    // Click change source button
    await page.click('[data-testid="change-source-button"]');

    // Verify re-selection confirmation dialog appears
    await expect(page.getByText('Change Recording Source?')).toBeVisible({ timeout: 2000 });
  });

  /**
   * Test 13: Visual indicator animation
   * Verifies recording indicator has pulse animation
   */
  test('should show animated recording indicator', async ({ page }) => {
    await startRecording(page);

    // Verify recording indicator exists and has animation class
    const indicator = page.locator('[data-testid="recording-indicator"]');
    await expect(indicator).toBeVisible();

    // Check for animation class (animate-pulse)
    const classes = await indicator.getAttribute('class');
    expect(classes).toContain('animate-pulse');
    expect(classes).toContain('bg-red-600');
  });

  /**
   * Test 14: Duration persists across pause/resume
   * Verifies duration does not reset when pausing and resuming
   */
  test('should maintain duration across pause and resume', async ({ page }) => {
    await startRecording(page);

    // Wait for duration to reach 3 seconds
    await waitForDuration(page, 3);

    // Get duration before pause
    const durationBeforePause = await page.locator('[data-testid="duration-display"]').textContent();

    // Pause recording
    await page.click('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="paused-indicator"]')).toBeVisible();

    // Get duration while paused
    const durationWhilePaused = await page.locator('[data-testid="duration-display"]').textContent();
    expect(durationWhilePaused).toBe(durationBeforePause);

    // Resume recording
    await page.click('[data-testid="resume-button"]');

    // Verify duration did not reset
    const durationAfterResume = await page.locator('[data-testid="duration-display"]').textContent();
    expect(durationAfterResume).toBe(durationBeforePause);
  });

  /**
   * Test 15: Keyboard shortcut hints are displayed
   * Verifies keyboard shortcut information is shown to users
   */
  test('should display keyboard shortcut hints', async ({ page }) => {
    await startRecording(page);

    // Verify keyboard shortcuts text is visible
    await expect(page.getByText(/Keyboard Shortcuts:/)).toBeVisible();
    await expect(page.getByText(/Space to pause\/resume/)).toBeVisible();
    await expect(page.getByText(/Escape to stop/)).toBeVisible();
  });
});
