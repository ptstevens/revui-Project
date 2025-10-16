# Tutorial Video Assets

This directory contains tutorial videos for the Revui recording workflow.

## Required Files

### recording-tutorial.mp4
- **Purpose**: 10-second instructional video for first-time users
- **Duration**: ~10 seconds
- **Format**: MP4 (H.264 codec for broad compatibility)
- **Resolution**: 1280x720 (720p recommended for fast loading)
- **File Size**: Target < 2MB for optimal loading
- **Content**: Quick demonstration of:
  - How to select a screen/window
  - Basic recording controls
  - Best practices for screen recording

## Production Checklist

- [ ] Record 10-second tutorial video covering:
  - Screen selection process
  - Recording controls (start, pause, stop)
  - Audio narration tips
  - Webcam overlay (if applicable)

- [ ] Encode video as MP4 (H.264)
  - Use FFmpeg: `ffmpeg -i input.mov -c:v libx264 -preset slow -crf 22 -c:a aac -b:a 128k recording-tutorial.mp4`

- [ ] Optimize file size (target < 2MB)
  - Consider 720p resolution
  - Adjust CRF value (18-28 range, higher = smaller file)

- [ ] Add to CDN (if using external hosting)
  - Update `videoUrl` prop in PreviewVideoTutorial usage

- [ ] Test video playback across browsers:
  - [ ] Chrome
  - [ ] Safari
  - [ ] Firefox
  - [ ] Edge

## Alternative Hosting

If hosting externally (e.g., Cloudflare R2, S3), update the `videoUrl` prop:

```tsx
<PreviewVideoTutorial
  videoUrl="https://cdn.revui.app/videos/recording-tutorial.mp4"
  // ... other props
/>
```

## Fallback

If video file is missing, the component will still render but show a broken video player. Ensure the file is in place before deployment.
