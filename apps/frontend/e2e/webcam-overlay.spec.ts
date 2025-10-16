/**
 * E2E Tests for Story 2.5: Webcam Overlay with Drag-and-Snap Positioning
 *
 * Tests the complete webcam overlay workflow including:
 * - Enable/disable webcam during recording
 * - Size selection (Small, Medium, Large)
 * - Mirror toggle (on/off)
 * - Drag-and-drop positioning
 * - Snap-to-corner animation
 * - localStorage persistence across page reloads
 * - Error handling (permission denied, no camera found)
 * - Auto-stop when recording ends
 * - Browser compatibility warnings
 *
 * Test Coverage (8 Acceptance Criteria):
 * - AC#1: Webcam Capture and Display
 * - AC#2: Toggle Controls (Enable/Disable)
 * - AC#3: Drag-and-Drop Positioning
 * - AC#4: Snap-to-Corner Animation
 * - AC#5: Size Options (S/M/L)
 * - AC#6: Mirror Toggle
 * - AC#7: Professional Styling
 * - AC#8: Accessibility (ARIA, keyboard support)
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Helper: Mock getDisplayMedia for screen capture
 */
async function mockScreenCapture(page: Page) {
  await page.evaluate(() => {
    // Create a mock MediaStream for screen capture
    const mockScreenStream = {
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
    (navigator.mediaDevices as any).getDisplayMedia = async () => mockScreenStream;

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
 * Helper: Mock getUserMedia for webcam capture
 * @param shouldSucceed - Whether to simulate successful camera access
 * @param errorType - Type of error to simulate ('NotAllowedError', 'NotFoundError', etc.)
 */
async function mockWebcamCapture(page: Page, shouldSucceed: boolean = true, errorType?: string) {
  await page.evaluate(({ shouldSucceed, errorType }) => {
    if (shouldSucceed) {
      // Create a mock MediaStream for webcam
      const mockWebcamStream = {
        id: 'mock-webcam-stream',
        active: true,
        getVideoTracks: () => [{
          label: 'Mock Webcam',
          kind: 'video',
          id: 'mock-video-track',
          enabled: true,
          readyState: 'live',
          stop: () => {},
          getSettings: () => ({ width: 1280, height: 720, facingMode: 'user' }),
          onended: null,
        }],
        getAudioTracks: () => [],
        getTracks: () => [],
        addTrack: () => {},
        removeTrack: () => {},
      } as any;

      (navigator.mediaDevices as any).getUserMedia = async (constraints: any) => {
        return mockWebcamStream;
      };
    } else {
      // Simulate error
      (navigator.mediaDevices as any).getUserMedia = async () => {
        throw new DOMException('Camera error', errorType || 'NotAllowedError');
      };
    }
  }, { shouldSucceed, errorType });
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
 * Helper: Get element position from style attribute
 */
async function getElementPosition(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const element = page.locator(selector);
  const style = await element.getAttribute('style');

  const leftMatch = style?.match(/left:\s*(\d+)px/);
  const topMatch = style?.match(/top:\s*(\d+)px/);

  return {
    x: leftMatch ? parseInt(leftMatch[1]) : 0,
    y: topMatch ? parseInt(topMatch[1]) : 0,
  };
}

/**
 * Helper: Drag element to position
 */
async function dragElementTo(page: Page, selector: string, x: number, y: number) {
  const element = page.locator(selector);
  const boundingBox = await element.boundingBox();

  if (!boundingBox) {
    throw new Error(`Element ${selector} not found or not visible`);
  }

  // Calculate center of element
  const startX = boundingBox.x + boundingBox.width / 2;
  const startY = boundingBox.y + boundingBox.height / 2;

  // Perform drag
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 10 });
  await page.mouse.up();
}

test.describe('Story 2.5: Webcam Overlay E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock browser APIs
    await mockScreenCapture(page);
    await mockWebcamCapture(page, true); // Default: successful webcam access

    // Navigate to recording page
    await page.goto('/recording/test-session');

    // Skip tutorial if it appears
    const tutorialModal = page.locator('[data-testid="tutorial-modal"]');
    if (await tutorialModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.click('[data-testid="tutorial-skip-button"]');
    }
  });

  /**
   * Test 1: Enable webcam during recording
   * AC#1: Webcam Capture and Display
   * AC#2: Toggle Controls
   * Verifies webcam can be enabled and preview appears
   */
  test('should enable webcam and display video preview during recording', async ({ page }) => {
    // Start recording
    await startRecording(page);

    // Verify webcam controls are present
    const webcamControls = page.locator('[data-testid="webcam-controls"]');
    await expect(webcamControls).toBeVisible({ timeout: 2000 });

    // Verify webcam is initially disabled
    const toggleButton = page.locator('[data-testid="webcam-toggle-button"]');
    await expect(toggleButton).toHaveText('Enable Webcam');
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

    // Click to enable webcam
    await toggleButton.click();

    // Wait for loading state
    await expect(toggleButton).toHaveText('Loading Webcam...', { timeout: 2000 });
    await expect(toggleButton).toBeDisabled();

    // Wait for webcam to start
    await expect(toggleButton).toHaveText('Webcam Enabled', { timeout: 5000 });
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

    // Verify webcam preview appears
    const webcamPreview = page.locator('[data-testid="webcam-preview"]');
    await expect(webcamPreview).toBeVisible();

    // Verify video element exists and has stream
    const videoElement = webcamPreview.locator('video');
    await expect(videoElement).toBeVisible();
    await expect(videoElement).toHaveAttribute('autoplay');
    await expect(videoElement).toHaveAttribute('muted');
  });

  /**
   * Test 2: Disable webcam during recording
   * AC#2: Toggle Controls
   * Verifies webcam can be disabled and preview disappears
   */
  test('should disable webcam and hide preview when toggle is clicked', async ({ page }) => {
    await startRecording(page);

    // Enable webcam first
    const toggleButton = page.locator('[data-testid="webcam-toggle-button"]');
    await toggleButton.click();
    await expect(toggleButton).toHaveText('Webcam Enabled', { timeout: 5000 });

    // Verify preview is visible
    await expect(page.locator('[data-testid="webcam-preview"]')).toBeVisible();

    // Disable webcam
    await toggleButton.click();

    // Verify button state changes
    await expect(toggleButton).toHaveText('Enable Webcam');
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

    // Verify preview disappears
    await expect(page.locator('[data-testid="webcam-preview"]')).not.toBeVisible();
  });

  /**
   * Test 3: Change webcam size (Small, Medium, Large)
   * AC#5: Size Options
   * Verifies all three size options work correctly
   */
  test('should change webcam size when size buttons are clicked', async ({ page }) => {
    await startRecording(page);

    // Enable webcam
    await page.click('[data-testid="webcam-toggle-button"]');
    await expect(page.locator('[data-testid="webcam-toggle-button"]')).toHaveText('Webcam Enabled', { timeout: 5000 });

    // Verify size controls are visible
    await expect(page.locator('[data-testid="size-small-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="size-medium-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="size-large-button"]')).toBeVisible();

    // Test Small size (120x90)
    await page.click('[data-testid="size-small-button"]');
    const smallPreview = page.locator('[data-testid="webcam-preview"]');
    await expect(smallPreview).toHaveCSS('width', '120px');
    await expect(smallPreview).toHaveCSS('height', '90px');
    await expect(page.locator('[data-testid="size-small-button"]')).toHaveClass(/bg-blue-600/);

    // Test Medium size (180x135) - default
    await page.click('[data-testid="size-medium-button"]');
    await expect(smallPreview).toHaveCSS('width', '180px');
    await expect(smallPreview).toHaveCSS('height', '135px');
    await expect(page.locator('[data-testid="size-medium-button"]')).toHaveClass(/bg-blue-600/);

    // Test Large size (240x180)
    await page.click('[data-testid="size-large-button"]');
    await expect(smallPreview).toHaveCSS('width', '240px');
    await expect(smallPreview).toHaveCSS('height', '180px');
    await expect(page.locator('[data-testid="size-large-button"]')).toHaveClass(/bg-blue-600/);
  });

  /**
   * Test 4: Toggle mirror on and off
   * AC#6: Mirror Toggle
   * Verifies mirror effect applies to video preview
   */
  test('should toggle mirror effect on webcam preview', async ({ page }) => {
    await startRecording(page);

    // Enable webcam
    await page.click('[data-testid="webcam-toggle-button"]');
    await expect(page.locator('[data-testid="webcam-toggle-button"]')).toHaveText('Webcam Enabled', { timeout: 5000 });

    // Verify mirror toggle button is visible
    const mirrorButton = page.locator('[data-testid="mirror-toggle-button"]');
    await expect(mirrorButton).toBeVisible();

    // Verify mirror is initially ON (default)
    await expect(mirrorButton).toHaveText('Mirror: On');
    await expect(mirrorButton).toHaveAttribute('aria-pressed', 'true');

    // Check video has mirror transform
    const video = page.locator('[data-testid="webcam-preview"] video');
    let transform = await video.evaluate((el) => window.getComputedStyle(el).transform);
    expect(transform).toContain('matrix(-1'); // scaleX(-1) creates matrix(-1, 0, 0, 1, 0, 0)

    // Toggle mirror OFF
    await mirrorButton.click();
    await expect(mirrorButton).toHaveText('Mirror: Off');
    await expect(mirrorButton).toHaveAttribute('aria-pressed', 'false');

    // Verify mirror transform is removed
    transform = await video.evaluate((el) => window.getComputedStyle(el).transform);
    expect(transform).not.toContain('matrix(-1');

    // Toggle mirror back ON
    await mirrorButton.click();
    await expect(mirrorButton).toHaveText('Mirror: On');
    transform = await video.evaluate((el) => window.getComputedStyle(el).transform);
    expect(transform).toContain('matrix(-1');
  });

  /**
   * Test 5: Drag webcam preview to different positions
   * AC#3: Drag-and-Drop Positioning
   * Verifies webcam can be dragged to custom positions
   */
  test('should allow dragging webcam preview to different positions', async ({ page }) => {
    await startRecording(page);

    // Enable webcam
    await page.click('[data-testid="webcam-toggle-button"]');
    await expect(page.locator('[data-testid="webcam-toggle-button"]')).toHaveText('Webcam Enabled', { timeout: 5000 });

    const webcamPreview = page.locator('[data-testid="webcam-preview"]');

    // Get initial position (should be bottom-right by default)
    const initialPosition = await getElementPosition(page, '[data-testid="webcam-preview"]');

    // Verify cursor changes to grab when hovering
    await expect(webcamPreview).toHaveClass(/cursor-grab/);

    // Drag to center of screen (960, 540 for 1920x1080)
    await dragElementTo(page, '[data-testid="webcam-preview"]', 960, 540);

    // Verify position changed
    const newPosition = await getElementPosition(page, '[data-testid="webcam-preview"]');
    expect(newPosition.x).not.toBe(initialPosition.x);
    expect(newPosition.y).not.toBe(initialPosition.y);

    // Verify cursor changes to grabbing during drag
    await page.mouse.move(960, 540);
    await page.mouse.down();
    await expect(webcamPreview).toHaveClass(/cursor-grabbing/);
    await page.mouse.up();
  });

  /**
   * Test 6: Snap to all four corners
   * AC#4: Snap-to-Corner Animation
   * Verifies webcam snaps to corners when dragged nearby
   */
  test('should snap webcam to corners when dragged to snap zones', async ({ page }) => {
    await startRecording(page);

    // Enable webcam
    await page.click('[data-testid="webcam-toggle-button"]');
    await expect(page.locator('[data-testid="webcam-toggle-button"]')).toHaveText('Webcam Enabled', { timeout: 5000 });

    // Set viewport size for consistent testing
    await page.setViewportSize({ width: 1920, height: 1080 });

    const webcamPreview = page.locator('[data-testid="webcam-preview"]');

    // Test snap to top-left corner (within 50px threshold)
    await dragElementTo(page, '[data-testid="webcam-preview"]', 30, 30);
    await page.waitForTimeout(500); // Wait for snap animation
    let position = await getElementPosition(page, '[data-testid="webcam-preview"]');
    expect(position.x).toBe(20); // Padding from edge
    expect(position.y).toBe(20);

    // Test snap to top-right corner
    await dragElementTo(page, '[data-testid="webcam-preview"]', 1890, 30);
    await page.waitForTimeout(500);
    position = await getElementPosition(page, '[data-testid="webcam-preview"]');
    expect(position.x).toBeGreaterThan(1700); // Near right edge
    expect(position.y).toBe(20);

    // Test snap to bottom-left corner
    await dragElementTo(page, '[data-testid="webcam-preview"]', 30, 1050);
    await page.waitForTimeout(500);
    position = await getElementPosition(page, '[data-testid="webcam-preview"]');
    expect(position.x).toBe(20);
    expect(position.y).toBeGreaterThan(900); // Near bottom edge

    // Test snap to bottom-right corner
    await dragElementTo(page, '[data-testid="webcam-preview"]', 1890, 1050);
    await page.waitForTimeout(500);
    position = await getElementPosition(page, '[data-testid="webcam-preview"]');
    expect(position.x).toBeGreaterThan(1700);
    expect(position.y).toBeGreaterThan(900);

    // Verify snap zone indicator appears during drag near corner
    await page.mouse.move(30, 30);
    await page.mouse.down();
    await page.mouse.move(30, 30, { steps: 5 });

    const snapIndicator = page.locator('[data-testid="snap-zone-indicator"]');
    await expect(snapIndicator).toBeVisible({ timeout: 1000 });

    await page.mouse.up();
    await expect(snapIndicator).not.toBeVisible();
  });

  /**
   * Test 7: localStorage persistence across page reloads
   * AC#2: Toggle Controls (Persistence)
   * Verifies webcam settings persist across page reloads
   */
  test('should persist webcam settings in localStorage and restore on reload', async ({ page }) => {
    await startRecording(page);

    // Enable webcam
    await page.click('[data-testid="webcam-toggle-button"]');
    await expect(page.locator('[data-testid="webcam-toggle-button"]')).toHaveText('Webcam Enabled', { timeout: 5000 });

    // Change size to Large
    await page.click('[data-testid="size-large-button"]');
    await expect(page.locator('[data-testid="webcam-preview"]')).toHaveCSS('width', '240px');

    // Toggle mirror OFF
    await page.click('[data-testid="mirror-toggle-button"]');
    await expect(page.locator('[data-testid="mirror-toggle-button"]')).toHaveText('Mirror: Off');

    // Drag to custom position
    await dragElementTo(page, '[data-testid="webcam-preview"]', 500, 300);
    const savedPosition = await getElementPosition(page, '[data-testid="webcam-preview"]');

    // Verify localStorage has saved settings
    const webcamEnabled = await page.evaluate(() => localStorage.getItem('webcam-enabled'));
    const webcamSize = await page.evaluate(() => localStorage.getItem('webcam-size'));
    const webcamMirrored = await page.evaluate(() => localStorage.getItem('webcam-mirrored'));
    const webcamPosition = await page.evaluate(() => localStorage.getItem('webcam-position'));

    expect(webcamEnabled).toBe('true');
    expect(webcamSize).toBe('large');
    expect(webcamMirrored).toBe('false');
    expect(webcamPosition).toBeTruthy();

    // Reload page
    await page.reload();

    // Skip tutorial again if needed
    const tutorialModal = page.locator('[data-testid="tutorial-modal"]');
    if (await tutorialModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.click('[data-testid="tutorial-skip-button"]');
    }

    // Start recording again
    await startRecording(page);

    // Verify webcam is auto-enabled from localStorage
    await expect(page.locator('[data-testid="webcam-toggle-button"]')).toHaveText('Webcam Enabled', { timeout: 5000 });

    // Verify size is restored
    await expect(page.locator('[data-testid="webcam-preview"]')).toHaveCSS('width', '240px');
    await expect(page.locator('[data-testid="size-large-button"]')).toHaveClass(/bg-blue-600/);

    // Verify mirror is OFF
    await expect(page.locator('[data-testid="mirror-toggle-button"]')).toHaveText('Mirror: Off');

    // Verify position is restored
    const restoredPosition = await getElementPosition(page, '[data-testid="webcam-preview"]');
    expect(restoredPosition.x).toBe(savedPosition.x);
    expect(restoredPosition.y).toBe(savedPosition.y);
  });

  /**
   * Test 8: Handle camera permission denied
   * AC#1: Webcam Capture and Display (Error Handling)
   * Verifies proper error message when camera permission is denied
   */
  test('should display error message when camera permission is denied', async ({ page }) => {
    // Mock getUserMedia to reject with NotAllowedError
    await mockWebcamCapture(page, false, 'NotAllowedError');

    await startRecording(page);

    // Try to enable webcam
    await page.click('[data-testid="webcam-toggle-button"]');

    // Wait for error message
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 3000 });
    await expect(errorAlert).toHaveText('Camera access denied. Please grant camera permission.');

    // Verify webcam toggle button returns to "Enable Webcam"
    await expect(page.locator('[data-testid="webcam-toggle-button"]')).toHaveText('Enable Webcam');

    // Verify no preview is shown
    await expect(page.locator('[data-testid="webcam-preview"]')).not.toBeVisible();
  });

  /**
   * Test 9: Handle no camera found
   * AC#1: Webcam Capture and Display (Error Handling)
   * Verifies proper error message when no camera is available
   */
  test('should display error message when no camera is found', async ({ page }) => {
    // Mock getUserMedia to reject with NotFoundError
    await mockWebcamCapture(page, false, 'NotFoundError');

    await startRecording(page);

    // Try to enable webcam
    await page.click('[data-testid="webcam-toggle-button"]');

    // Wait for error message
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 3000 });
    await expect(errorAlert).toHaveText('No camera found. Please connect a webcam.');

    // Verify webcam toggle button returns to "Enable Webcam"
    await expect(page.locator('[data-testid="webcam-toggle-button"]')).toHaveText('Enable Webcam');
  });

  /**
   * Test 10: Auto-stop webcam when recording ends
   * AC#2: Toggle Controls (Auto-stop)
   * Verifies webcam stops automatically when user stops recording
   */
  test('should automatically stop webcam when recording is stopped', async ({ page }) => {
    await startRecording(page);

    // Enable webcam
    await page.click('[data-testid="webcam-toggle-button"]');
    await expect(page.locator('[data-testid="webcam-toggle-button"]')).toHaveText('Webcam Enabled', { timeout: 5000 });

    // Verify preview is visible
    await expect(page.locator('[data-testid="webcam-preview"]')).toBeVisible();

    // Stop recording
    await page.click('[data-testid="stop-button"]');

    // Wait for review phase
    await expect(page.getByText('Recording Complete')).toBeVisible({ timeout: 3000 });

    // Verify webcam controls are no longer visible (because recording ended)
    await expect(page.locator('[data-testid="webcam-controls"]')).not.toBeVisible();

    // Verify webcam preview is no longer visible
    await expect(page.locator('[data-testid="webcam-preview"]')).not.toBeVisible();
  });

  /**
   * Test 11: Accessibility - keyboard navigation
   * AC#8: Accessibility
   * Verifies keyboard navigation works for all controls
   */
  test('should support keyboard navigation for webcam controls', async ({ page }) => {
    await startRecording(page);

    // Tab to webcam toggle button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // May need multiple tabs depending on layout

    // Find the toggle button and activate with Enter
    const toggleButton = page.locator('[data-testid="webcam-toggle-button"]');
    await toggleButton.focus();
    await page.keyboard.press('Enter');

    // Wait for webcam to enable
    await expect(toggleButton).toHaveText('Webcam Enabled', { timeout: 5000 });

    // Tab to size buttons and select with Enter
    const smallButton = page.locator('[data-testid="size-small-button"]');
    await smallButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="webcam-preview"]')).toHaveCSS('width', '120px');

    // Tab to mirror button and toggle with Enter
    const mirrorButton = page.locator('[data-testid="mirror-toggle-button"]');
    await mirrorButton.focus();
    await page.keyboard.press('Enter');
    await expect(mirrorButton).toHaveText('Mirror: Off');

    // Verify focus indicators are visible (focus:ring-2 class)
    await toggleButton.focus();
    const toggleClasses = await toggleButton.getAttribute('class');
    expect(toggleClasses).toContain('focus:ring-2');
  });

  /**
   * Test 12: Professional styling verification
   * AC#7: Professional Styling
   * Verifies webcam preview has proper styling (rounded corners, shadow, border)
   */
  test('should apply professional styling to webcam preview', async ({ page }) => {
    await startRecording(page);

    // Enable webcam
    await page.click('[data-testid="webcam-toggle-button"]');
    await expect(page.locator('[data-testid="webcam-toggle-button"]')).toHaveText('Webcam Enabled', { timeout: 5000 });

    const webcamPreview = page.locator('[data-testid="webcam-preview"]');

    // Verify rounded corners
    await expect(webcamPreview).toHaveClass(/rounded-lg/);

    // Verify shadow
    await expect(webcamPreview).toHaveClass(/shadow-lg/);

    // Verify border
    await expect(webcamPreview).toHaveClass(/border-2/);

    // Verify z-index for proper layering
    const zIndex = await webcamPreview.evaluate((el) => window.getComputedStyle(el).zIndex);
    expect(parseInt(zIndex)).toBeGreaterThan(0);

    // Verify smooth opacity during drag
    await page.mouse.move(960, 540);
    await page.mouse.down();
    await expect(webcamPreview).toHaveClass(/opacity-90/); // Reduced opacity during drag
    await page.mouse.up();
    await expect(webcamPreview).toHaveClass(/opacity-100/); // Full opacity when not dragging
  });

  /**
   * Test 13: Size label overlay during drag
   * AC#3: Drag-and-Drop Positioning (Visual feedback)
   * Verifies size label appears during drag to show current size
   */
  test('should display size label overlay during drag', async ({ page }) => {
    await startRecording(page);

    // Enable webcam
    await page.click('[data-testid="webcam-toggle-button"]');
    await expect(page.locator('[data-testid="webcam-toggle-button"]')).toHaveText('Webcam Enabled', { timeout: 5000 });

    // Set size to Large
    await page.click('[data-testid="size-large-button"]');

    const webcamPreview = page.locator('[data-testid="webcam-preview"]');

    // Start dragging
    const boundingBox = await webcamPreview.boundingBox();
    if (boundingBox) {
      await page.mouse.move(boundingBox.x + 90, boundingBox.y + 90);
      await page.mouse.down();

      // Verify size label appears
      await expect(page.getByText('Large')).toBeVisible();

      // Move mouse to trigger drag
      await page.mouse.move(boundingBox.x + 100, boundingBox.y + 100, { steps: 5 });

      // Verify label is still visible during drag
      await expect(page.getByText('Large')).toBeVisible();

      // End drag
      await page.mouse.up();

      // Verify label disappears after drag
      await expect(page.getByText('Large')).not.toBeVisible({ timeout: 1000 });
    }
  });

  /**
   * Test 14: Browser compatibility warning
   * AC#1: Webcam Capture and Display (Compatibility)
   * Verifies warning appears when getUserMedia is not supported
   */
  test('should display browser compatibility warning when getUserMedia not supported', async ({ page }) => {
    // Remove getUserMedia support
    await page.evaluate(() => {
      delete (navigator.mediaDevices as any).getUserMedia;
    });

    await startRecording(page);

    // Verify compatibility warning appears
    await expect(page.getByText(/Camera access is not supported in this browser/)).toBeVisible({ timeout: 2000 });

    // Verify toggle button is disabled or shows error state
    const toggleButton = page.locator('[data-testid="webcam-toggle-button"]');

    // Try to enable - should show error
    await toggleButton.click();

    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 3000 });
    await expect(errorAlert).toContainText('not supported');
  });

  /**
   * Test 15: Multiple size and position changes
   * Integration test combining multiple features
   * Verifies webcam handles rapid size/position changes without errors
   */
  test('should handle rapid size and position changes without errors', async ({ page }) => {
    await startRecording(page);

    // Enable webcam
    await page.click('[data-testid="webcam-toggle-button"]');
    await expect(page.locator('[data-testid="webcam-toggle-button"]')).toHaveText('Webcam Enabled', { timeout: 5000 });

    // Rapid size changes
    await page.click('[data-testid="size-small-button"]');
    await page.click('[data-testid="size-large-button"]');
    await page.click('[data-testid="size-medium-button"]');
    await page.click('[data-testid="size-small-button"]');

    // Verify final size is Small
    await expect(page.locator('[data-testid="webcam-preview"]')).toHaveCSS('width', '120px');

    // Multiple drag operations
    await dragElementTo(page, '[data-testid="webcam-preview"]', 500, 300);
    await page.waitForTimeout(100);
    await dragElementTo(page, '[data-testid="webcam-preview"]', 800, 600);
    await page.waitForTimeout(100);
    await dragElementTo(page, '[data-testid="webcam-preview"]', 30, 30); // Snap to top-left

    // Verify no errors occurred
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).not.toBeVisible();

    // Verify webcam is still functional
    await expect(page.locator('[data-testid="webcam-preview"]')).toBeVisible();
    await expect(page.locator('video')).toBeVisible();
  });
});
