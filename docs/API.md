# 📡 MockMirror — API Reference

Base URL: `http://localhost:5000/api`

---

## Health Check

### `GET /api/health`

Check if the backend server is running and healthy.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 1234.56,
  "environment": "development"
}
```

**Status Codes:**
| Code | Description          |
|------|----------------------|
| 200  | Server is healthy    |

---

## Interview

### `POST /api/interview/generate-questions`

Generate AI-powered interview questions based on domain and difficulty.

**Request Body:**
```json
{
  "domain": "Software Engineering",
  "difficulty": "medium",
  "count": 5
}
```

| Field      | Type   | Required | Description                                                |
|------------|--------|----------|------------------------------------------------------------|
| domain     | string | Yes      | Interview domain (e.g., "Software Engineering", "Data Science") |
| difficulty | string | Yes      | Difficulty level: "easy", "medium", or "hard"              |
| count      | number | No       | Number of questions (default: 5, max: 15)                  |

**Response (200):**
```json
{
  "success": true,
  "questions": [
    {
      "id": 1,
      "question": "Explain the difference between REST and GraphQL APIs.",
      "expectedTopics": ["REST", "GraphQL", "API design"],
      "difficulty": "medium"
    }
  ]
}
```

**Error Response (503 — No API Key):**
```json
{
  "success": false,
  "error": "Gemini API key not configured",
  "message": "Set GEMINI_API_KEY in your .env file"
}
```

---

### `POST /api/interview/evaluate-answer`

Evaluate a user's answer to an interview question using AI.

**Request Body:**
```json
{
  "question": "Explain the difference between REST and GraphQL APIs.",
  "answer": "REST uses fixed endpoints while GraphQL uses a single endpoint with queries...",
  "domain": "Software Engineering"
}
```

| Field    | Type   | Required | Description                     |
|----------|--------|----------|---------------------------------|
| question | string | Yes      | The interview question          |
| answer   | string | Yes      | The user's answer               |
| domain   | string | Yes      | The interview domain            |

**Response (200):**
```json
{
  "success": true,
  "evaluation": {
    "score": 7,
    "feedback": "Good understanding of the core differences...",
    "strengths": [
      "Clear comparison between the two approaches",
      "Mentioned key architectural differences"
    ],
    "improvements": [
      "Could elaborate on when to use each approach",
      "Missing mention of performance considerations"
    ]
  }
}
```

---

### `POST /api/interview/generate-report`

Generate a comprehensive performance report after the interview session.

**Request Body:**
```json
{
  "domain": "Software Engineering",
  "difficulty": "medium",
  "responses": [
    {
      "question": "Explain REST vs GraphQL",
      "answer": "REST uses fixed endpoints...",
      "score": 7
    }
  ],
  "behaviorMetrics": {
    "eyeContact": 75,
    "posture": 80,
    "confidence": 70,
    "engagement": 85
  }
}
```

| Field           | Type   | Required | Description                           |
|-----------------|--------|----------|---------------------------------------|
| domain          | string | Yes      | Interview domain                      |
| difficulty      | string | Yes      | Difficulty level                      |
| responses       | array  | Yes      | Array of question/answer/score objects |
| behaviorMetrics | object | No       | Behavioral analysis scores (0-100)    |

**Response (200):**
```json
{
  "success": true,
  "report": {
    "overallScore": 72,
    "summary": "Strong technical knowledge with room for improvement in communication...",
    "categoryScores": {
      "technical": 78,
      "communication": 65,
      "confidence": 70,
      "clarity": 75
    },
    "detailedFeedback": "Your responses demonstrated solid understanding...",
    "recommendations": [
      "Practice explaining complex concepts in simpler terms",
      "Work on providing more structured answers using the STAR method"
    ]
  }
}
```

---

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error description"
}
```

**Common Status Codes:**

| Code | Description                    |
|------|--------------------------------|
| 200  | Success                        |
| 400  | Bad Request (missing fields)   |
| 429  | Too Many Requests (rate limit) |
| 500  | Internal Server Error          |
| 503  | Service Unavailable (no API key)|

---

## Rate Limiting

API requests are rate-limited to **100 requests per 15 minutes** per IP address. When exceeded, the API returns:

```json
{
  "error": "Too many requests, please try again later."
}
```

---

## CORS

The backend is configured to accept requests from `http://localhost:3000` (the frontend dev server). In production, update the `FRONTEND_URL` environment variable.
