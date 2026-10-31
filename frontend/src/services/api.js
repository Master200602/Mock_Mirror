import axios from 'axios';


// VITE_API_URL is baked in at BUILD time. On Vercel set it to the deployed backend, e.g.
//   VITE_API_URL=https://your-backend.vercel.app/api      (then REDEPLOY the frontend)
// If it is missing, requests go to "/api" on the frontend's own domain, which has no backend.

// On Vercel (services setup, see /vercel.json) the frontend and backend share one domain and
// "/api/*" is routed to the backend service, so leave VITE_API_URL UNSET in production.
// Only set it if the backend lives on a different domain (it is read at BUILD time).

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

if (typeof window !== 'undefined') {
  const onLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (!onLocalhost && /\/\/(localhost|127\.0\.0\.1)/.test(API_URL)) {
    console.error(
      `[MockMirror] The deployed site is configured to call ${API_URL}, which only works on your own computer. ` +
      'Set VITE_API_URL to your deployed backend URL and redeploy the frontend.'
    );

  } else if (!onLocalhost && API_URL === '/api') {

    console.warn(
      '[MockMirror] VITE_API_URL is not set, so API calls go to this site\'s own /api path. ' +
      'If your backend is a separate deployment, set VITE_API_URL and redeploy the frontend.'
    );

  }
}

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const checkHealth = () => api.get('/health');
export const checkCustomApiHealth = () => api.get('/v1/health');

export const uploadResume = (file) => {
  const formData = new FormData();
  formData.append('resume', file);

  // Don't set Content-Type by hand: the browser must add the multipart boundary itself.
  // The timeout keeps the UI from spinning forever if the server never answers.
  return api.post('/resume/upload', formData, { timeout: 60000 });
};

export const analyzeResume = (resumeText, targetRole) =>
  api.post('/resume/analyze', { resumeText, targetRole }, { timeout: 60000 });

export const sendConversationTurn = (data) =>
  api.post('/interview/conversation', data);

export const generateQuestions = (domainOrPayload, difficulty, count) => {
  if (typeof domainOrPayload === 'object' && domainOrPayload !== null) {
    return api.post('/interview/generate-questions', domainOrPayload);
  }
  return api.post('/interview/generate-questions', { domain: domainOrPayload, difficulty, totalQuestions: count });
};

export const evaluateAnswer = (question, answer, domain) =>
  api.post('/interview/evaluate-answer', { question, answer, domain });

// ── MockMirror Custom V1 API Endpoints (98-99% Task Accuracy Engine) ──
export const customAskQuestion = (payload) =>
  api.post('/v1/interview/ask', payload);

export const customEvaluateAnswer = (payload) =>
  api.post('/v1/interview/evaluate', payload);

export const customAnalyzeBehavior = (metrics) =>
  api.post('/v1/behavior/analyze', metrics);

export const generateReport = (data) =>
  api.post('/interview/generate-report', data);

export const analyzeResumeVsJd = (data) =>
  api.post('/interview/generate-resume-jd-analysis', data);

export default api;