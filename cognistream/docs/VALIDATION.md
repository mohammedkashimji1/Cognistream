# Validation of v0.2

Checks performed on October 6, 2026. The checked package includes the production UI and generated sample assets.

## Passed

- React/Vite production build and npm dependency audit (zero reported vulnerabilities).
- Four JavaScript tests covering sustained timing/reset rules, baseline scoring, VTT/SRT parsing and context windows, invalid timestamps/metadata, safe caption roundtrip and bounded recent context.
- Five Python API tests covering prepared/custom separation, input validation, mocked Gemini success/failure, key-safe health, and explanation alignment with every chapter of the generated lesson manifest.
- Real Chromium browser checks against the running FastAPI production app: sample asset loading, video playback/pause, chapter seeking, caption toggling, playback speed, help/checkpoint/resume, transcript uploads, stale-caption clearing when changing videos, custom-context fallback, request failure and retry without duplicate events, and desktop/mobile overflow.
- Local MediaPipe model and WASM initialization, face inference, continuous five-second calibration and camera shutdown, using a prerecorded portrait as a virtual camera fixture. This tests the camera/model pipeline; it is not a test of a person's natural expression changes.
- Three-second sustained automatic intervention using injected expression coefficients after real model calibration. This tests timing, pause, request and modal integration; it is a simulated expression test, not detection-accuracy evidence.
- H.264 video with AAC narration: 1280 × 720, 230.66 seconds, six chapters, 44 sentence captions. Matching VTT, SRT and plain-text transcripts are included. Captions and chapter positions come from narration boundary timings and encoded segment lengths.
- Actual desktop, support-panel and mobile browser screenshots are included in this folder. Caption switching disables stale text tracks, and camera shutdown clears the contour overlay.

## Still requires the review laptop

- Physical webcam performance, calibration in actual lighting, naturally produced brow/squint cues and reliable triggers on a person.
- A live Gemini request using your key. No user key was provided here; mocked provider handling and real prepared/extractive fallback were checked.
- Windows batch execution and the upgrade copy operation. The app was built and checked on Linux. Manual Windows commands are supplied because Smart App Control blocked unsigned batch execution in the user's setup.
- Cognitive-load accuracy, confusion validity, demographic robustness and learning improvements. These need a participant study; no accuracy percentage is claimed.

Before review, verify one actual camera-triggered pause on your laptop, one support/resume cycle, and live Gemini if you will demonstrate it. Keep prepared notes and manual simulations clearly identified.
