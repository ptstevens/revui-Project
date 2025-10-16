/**
 * Browser compatibility detection utilities for WebRTC screen recording
 *
 * Implements Story 2.1 acceptance criteria:
 * - AC#1: Browser Compatibility Check for WebRTC MediaRecorder API
 *
 * Supported browsers:
 * - Chrome 49+ (stable support since v72)
 * - Edge 79+ (Chromium-based)
 * - Safari 14.1+ (macOS 11.3+)
 * - Firefox 96+ (experimental)
 */

export interface BrowserSupport {
  isSupported: boolean;
  hasScreenCapture: boolean;
  hasMediaRecorder: boolean;
  supportedMimeTypes: string[];
  browser: string;
  version: string;
}

/**
 * Check comprehensive browser support for WebRTC screen recording
 *
 * Verifies:
 * 1. navigator.mediaDevices.getDisplayMedia availability
 * 2. MediaRecorder constructor availability
 * 3. Supported codecs (VP9, VP8, H.264)
 *
 * @returns Detailed support information
 */
export function checkBrowserSupport(): BrowserSupport {
  const hasScreenCapture = !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getDisplayMedia
  );

  const hasMediaRecorder = !!(window.MediaRecorder);

  const supportedMimeTypes: string[] = [];
  const codecs = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=h264,aac', // Safari fallback
    'video/mp4',
  ];

  if (hasMediaRecorder) {
    codecs.forEach(codec => {
      if (MediaRecorder.isTypeSupported(codec)) {
        supportedMimeTypes.push(codec);
      }
    });
  }

  const isSupported = hasScreenCapture && hasMediaRecorder && supportedMimeTypes.length > 0;

  // Browser detection (user agent parsing)
  const userAgent = navigator.userAgent;
  let browser = 'Unknown';
  let version = 'Unknown';

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
    version = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
    version = userAgent.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
    version = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
    version = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  }

  return {
    isSupported,
    hasScreenCapture,
    hasMediaRecorder,
    supportedMimeTypes,
    browser,
    version,
  };
}

/**
 * Detect if user is on a mobile device
 * Mobile browsers do not support getDisplayMedia (desktop only)
 *
 * @returns true if mobile device detected
 */
export function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Get recommended recording configuration based on browser
 * Safari requires MP4 format, others use WebM
 *
 * @param browser - Browser name from checkBrowserSupport()
 * @returns Optimal recording configuration
 */
export function getRecordingConfig(browser: string): {
  mimeType: string;
  videoBitsPerSecond: number;
  audioBitsPerSecond: number;
} {
  if (browser === 'Safari') {
    return {
      mimeType: 'video/mp4', // Safari requires MP4
      videoBitsPerSecond: 2000000, // 2000kbps (slightly lower for Safari)
      audioBitsPerSecond: 128000,
    };
  }

  // Default: Chrome, Edge, Firefox
  return {
    mimeType: 'video/webm;codecs=vp9,opus',
    videoBitsPerSecond: 2500000, // 2500kbps
    audioBitsPerSecond: 128000,
  };
}

/**
 * Get human-readable error message for unsupported browsers
 *
 * @param support - Browser support object from checkBrowserSupport()
 * @returns Error message with upgrade instructions
 */
export function getUnsupportedBrowserMessage(support: BrowserSupport): string {
  if (!support.hasScreenCapture) {
    return `Your browser doesn't support screen recording.

Please upgrade to one of these browsers:
• Chrome 49 or later
• Edge 79 or later (Chromium-based)
• Safari 14.1 or later
• Firefox 96 or later

You are currently using: ${support.browser} ${support.version}`;
  }

  if (!support.hasMediaRecorder) {
    return `Your browser doesn't support video recording.

Please upgrade to a newer version of your browser.

You are currently using: ${support.browser} ${support.version}`;
  }

  if (support.supportedMimeTypes.length === 0) {
    return `Your browser doesn't support the required video codecs (VP9, VP8, or H.264).

Please upgrade to a newer version of your browser.

You are currently using: ${support.browser} ${support.version}`;
  }

  return 'Your browser is not supported for screen recording.';
}

/**
 * Check if specific browser version meets minimum requirements
 *
 * @param browser - Browser name
 * @param version - Version number (major version as string)
 * @returns true if version meets minimum requirements
 */
export function meetsMinimumVersion(browser: string, version: string): boolean {
  const versionNum = parseInt(version, 10);
  if (isNaN(versionNum)) return false;

  const minimumVersions: Record<string, number> = {
    Chrome: 49,
    Edge: 79,
    Safari: 14,
    Firefox: 96,
  };

  const minVersion = minimumVersions[browser];
  if (!minVersion) return false;

  return versionNum >= minVersion;
}
