const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const c = require('../controllers/animationController');

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp'];
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'public', 'uploads'),
  filename: (req, file, cb) =>
    cb(null, crypto.randomBytes(8).toString('hex') + path.extname(file.originalname).toLowerCase())
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new Error('Only JPG, JPEG, PNG and WEBP files are allowed'));
  }
});

const router = express.Router();
router.post('/upload', upload.single('image'), c.upload);
router.post('/generate', c.generate);
router.get('/animation/:id', c.download);
module.exports = router;
