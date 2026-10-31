/**
 * Resume Controller
 * Handles PDF resume upload, binary signature verification,
 * text extraction, and automated profile/skills extraction.
 */

import pdfParse from 'pdf-parse';
import { getGeminiClient, generateWithGeminiFallback, extractJSON } from '../services/conversationService.js';

/**
 * Heuristic fallback parser to extract candidate profile from text
 */
function extractProfileFromText(text = '', targetRole = '') {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  // Name (typically the first line or first line before email)
  let name = '';
  for (const line of lines.slice(0, 5)) {
    if (line.includes('@') || /http|github|linkedin|resume|curriculum/i.test(line)) continue;
    if (line.length > 2 && line.length < 40 && !/[0-9]/.test(line)) {
      name = line;
      break;
    }
  }

  // Location / City
  let location = '';
  const locationMatch = text.match(/\b(New York|San Francisco|London|Bangalore|Bengaluru|Mumbai|Delhi|Hyderabad|Pune|Seattle|Boston|Austin|Toronto|Remote)\b/i);
  if (locationMatch) location = locationMatch[0];

  // College / University
  let college = '';
  for (const line of lines) {
    if (/(university|institute|college|school of technology|academy)/i.test(line) && line.length < 80) {
      college = line.replace(/^(education|academic)\s*[:\-]?\s*/i, '').trim();
      break;
    }
  }

  // Degree & Branch
  let degree = '';
  const degreeMatch = text.match(/\b(B\.Tech|B\.E\.|BSc|B\.S\.|Bachelor of [A-Za-z]+|M\.Tech|M\.E\.|MSc|M\.S\.|Master of [A-Za-z]+|PhD)\b/i);
  if (degreeMatch) degree = degreeMatch[0];

  let branch = '';
  const branchMatch = text.match(/\b(Computer Science|Information Technology|Data Science|Software Engineering|Electrical Engineering|Mechanical Engineering|ECE|CSE)\b/i);
  if (branchMatch) branch = branchMatch[0];

  // Graduation Year
  let graduationYear = null;
  const yearMatch = text.match(/\b(20[0-3][0-9])\b/g);
  if (yearMatch && yearMatch.length > 0) {
    graduationYear = parseInt(yearMatch[yearMatch.length - 1], 10);
  }

  // Experience Years
  let experienceYears = '0';
  const expMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience/i);
  if (expMatch) {
    experienceYears = expMatch[1];
  } else if (/fresher|intern|student/i.test(text)) {
    experienceYears = '0';
  }

  // Skills
  const knownSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby',
    'React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'FastAPI', 'Spring Boot',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'CI/CD', 'Linux',
    'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'Scikit-Learn',
  ];
  const foundSkills = knownSkills.filter(s => new RegExp(`\\b${s.replace('.', '\\.')}\\b`, 'i').test(text));

  // Projects
  const foundProjects = [];
  let inProjects = false;
  for (const line of lines) {
    if (/^(projects|academic projects|key projects)/i.test(line)) {
      inProjects = true;
      continue;
    }
    if (inProjects) {
      if (/^(experience|skills|education|certifications|awards)/i.test(line)) {
        inProjects = false;
        continue;
      }
      if (line.length > 5 && line.length < 80 && !line.startsWith('http') && !line.includes('@')) {
        foundProjects.push(line.replace(/^[\s•\-*0-9.]+\s*/, ''));
        if (foundProjects.length >= 4) break;
      }
    }
  }

  return {
    name,
    email,
    location,
    college,
    degree,
    branch,
    graduationYear,
    experienceYears,
    skills: foundSkills,
    projects: foundProjects,
    targetRole: targetRole || 'Software Developer',
  };
}

/**
 * POST /resume/upload
 * Validates uploaded PDF, extracts text and initial profile.
 */
export async function uploadResume(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        error: 'NO_FILE',
        message: 'No resume file was uploaded. Please select a PDF file.',
      });
    }

    const buffer = req.file.buffer;

    // Strict %PDF- signature check
    const headerStr = buffer.slice(0, 1024).toString('binary');
    if (!headerStr.includes('%PDF-')) {
      return res.status(400).json({
        error: 'NOT_A_RESUME',
        message: 'The uploaded file does not have a valid PDF binary signature (%PDF-).',
      });
    }

    const parsedPdf = await pdfParse(buffer);
    const extractedText = (parsedPdf.text || '').trim();

    if (extractedText.length < 50) {
      return res.status(400).json({
        error: 'INSUFFICIENT_CONTENT',
        message: "Couldn't extract readable text from this PDF. Please upload a text-based resume PDF (not a scanned image).",
      });
    }

    const candidateProfile = extractProfileFromText(extractedText);

    res.status(200).json({
      success: true,
      extractedText,
      resumeText: extractedText,
      candidateProfile,
    });
  } catch (err) {
    console.error('[uploadResume error]', err);
    res.status(400).json({
      error: 'PARSE_FAILED',
      message: `Failed to process PDF: ${err.message}`,
    });
  }
}

/**
 * POST /resume/analyze
 * Analyzes resume text against target role using Gemini with heuristic fallback.
 */
export async function analyzeResume(req, res) {
  try {
    const { resumeText = '', targetRole = 'Software Developer' } = req.body;

    if (!resumeText || resumeText.trim().length < 20) {
      return res.status(400).json({
        error: 'MISSING_TEXT',
        message: 'Resume text is required for analysis.',
      });
    }

    const client = getGeminiClient();
    if (client) {
      const prompt = `You are an expert technical recruiter analyzing a candidate's resume for target role "${targetRole}".
Resume Text:
"""
${resumeText.slice(0, 3500)}
"""

Extract candidate information accurately. Return ONLY valid JSON:
{
  "name": "Candidate Full Name or empty",
  "email": "Email or empty",
  "location": "City or empty",
  "college": "College / University name or empty",
  "degree": "Degree name or empty",
  "branch": "Major / Branch or empty",
  "graduationYear": 2024,
  "experienceYears": "0" | "1" | "2" | "3" | "5+",
  "skills": ["Skill1", "Skill2"],
  "projects": ["Project 1", "Project 2"],
  "strengths": ["Key resume strength 1", "Key resume strength 2"],
  "improvements": ["Resume improvement recommendation 1"]
}`;

      try {
        const { text } = await generateWithGeminiFallback(prompt);
        const parsed = extractJSON(text);
        if (parsed && typeof parsed === 'object') {
          return res.status(200).json(parsed);
        }
      } catch (err) {
        console.warn('[analyzeResume Gemini fallback]:', err.message);
      }
    }

    // Heuristic fallback
    const heuristicProfile = extractProfileFromText(resumeText, targetRole);
    res.status(200).json({
      ...heuristicProfile,
      strengths: ['Identified relevant technical skills and project involvement'],
      improvements: ['Quantify project outcomes and impact with measurable engineering metrics'],
    });
  } catch (err) {
    console.error('[analyzeResume error]', err);
    res.status(500).json({
      error: 'ANALYSIS_FAILED',
      message: err.message,
    });
  }
}

export default {
  uploadResume,
  analyzeResume,
};
