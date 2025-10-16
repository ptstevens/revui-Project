import { useState, useCallback, useRef, useEffect, RefObject } from 'react';

/**
 * Corner snap zones
 */
export type SnapZone = 'tl' | 'tr' | 'bl' | 'br' | null;

/**
 * Position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Options for useDragAndSnap hook
 */
export interface UseDragAndSnapOptions {
  /** Reference to container element for boundary constraints */
  containerRef: RefObject<HTMLElement>;
  /** Initial position (default: bottom-right corner) */
  initialPosition?: Position;
  /** Distance from edge to trigger snap (default: 50px) */
  snapThreshold?: number;
  /** Duration of snap animation in ms (default: 200ms) */
  snapAnimationDuration?: number;
  /** localStorage key for persisting position (optional) */
  storageKey?: string;
  /** Size of draggable element for boundary calculations */
  elementSize?: { width: number; height: number };
}

/**
 * Return type for useDragAndSnap hook
 */
export interface UseDragAndSnapReturn {
  /** Current position of draggable element */
  position: Position;
  /** Whether element is currently being dragged */
  isDragging: boolean;
  /** Current snap zone (tl/tr/bl/br) or null */
  snapZone: SnapZone;
  /** Mouse down handler to initiate drag */
  handleMouseDown: (e: React.MouseEvent) => void;
  /** Touch start handler to initiate drag */
  handleTouchStart: (e: React.TouchEvent) => void;
  /** Reset position to initial state */
  resetPosition: () => void;
}

/**
 * Custom hook for drag-and-drop with snap-to-corner functionality
 *
 * Implements Story 2.5 acceptance criteria:
 * - AC#3: Drag-and-Drop Positioning
 *   - Smooth drag-and-drop with mouse or touch
 *   - Stays within container boundaries
 *   - Position persists via localStorage
 *
 * - AC#4: Snap-to-Corner Grid
 *   - Four snap positions: top-left, top-right, bottom-left, bottom-right
 *   - 50px snap threshold triggers smooth animation
 *   - Default position: bottom-right corner
 *
 * Features:
 * - Mouse and touch event support
 * - Boundary constraints (element stays within container)
 * - Smooth snap animations via CSS transforms
 * - localStorage persistence
 * - Keyboard-accessible (via resetPosition)
 *
 * @param options - Configuration options for drag behavior
 * @returns Drag state and event handlers
 */
export function useDragAndSnap({
  containerRef,
  initialPosition,
  snapThreshold = 50,
  snapAnimationDuration = 200,
  storageKey = 'webcam-position',
  elementSize = { width: 180, height: 135 }, // Default medium size (180px width, 4:3 aspect ratio)
}: UseDragAndSnapOptions): UseDragAndSnapReturn {
  // Load saved position from localStorage or use default
  const getSavedPosition = useCallback((): Position => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.warn('Failed to parse saved position:', e);
        }
      }
    }

    // Default to bottom-right corner
    return initialPosition || { x: window.innerWidth - elementSize.width - 20, y: window.innerHeight - elementSize.height - 20 };
  }, [initialPosition, storageKey, elementSize]);

  const [position, setPosition] = useState<Position>(getSavedPosition);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [snapZone, setSnapZone] = useState<SnapZone>(null);

  const dragStartPos = useRef<Position>({ x: 0, y: 0 });
  const elementStartPos = useRef<Position>({ x: 0, y: 0 });
  const isSnapping = useRef<boolean>(false);

  /**
   * Calculate which snap zone is closest based on position
   */
  const calculateSnapZone = useCallback(
    (pos: Position): SnapZone => {
      if (!containerRef.current) return null;

      const container = containerRef.current.getBoundingClientRect();
      const { width, height } = elementSize;

      // Calculate distances to each corner
      const distanceToTopLeft = Math.sqrt(Math.pow(pos.x, 2) + Math.pow(pos.y, 2));
      const distanceToTopRight = Math.sqrt(Math.pow(container.width - width - pos.x, 2) + Math.pow(pos.y, 2));
      const distanceToBottomLeft = Math.sqrt(Math.pow(pos.x, 2) + Math.pow(container.height - height - pos.y, 2));
      const distanceToBottomRight = Math.sqrt(
        Math.pow(container.width - width - pos.x, 2) + Math.pow(container.height - height - pos.y, 2)
      );

      const minDistance = Math.min(distanceToTopLeft, distanceToTopRight, distanceToBottomLeft, distanceToBottomRight);

      // Check if within snap threshold
      if (minDistance > snapThreshold) return null;

      // Return closest corner
      if (minDistance === distanceToTopLeft) return 'tl';
      if (minDistance === distanceToTopRight) return 'tr';
      if (minDistance === distanceToBottomLeft) return 'bl';
      return 'br';
    },
    [containerRef, elementSize, snapThreshold]
  );

  /**
   * Get snap position for a given zone
   */
  const getSnapPosition = useCallback(
    (zone: SnapZone): Position => {
      if (!containerRef.current || !zone) return position;

      const container = containerRef.current.getBoundingClientRect();
      const { width, height } = elementSize;
      const padding = 20; // 20px padding from edges

      switch (zone) {
        case 'tl':
          return { x: padding, y: padding };
        case 'tr':
          return { x: container.width - width - padding, y: padding };
        case 'bl':
          return { x: padding, y: container.height - height - padding };
        case 'br':
          return { x: container.width - width - padding, y: container.height - height - padding };
        default:
          return position;
      }
    },
    [containerRef, elementSize, position]
  );

  /**
   * Constrain position within container boundaries
   */
  const constrainPosition = useCallback(
    (pos: Position): Position => {
      if (!containerRef.current) return pos;

      const container = containerRef.current.getBoundingClientRect();
      const { width, height } = elementSize;

      return {
        x: Math.max(0, Math.min(pos.x, container.width - width)),
        y: Math.max(0, Math.min(pos.y, container.height - height)),
      };
    },
    [containerRef, elementSize]
  );

  /**
   * Handle mouse move during drag
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || isSnapping.current) return;

      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      const newPosition = constrainPosition({
        x: elementStartPos.current.x + deltaX,
        y: elementStartPos.current.y + deltaY,
      });

      setPosition(newPosition);

      // Update snap zone indicator
      const zone = calculateSnapZone(newPosition);
      setSnapZone(zone);
    },
    [isDragging, constrainPosition, calculateSnapZone]
  );

  /**
   * Handle touch move during drag
   */
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || isSnapping.current || e.touches.length === 0) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartPos.current.x;
      const deltaY = touch.clientY - dragStartPos.current.y;

      const newPosition = constrainPosition({
        x: elementStartPos.current.x + deltaX,
        y: elementStartPos.current.y + deltaY,
      });

      setPosition(newPosition);

      // Update snap zone indicator
      const zone = calculateSnapZone(newPosition);
      setSnapZone(zone);
    },
    [isDragging, constrainPosition, calculateSnapZone]
  );

  /**
   * Handle drag end (mouse up or touch end)
   */
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    // Snap to corner if within threshold
    if (snapZone) {
      isSnapping.current = true;
      const snapPos = getSnapPosition(snapZone);

      // Animate snap
      setPosition(snapPos);

      // Reset snapping flag after animation
      setTimeout(() => {
        isSnapping.current = false;
      }, snapAnimationDuration);

      // Save snapped position to localStorage
      if (storageKey && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(snapPos));
      }
    } else {
      // Save current position to localStorage
      if (storageKey && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(position));
      }
    }
  }, [isDragging, snapZone, getSnapPosition, snapAnimationDuration, storageKey, position]);

  /**
   * Handle mouse down to start drag
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Prevent default to avoid text selection
    e.preventDefault();

    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    elementStartPos.current = position;
  }, [position]);

  /**
   * Handle touch start to start drag
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) return;

    const touch = e.touches[0];
    setIsDragging(true);
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    elementStartPos.current = position;
  }, [position]);

  /**
   * Reset position to initial/default state
   */
  const resetPosition = useCallback(() => {
    const defaultPos = initialPosition || getSnapPosition('br'); // Default to bottom-right
    setPosition(defaultPos);
    setSnapZone('br');

    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(defaultPos));
    }
  }, [initialPosition, getSnapPosition, storageKey]);

  /**
   * Set up event listeners for drag
   */
  useEffect(() => {
    if (!isDragging) return;

    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleDragEnd);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleDragEnd]);

  /**
   * Update position on window resize to stay within bounds
   */
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => constrainPosition(prev));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [constrainPosition]);

  return {
    position,
    isDragging,
    snapZone,
    handleMouseDown,
    handleTouchStart,
    resetPosition,
  };
}
