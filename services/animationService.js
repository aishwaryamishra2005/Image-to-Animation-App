const sharp = require('sharp');
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const STYLES = ['zoom-in', 'zoom-out', 'pan', 'rotate', 'cinematic'];
const W = 1280, H = 720, FPS = 30;
const ease = t => t * t * (3 - 2 * t); // smoothstep

// Returns {zoom, dx, dy (fraction of free space, -1..1), angle (deg)} for progress t (0..1)
function transform(style, t, motion, speed) {
  const k = ease(t);
  const amt = (0.08 + 0.32 * motion) * (0.6 + 0.8 * speed); // how far the effect travels
  switch (style) {
    case 'zoom-in':  return { zoom: 1 + amt * k, dx: 0, dy: 0, angle: 0 };
    case 'zoom-out': return { zoom: 1 + amt * (1 - k), dx: 0, dy: 0, angle: 0 };
    case 'pan':      return { zoom: 1 + amt * 0.6, dx: -1 + 2 * k, dy: 0, angle: 0 };
    case 'rotate':   return { zoom: 1.2 + amt * 0.3, dx: 0, dy: 0, angle: (-1 + 2 * k) * (2 + 6 * motion) };
    case 'cinematic':return { zoom: 1 + amt * k * 0.9, dx: (-0.5 + k) * 0.8, dy: (0.3 - 0.6 * k) * 0.5, angle: (-0.5 + k) * 2 * motion };
  }
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args);
    let err = '';
    p.stderr.on('data', d => (err += d));
    p.on('close', code => (code === 0 ? resolve() : reject(new Error('FFmpeg failed: ' + err.slice(-400)))));
  });
}

async function createAnimation({ input, output, style, format, duration, motion, speed }) {
  const frames = Math.round(duration * FPS);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frames-'));
  try {
    // Oversized base image so zooming/rotating always has pixels to crop from
    const base = await sharp(input).rotate().resize(W * 1.5, H * 1.5, { fit: 'cover' }).toBuffer();
    const BW = Math.round(W * 1.5), BH = Math.round(H * 1.5);

    const makeFrame = async i => {
      const t = frames > 1 ? i / (frames - 1) : 0;
      const { zoom, dx, dy, angle } = transform(style, t, motion, speed);
      let img = base, iw = BW, ih = BH;
      if (angle) {
        const r = await sharp(base).rotate(angle, { background: '#000' }).toBuffer({ resolveWithObject: true });
        img = r.data; iw = r.info.width; ih = r.info.height;
      }
      // Crop window (16:9) sized by zoom; zoom 1 = full base image
      const cw = Math.round((angle ? BW * 0.85 : BW) / zoom);
      const ch = Math.round(cw * H / W);
      const freeX = Math.max(0, (iw - cw) / 2), freeY = Math.max(0, (ih - ch) / 2);
      const left = Math.round(Math.min(iw - cw, Math.max(0, freeX + dx * freeX)));
      const top = Math.round(Math.min(ih - ch, Math.max(0, freeY + dy * freeY)));
      await sharp(img).extract({ left, top, width: cw, height: ch })
        .resize(W, H).jpeg({ quality: 90 })
        .toFile(path.join(dir, `${String(i + 1).padStart(4, '0')}.jpg`));
    };

    for (let i = 0; i < frames; i += 6) { // 6 frames in parallel
      await Promise.all(Array.from({ length: Math.min(6, frames - i) }, (_, j) => makeFrame(i + j)));
    }

    const inArgs = ['-y', '-framerate', String(FPS), '-i', path.join(dir, '%04d.jpg')];
    const outArgs = format === 'gif'
      ? ['-vf', 'fps=15,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse', '-loop', '0', output]
      : ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output];
    await runFfmpeg([...inArgs, ...outArgs]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { createAnimation, STYLES };
