/**
 * Unit tests for browser detection utilities
 *
 * Tests Story 2.1 acceptance criteria:
 * - AC#1: Browser Compatibility Check for WebRTC MediaRecorder API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkBrowserSupport,
  isMobile,
  getRecordingConfig,
  getUnsupportedBrowserMessage,
  meetsMinimumVersion,
  type BrowserSupport,
} from '../browser-detection';

describe('checkBrowserSupport', () => {
  let originalNavigator: any;
  let originalMediaRecorder: any;

  beforeEach(() => {
    // Store originals
    originalNavigator = global.navigator;
    originalMediaRecorder = global.MediaRecorder;
  });

  afterEach(() => {
    // Restore originals
    global.navigator = originalNavigator;
    global.MediaRecorder = originalMediaRecorder;
  });

  /**
   * Test 1: Full browser support (all APIs present, codecs supported)
   * Verifies that checkBrowserSupport returns isSupported=true when all requirements are met
   */
  it('should return full support when all APIs are present and codecs are supported', () => {
    // Create a new navigator object with Chrome user agent
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      mediaDevices: {
        getDisplayMedia: vi.fn(),
        getUserMedia: vi.fn(),
        enumerateDevices: vi.fn(),
      },
    };
    global.navigator = mockNavigator as any;

    // Mock MediaRecorder with isTypeSupported
    global.MediaRecorder = class MediaRecorder {
      static isTypeSupported = vi.fn((mimeType: string) => {
        // Support VP9 and VP8 codecs (Chrome standard)
        return mimeType.includes('webm');
      });
    } as any;

    const support = checkBrowserSupport();

    expect(support.isSupported).toBe(true);
    expect(support.hasScreenCapture).toBe(true);
    expect(support.hasMediaRecorder).toBe(true);
    expect(support.supportedMimeTypes.length).toBeGreaterThan(0);
    expect(support.supportedMimeTypes).toContain('video/webm;codecs=vp9,opus');
    expect(support.browser).toBe('Chrome');
    expect(support.version).toBe('120');
  });

  /**
   * Test 2: Missing getDisplayMedia API
   * Verifies that checkBrowserSupport returns hasScreenCapture=false when getDisplayMedia is not available
   */
  it('should return unsupported when getDisplayMedia is missing', () => {
    // Create navigator WITHOUT getDisplayMedia
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      mediaDevices: {
        getUserMedia: vi.fn(),
        enumerateDevices: vi.fn(),
        // getDisplayMedia is missing
      },
    };
    global.navigator = mockNavigator as any;

    // Mock MediaRecorder
    global.MediaRecorder = class MediaRecorder {
      static isTypeSupported = vi.fn(() => true);
    } as any;

    const support = checkBrowserSupport();

    expect(support.isSupported).toBe(false);
    expect(support.hasScreenCapture).toBe(false);
    expect(support.hasMediaRecorder).toBe(true);
  });

  /**
   * Test 3: Missing MediaRecorder API
   * Verifies that checkBrowserSupport returns hasMediaRecorder=false when MediaRecorder is not available
   */
  it('should return unsupported when MediaRecorder is missing', () => {
    // Create navigator with getDisplayMedia
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      mediaDevices: {
        getDisplayMedia: vi.fn(),
        getUserMedia: vi.fn(),
        enumerateDevices: vi.fn(),
      },
    };
    global.navigator = mockNavigator as any;

    // Remove MediaRecorder
    (global as any).MediaRecorder = undefined;

    const support = checkBrowserSupport();

    expect(support.isSupported).toBe(false);
    expect(support.hasScreenCapture).toBe(true);
    expect(support.hasMediaRecorder).toBe(false);
    expect(support.supportedMimeTypes).toEqual([]);
  });

  /**
   * Test 4: Unsupported codecs (no supported MIME types)
   * Verifies that checkBrowserSupport returns empty supportedMimeTypes when no codecs are supported
   */
  it('should return unsupported when no codecs are supported', () => {
    // Create navigator with all APIs
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      mediaDevices: {
        getDisplayMedia: vi.fn(),
        getUserMedia: vi.fn(),
        enumerateDevices: vi.fn(),
      },
    };
    global.navigator = mockNavigator as any;

    // Mock MediaRecorder with isTypeSupported returning false for all codecs
    global.MediaRecorder = class MediaRecorder {
      static isTypeSupported = vi.fn(() => false);
    } as any;

    const support = checkBrowserSupport();

    expect(support.isSupported).toBe(false);
    expect(support.hasScreenCapture).toBe(true);
    expect(support.hasMediaRecorder).toBe(true);
    expect(support.supportedMimeTypes).toEqual([]);
  });

  /**
   * Test 5: Edge browser detection
   * Verifies that Edge browser is correctly identified from user agent
   */
  it('should correctly detect Edge browser', () => {
    // Create navigator with Edge user agent
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      mediaDevices: {
        getDisplayMedia: vi.fn(),
        getUserMedia: vi.fn(),
        enumerateDevices: vi.fn(),
      },
    };
    global.navigator = mockNavigator as any;

    // Mock MediaRecorder
    global.MediaRecorder = class MediaRecorder {
      static isTypeSupported = vi.fn((mimeType: string) => mimeType.includes('webm'));
    } as any;

    const support = checkBrowserSupport();

    expect(support.browser).toBe('Edge');
    expect(support.version).toBe('120');
  });

  /**
   * Test 6: Safari browser detection
   * Verifies that Safari browser is correctly identified from user agent
   */
  it('should correctly detect Safari browser', () => {
    // Create navigator with Safari user agent (no Chrome keyword)
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
      mediaDevices: {
        getDisplayMedia: vi.fn(),
        getUserMedia: vi.fn(),
        enumerateDevices: vi.fn(),
      },
    };
    global.navigator = mockNavigator as any;

    // Mock MediaRecorder (Safari supports MP4)
    global.MediaRecorder = class MediaRecorder {
      static isTypeSupported = vi.fn((mimeType: string) => mimeType.includes('mp4'));
    } as any;

    const support = checkBrowserSupport();

    expect(support.browser).toBe('Safari');
    expect(support.version).toBe('16');
    expect(support.supportedMimeTypes).toContain('video/mp4;codecs=h264,aac');
  });

  /**
   * Test 7: Firefox browser detection
   * Verifies that Firefox browser is correctly identified from user agent
   */
  it('should correctly detect Firefox browser', () => {
    // Create navigator with Firefox user agent
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
      mediaDevices: {
        getDisplayMedia: vi.fn(),
        getUserMedia: vi.fn(),
        enumerateDevices: vi.fn(),
      },
    };
    global.navigator = mockNavigator as any;

    // Mock MediaRecorder
    global.MediaRecorder = class MediaRecorder {
      static isTypeSupported = vi.fn((mimeType: string) => mimeType.includes('webm'));
    } as any;

    const support = checkBrowserSupport();

    expect(support.browser).toBe('Firefox');
    expect(support.version).toBe('115');
  });

  /**
   * Test 8: Missing mediaDevices entirely
   * Verifies handling when navigator.mediaDevices is undefined
   */
  it('should handle missing mediaDevices object', () => {
    // Create navigator without mediaDevices
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      // mediaDevices is not defined
    };
    global.navigator = mockNavigator as any;

    // Mock MediaRecorder
    global.MediaRecorder = class MediaRecorder {
      static isTypeSupported = vi.fn(() => true);
    } as any;

    const support = checkBrowserSupport();

    expect(support.isSupported).toBe(false);
    expect(support.hasScreenCapture).toBe(false);
    expect(support.hasMediaRecorder).toBe(true);
  });
});

describe('isMobile', () => {
  let originalNavigator: any;

  beforeEach(() => {
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  /**
   * Test 1: Detect Android device
   */
  it('should detect Android as mobile', () => {
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36',
    };
    global.navigator = mockNavigator as any;

    expect(isMobile()).toBe(true);
  });

  /**
   * Test 2: Detect iPhone device
   */
  it('should detect iPhone as mobile', () => {
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    };
    global.navigator = mockNavigator as any;

    expect(isMobile()).toBe(true);
  });

  /**
   * Test 3: Detect iPad device
   */
  it('should detect iPad as mobile', () => {
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    };
    global.navigator = mockNavigator as any;

    expect(isMobile()).toBe(true);
  });

  /**
   * Test 4: Desktop Chrome is not mobile
   */
  it('should not detect desktop Chrome as mobile', () => {
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    global.navigator = mockNavigator as any;

    expect(isMobile()).toBe(false);
  });

  /**
   * Test 5: Desktop Windows is not mobile
   */
  it('should not detect desktop Windows as mobile', () => {
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
    global.navigator = mockNavigator as any;

    expect(isMobile()).toBe(false);
  });
});

describe('getRecordingConfig', () => {
  /**
   * Test 1: Safari configuration uses MP4 format
   */
  it('should return MP4 config for Safari', () => {
    const config = getRecordingConfig('Safari');

    expect(config.mimeType).toBe('video/mp4');
    expect(config.videoBitsPerSecond).toBe(2000000);
    expect(config.audioBitsPerSecond).toBe(128000);
  });

  /**
   * Test 2: Chrome configuration uses WebM VP9 format
   */
  it('should return WebM VP9 config for Chrome', () => {
    const config = getRecordingConfig('Chrome');

    expect(config.mimeType).toBe('video/webm;codecs=vp9,opus');
    expect(config.videoBitsPerSecond).toBe(2500000);
    expect(config.audioBitsPerSecond).toBe(128000);
  });

  /**
   * Test 3: Edge configuration uses WebM VP9 format
   */
  it('should return WebM VP9 config for Edge', () => {
    const config = getRecordingConfig('Edge');

    expect(config.mimeType).toBe('video/webm;codecs=vp9,opus');
    expect(config.videoBitsPerSecond).toBe(2500000);
    expect(config.audioBitsPerSecond).toBe(128000);
  });

  /**
   * Test 4: Firefox configuration uses WebM VP9 format
   */
  it('should return WebM VP9 config for Firefox', () => {
    const config = getRecordingConfig('Firefox');

    expect(config.mimeType).toBe('video/webm;codecs=vp9,opus');
    expect(config.videoBitsPerSecond).toBe(2500000);
    expect(config.audioBitsPerSecond).toBe(128000);
  });

  /**
   * Test 5: Unknown browser uses default WebM VP9 format
   */
  it('should return default WebM VP9 config for unknown browser', () => {
    const config = getRecordingConfig('UnknownBrowser');

    expect(config.mimeType).toBe('video/webm;codecs=vp9,opus');
    expect(config.videoBitsPerSecond).toBe(2500000);
    expect(config.audioBitsPerSecond).toBe(128000);
  });
});

describe('getUnsupportedBrowserMessage', () => {
  /**
   * Test 1: Missing screen capture error message
   */
  it('should return screen capture error message when getDisplayMedia is missing', () => {
    const support: BrowserSupport = {
      isSupported: false,
      hasScreenCapture: false,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm'],
      browser: 'Chrome',
      version: '48',
    };

    const message = getUnsupportedBrowserMessage(support);

    expect(message).toContain("doesn't support screen recording");
    expect(message).toContain('Chrome 49 or later');
    expect(message).toContain('Edge 79 or later');
    expect(message).toContain('Safari 14.1 or later');
    expect(message).toContain('Firefox 96 or later');
    expect(message).toContain('Chrome 48');
  });

  /**
   * Test 2: Missing MediaRecorder error message
   */
  it('should return MediaRecorder error message when MediaRecorder is missing', () => {
    const support: BrowserSupport = {
      isSupported: false,
      hasScreenCapture: true,
      hasMediaRecorder: false,
      supportedMimeTypes: [],
      browser: 'Safari',
      version: '13',
    };

    const message = getUnsupportedBrowserMessage(support);

    expect(message).toContain("doesn't support video recording");
    expect(message).toContain('upgrade to a newer version');
    expect(message).toContain('Safari 13');
  });

  /**
   * Test 3: Missing codecs error message
   */
  it('should return codecs error message when no codecs are supported', () => {
    const support: BrowserSupport = {
      isSupported: false,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: [],
      browser: 'Firefox',
      version: '95',
    };

    const message = getUnsupportedBrowserMessage(support);

    expect(message).toContain("doesn't support the required video codecs");
    expect(message).toContain('VP9, VP8, or H.264');
    expect(message).toContain('upgrade to a newer version');
    expect(message).toContain('Firefox 95');
  });

  /**
   * Test 4: Generic error message for other cases
   */
  it('should return generic error message for other unsupported cases', () => {
    const support: BrowserSupport = {
      isSupported: false,
      hasScreenCapture: true,
      hasMediaRecorder: true,
      supportedMimeTypes: ['video/webm'],
      browser: 'Unknown',
      version: 'Unknown',
    };

    const message = getUnsupportedBrowserMessage(support);

    expect(message).toBe('Your browser is not supported for screen recording.');
  });
});

describe('meetsMinimumVersion', () => {
  /**
   * Test 1: Chrome minimum version check (49+)
   */
  it('should return true for Chrome 72 (above minimum)', () => {
    expect(meetsMinimumVersion('Chrome', '72')).toBe(true);
  });

  it('should return true for Chrome 49 (exactly minimum)', () => {
    expect(meetsMinimumVersion('Chrome', '49')).toBe(true);
  });

  it('should return false for Chrome 48 (below minimum)', () => {
    expect(meetsMinimumVersion('Chrome', '48')).toBe(false);
  });

  /**
   * Test 2: Edge minimum version check (79+)
   */
  it('should return true for Edge 100 (above minimum)', () => {
    expect(meetsMinimumVersion('Edge', '100')).toBe(true);
  });

  it('should return true for Edge 79 (exactly minimum)', () => {
    expect(meetsMinimumVersion('Edge', '79')).toBe(true);
  });

  it('should return false for Edge 78 (below minimum)', () => {
    expect(meetsMinimumVersion('Edge', '78')).toBe(false);
  });

  /**
   * Test 3: Safari minimum version check (14+)
   */
  it('should return true for Safari 16 (above minimum)', () => {
    expect(meetsMinimumVersion('Safari', '16')).toBe(true);
  });

  it('should return true for Safari 14 (exactly minimum)', () => {
    expect(meetsMinimumVersion('Safari', '14')).toBe(true);
  });

  it('should return false for Safari 13 (below minimum)', () => {
    expect(meetsMinimumVersion('Safari', '13')).toBe(false);
  });

  /**
   * Test 4: Firefox minimum version check (96+)
   */
  it('should return true for Firefox 115 (above minimum)', () => {
    expect(meetsMinimumVersion('Firefox', '115')).toBe(true);
  });

  it('should return true for Firefox 96 (exactly minimum)', () => {
    expect(meetsMinimumVersion('Firefox', '96')).toBe(true);
  });

  it('should return false for Firefox 95 (below minimum)', () => {
    expect(meetsMinimumVersion('Firefox', '95')).toBe(false);
  });

  /**
   * Test 5: Unknown browser
   */
  it('should return false for unknown browser', () => {
    expect(meetsMinimumVersion('UnknownBrowser', '100')).toBe(false);
  });

  /**
   * Test 6: Invalid version string
   */
  it('should return false for non-numeric version', () => {
    expect(meetsMinimumVersion('Chrome', 'abc')).toBe(false);
    expect(meetsMinimumVersion('Chrome', '')).toBe(false);
    expect(meetsMinimumVersion('Chrome', 'Unknown')).toBe(false);
  });
});
