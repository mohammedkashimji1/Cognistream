# Tomorrow's demonstration

## Before leaving for college

1. Run setup while you have internet. Verify the app on the actual review laptop.
2. Confirm camera permission and five-second calibration.
3. Verify that a sustained expression can trigger the pause on your face. Watch the score and choose a sensible threshold. If it is unreliable, explain the limitation.
4. Try one full support → resume cycle and export the session log.
5. If using Gemini, verify an answer labelled **Live Gemini explanation**. A configured key alone is not proof of a working API request.
6. Record a 45–60 second screen recording using your laptop's recording tool. Record an actual automatic trigger if it works. Keep any simulated demonstration explicitly labelled.
7. Keep a copy of the extracted project and the original ZIP on the laptop. Bring your charger.

## A two-minute live demo

| Time | Action | Explanation |
|---|---|---|
| 0:00 | Show learning studio and press Play | “This original lecture has English narration, captions, and a clickable transcript.” |
| 0:15 | Enable camera, remain neutral | “Calibration gives us the individual normal-expression baseline.” |
| 0:30 | Show live contours and cue score | “The pretrained model runs locally in the browser.” |
| 0:45 | Hold the selected expression | “The rule requires a sustained change instead of a brief movement.” |
| 1:00 | Show the paused video and context | “The timestamp selects the recent lecture segment.” |
| 1:15 | Show support label and explanation | “This is live Gemini / prepared sample support, as labelled.” |
| 1:30 | Resume and show cooldown | “The learner controls continuation; cooldown limits repeat pauses.” |
| 1:45 | Show session activity | “Automatic, manual, and demo events are recorded separately.” |

If camera triggering does not work under review conditions, use **Help me understand** or **Review demo → Simulate intervention** and explicitly say it is a manual trigger. The simulation demonstrates integration, not facial detection performance.

## Evidence to show

- Running interface and facial contours.
- Selected transcript excerpt and pause timestamp.
- Source-labelled explanation and resumption.
- `VisionPanel.jsx` for model/calibration.
- `core.js` for scoring and sustained timing.
- `backend/main.py` for Gemini and fallback handling.
- API docs at `127.0.0.1:8000/docs`.
- JSON event export. Do not expose `.env` or any key.

## Suggested PPT content

Title → problem and objectives → architecture → implemented modules → screenshots/live demo → validation performed → remaining work → conclusion. Reuse only literature papers whose titles, authors, and reported findings you have verified against real sources.
