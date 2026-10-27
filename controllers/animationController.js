const fs = require('fs');
const path = require('path');
const service = require('../services/animationService');

const UPLOADS = path.join(__dirname, '..', 'public', 'uploads');
const OUTPUT = path.join(__dirname, '..', 'public', 'output');

exports.upload = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  res.json({ id: req.file.filename, url: `/uploads/${req.file.filename}` });
};

exports.generate = async (req, res, next) => {
  try {
    const { id, style = 'zoom-in', duration = 5, motion = 50, speed = 50, format = 'mp4' } = req.body;
    if (!id || id !== path.basename(id)) return res.status(400).json({ error: 'Invalid image id' });
    const input = path.join(UPLOADS, id);
    if (!fs.existsSync(input)) return res.status(404).json({ error: 'Image not found' });
    if (!service.STYLES.includes(style)) return res.status(400).json({ error: 'Unknown style' });

    const fmt = format === 'gif' ? 'gif' : 'mp4';
    const outName = `${path.parse(id).name}-${style}-${Date.now()}.${fmt}`;
    await service.createAnimation({
      input, output: path.join(OUTPUT, outName), style, format: fmt,
      duration: Math.min(10, Math.max(2, Number(duration))),
      motion: Math.min(100, Math.max(0, Number(motion))) / 100,
      speed: Math.min(100, Math.max(0, Number(speed))) / 100
    });
    res.json({ id: outName, url: `/output/${outName}`, download: `/animation/${outName}`, style, duration, format: fmt });
  } catch (e) { next(e); }
};

exports.download = (req, res) => {
  const file = path.join(OUTPUT, path.basename(req.params.id));
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  res.download(file);
};
