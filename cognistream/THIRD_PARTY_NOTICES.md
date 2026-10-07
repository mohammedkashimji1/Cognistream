# Third-party notices

This project integrates third-party software. See installed packages for their complete licences and notices.

- React and React DOM: Meta and contributors; MIT licence.
- Vite and its React plugin: Vite contributors; MIT licence.
- MediaPipe Tasks Vision and Face Landmarker assets: Google and contributors. Package distribution includes its licence; the model's authoritative download/source is the [Google MediaPipe model documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/index#models). Retain upstream licence files distributed alongside the runtime. Review upstream terms before redistribution beyond an academic prototype.
- FastAPI: FastAPI contributors; MIT licence.
- Uvicorn: Encode and contributors; BSD licence.
- HTTPX: Encode and contributors; BSD licence.
- python-dotenv: python-dotenv contributors; BSD licence.
- FFmpeg was used to encode the original sample slide video. It is not included as a runtime dependency.
- The sample lesson text and visual cards were authored for this prototype; no third-party lecture footage is bundled.

The Gemini API is an optional external service subject to Google's current terms and account limits.

- Inter font: Rasmus Andersson and contributors, SIL Open Font License 1.1. Locally bundled from Fontsource Inter 5.3.0. Full font licence: `frontend/public/fonts/OFL.txt`.
- Narration was generated with edge-tts using a synthetic English voice; no speaker identity or original third-party lecture recording is imitated. edge-tts is a build-time Python tool, not bundled as app runtime.
