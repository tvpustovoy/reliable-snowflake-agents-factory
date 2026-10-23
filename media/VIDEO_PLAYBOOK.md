# VIDEO_PLAYBOOK.md — how an agent makes the demo video

*Purpose: a self-contained recipe for an AI coding agent to produce a short (30–60 s, 1080p) explainer/demo video from code.
Inputs: a script (acts + narration), numbers from Snowflake (aggregates only).
Outputs: `renders/*.mp4` with voiceover. Built and tested 23.10.2026.*

Two pipelines were built and compared on the same 30 s script (problem → Frosty → impact):

| | A. HyperFrames + GSAP (+ three.js as background) | B. Pure three.js + Puppeteer + FFmpeg |
|---|---|---|
| Best for | text, numbers, cards, scorecards, captions | cinematic 3D: camera moves, particles, crystal |
| Code | ~150 lines, one HTML file | ~200 lines scene + capture script |
| Iterations to first good render | 1 (minor font/width fix) | 3 (camera inside particles, invisible points) |
| Render time, 30 s @1080p | ~18 s | ~39 s (900 frames) |
| QA | built-in `check` (layout, contrast, dead stretches) + contact sheet | manual stills only |
| Audio | native `<audio>` clips on the timeline | muxed afterwards with FFmpeg |

**Default recommendation: hybrid.** Use A as the main pipeline (all text/data scenes, audio, final assembly). Use B only for 1–2 hero shots and drop the rendered clip into A as a `<video>` background.

Requirements: Node.js ≥ 22, FFmpeg, macOS/Linux with a GPU-capable Chrome (downloaded automatically).

---

## Pipeline A — HyperFrames + GSAP

HyperFrames (github.com/heygen-com/hyperframes) renders an HTML page with a seekable timeline into a deterministic MP4.

### Setup
```bash
npx -y hyperframes telemetry disable
HYPERFRAMES_SKIP_SKILLS=1 npx -y hyperframes init <name> --example blank --non-interactive --resolution landscape
cd <name>
```
`init` pins the CLI version in `package.json`. Use `--non-interactive` (agents cannot answer prompts); `--yes` does not exist.

### Composition contract (must follow or the render breaks)
- Root element: `data-composition-id="main" data-start="0" data-duration="<sec>" data-width="1920" data-height="1080"`.
- Every timed element: `class="clip" data-start data-duration data-track-index` (overlapping elements need different track indexes).
- One **paused** GSAP timeline registered as `window.__timelines["main"] = tl; tl.seek(0);`. The renderer seeks it frame by frame. Never use `setTimeout`, `requestAnimationFrame` loops or `Date.now()`.
- Keep the timeline as long as the video: `tl.to({t:0}, {t: DUR, duration: DUR, ease: "none"}, 0)`.
- three.js inside A: a `<canvas class="clip" data-layout-allow-overflow>`, the scene drawn from `tl`'s `onUpdate: () => draw(tl.time())`. Every particle position must be a pure function of `t` (seeded PRNG, no accumulated state) so any frame can be rendered on its own.
- Text ≥ 28 px; start a new motion within 3 s, or mark deliberate stills with `data-hold`.

### Work loop
```bash
npm run check                                   # lint + layout + contrast + motion; fix all errors, review warnings
npx hyperframes snapshot --at 2,9,12,17,24,28   # PNGs + contact-sheet.jpg in .hyperframes/artifacts/snapshots/
#   -> open contact-sheet.jpg and look at it before rendering
npm run render                                  # -> renders/<name>_<date>.mp4
ffmpeg -i renders/<file>.mp4 -c:v libx264 -crf 23 -preset fast -movflags +faststart renders/<name>_v1.mp4   # ~2.5x smaller
```
`npx hyperframes docs <topic>` (`data-attributes`, `gsap`, `compositions`, `rendering`, `troubleshooting`) works offline.

### Scene pattern used
Three 10 s acts, each a `.act` block (kicker + headline + sub) faded in/out by a helper:
```js
const inOut = (sel, at, len) => {
  tl.fromTo(sel, {opacity:0, y:40}, {opacity:1, y:0, duration:0.8, ease:"power3.out"}, at);
  tl.to(sel, {opacity:0, y:-20, duration:0.6, ease:"power2.in"}, at + len - 0.6);
};
```
Counters: tween a plain object and write `textContent` in `onUpdate`.

---

## Pipeline B — pure three.js + Puppeteer + FFmpeg

### Setup
```bash
mkdir <name> && cd <name> && npm init -y && npm i puppeteer three@0.149.0
```
(`three@0.149` still ships `build/three.min.js`, so a plain `<script>` tag works without a bundler.)

### Scene contract
- `index.html` exposes `window.DUR` and `window.renderAt(t)`, which sets **all** state from `t` and calls `renderer.render`. Renderer: `preserveDrawingBuffer: true`.
- Text: draw on a 2D canvas → `THREE.CanvasTexture` → `PlaneGeometry`, `depthWrite:false, fog:false`. For HUD text, place the plane at a fixed offset in front of the camera every frame and copy `camera.quaternion`.
- Blend between act states with `smoothstep(t0, t1, t)` and lerp: positions, colors, camera position, look-at target.

### Capture
`render.mjs`: launch Puppeteer (`--use-angle=metal --enable-gpu --allow-file-access-from-files`), viewport 1920×1080. For each frame `f`, call `renderAt(f/30)`, take a JPEG screenshot and write it to `ffmpeg -f image2pipe -framerate 30 -i - -c:v libx264 -pix_fmt yuv420p -crf 20 out.mp4`. Respect stdin backpressure (`drain`).
Add a stills mode (`node render.mjs 3,12,24` → PNGs). Always check stills, stitched with `ffmpeg ... xstack` or `hstack`, before the full render.

### Pitfalls we hit
- **Camera flies through particles** → huge squares on screen. Use `sizeAttenuation:false` (screen-space px size) and keep camera paths outside the cloud.
- **Particles invisible far from the camera** → raise `material.size` during that act (`size = base + flow*3.5`).
- Mind the stacking order of `lerp`s between acts: later act targets must override earlier ones.

---

## Audio

### Voiceover — Gemini TTS (REST, stdlib Python, no SDK)
- Key: Google AI Studio → https://aistudio.google.com/apikey. A Gemini consumer subscription does **not** give API access. Pass it as `GEMINI_API_KEY` from a secret store; never commit it or paste it into chat.
- Free tier: **3 requests/min** for `gemini-3.8-flash-tts` (HTTP 429 says how long to wait). Make one request per line and sleep ~20 s between requests, or batch fewer lines.
- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/interactions`, header `x-goog-api-key`. Body:
```json
{"model":"gemini-3.8-flash-tts",
 "input":[{"type":"user_input","content":[{"type":"text","text":"Meet Frosty. <short pause> ...",
   "annotations":[{"type":"speech_metadata","style":"confident, warm, unhurried"}]}]}],
 "response_format":{"type":"audio"},
 "generation_config":{"speech_config":[{"voice":"Kore"}]}}
```
  The audio is base64 in `steps[].content[]` where `type=="audio"`. It is a complete WAV (24 kHz mono), so write the bytes straight to `.wav`.
- Text is read **verbatim**. Delivery goes in `style`. Pauses and vocal events go inline as `<short pause>`, `<long pause>`, `<sigh>`, `<breath>`. CAPS add emphasis.
- Female English voices to audition: Kore (firm), Sulafat (warm), Aoede (breezy), Zephyr (bright), Despina (smooth), Vindemiatrix (gentle). We used **Kore**.
- Budget ~2.3 words/s: a 10 s act holds a ~20-word line (ours came out at 8.3–9.0 s). Check with `ffprobe -show_entries format=duration`.
- Reference script: `video/tts/tts.py` in the working repo. It holds a `SCRIPT` list of `(id, start_sec, style, text)`; `--voices` auditions line 1 in several voices.

### Placing lines on the timeline
```bash
ffmpeg -i 01.wav -i 02.wav -i 03.wav -filter_complex \
 "[0]adelay=600|600[a];[1]adelay=10800|10800[b];[2]adelay=20600|20600[c];\
  [a][b][c]amix=inputs=3:normalize=0,apad=whole_dur=30[o]" -map "[o]" -t 30 voiceover.wav
```
Start each line ~0.3–0.8 s after its act's text appears.

### Mux with video
```bash
ffmpeg -i video.mp4 -i voiceover.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest video_voice.mp4
```
In pipeline A you can instead add `<audio class="clip" src="voiceover.wav" data-start="0" data-duration="30" data-track-index="9">` and render once.

### Music bed and SFX (optional)
- CC0 sources only (e.g. the opus-sound-layer library). Duck the music under the voice: `[music]volume=0.15[m];[voice][m]amix=inputs=2:normalize=0`, or sidechain with `sidechaincompress`.
- To cut on the beat, get beat times with `librosa.beat.beat_track` and use them as GSAP positions.
- Loudness for web: `loudnorm=I=-16:TP=-1.5:LRA=11` on the final mix.

---

## Checklist before publishing a video
- [ ] Only aggregates and synthetic or redacted text on screen (AGENTS.md rule 2)
- [ ] No placeholder metrics presented as results: every number traces to a query in `queries/`
- [ ] Stills reviewed; `check` clean (pipeline A)
- [ ] Voice lines fit their acts; final loudness normalized
- [ ] Link/file recorded in `media/video.md`
