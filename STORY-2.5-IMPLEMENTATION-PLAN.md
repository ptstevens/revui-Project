# Story 2.5 Implementation Plan: Webcam Overlay with Drag-and-Snap Positioning

**Story ID:** 2.5
**Epic:** Epic 2 - Revui Recording Experience
**Status:** 📋 PLANNING
**Estimated Effort:** 8 story points (~6-8 hours)
**Dependencies:** Story 2.1, 2.2, 2.3, 2.4 (all completed)

---

## Story Overview

**Title:** Webcam Overlay with Drag-and-Snap Positioning

**Description:**
Implement a webcam video overlay component that displays the user's webcam feed during screen recording with drag-and-drop repositioning and snap-to-corner functionality. The webcam overlay provides a personal touch to recordings while maintaining a clean, professional appearance through smart positioning and sizing controls.

**Business Value:**
- Adds personal presence to screen recordings, increasing engagement
- Provides professional video-in-video layout commonly expected in tutorials
- Enables users to maintain eye contact with viewers while demonstrating software
- Differentiates Revui from basic screen recorders
- Increases perceived production value of recordings

---

## Inferred Acceptance Criteria

Based on the story title "Webcam Overlay with Drag-and-Snap Positioning" and industry-standard webcam overlay patterns:

### ✅ AC#1: Webcam Capture and Display
**Criteria:** System captures webcam video via `getUserMedia` and displays it as an overlay during recording

**Implementation Requirements:**
- Capture webcam stream using `navigator.mediaDevices.getUserMedia({ video: true })`
- Display webcam video in HTML `<video>` element overlay
- Webcam feed appears ONLY during recording phase (not in setup or review)
- Handle permission denied errors gracefully
- Support "no webcam" scenario (optional feature)

### ✅ AC#2: Toggle Webcam On/Off
**Criteria:** User can enable/disable webcam overlay during recording

**Implementation Requirements:**
- Toggle button in recording controls to show/hide webcam
- State persists across pause/resume cycles
- Webcam stream released when disabled to save resources
- Clear visual indication of webcam status (on/off)

### ✅ AC#3: Drag-and-Drop Positioning
**Criteria:** User can drag webcam overlay to any position on screen

**Implementation Requirements:**
- Draggable webcam container using mouse/touch events
- Smooth drag experience with visual feedback
- Boundary constraints (keep within recording area)
- Cursor changes to "grab" when hovering over webcam
- Position state preserved during drag operations

### ✅ AC#4: Snap-to-Corner Grid
**Criteria:** Webcam overlay snaps to corner positions when dragged near edges

**Implementation Requirements:**
- Four snap positions: top-left, top-right, bottom-left, bottom-right
- Snap threshold: 50px from edges triggers snap animation
- Visual indication when snap zone is active (highlight or animation)
- Smooth transition animation when snapping
- Default position: bottom-right corner

### ✅ AC#5: Webcam Size Options
**Criteria:** User can select between small, medium, and large webcam sizes

**Implementation Requirements:**
- Three size presets: Small (120px), Medium (180px), Large (240px)
- Size selector UI (dropdown or button group)
- Size preference persisted in localStorage
- Smooth transition animation when changing sizes
- Default size: Medium (180px)

### ✅ AC#6: Mirror/Flip Toggle
**Criteria:** User can mirror (flip) webcam video horizontally for "selfie" view

**Implementation Requirements:**
- Mirror toggle button (common user preference for webcam)
- CSS transform to flip video horizontally
- Mirror state persisted in localStorage
- Visual indication of mirror status
- Default: Mirrored (most natural for users)

### ✅ AC#7: Webcam Overlay Customization
**Criteria:** Webcam overlay has professional appearance with border and shadow

**Implementation Requirements:**
- Circular or rounded rectangle border
- Subtle drop shadow for depth
- Border color: White with slight transparency
- Border thickness: 2-3px
- Professional, clean appearance that doesn't distract from content

### ✅ AC#8: Accessibility
**Criteria:** Webcam overlay controls are fully accessible via keyboard and screen readers

**Implementation Requirements:**
- ARIA labels for all interactive elements
- Keyboard navigation support (Tab, Enter, Arrow keys for positioning)
- Focus indicators for all controls
- Screen reader announcements for state changes
- High contrast mode support

---

## Architecture Design

### Component Structure

```
WebcamOverlay Component
├── useWebcamCapture Hook (webcam stream management)
├── useDragAndSnap Hook (drag-drop + snap logic)
├── WebcamControls (toggle, size, mirror buttons)
└── WebcamPreview (video element with styling)
```

### File Structure

```
apps/frontend/src/
├── components/
│   ├── WebcamOverlay.tsx              (Main overlay component)
│   ├── __tests__/
│   │   └── WebcamOverlay.test.tsx     (Unit tests)
│   └── webcam/
│       ├── WebcamControls.tsx         (Control panel UI)
│       ├── WebcamPreview.tsx          (Video element wrapper)
│       └── __tests__/
│           ├── WebcamControls.test.tsx
│           └── WebcamPreview.test.tsx
├── hooks/
│   ├── useWebcamCapture.ts            (getUserMedia hook)
│   ├── useDragAndSnap.ts              (Drag-drop logic)
│   └── __tests__/
│       ├── useWebcamCapture.test.ts
│       └── useDragAndSnap.test.ts
└── utils/
    └── webcam-positioning.ts           (Snap calculations)

apps/frontend/e2e/
└── webcam-overlay.spec.ts             (E2E tests)
```

### Data Flow

```
RecordingPage
  │
  ├─> useWebcamCapture()
  │     ├─> getUserMedia({ video: true })
  │     └─> webcamStream (MediaStream)
  │
  ├─> WebcamOverlay
  │     ├─> webcamStream (prop)
  │     ├─> isEnabled (state)
  │     ├─> position (state)
  │     ├─> size (state)
  │     └─> isMirrored (state)
  │
  └─> useWebRTCRecorder()
        └─> startRecording(screenStream, micStream, webcamStream)
            (webcamStream passed but NOT recorded, used for UI only)
```

### State Management

**Local Component State:**
- `isWebcamEnabled: boolean` - Webcam on/off
- `position: { x: number; y: number }` - Current position
- `size: 'small' | 'medium' | 'large'` - Current size
- `isMirrored: boolean` - Mirror toggle
- `isDragging: boolean` - Drag state
- `snapZone: 'tl' | 'tr' | 'bl' | 'br' | null` - Active snap zone

**localStorage Persistence:**
- `revui_webcam_size_{userId}` - Preferred webcam size
- `revui_webcam_mirrored_{userId}` - Mirror preference
- `revui_webcam_enabled_{userId}` - Last enabled state

---

## Implementation Tasks

### Task 1: Create `useWebcamCapture` Hook
**File:** `apps/frontend/src/hooks/useWebcamCapture.ts`

**Functionality:**
```typescript
interface UseWebcamCaptureReturn {
  webcamStream: MediaStream | null;
  isLoading: boolean;
  error: Error | null;
  startWebcam: () => Promise<void>;
  stopWebcam: () => void;
  isWebcamAvailable: boolean;
}

export const useWebcamCapture = (): UseWebcamCaptureReturn => {
  // Implementation:
  // 1. Check if getUserMedia is available
  // 2. Request webcam permission on startWebcam()
  // 3. Handle permission denied errors
  // 4. Return MediaStream on success
  // 5. Clean up stream on stopWebcam()
  // 6. Handle errors gracefully
};
```

**Testing:**
- Unit test: Successful webcam capture
- Unit test: Permission denied error handling
- Unit test: No webcam available scenario
- Unit test: Stream cleanup on unmount

**Time Estimate:** 1.5 hours

---

### Task 2: Create `useDragAndSnap` Hook
**File:** `apps/frontend/src/hooks/useDragAndSnap.ts`

**Functionality:**
```typescript
interface UseDragAndSnapOptions {
  containerRef: RefObject<HTMLElement>;
  initialPosition?: { x: number; y: number };
  snapThreshold?: number; // default: 50px
  snapAnimationDuration?: number; // default: 200ms
}

interface UseDragAndSnapReturn {
  position: { x: number; y: number };
  isDragging: boolean;
  snapZone: 'tl' | 'tr' | 'bl' | 'br' | null;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
}

export const useDragAndSnap = (options: UseDragAndSnapOptions): UseDragAndSnapReturn => {
  // Implementation:
  // 1. Track mouse/touch position during drag
  // 2. Update position in real-time
  // 3. Detect when near edge (within snapThreshold)
  // 4. Animate to snap position when released in snap zone
  // 5. Respect container boundaries
  // 6. Cleanup event listeners
};
```

**Testing:**
- Unit test: Drag position updates
- Unit test: Snap to corners detection
- Unit test: Boundary constraints
- Unit test: Event listener cleanup

**Time Estimate:** 2 hours

---

### Task 3: Create `WebcamPreview` Component
**File:** `apps/frontend/src/components/webcam/WebcamPreview.tsx`

**Functionality:**
```typescript
interface WebcamPreviewProps {
  stream: MediaStream | null;
  size: 'small' | 'medium' | 'large';
  isMirrored: boolean;
  position: { x: number; y: number };
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

export const WebcamPreview: React.FC<WebcamPreviewProps> = ({
  stream,
  size,
  isMirrored,
  position,
  isDragging,
  onMouseDown,
  onTouchStart,
}) => {
  // Implementation:
  // 1. Render <video> element with stream
  // 2. Apply size styles (120px, 180px, 240px)
  // 3. Apply mirror transform if enabled
  // 4. Apply position (absolute positioning)
  // 5. Apply border and shadow styles
  // 6. Handle drag events
  // 7. Auto-play webcam video
  // 8. Cursor styles (grab/grabbing)
};
```

**Testing:**
- Unit test: Video element renders with stream
- Unit test: Size classes applied correctly
- Unit test: Mirror transform applied
- Unit test: Position styles applied
- Unit test: Drag event handlers wired

**Time Estimate:** 1 hour

---

### Task 4: Create `WebcamControls` Component
**File:** `apps/frontend/src/components/webcam/WebcamControls.tsx`

**Functionality:**
```typescript
interface WebcamControlsProps {
  isEnabled: boolean;
  size: 'small' | 'medium' | 'large';
  isMirrored: boolean;
  onToggle: () => void;
  onSizeChange: (size: 'small' | 'medium' | 'large') => void;
  onMirrorToggle: () => void;
}

export const WebcamControls: React.FC<WebcamControlsProps> = ({
  isEnabled,
  size,
  isMirrored,
  onToggle,
  onSizeChange,
  onMirrorToggle,
}) => {
  // Implementation:
  // 1. Toggle button (camera icon, on/off state)
  // 2. Size selector (S/M/L buttons or dropdown)
  // 3. Mirror toggle button (flip icon)
  // 4. ARIA labels for accessibility
  // 5. Visual state indicators
  // 6. Keyboard navigation support
};
```

**Testing:**
- Unit test: Toggle button calls onToggle
- Unit test: Size buttons call onSizeChange
- Unit test: Mirror button calls onMirrorToggle
- Unit test: ARIA labels present
- Unit test: Keyboard navigation works

**Time Estimate:** 1 hour

---

### Task 5: Create `WebcamOverlay` Main Component
**File:** `apps/frontend/src/components/WebcamOverlay.tsx`

**Functionality:**
```typescript
interface WebcamOverlayProps {
  isRecording: boolean;
  onWebcamToggle?: (enabled: boolean) => void;
}

export const WebcamOverlay: React.FC<WebcamOverlayProps> = ({
  isRecording,
  onWebcamToggle,
}) => {
  const { webcamStream, startWebcam, stopWebcam, error } = useWebcamCapture();
  const [isEnabled, setIsEnabled] = useState(false);
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [isMirrored, setIsMirrored] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const {
    position,
    isDragging,
    snapZone,
    handleMouseDown,
    handleTouchStart,
  } = useDragAndSnap({ containerRef, initialPosition: { x: window.innerWidth - 250, y: window.innerHeight - 250 } });

  // Implementation:
  // 1. Load preferences from localStorage
  // 2. Start webcam when enabled
  // 3. Stop webcam when disabled
  // 4. Handle toggle, size, mirror changes
  // 5. Render WebcamPreview with position/size
  // 6. Render WebcamControls
  // 7. Show error message if permission denied
  // 8. Clean up stream on unmount
};
```

**Testing:**
- Unit test: Component renders when recording
- Unit test: Component hidden when not recording
- Unit test: Webcam starts when enabled
- Unit test: Webcam stops when disabled
- Unit test: localStorage preferences loaded
- Unit test: Error handling for permission denied

**Time Estimate:** 1.5 hours

---

### Task 6: Integrate into RecordingPage
**File:** `apps/frontend/src/pages/RecordingPage.tsx`

**Changes Required:**
1. Import WebcamOverlay component
2. Add state for webcam enabled status
3. Render WebcamOverlay during recording phase
4. Pass isRecording prop from phase state

**Code Changes:**
```typescript
// Add import
import { WebcamOverlay } from '../components/WebcamOverlay';

// In render, during recording phase:
{phase === 'recording' && (
  <>
    <RecordingControls
      recordingState={recorder.state}
      duration={recorder.duration}
      estimatedSize={recorder.getEstimatedSize()}
      screenType={selectedScreenType}
      sourceName={selectedSourceName}
      onPause={handlePauseRecording}
      onResume={handleResumeRecording}
      onStop={handleStopRecording}
      onChangeSource={handleRequestReselection}
      showMetadata={true}
      showChangeSource={true}
    />

    <WebcamOverlay
      isRecording={true}
      onWebcamToggle={(enabled) => console.log('Webcam toggled:', enabled)}
    />
  </>
)}
```

**Testing:**
- Integration test: WebcamOverlay renders during recording
- Integration test: WebcamOverlay hidden during setup/review

**Time Estimate:** 0.5 hours

---

### Task 7: Create Unit Tests
**Files:**
- `apps/frontend/src/hooks/__tests__/useWebcamCapture.test.ts`
- `apps/frontend/src/hooks/__tests__/useDragAndSnap.test.ts`
- `apps/frontend/src/components/__tests__/WebcamOverlay.test.tsx`
- `apps/frontend/src/components/webcam/__tests__/WebcamControls.test.tsx`
- `apps/frontend/src/components/webcam/__tests__/WebcamPreview.test.tsx`

**Test Coverage Goals:**
- 18+ unit test cases covering all components and hooks
- Mock getUserMedia in tests (already available in test/setup.ts)
- Test drag-drop logic with simulated mouse events
- Test snap-to-corner calculations
- Test localStorage persistence
- Test error handling (permission denied, no webcam)
- Test accessibility (ARIA labels, keyboard nav)

**Time Estimate:** 2 hours

---

### Task 8: Create E2E Tests
**File:** `apps/frontend/e2e/webcam-overlay.spec.ts`

**Test Scenarios:**
1. Webcam overlay appears when recording starts
2. Toggle webcam on/off during recording
3. Drag webcam to different positions
4. Snap webcam to corners
5. Change webcam size (S/M/L)
6. Toggle mirror mode
7. Webcam preferences persist across sessions
8. Error message shown when permission denied
9. Webcam hidden during setup and review phases
10. Keyboard navigation works for all controls

**Time Estimate:** 1.5 hours

---

### Task 9: Create Completion Report
**File:** `STORY-2.5-COMPLETION-REPORT.md`

**Contents:**
- Story overview and business value
- Acceptance criteria validation
- Implementation summary
- Test coverage details
- Integration points
- Technical highlights
- Known limitations and future enhancements
- Deployment checklist
- Team notes

**Time Estimate:** 0.5 hours

---

## Total Estimated Time: 11.5 hours

**Breakdown:**
- Hook development: 3.5 hours
- Component development: 3.5 hours
- Integration: 0.5 hours
- Testing: 3.5 hours
- Documentation: 0.5 hours

---

## Technical Considerations

### Browser Compatibility

**getUserMedia Support:**
- Chrome 53+ ✅
- Firefox 36+ ✅
- Safari 11+ ✅
- Edge 79+ ✅

**Constraint:** All target browsers support getUserMedia

### Performance Optimization

1. **Lazy Stream Initialization**
   - Don't start webcam until user enables it
   - Release stream immediately when disabled

2. **CSS Transforms for Positioning**
   - Use `transform: translate()` for smooth drag (GPU accelerated)
   - Avoid layout thrashing with `position: absolute`

3. **Debounced Position Updates**
   - Update position max 60fps during drag
   - Use `requestAnimationFrame` for smooth animation

### Accessibility

1. **Keyboard Navigation**
   - Tab to focus webcam overlay
   - Arrow keys to move position (10px increments)
   - Enter to toggle mirror
   - Space to toggle webcam on/off

2. **Screen Reader Support**
   - ARIA labels for all controls
   - Live region announcements for state changes
   - Alt text for webcam video

3. **High Contrast Mode**
   - Ensure border visible in high contrast
   - Use system colors where appropriate

---

## Design Specifications

### Webcam Sizes

| Size   | Dimensions | Use Case                    |
|--------|------------|-----------------------------|
| Small  | 120×120px  | Minimal presence            |
| Medium | 180×180px  | Standard (default)          |
| Large  | 240×240px  | Emphasis on presenter       |

### Border and Shadow

```css
.webcam-preview {
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-radius: 50%; /* circular */
}
```

### Snap Positions

```typescript
const SNAP_POSITIONS = {
  'tl': { x: 20, y: 20 },           // top-left
  'tr': { x: window.innerWidth - 200, y: 20 },  // top-right
  'bl': { x: 20, y: window.innerHeight - 200 }, // bottom-left
  'br': { x: window.innerWidth - 200, y: window.innerHeight - 200 }, // bottom-right (default)
};
```

### Animation Timing

- Snap animation: 200ms ease-in-out
- Size change: 150ms ease-in-out
- Toggle fade: 300ms ease-in-out

---

## Error Handling

### Permission Denied

**Scenario:** User denies webcam access

**Handling:**
```typescript
if (error?.name === 'NotAllowedError') {
  return (
    <div className="webcam-error">
      <p>Webcam access denied. Recording will continue without webcam.</p>
      <button onClick={requestPermissionAgain}>Grant Permission</button>
    </div>
  );
}
```

### No Webcam Available

**Scenario:** Device has no webcam

**Handling:**
```typescript
if (error?.name === 'NotFoundError') {
  return (
    <div className="webcam-info">
      <p>No webcam detected. Recording will continue without webcam.</p>
    </div>
  );
}
```

### Stream Interruption

**Scenario:** Webcam disconnected during recording

**Handling:**
```typescript
videoTrack.onended = () => {
  setIsEnabled(false);
  showNotification('Webcam disconnected. Recording continues.');
};
```

---

## Future Enhancements

### Optional Improvements (Not in Scope for Story 2.5)

1. **Background Blur/Removal**
   - Use Canvas API or TensorFlow.js for background effects
   - Requires significant additional development

2. **Virtual Backgrounds**
   - Replace background with custom images
   - Requires background segmentation

3. **Picture-in-Picture Mode**
   - Enable browser PiP API for webcam overlay
   - Allows webcam to float outside recording area

4. **Face Detection**
   - Auto-center face in webcam frame
   - Requires ML model integration

5. **Recording Webcam to Final Video**
   - Composite webcam into final recording (not just overlay)
   - Requires significant MediaRecorder architecture changes

---

## Dependencies

### Runtime Dependencies
- React 18+
- `navigator.mediaDevices.getUserMedia` (browser API)
- localStorage (browser API)

### Development Dependencies
- Vitest (unit testing)
- React Testing Library
- Playwright (E2E testing)
- TypeScript

### Internal Dependencies
- useWebRTCRecorder hook (pass webcam stream, though not recorded)
- RecordingPage (integration point)

---

## Risks and Mitigation

### Risk 1: Browser Permission UX
**Risk:** Users may be confused by dual permissions (screen + webcam)

**Mitigation:**
- Make webcam optional (can record without it)
- Clear messaging about why webcam permission is requested
- Graceful degradation if permission denied

### Risk 2: Performance Impact
**Risk:** Webcam stream + screen recording may impact performance

**Mitigation:**
- Lazy initialization (only start when enabled)
- Release stream immediately when disabled
- Monitor performance in testing

### Risk 3: Mobile Browser Support
**Risk:** Mobile browsers may not support getUserMedia well

**Mitigation:**
- Already blocking mobile devices (see RecordingPage.tsx:227-246)
- No additional work needed

---

## Success Criteria

Story 2.5 is complete when:

- ✅ All 8 acceptance criteria validated
- ✅ 18+ unit tests passing
- ✅ 10+ E2E tests passing
- ✅ TypeScript compilation successful
- ✅ No ESLint errors
- ✅ Accessibility verified (ARIA, keyboard nav)
- ✅ Browser compatibility validated
- ✅ Completion report created
- ✅ Code review approved
- ✅ Integration with RecordingPage complete

---

## Next Steps

After implementation plan approval:

1. Create feature branch: `feature/story-2.5-webcam-overlay`
2. Implement tasks 1-9 in sequence
3. Run all tests and verify passing
4. Create completion report
5. Request code review
6. Merge to main branch
7. Proceed to Story 2.6: Voice Narration Capability

---

**Plan Created:** 2025-10-16
**Author:** Claude Code
**Epic:** Epic 2 - Revui Recording Experience
**Status:** 📋 READY FOR IMPLEMENTATION
