import express from 'express';
import multer from 'multer';
import { uploadResume, analyzeResume } from '../controllers/resumeController.js';

const router = express.Router();

const storage = multer.memoryStorage();

// Vercel serverless functions reject request bodies larger than ~4.5MB with an HTTP 413
// BEFORE this code runs (and that response has no JSON body and no CORS headers).
// Keep our limit safely below that, leaving room for multipart overhead.
// Keep this value in sync with MAX_RESUME_MB in frontend/src/pages/CandidateInfo.jsx.
export const MAX_RESUME_MB = 4;

// First-pass type filter — PDF only (text extraction is PDF-based).
// Some browsers/OSes label PDFs "application/octet-stream" or leave the type empty, so we
// also accept a ".pdf" file name here. The authoritative check is the "%PDF-" signature
// test in resumeController.js, which cannot be spoofed by the client.
const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const looksLikePdf =
    mime === 'application/pdf' ||
    mime === 'application/x-pdf' ||
    ((mime === 'application/octet-stream' || mime === '') &&
      /\.pdf$/i.test(file.originalname || ''));

  if (looksLikePdf) {
    cb(null, true);
  } else {
    const err = new Error('Only PDF files are accepted. Please upload your resume as a PDF.');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_RESUME_MB * 1024 * 1024, files: 1 },
  fileFilter,
});

// Wrapper that catches multer errors and returns clean JSON
const uploadMiddleware = (req, res, next) => {
  const multerUpload = upload.single('resume');

  multerUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'FILE_TOO_LARGE',
          message: `File size exceeds the ${MAX_RESUME_MB}MB limit. Please upload a smaller PDF.`,
        });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          error: 'INVALID_FILE_TYPE',
          message: err.message,
        });
      }
      return res.status(400).json({
        error: 'UPLOAD_ERROR',
        message: `Upload error: ${err.message}`,
      });
    }
    next();
  });
};

router.post('/upload', uploadMiddleware, uploadResume);
router.post('/analyze', analyzeResume);

export default router;