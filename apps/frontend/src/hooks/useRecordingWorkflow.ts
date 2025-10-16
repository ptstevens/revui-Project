import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface RecordingSessionInfo {
  sessionId: string;
  userId: string;
  tenantId: string;
  recordingCount: number;
  isFirstTimeUser: boolean;
}

export interface UseRecordingWorkflowOptions {
  sessionId?: string;
  tenantId?: string;
  userId?: string;
}

/**
 * Custom hook for managing recording workflow state
 *
 * Implements Story 2.3 Task 2:
 * - Checks if tutorial should be shown (first-time user detection)
 * - Manages tutorial step in workflow
 * - Calls backend to check recording count
 * - Integrates with PreviewVideoTutorial component
 *
 * Integration points:
 * - GET /api/v1/recording-sessions/count?userId={userId}
 * - Returns: { count: number }
 *
 * Tutorial display logic:
 * - Show if: recordingCount === 0 AND localStorage skip !== 'true'
 * - Skip if: user has seen tutorial before (localStorage)
 *
 * @param options - Configuration for workflow (sessionId, tenantId, userId)
 * @returns Workflow state and controls
 */
export function useRecordingWorkflow(options: UseRecordingWorkflowOptions = {}) {
  const [sessionInfo, setSessionInfo] = useState<RecordingSessionInfo | null>(null);
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { sessionId, tenantId = 'default', userId = 'default' } = options;

  /**
   * Check if user has completed any recordings
   * Returns true if user is first-time (count === 0)
   */
  const checkIsFirstTimeUser = useCallback(async (uid: string): Promise<boolean> => {
    try {
      const response = await api.get<{ count: number }>(`/recording-sessions/count`, {
        params: { userId: uid },
      });
      return response.data.count === 0;
    } catch (err) {
      console.error('Failed to check recording count:', err);
      // On error, assume not first-time to avoid blocking workflow
      return false;
    }
  }, []);

  /**
   * Check localStorage for tutorial skip preference
   */
  const hasSkippedTutorial = useCallback((tid: string, uid: string): boolean => {
    const storageKey = `revui_tutorial_skip_${tid}_${uid}`;
    return localStorage.getItem(storageKey) === 'true';
  }, []);

  /**
   * Determine if tutorial should be shown
   * Logic: Show if first-time user AND not skipped before
   */
  const shouldShowTutorialModal = useCallback(async (
    tid: string,
    uid: string
  ): Promise<boolean> => {
    const isFirstTime = await checkIsFirstTimeUser(uid);
    const hasSkipped = hasSkippedTutorial(tid, uid);

    return isFirstTime && !hasSkipped;
  }, [checkIsFirstTimeUser, hasSkippedTutorial]);

  /**
   * Initialize workflow and check tutorial status
   */
  useEffect(() => {
    async function initializeWorkflow() {
      setIsLoadingSession(true);
      setError(null);

      try {
        // Check if tutorial should be shown
        const showTutorial = await shouldShowTutorialModal(tenantId, userId);
        setShouldShowTutorial(showTutorial);

        // Set session info
        setSessionInfo({
          sessionId: sessionId || '',
          userId,
          tenantId,
          recordingCount: showTutorial ? 0 : 1, // Approximation
          isFirstTimeUser: showTutorial,
        });
      } catch (err) {
        const error = err as Error;
        setError(error);
        console.error('Failed to initialize recording workflow:', error);
      } finally {
        setIsLoadingSession(false);
      }
    }

    initializeWorkflow();
  }, [sessionId, tenantId, userId, shouldShowTutorialModal]);

  /**
   * Mark tutorial as completed (called by PreviewVideoTutorial onComplete)
   */
  const completeTutorial = useCallback(() => {
    setShouldShowTutorial(false);
  }, []);

  /**
   * Manually trigger tutorial display (for "Watch Tutorial" button)
   */
  const showTutorial = useCallback(() => {
    setShouldShowTutorial(true);
  }, []);

  return {
    sessionInfo,
    shouldShowTutorial,
    isLoadingSession,
    error,
    completeTutorial,
    showTutorial,
  };
}
