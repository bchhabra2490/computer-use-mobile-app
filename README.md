# Jarvis Remote

Personal companion phone app for a macOS voice computer-use agent (Jarvis). The Mac already runs the agent, microphone, TTS, and desktop control. This app is a second surface: send text commands and watch live status. It is **not** a second agent.

The phone never calls OpenAI, Sarvam, or any LLM. It never streams mouse/keyboard events and never talks to ZeroMQ. HTTP + SSE only, against the Mac’s phone gateway.

## Pair with the Mac

1. On the Mac:

   ```bash
   PHONE_GATEWAY=1 python orchestrator.py --auto
   ```

2. Copy the printed URL (`http://<mac-lan-ip>:8742`) and the **5-character** `Authorization: Bearer` token.
3. In the app, enter **host**, **port** (default **8742**), and the token (exactly 5 characters). Tap **Test connection**, then **Save**.

Same Wi‑Fi or Tailscale. The gateway binds **cleartext HTTP** (not HTTPS) on the LAN.

### Network notes

| Path | How |
| --- | --- |
| Same Wi‑Fi | Use the Mac’s LAN IP printed when the gateway starts |
| Android hotspot | Usually works |
| iPhone Personal Hotspot | Often **cannot** reach the Mac. Use Tailscale IPs or USB tethering instead |
| Away from home | Tailscale on Mac + phone; paste the Mac’s Tailscale IP the same way (`100.x.y.z`) |

Do not scan the internet. Host is entered manually. CORS is `*` so web preview works.

iOS will prompt for **Local Network**, **Microphone**, and **Camera** (a still for `/v1/photo`). The phone does not run STT or vision — the Mac transcribes `/v1/audio` and looks at `/v1/photo`.

## Project layout

```
src/app/index.tsx      Home (or redirect to pair)
src/app/pair.tsx
src/app/settings.tsx
src/app/compose.tsx    Deep link from the home widget
src/api/client.ts      fetch wrappers (health 8s, others 5s)
src/api/sse.ts
src/api/types.ts
src/state/connection.ts
src/storage/pairing.ts SecureStore
src/widget/            Android home widget (command / MIC / CAM)
```

Host and token are runtime-only. No build-time env.

## Run the app

```bash
npm install
npx expo start --go
```

Android first, in **Expo Go**. `expo start` is forced to Go so it does not look for a custom `com.personal.jarvisremote` app. Cleartext HTTP is required; this project sets `usesCleartextTraffic`, ATS arbitrary/local loads, and the local-network usage string. If iOS Expo Go blocks LAN HTTP, use a native build (`npx expo run:ios`) so ATS settings apply.

The **home-screen widget** does not work in Expo Go. Install a native Android build once:

```bash
npx expo run:android
```

Then long-press the home screen → Widgets → **Jarvis**, or Settings → **Add home widget**. The widget shows a command field, MIC, and CAM. Android cannot type, record, or open the camera *inside* a widget, so each tap opens the app (`jarvisremote://compose?action=type|mic|cam`) and focuses the field, starts a latched recording, or attaches a camera still for you to caption and Send.

```bash
npm run android
npm run ios
npm run web
```

Token is stored in **SecureStore**, never AsyncStorage. The pairing field is 5 characters, auto-capitalized, no spaces. The token is not printed to Metro logs.

## API (Mac gateway — do not invent paths)

Base URL: `http://HOST:PORT` (port default `8742`).

Every route except health requires `Authorization: Bearer <token>` (exactly 5 characters). The app sends that header on JSON, SSE (XHR), `/v1/screen`, and `/v1/speech`. The gateway also accepts `?token=` for `<Image>` / EventSource / speech. Token is never written to Metro logs.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/v1/health` | No auth. Pairing probe, 8s timeout |
| `GET` | `/v1/status` | Live state, logs, last spoken, `screen_at`, `photo_at`, `speech_at`, `reply_sink` |
| `GET` | `/v1/events` | SSE `event: status` (same JSON as `/v1/status`) |
| `GET` | `/v1/screen` | Last computer-use JPEG (`/v1/screenshot` alias). 8s timeout. 404 = none yet |
| `GET` | `/v1/speech` | Last Mac-synthesized reply WAV for phone turns (`/v1/tts` alias). Bearer same as `/v1/screen`. 15s timeout. 404 = none yet |
| `POST` | `/v1/command` | `{ "text": "play lag ja gale" }` |
| `POST` | `/v1/audio` | Hold-to-talk clip. WAV/M4A JSON `{ "audio": "<base64>", "mime": "audio/m4a" }`, ~30s / 2.5MB. Mac STT queues like `/v1/command`. `{ "ok": true, "queued": true, "text": "…", "source": "audio" }` |
| `POST` | `/v1/photo` | Camera still (`/v1/image` alias). JSON `{ "photo": "<base64>", "mime": "image/jpeg", "text": "…", "audio": "<base64>", "audio_mime": "audio/m4a" }`. Multipart fields `photo` + optional `audio` + optional `text`. Caption order: typed `text` → transcribed `audio` (same STT as `/v1/audio`) → Mac default “explain this photo”. JPEG/PNG/HEIC, 6MB. `{ "ok": true, "queued": true, "text": "…", "source": "photo", "caption_source", "width", "height" }` |
| `POST` | `/v1/control` | `{ "action": "send" \| "mark_done" \| "quit" }` |

The phone **does not** request a new screenshot. It only pulls the last frame when `screen_at` changes. Idle Jarvis does not update the picture.

TTS stays on the Mac. Phone turns (`/v1/command`, `/v1/audio`, `/v1/photo`) skip Mac speakers and set `reply_sink` to phone; when `speech_at` changes the app refetches `/v1/speech` and plays the WAV locally. Mac wake-word turns use the Mac speakers and do not publish that file. A Mac-side timer can keep the phone sink after you later talk on the Mac.

Client: connect SSE; on error fall back to polling `GET /v1/status` every 1.0s. Reconnect with backoff 1s, 2s, 5s, max 15s.

Timeouts: health 8s, command/control/status 5s, screen 8s, speech 15s, audio 20s, photo 20s.

401 → “token rejected, re-pair”.

## Manual test checklist

With `PHONE_GATEWAY=1 python orchestrator.py --auto` running on the Mac:

- [ ] **health** — Test connection succeeds against `GET /v1/health` then `GET /v1/status`
- [ ] **status** — Home shows `state`, `detail`, logs, last spoken, and Mac preview
- [ ] **screen** — After a computer-use task, JPEG appears; tap to zoom. Idle does not refresh the picture. 404 shows the placeholder, not a crash
- [ ] **command** — Type `open notes` and send; Mac starts the task (no wake word). Works during ask_user listen too
- [ ] **audio** — Hold-to-talk (or tap to record, cap 30s) POSTs `/v1/audio`; Mac transcribes and queues. Too-short clip is discarded. 2.5MB cap.
- [ ] **photo** — CAM attaches a still (does not send yet). Type a question, hold MIC to attach a clip, or both, then Send POSTs `/v1/photo`. Caption order: typed text → transcribed audio → Mac default. ✕ removes the still (and clip). MIC ✕ drops only the clip. Long-press CAM picks from the library. 6MB / 2.5MB caps.
- [ ] **speech** — After a phone command/audio/photo, Last spoken shows PHONE then PLAYING; WAV from `GET /v1/speech` plays on the phone. Mac wake-word replies stay on the Mac and do not update `speech_at`.
- [ ] **widget** — Native Android build only. Pin the Jarvis widget; field opens the composer, MIC starts hold-to-talk (or attaches a clip if a photo is staged), CAM attaches a still for you to caption and Send. Expo Go shows an explanation in Settings.
- [ ] **SSE** — State/logs/`last_spoken` update within ~1s (or 1s poll fallback)
- [ ] **mark_done** — Mark done sends `POST /v1/control` `{"action":"mark_done"}` (confirm if a job is running)
- [ ] **send (Mac STT)** — Finish Mac listen is enabled only while `stt_active`; sends `{"action":"send"}`
- [ ] **quit** — Confirm “Stop Jarvis on the Mac?”, then `{"action":"quit"}`
- [ ] **401** — Wrong token → “token rejected, re-pair”, app does not crash
- [ ] **offline** — Kill the Mac process → Offline pill, composer disabled; restore gateway → Connected without re-pairing
- [ ] Airplane mode / Mac asleep → Offline, auto-resume when back

## Out of scope (v1)

On-device STT/TTS, capturing or streaming video, requesting a fresh Mac screenshot, push notifications, public internet without Tailscale, driving the Mac mouse, accounts, cloud backend, analytics SDKs.
