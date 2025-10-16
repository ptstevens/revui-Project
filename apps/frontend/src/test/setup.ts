/**
 * Vitest test setup file
 * Configures jsdom environment and global test utilities
 */

import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test case
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock window.matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock navigator.mediaDevices (for WebRTC tests)
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(),
    getDisplayMedia: vi.fn(),
    enumerateDevices: vi.fn(),
  },
});

// Mock MediaRecorder (for WebRTC recording tests)
global.MediaRecorder = class MediaRecorder {
  static isTypeSupported = vi.fn();
  state = 'inactive';
  ondataavailable = null;
  onstop = null;
  onerror = null;
  start = vi.fn();
  stop = vi.fn();
  pause = vi.fn();
  resume = vi.fn();
  mimeType = 'video/webm';
} as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

// Mock MediaStream (for WebRTC recording tests)
global.MediaStream = class MediaStream {
  id = 'mock-stream';
  active = true;
  private tracks: MediaStreamTrack[] = [];

  constructor(tracks?: MediaStreamTrack[]) {
    if (tracks) {
      this.tracks = tracks;
    }
  }

  getVideoTracks() {
    return this.tracks.filter((t: MediaStreamTrack) => t.kind === 'video');
  }

  getAudioTracks() {
    return this.tracks.filter((t: MediaStreamTrack) => t.kind === 'audio');
  }

  getTracks() {
    return this.tracks;
  }

  addTrack(track: MediaStreamTrack) {
    this.tracks.push(track);
  }

  removeTrack(track: MediaStreamTrack) {
    this.tracks = this.tracks.filter((t: MediaStreamTrack) => t !== track);
  }

  clone() {
    return new MediaStream(this.tracks);
  }

  getTrackById(id: string) {
    return this.tracks.find((t: MediaStreamTrack) => t.id === id);
  }

  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
} as any;

// Mock BlobEvent (for MediaRecorder tests)
global.BlobEvent = class BlobEvent extends Event {
  data: Blob;

  constructor(type: string, eventInitDict: { data: Blob }) {
    super(type);
    this.data = eventInitDict.data;
  }
} as any;
