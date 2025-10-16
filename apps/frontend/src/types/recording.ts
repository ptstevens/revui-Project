/**
 * TypeScript type definitions for recording feature
 *
 * Implements Story 2.1 Task 5:
 * - ScreenCaptureOptions interface
 * - MediaRecorderConfig interface
 * - RecordingState type union
 * - RecordingMetadata interface
 * - WebRTCSupportInfo interface
 */

/**
 * Options for screen capture via getDisplayMedia
 */
export interface ScreenCaptureOptions {
  video: {
    width: { ideal: number };
    height: { ideal: number };
    frameRate: { ideal: number };
  };
  audio: boolean; // System audio capture
}

/**
 * Configuration for MediaRecorder initialization
 */
export interface MediaRecorderConfig {
  mimeType: string;
  videoBitsPerSecond: number;
  audioBitsPerSecond?: number;
}

/**
 * Recording state machine states
 */
export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

/**
 * Metadata about a recording session
 */
export interface RecordingMetadata {
  sessionId: string;
  taskAssignmentId: string;
  duration: number; // seconds
  fileSizeBytes: number;
  mimeType: string;
  screenType: 'screen' | 'window' | 'tab';
  hasVoiceNarration: boolean;
  hasWebcamOverlay: boolean;
  browserName: string;
  browserVersion: string;
  recordingStartedAt: number; // Unix timestamp
  recordingStoppedAt: number; // Unix timestamp
}

/**
 * WebRTC support information from browser detection
 */
export interface WebRTCSupportInfo {
  isSupported: boolean;
  hasScreenCapture: boolean;
  hasMediaRecorder: boolean;
  supportedMimeTypes: string[];
  browser: string;
  version: string;
}

/**
 * Error types for recording failures
 */
export type RecordingErrorCode =
  | 'PERMISSION_DENIED'
  | 'RECORDING_INTERRUPTED'
  | 'BROWSER_CRASH'
  | 'CODEC_UNSUPPORTED'
  | 'QUOTA_EXCEEDED'
  | 'STREAM_ENDED'
  | 'UNKNOWN_ERROR';

/**
 * Recording error with context
 */
export interface RecordingError {
  code: RecordingErrorCode;
  message: string;
  recoverable: boolean;
  userMessage: string; // User-friendly error message
}

/**
 * Screen type detected from displaySurface
 */
export type ScreenType = 'screen' | 'window' | 'tab';

/**
 * Recording phase in the workflow
 */
export type RecordingPhase = 'setup' | 'recording' | 'review' | 'uploading' | 'complete';

/**
 * Upload chunk information
 */
export interface UploadChunk {
  chunkNumber: number;
  chunkSize: number;
  etag: string;
  uploadedAt: number;
}

/**
 * Upload state for resumable uploads
 */
export interface UploadState {
  uploadId: string | null;
  s3Key: string | null;
  completedChunks: number[];
  totalChunks: number;
  progress: number; // 0-100
  isUploading: boolean;
  error: Error | null;
}
