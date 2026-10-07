# Review 2 — what to explain

## Opening explanation, in easy words

“Our project is an adaptive learning video player. While a student watches a lecture, a pretrained model tracks facial expression cues locally through the webcam. We compare those cues with the student's normal expression. If selected changes remain above a threshold, the player pauses. We select the recent lecture transcript and provide a simpler explanation. The student chooses when to continue. Our current detection rule is experimental; we will validate it with user testing.”

## Team responsibilities

| Member | Main module | Files to understand | Presentation focus |
|---|---|---|---|
| Mohammed Jawwad | Computer vision and heuristic | `VisionPanel.jsx`, scoring/timing in `core.js` | Camera, pretrained model, baseline, thresholds, limitations |
| Mohammed Kashimji | Python and generative support | `backend/main.py`, `.env.example` | API validation, prompting, server-side key, fallback labels |
| Umair Hafiz | Frontend and integration | `App.jsx`, `style.css`, subtitle functions in `core.js` | Video timestamp, transcript window, modal, resume, session log |

These are proposed ownership assignments. Each member should run, test, and understand their module. Do not claim someone implemented code independently if they have not worked on it; describe AI-assisted development honestly if asked.

## Jawwad's explanation

“We use MediaPipe's pretrained Face Landmarker. It gives us facial positions and expression coefficients. We do not train it from scratch. The browser captures the camera after permission and processes the frames locally. We draw face contours so the tracking is visible.”

“We collect approximately five seconds of normal-expression samples for calibration. Then we subtract the baseline from brow-lowering and squinting coefficients. The weighted rule uses 65% brow and 35% squint contribution, scales the value to a 0–100 cue score, and smooths it over successive observations. These are experimental parameters.”

“Our trigger uses three seconds of sustained observed cues, not thirty assumed frames. If the face disappears, the video is paused, the user seeks, the tab is hidden, or observations have a large gap, the timer resets. There is a ten-second cooldown after the support panel closes.”

If asked “Is this really confusion detection?”:

“It detects facial expression cues that we hypothesise may sometimes accompany difficulty. We have not established that a high score means confusion. We will evaluate false triggers and missed requests using participant feedback.”

## Kashimji's explanation

“FastAPI is our Python backend. It receives text context, the pause timestamp, lesson ID, and trigger reason. It validates the request and returns structured explanation fields. It has an interactive `/docs` page for testing.”

“When Gemini is configured, the backend sends only the transcript excerpt to the language model. The prompt asks for a short explanation, an analogy, and a self-check question. The API key stays on the backend. We use a timeout and validate the returned JSON.”

“With no key or when the provider fails, we clearly label the fallback. The bundled lecture has prewritten teaching notes. A custom lecture gets a literal excerpt rather than unrelated sample content. We do not claim those fallback notes are generated.”

If asked “Does your prompt eliminate hallucinations?”:

“No. Restricting context and prompting carefully can reduce unsupported responses, but generated output still needs checking. We have not measured factual accuracy yet.”

## Umair's explanation

“React manages the video, camera, help panel, and session activity. HTML5 provides the current timestamp and pause/play methods. We parse timestamped VTT or SRT cues and select those overlapping the preceding thirty seconds.”

“When an intervention occurs, we pause the video, capture context, and call the backend. We show its response with the correct source label. The student chooses Stay paused or Resume lecture. We record the event reason and lecture timestamp locally, and provide JSON export.”

“A separate labelled simulation button demonstrates downstream integration without pretending the camera triggered it. Loading a new video clears the old transcript to prevent mismatched explanations.”

## Common questions

| Question | Honest answer |
|---|---|
| Which part is AI/ML? | MediaPipe runs a pretrained ML model; Gemini is the optional language model. The cue score itself is a hand-designed rule. |
| Did you train a CNN? | No. We reuse a pretrained model and implement calibration, scoring, and integration around it. |
| Which framework runs where? | React/Vite in the browser; FastAPI in Python; MediaPipe locally in the browser; Gemini remotely through the backend. |
| Why process the webcam locally? | It avoids uploading camera frames and reduces reliance on a remote vision service. |
| Is it fully offline? | The sample player, local model, and prepared support can work offline after setup. Live Gemini needs internet. |
| Is there a database? | No database service in this scope. Small event history is stored in this browser's local storage. |
| Does it use RAG? | It uses timestamp-selected transcript context. It does not yet include an embedding/vector retrieval system; do not claim a full RAG implementation. |
| Is the score a confidence percentage? | No. It is an experimental scaled cue score, not a calibrated probability. |
| Why use three seconds? | It is an initial design choice to suppress very brief changes. We still need to tune it through evaluation. |
| How much is complete? | The core lecture → cue tracking → pause → context → support → resume flow is implemented. Completion against the college rubric is for the reviewers to assess. |
| What is pending? | User testing, threshold evaluation, error analysis, more lecture support, speech-to-text, browser performance improvements, and deployment. |
| What are the practical limits? | Lighting, camera angle, glasses/occlusion, personal expression differences, frame rate, and cues unrelated to understanding. |

## Suggested remaining evaluation

Obtain participant consent; ask whether each intervention was helpful or unnecessary. Compare supported playback with standard playback for a small prepared lecture. Record false interventions, missed self-reported difficulty, response latency, and a short understanding check. Clearly distinguish subjective ratings from objective accuracy. Do not put invented percentages in the PPT.

## Short conclusion

“For Review 2, we have integrated the main modules into a working prototype. The next stage is validating whether the intervention rule is useful and improving its reliability across learners and devices.”

## v0.2 interface and lecture improvements

The UI uses a green sidebar, light study workspace, setup steps, optional camera controls, native captions, speed selection, clickable chapters and transcript, and an accessible help dialog. The original neural-network lecture contains synthetic English narration, six illustrated chapters, 44 timed captions, and VTT/SRT/plain-text transcripts. A chapter manifest keeps prepared teaching notes aligned with the regenerated video. The self-check options are prepared educational content, not a learning-outcome study. Vite was updated to 7.3.7; the dependency audit reported zero known vulnerabilities at packaging time.

Pillow renders the original educational slides and FFmpeg combines them with generated narration into H.264/AAC MP4. These tools run when preparing the sample media; the app itself uses the browser's HTML5 video player. There is no automatic transcription feature for uploaded lectures.
