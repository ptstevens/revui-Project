/**
 * User Preferences Type Definition
 * Story 2.3: 10-Second Preview Video Tutorial
 *
 * Defines the structure of the user preferences JSONB column
 */

export interface UserPreferences {
  // Tutorial preferences
  tutorialSkipped?: boolean;
  tutorialCompletedAt?: string; // ISO date string

  // UI preferences
  theme?: 'light' | 'dark' | 'system';
  language?: string; // e.g., 'en', 'es', 'fr'

  // Notification preferences
  notifications?: {
    email?: boolean;
    inApp?: boolean;
    recordingComplete?: boolean;
    invitations?: boolean;
  };

  // Feature preferences
  features?: {
    betaFeatures?: boolean;
    advancedMode?: boolean;
    autoStartRecording?: boolean;
    showPreviewTutorial?: boolean;
  };

  // Recording preferences
  recording?: {
    defaultQuality?: 'low' | 'medium' | 'high' | 'auto';
    defaultSource?: 'screen' | 'window' | 'tab';
    showCountdown?: boolean;
    countdownDuration?: number; // seconds
  };

  // Additional preferences can be added here
  [key: string]: any; // Allow for future expansion
}

/**
 * Default preferences for new users
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  tutorialSkipped: false,
  theme: 'system',
  notifications: {
    email: true,
    inApp: true,
    recordingComplete: true,
    invitations: true,
  },
  features: {
    betaFeatures: false,
    advancedMode: false,
    autoStartRecording: false,
    showPreviewTutorial: true, // Story 2.3: Default to showing tutorial
  },
  recording: {
    defaultQuality: 'auto',
    defaultSource: 'screen',
    showCountdown: true,
    countdownDuration: 3,
  },
};