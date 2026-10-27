# ImageMotion – Image to Animation App

Upload an image → pick a style → generate an MP4/GIF → preview & download.

## Run
```bash
npm install
npm start        # http://localhost:3000
```
FFmpeg is bundled through `ffmpeg-static`, so no separate install is needed.

## API
- `POST /upload` – multipart field `image` → `{ id, url }`
- `POST /generate` – JSON `{ id, style, duration, motion, speed, format }` → `{ url, download }`
- `GET /animation/:id` – download the generated file

Styles: `zoom-in`, `zoom-out`, `pan`, `rotate`, `cinematic`.

## How it works
Sharp renders ~30 frames per second of video, each with a slightly different zoom/offset/rotation (eased with smoothstep). FFmpeg then encodes the frames into MP4 (H.264) or GIF.

## Next steps (roadmap steps 10–11)
Parallax layers, and an AI image-to-video API behind an optional `/generate-ai` route.
