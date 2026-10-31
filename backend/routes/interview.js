import express from 'express';
import { conductConversation, generateQuestions, evaluateAnswer, generateReport, generateResumeJdAnalysis, verifyApiKey } from '../controllers/interviewController.js';

const router = express.Router();

// ── Core interview routes ──
router.post('/conversation', conductConversation);
router.post('/generate-questions', generateQuestions);
router.post('/evaluate-answer', evaluateAnswer);
router.post('/generate-report', generateReport);
router.post('/generate-resume-jd-analysis', generateResumeJdAnalysis);

// ── API key health check (safe to call from any device) ──
router.get('/verify-key', verifyApiKey);

export default router;
