import { generateWithGeminiFallback, extractJSON, getGeminiClient } from './conversationService.js';
import { getDomainCompetencies, GENERAL_BEHAVIORAL_QUESTIONS } from '../config/domainCompetencies.js';

/**
 * Calculates the required number of Resume, Domain, and General questions based on exact rule table:
 *
 * | Total Questions | Resume | Domain | General |
 * | 1               | 0      | 1      | 0       |
 * | 2               | 1      | 1      | 0       |
 * | 3               | 1      | 1      | 1       |
 * | 4               | 1      | 2      | 1       |
 * | 5               | 2      | 2      | 1       |
 * | 6               | 2      | 3      | 1       |
 * | 7               | 2      | 3      | 2       |
 * | 8               | 3      | 3      | 2       |
 * | 9               | 3      | 4      | 2       |
 * | 10              | 3      | 5      | 2       |
 *
 * For N > 10:
 * Resume: ~30-40% (Math.floor(N * 0.35))
 * General: ~15-25% (Math.max(2, Math.floor(N * 0.20)))
 * Domain: N - Resume - General (40-50%)
 *
 * If hasResume === false:
 * Resume = 0
 * Slots are cleanly redistributed to Domain and General questions.
 *
 * @param {number} totalQuestions
 * @param {boolean} hasResume
 * @param {boolean} hasJd
 * @returns {{ totalQuestions: number, resumeQuestions: number, domainQuestions: number, generalQuestions: number, jdQuestions: number, otherQuestions: number }}
 */
export function calculateQuestionDistribution(totalQuestions, hasResume = true, hasJd = false) {
  const N = Math.max(1, parseInt(totalQuestions, 10) || 5);

  let resumeCount = 0;
  let domainCount = 0;
  let generalCount = 0;

  if (N === 1) {
    resumeCount = 0;
    domainCount = 1;
    generalCount = 0;
  } else if (N === 2) {
    resumeCount = 1;
    domainCount = 1;
    generalCount = 0;
  } else if (N === 3) {
    resumeCount = 1;
    domainCount = 1;
    generalCount = 1;
  } else if (N === 4) {
    resumeCount = 1;
    domainCount = 2;
    generalCount = 1;
  } else if (N === 5) {
    resumeCount = 2;
    domainCount = 2;
    generalCount = 1;
  } else if (N === 6) {
    resumeCount = 2;
    domainCount = 3;
    generalCount = 1;
  } else if (N === 7) {
    resumeCount = 2;
    domainCount = 3;
    generalCount = 2;
  } else if (N === 8) {
    resumeCount = 3;
    domainCount = 3;
    generalCount = 2;
  } else if (N === 9) {
    resumeCount = 3;
    domainCount = 4;
    generalCount = 2;
  } else if (N === 10) {
    resumeCount = 3;
    domainCount = 5;
    generalCount = 2;
  } else {
    // Dynamic rule for N > 10: ~35% Resume, ~20% General, rest Domain
    resumeCount = Math.floor(N * 0.35);
    generalCount = Math.max(2, Math.floor(N * 0.20));
    domainCount = N - resumeCount - generalCount;
  }

  // If no resume is uploaded/available, redistribute resume slots to domain & general
  if (!hasResume && resumeCount > 0) {
    const redistributed = resumeCount;
    resumeCount = 0;
    const extraDomain = Math.ceil(redistributed * 0.7);
    const extraGeneral = redistributed - extraDomain;
    domainCount += extraDomain;
    generalCount += extraGeneral;
  }

  const jdCount = hasJd ? Math.min(domainCount, 1) : 0;

  return {
    totalQuestions: N,
    resumeQuestions: resumeCount,
    domainQuestions: domainCount,
    generalQuestions: generalCount,
    jdQuestions: jdCount,
    otherQuestions: domainCount + generalCount,
  };
}

/**
 * Normalizes question types to standard category tags:
 * "resume_based" | "domain_based" | "general" | "job_description_based"
 *
 * @param {string|Array<string>} typeInput
 * @returns {Array<string>}
 */
export function normalizeQuestionTypes(typeInput) {
  const rawTypes = Array.isArray(typeInput) ? typeInput : [typeInput];
  const normalized = new Set();

  for (const item of rawTypes) {
    if (!item || typeof item !== 'string') continue;
    const t = item.toLowerCase().trim().replace(/[-\s]/g, '_');

    if (t.includes('resume') || t === 'resume_based') {
      normalized.add('resume_based');
    } else if (t.includes('domain') || t === 'domain_based' || t.includes('tech') || t === 'technical') {
      normalized.add('domain_based');
    } else if (t.includes('general') || t.includes('behavior') || t === 'behavioral') {
      normalized.add('general');
    } else if (t.includes('job') || t.includes('jd') || t === 'job_description_based') {
      normalized.add('domain_based');
      normalized.add('job_description_based');
    }
  }

  if (normalized.size === 0) {
    normalized.add('domain_based');
  }

  return Array.from(normalized);
}

/**
 * Returns primary single type string for backwards compatibility.
 */
export function normalizeQuestionType(type) {
  const types = normalizeQuestionTypes(type);
  if (types.includes('resume_based')) return 'resume_based';
  if (types.includes('domain_based')) return 'domain_based';
  if (types.includes('general')) return 'general';
  if (types.includes('job_description_based')) return 'job_description_based';
  return types[0] || 'domain_based';
}

/**
 * Interleaves questions naturally into a realistic interview flow.
 * Alternates between Domain, Resume, and General/Behavioral questions.
 *
 * @param {Array} resumeList
 * @param {Array} domainList
 * @param {Array} generalList
 * @returns {Array}
 */
export function interleaveNaturalInterview(resumeList = [], domainList = [], generalList = []) {
  const rQueue = [...resumeList];
  const dQueue = [...domainList];
  const gQueue = [...generalList];
  const result = [];

  const total = rQueue.length + dQueue.length + gQueue.length;
  if (total === 0) return [];
  if (total === 1) return [...dQueue, ...rQueue, ...gQueue];

  while (result.length < total) {
    // 1. Domain technical question
    if (dQueue.length > 0) result.push(dQueue.shift());
    // 2. Resume-based question
    if (rQueue.length > 0) result.push(rQueue.shift());
    // 3. General / Behavioral question
    if (gQueue.length > 0) result.push(gQueue.shift());

    if (dQueue.length === 0 && rQueue.length === 0 && gQueue.length === 0) break;
  }

  return result.slice(0, total);
}

/**
 * Legacy interleave compatibility wrapper.
 */
export function interleaveQuestions(resumeQuestions = [], jdQuestions = [], otherQuestions = []) {
  return interleaveNaturalInterview(resumeQuestions, [...jdQuestions, ...otherQuestions], []);
}

/**
 * Extracts verifiable details from resume text and candidate profile to construct
 * grounded fallback resume questions when Gemini is unavailable or returns insufficient items.
 * NEVER invents fake information.
 */
export function generateGroundedResumeQuestions(candidateProfile = {}, resumeText = '', count = 1, difficulty = 'Medium', existingQuestions = []) {
  const generated = [];
  const existingLower = existingQuestions.map(q => (typeof q === 'string' ? q : q.question || '').toLowerCase());

  const projects = Array.isArray(candidateProfile.projects)
    ? candidateProfile.projects.filter(p => p && !p.toLowerCase().includes('academic & technical') && p.length > 3)
    : [];

  const skills = Array.isArray(candidateProfile.skills)
    ? candidateProfile.skills.filter(s => s && s.length > 1)
    : [];

  const role = candidateProfile.targetRole || candidateProfile.currentRole || 'Software Engineering';
  const education = candidateProfile.education || candidateProfile.degree || '';

  const resumeLines = (resumeText || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 20 && !/^(skills|education|experience|projects|certifications)$/i.test(l));

  const addUniqueQuestion = (qText, types = ['resume_based']) => {
    if (generated.length >= count) return;
    const isDup = existingLower.some(e => e.includes(qText.toLowerCase().slice(0, 30))) ||
                  generated.some(g => g.question.toLowerCase().includes(qText.toLowerCase().slice(0, 30)));
    if (!isDup) {
      generated.push({
        question: qText,
        type: 'resume_based',
        types,
        topic: 'resume_experience',
      });
      existingLower.push(qText.toLowerCase());
    }
  };

  const isEasy = difficulty === 'Easy' || difficulty === 'Beginner';
  const isHard = difficulty === 'Hard' || difficulty === 'Advanced';

  for (const proj of projects) {
    if (generated.length >= count) break;
    if (isEasy) {
      addUniqueQuestion(`In your resume, you mentioned working on "${proj}". Could you give a clear overview of what this project does and the main technologies you utilized?`);
    } else if (isHard) {
      addUniqueQuestion(`In your resume, you mentioned working on "${proj}". What were the most critical architectural trade-offs, scalability bottlenecks, or security considerations you engineered in that system?`);
    } else {
      addUniqueQuestion(`In your resume, you mentioned working on "${proj}". Could you walk me through the architecture and the most challenging technical problem you solved in that project?`);
    }
  }

  for (const line of resumeLines) {
    if (generated.length >= count) break;
    if (/(developed|built|implemented|designed|created|engineered|managed|led)/i.test(line)) {
      const cleanLine = line.replace(/^[\s•\-*0-9.]+\s*/, '').slice(0, 140);
      if (isEasy) {
        addUniqueQuestion(`Your resume highlights that you "${cleanLine}". Can you describe the primary purpose of this feature and what tools you used?`);
      } else if (isHard) {
        addUniqueQuestion(`Your resume highlights that you "${cleanLine}". How did you design this for high performance, testability, and edge-case resilience?`);
      } else {
        addUniqueQuestion(`Your resume highlights that you "${cleanLine}". Can you elaborate on how you implemented that and what technical choices you made?`);
      }
    }
  }

  if (skills.length > 0) {
    for (let i = 0; i < skills.length && generated.length < count; i += 2) {
      const skillA = skills[i];
      const skillB = skills[i + 1];
      if (skillB) {
        if (isEasy) {
          addUniqueQuestion(`Your profile lists both ${skillA} and ${skillB}. How do these two technologies complement each other in your practical development experience?`);
        } else if (isHard) {
          addUniqueQuestion(`Your profile emphasizes experience with ${skillA} and ${skillB}. How do you optimize memory, concurrency, or latency when architecting solutions using ${skillA} and ${skillB}?`);
        } else {
          addUniqueQuestion(`Your profile emphasizes hands-on experience with ${skillA} and ${skillB}. How have you leveraged these technologies together in your practical work?`);
        }
      } else {
        if (isEasy) {
          addUniqueQuestion(`You listed ${skillA} in your skillset. What are the core fundamentals and standard practices you follow when developing with ${skillA}?`);
        } else if (isHard) {
          addUniqueQuestion(`You listed ${skillA} in your skillset. Describe an advanced debugging or performance optimization challenge you resolved using ${skillA}.`);
        } else {
          addUniqueQuestion(`You listed ${skillA} in your technical skillset. Can you describe a complex real-world feature or problem you tackled using ${skillA}?`);
        }
      }
    }
  }

  if (generated.length < count && education) {
    addUniqueQuestion(`Based on your background in ${education}, how have you applied your foundational coursework and technical concepts to practical projects?`);
  }

  if (generated.length < count) {
    addUniqueQuestion(`Looking at your background in ${role}, what has been your most impactful technical contribution or project to date, and why?`);
  }

  while (generated.length < count) {
    addUniqueQuestion(`Could you describe a significant technical challenge you faced during your projects or work experience, and how you resolved it?`);
  }

  return generated.slice(0, count);
}

/**
 * Extracts verifiable requirements from Job Description text to construct
 * grounded fallback JD-based questions.
 */
export function generateGroundedJdQuestions(jobDescription = '', count = 1, existingQuestions = []) {
  const generated = [];
  const existingLower = existingQuestions.map(q => (typeof q === 'string' ? q : q.question || '').toLowerCase());

  if (!jobDescription || jobDescription.trim().length < 15) {
    return [
      {
        question: 'This role requires strong technical problem-solving and architectural design. How do you approach building robust, production-ready solutions?',
        type: 'domain_based',
        types: ['domain_based', 'job_description_based'],
        topic: 'job_description_requirements',
      },
    ];
  }

  const jdText = jobDescription.trim();
  const techKeywords = Array.from(new Set(
    (jdText.match(/\b(React|Node\.js|Express|MongoDB|SQL|PostgreSQL|Python|Java|C\+\+|TypeScript|JavaScript|AWS|Docker|Kubernetes|REST API|GraphQL|Microservices|Git|CI\/CD|Redux|Next\.js|Flutter|Spring Boot|Pandas|PyTorch|TensorFlow)\b/gi) || [])
      .map(k => k.trim())
  ));

  const addUniqueJdQuestion = (qText) => {
    if (generated.length >= count) return;
    const isDup = existingLower.some(e => e.includes(qText.toLowerCase().slice(0, 30))) ||
                  generated.some(g => g.question.toLowerCase().includes(qText.toLowerCase().slice(0, 30)));
    if (!isDup) {
      generated.push({
        question: qText,
        type: 'domain_based',
        types: ['domain_based', 'job_description_based'],
        topic: 'job_description_technology',
      });
      existingLower.push(qText.toLowerCase());
    }
  };

  if (techKeywords.length > 0) {
    for (let i = 0; i < techKeywords.length && generated.length < count; i += 2) {
      const techA = techKeywords[i];
      const techB = techKeywords[i + 1];
      if (techB) {
        addUniqueJdQuestion(`The job description specifically calls for experience with ${techA} and ${techB}. How would you structure a scalable application for this role utilizing these technologies?`);
      } else {
        addUniqueJdQuestion(`This position highlights ${techA} as a core requirement. How have you applied ${techA} in production, and how would you optimize performance for our application?`);
      }
    }
  }

  const jdLines = jdText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 25 && /(requirement|responsibility|looking for|experience in|must have|develop|build|design|collaborate)/i.test(l));

  for (const line of jdLines) {
    if (generated.length >= count) break;
    const cleanLine = line.replace(/^[\s•\-*0-9.]+\s*/, '').slice(0, 130);
    addUniqueJdQuestion(`The job description mentions: "${cleanLine}". How would your technical approach align with this responsibility?`);
  }

  while (generated.length < count) {
    addUniqueJdQuestion(`Reviewing the key responsibilities described for this role, what would be your top priority when onboarding to ensure rapid architectural contribution?`);
  }

  return generated.slice(0, count);
}

/**
 * Domain-specific technical fallback questions based on domain competencies configuration.
 */
export function generateDomainTechnicalQuestions(domain = 'Software Developer', difficulty = 'Medium', count = 1, existingQuestions = []) {
  const domainInfo = getDomainCompetencies(domain);
  const existingLower = existingQuestions.map(q => (typeof q === 'string' ? q : q.question || '').toLowerCase());
  const selected = [];

  const diffKey = (difficulty === 'Easy' || difficulty === 'Beginner')
    ? 'Beginner'
    : (difficulty === 'Hard' || difficulty === 'Advanced')
    ? 'Advanced'
    : 'Intermediate';
  const tierQuestions = domainInfo.sampleQuestions?.[diffKey] || [];
  const allTierQuestions = Object.values(domainInfo.sampleQuestions || {}).flat();
  const pool = [...tierQuestions, ...allTierQuestions];

  for (const q of pool) {
    if (selected.length >= count) break;
    const isDup = existingLower.some(e => e.includes(q.toLowerCase().slice(0, 30))) ||
                  selected.some(s => s.question.toLowerCase().includes(q.toLowerCase().slice(0, 30)));
    if (!isDup) {
      selected.push({
        question: q,
        type: 'domain_based',
        types: ['domain_based', 'technical'],
        topic: 'domain_competency',
      });
      existingLower.push(q.toLowerCase());
    }
  }

  // If count exceeds curated pool, generate questions from competency list
  let compIdx = 0;
  const competencies = domainInfo.competencies || [];
  while (selected.length < count && compIdx < competencies.length) {
    const comp = competencies[compIdx++];
    const qText = `In ${domain} (${difficulty} level), can you explain how you apply ${comp} to build maintainable, high-quality systems?`;
    const isDup = existingLower.some(e => e.includes(qText.toLowerCase().slice(0, 30))) ||
                  selected.some(s => s.question.toLowerCase().includes(qText.toLowerCase().slice(0, 30)));
    if (!isDup) {
      selected.push({
        question: qText,
        type: 'domain_based',
        types: ['domain_based', 'technical'],
        topic: comp.toLowerCase().replace(/\s+/g, '_'),
      });
      existingLower.push(qText.toLowerCase());
    }
  }

  let fallbackIdx = 1;
  while (selected.length < count) {
    selected.push({
      question: `In ${domain} (${difficulty} level), what are the most critical architectural decisions, testing practices, and performance trade-offs you evaluate? (Part ${fallbackIdx++})`,
      type: 'domain_based',
      types: ['domain_based', 'technical'],
      topic: 'domain_general',
    });
  }

  return selected.slice(0, count);
}

/**
 * General & Behavioral fallback questions generator.
 */
export function generateGeneralBehavioralQuestions(count = 1, existingQuestions = []) {
  const selected = [];
  const existingLower = existingQuestions.map(q => (typeof q === 'string' ? q : q.question || '').toLowerCase());

  for (const q of GENERAL_BEHAVIORAL_QUESTIONS) {
    if (selected.length >= count) break;
    const isDup = existingLower.some(e => e.includes(q.toLowerCase().slice(0, 30))) ||
                  selected.some(s => s.question.toLowerCase().includes(q.toLowerCase().slice(0, 30)));
    if (!isDup) {
      selected.push({
        question: q,
        type: 'general',
        types: ['general', 'behavioral'],
        topic: 'behavioral_competency',
      });
      existingLower.push(q.toLowerCase());
    }
  }

  let index = 1;
  while (selected.length < count) {
    selected.push({
      question: `Could you tell me about a time you had to adapt quickly to changing technical priorities or deliver under tight deadlines? (Scenario ${index++})`,
      type: 'general',
      types: ['general', 'behavioral'],
      topic: 'adaptability',
    });
  }

  return selected.slice(0, count);
}

/**
 * Main function: Generates and validates interview questions, strictly enforcing:
 * 1. Selected domain competencies controlling technical questions
 * 2. Uploaded resume grounding resume-based questions
 * 3. General / behavioral questions for complete professional evaluation
 * 4. Automatic distribution calculation and application-side validation
 *
 * @param {Object} params
 * @param {string} params.domain
 * @param {string} params.difficulty
 * @param {number} params.totalQuestions
 * @param {Object} params.candidateProfile
 * @param {string} params.resumeText
 * @param {string} params.jobDescription
 * @returns {Promise<{ distribution: Object, questions: Array<{ question: string, type: string, types: Array<string>, topic: string }> }>}
 */
export async function generateAndValidateInterviewQuestions({
  domain = 'Software Developer',
  difficulty = 'Medium',
  totalQuestions = 5,
  candidateProfile = {},
  resumeText = '',
  jobDescription = '',
}) {
  const hasResume = Boolean((resumeText && resumeText.trim().length > 30) || (candidateProfile?.skills?.length > 0));
  const hasJd = Boolean(jobDescription && jobDescription.trim().length > 25);

  const distribution = calculateQuestionDistribution(totalQuestions, hasResume, hasJd);
  const {
    resumeQuestions: targetResumeCount,
    domainQuestions: targetDomainCount,
    generalQuestions: targetGeneralCount,
    jdQuestions: targetJdCount,
    totalQuestions: targetTotal,
  } = distribution;

  const candidateName = candidateProfile?.fullName || 'Candidate';
  const targetRole = candidateProfile?.targetRole || domain;
  const domainInfo = getDomainCompetencies(targetRole);

  const skillsList = candidateProfile?.skills?.join(', ') || '';
  const projectsList = candidateProfile?.projects?.join(', ') || '';
  const resumeExcerpt = resumeText ? resumeText.slice(0, 2500) : '';
  const jdExcerpt = jobDescription ? jobDescription.slice(0, 2500) : '';

  let generatedQuestions = [];
  const client = getGeminiClient();

  if (client) {
    const prompt = `You are a senior technical interviewer designing an exact structured question set for an upcoming live mock interview on MockMirror.

INTERVIEW CONFIGURATION:
- Career Domain / Target Role: ${targetRole} (${domainInfo.category})
- Difficulty Level: ${difficulty.toUpperCase()}
- Total Questions Required: ${targetTotal}
- Required Resume-Based Questions: ${targetResumeCount}
- Required Domain-Based Questions: ${targetDomainCount}
- Required General / Behavioral Questions: ${targetGeneralCount}
${hasJd ? `- Required Job Description-Based Questions (subset of domain): ${targetJdCount}` : ''}

STRICT DIFFICULTY LEVEL REQUIREMENTS (MUST BE ENFORCED):
${difficulty === 'Easy' || difficulty === 'Beginner' ? `• DIFFICULTY = EASY (Beginner):
  - Test fundamental concepts, basic terminology, basic programming constructs, syntax, and foundational understanding.
  - Examples: "What is a class in Java?", "What is the difference between SQL and NoSQL?", "Explain the difference between let and const in JavaScript."
  - DO NOT ask complex system design, distributed scalability, or high-level architecture questions.` : difficulty === 'Hard' || difficulty === 'Advanced' ? `• DIFFICULTY = HARD (Advanced / Senior):
  - Test advanced concepts, complex problem solving, high-level system design, distributed systems, concurrency/deadlocks, scalability, security vulnerabilities, advanced debugging, trade-offs, and production failure recovery.
  - Examples: "How would you design a distributed caching layer to prevent cache stampede and ensure high availability?", "How do you mitigate race conditions in concurrent transactions?", "Walk me through how you design multi-region disaster recovery for a zero-downtime microservices platform."` : `• DIFFICULTY = MEDIUM (Intermediate / Real-World):
  - Test practical problem-solving, real-world company interview questions, debugging, application of concepts, state management, caching, database indexing, REST API design.
  - Examples: "How would you optimize a slow SQL database query?", "How do you handle authentication in a REST API?", "How do you manage component state across a large web app?"`}

DOMAIN COMPETENCIES FOR ${targetRole.toUpperCase()}:
The candidate has chosen the career domain "${targetRole}". Your domain questions MUST test broad professional knowledge, principles, and competencies expected for this role, covering:
${domainInfo.competencies.map(c => `• ${c}`).join('\n')}

CANDIDATE INFORMATION:
- Name: ${candidateName}
- Target Role: ${targetRole}
${skillsList ? `- Skills listed in profile: ${skillsList}` : ''}
${projectsList ? `- Projects listed in profile: ${projectsList}` : ''}
${resumeExcerpt ? `- Verified Resume Text:\n"""\n${resumeExcerpt}\n"""` : '- Resume: Not provided'}

${hasJd ? `JOB DESCRIPTION:\n"""\n${jdExcerpt}\n"""` : ''}

MANDATORY RULES BY CATEGORY:
1. RESUME-BASED QUESTIONS (${targetResumeCount} required):
   - Must reference actual projects, work experience, technologies, or achievements explicitly mentioned in the candidate's verified resume.
   - Tailor the question complexity to the ${difficulty} difficulty level.
   - NEVER invent fake details.
   - Set "type": "resume_based".

2. DOMAIN-BASED QUESTIONS (${targetDomainCount} required):
   - Must evaluate the core knowledge, concepts, architecture, and skills of a professional ${targetRole}.
   - Align strictly with the ${difficulty} difficulty level.
   - Set "type": "domain_based".
   ${hasJd ? '- Incorporate key responsibilities and requirements from the Job Description.' : ''}

3. GENERAL / BEHAVIORAL QUESTIONS (${targetGeneralCount} required):
   - Evaluate communication, problem-solving mindset, handling technical disagreements, learning new tech, or situational STAR questions.
   - Set "type": "general".

Return ONLY valid JSON matching this exact structure:
{
  "questions": [
    {
      "question": "Clear, concise interview question",
      "type": "resume_based" | "domain_based" | "general",
      "topic": "specific_topic_name"
    }
  ]
}`;

    try {
      const { text } = await generateWithGeminiFallback(prompt);
      const parsed = extractJSON(text);
      if (parsed && Array.isArray(parsed.questions)) {
        generatedQuestions = parsed.questions
          .filter(q => q && typeof q.question === 'string' && q.question.trim().length > 10)
          .map(q => {
            const types = normalizeQuestionTypes(q.types || q.type);
            const primaryType = normalizeQuestionType(types);
            return {
              question: q.question.trim(),
              types,
              type: primaryType,
              topic: q.topic || primaryType,
            };
          });
      }
    } catch (llmErr) {
      console.warn('[questionService] Primary Gemini generation failed, entering application validation & fallback cascade:', llmErr.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // APPLICATION-SIDE VALIDATION & CORRECTION LAYER (MANDATORY)
  // ─────────────────────────────────────────────────────────────────

  let resumePool = generatedQuestions.filter(q => q.type === 'resume_based' || q.types?.includes('resume_based'));
  let domainPool = generatedQuestions.filter(q => (q.type === 'domain_based' || q.types?.includes('domain_based')) && !q.types?.includes('resume_based'));
  let generalPool = generatedQuestions.filter(q => q.type === 'general' || q.types?.includes('general'));

  // 1. Validate & Fill Resume Quota
  if (resumePool.length < targetResumeCount && hasResume) {
    const needed = targetResumeCount - resumePool.length;
    console.log(`[questionService] Validation: Gemini provided ${resumePool.length}/${targetResumeCount} resume questions. Generating ${needed} grounded resume questions.`);
    const missingResume = generateGroundedResumeQuestions(candidateProfile, resumeText, needed, difficulty, [...resumePool, ...domainPool, ...generalPool]);
    resumePool.push(...missingResume);
  }

  // 2. Validate & Fill Domain Quota
  if (hasJd && targetJdCount > 0 && !domainPool.some(q => q.types?.includes('job_description_based'))) {
    const jdQuestions = generateGroundedJdQuestions(jobDescription, targetJdCount, [...resumePool, ...domainPool, ...generalPool]);
    domainPool.unshift(...jdQuestions);
  }

  if (domainPool.length < targetDomainCount) {
    const needed = targetDomainCount - domainPool.length;
    console.log(`[questionService] Validation: Gemini provided ${domainPool.length}/${targetDomainCount} domain questions. Generating ${needed} domain competency questions.`);
    const missingDomain = generateDomainTechnicalQuestions(targetRole, difficulty, needed, [...resumePool, ...domainPool, ...generalPool]);
    domainPool.push(...missingDomain);
  }

  // 3. Validate & Fill General Quota
  if (generalPool.length < targetGeneralCount) {
    const needed = targetGeneralCount - generalPool.length;
    console.log(`[questionService] Validation: Gemini provided ${generalPool.length}/${targetGeneralCount} general questions. Generating ${needed} behavioral questions.`);
    const missingGeneral = generateGeneralBehavioralQuestions(needed, [...resumePool, ...domainPool, ...generalPool]);
    generalPool.push(...missingGeneral);
  }

  // 4. Deduplicate within each pool
  const deduplicatePool = (pool) => {
    const unique = [];
    const seen = new Set();
    for (const item of pool) {
      const key = item.question.toLowerCase().trim().replace(/[^a-z0-9]/g, '').slice(0, 35);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    return unique;
  };

  const finalResume = deduplicatePool(resumePool).slice(0, targetResumeCount);
  const finalDomain = deduplicatePool(domainPool).slice(0, targetDomainCount);
  const finalGeneral = deduplicatePool(generalPool).slice(0, targetGeneralCount);

  // 5. Natural Interleaving for Realistic Interview Experience
  let finalQuestions = interleaveNaturalInterview(finalResume, finalDomain, finalGeneral);

  // Safety fill if count is still less than targetTotal
  if (finalQuestions.length < targetTotal) {
    const needed = targetTotal - finalQuestions.length;
    const additional = generateDomainTechnicalQuestions(targetRole, difficulty, needed, finalQuestions);
    finalQuestions.push(...additional);
  }

  finalQuestions = finalQuestions.slice(0, targetTotal);

  const actualResumeCount = finalQuestions.filter(q => q.type === 'resume_based' || q.types?.includes('resume_based')).length;
  const actualDomainCount = finalQuestions.filter(q => (q.type === 'domain_based' || q.types?.includes('domain_based')) && q.type !== 'resume_based').length;
  const actualGeneralCount = finalQuestions.filter(q => q.type === 'general' || q.types?.includes('general')).length;

  console.log(`[questionService] Final Question Distribution: Total=${finalQuestions.length} (Resume=${actualResumeCount}, Domain=${actualDomainCount}, General=${actualGeneralCount})`);

  return {
    distribution: {
      totalQuestions: targetTotal,
      resumeQuestions: actualResumeCount,
      domainQuestions: actualDomainCount,
      generalQuestions: actualGeneralCount,
      otherQuestions: actualDomainCount + actualGeneralCount,
    },
    questions: finalQuestions,
  };
}

export default {
  calculateQuestionDistribution,
  normalizeQuestionTypes,
  normalizeQuestionType,
  interleaveNaturalInterview,
  interleaveQuestions,
  generateGroundedResumeQuestions,
  generateGroundedJdQuestions,
  generateDomainTechnicalQuestions,
  generateGeneralBehavioralQuestions,
  generateAndValidateInterviewQuestions,
};
