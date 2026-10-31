/**
 * Client-side required-skills map for the Resume Fit section of the PDF report.
 *
 * Mirrors the structure of backend/services/ruleEngine.js's TECHNICAL_FACTS
 * (a keyword list per subject area), but keyed by target job role instead of
 * interview domain, and used for resume/skill matching rather than answer
 * verification. Report.jsx only has candidateProfile.skills (from
 * analyzeResume on the backend) and the freeform targetRole string — there is
 * no backend endpoint for role -> expected-skills, so this is computed here.
 */

const ROLE_SKILL_MAP = {
  'frontend developer': ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'REST APIs', 'Git', 'Testing (Jest)', 'State Mgmt (Redux)', 'Webpack/Vite'],
  'react developer': ['React', 'JavaScript', 'TypeScript', 'REST APIs', 'Git', 'CSS / Flexbox', 'Testing (Jest)', 'State Mgmt (Redux)'],
  'backend developer': ['Node.js', 'REST APIs', 'SQL', 'Databases', 'Git', 'Authentication', 'Testing', 'System Design', 'Docker'],
  'full stack developer': ['React', 'Node.js', 'JavaScript', 'REST APIs', 'SQL', 'Git', 'CSS', 'System Design', 'Testing'],
  'software engineer': ['Data Structures', 'Algorithms', 'Git', 'REST APIs', 'SQL', 'Testing', 'System Design', 'OOP'],
  'data scientist': ['Python', 'Pandas', 'NumPy', 'SQL', 'Machine Learning', 'Statistics', 'Data Visualization', 'Scikit-learn'],
  'data analyst': ['SQL', 'Excel', 'Python', 'Data Visualization', 'Statistics', 'Power BI / Tableau'],
  'machine learning engineer': ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow / PyTorch', 'SQL', 'Statistics', 'MLOps'],
  'devops engineer': ['Docker', 'Kubernetes', 'CI/CD', 'AWS / Azure / GCP', 'Linux', 'Scripting', 'Terraform', 'Monitoring'],
  'cloud engineer': ['AWS', 'Azure', 'Docker', 'Kubernetes', 'Networking', 'IAM', 'Serverless', 'Scalability'],
  'mobile developer': ['React Native / Flutter', 'JavaScript', 'REST APIs', 'Git', 'UI Design', 'Testing'],
  'qa engineer': ['Testing', 'Test Automation', 'Selenium', 'Git', 'Bug Tracking', 'API Testing'],
  'ui/ux designer': ['Figma', 'Wireframing', 'Prototyping', 'User Research', 'Design Systems', 'Usability Testing'],
  'product manager': ['Roadmapping', 'Stakeholder Management', 'Agile / Scrum', 'Data Analysis', 'User Research', 'Prioritization'],
  'cybersecurity analyst': ['Network Security', 'Firewalls', 'Vulnerability Assessment', 'SIEM', 'Encryption', 'Incident Response'],
};

const GENERIC_FALLBACK = ['Communication', 'Problem Solving', 'Git', 'Teamwork', 'Domain Fundamentals'];

/**
 * Finds the closest ROLE_SKILL_MAP entry for a freeform target role string
 * (e.g. "Frontend Developer (React)" -> 'frontend developer').
 */
function resolveRoleKey(targetRole = '') {
  const lower = targetRole.toLowerCase();
  const keys = Object.keys(ROLE_SKILL_MAP);

  // Exact-ish substring match first (longest key wins to avoid e.g.
  // "developer" matching before "frontend developer").
  const candidates = keys.filter(k => lower.includes(k) || k.includes(lower));
  if (candidates.length) {
    return candidates.sort((a, b) => b.length - a.length)[0];
  }

  // Loose keyword match (e.g. "React Engineer" -> react developer via "react")
  for (const k of keys) {
    const kw = k.split(' ')[0];
    if (lower.includes(kw)) return k;
  }

  return null;
}

/**
 * Returns the expected-skills checklist for a target role.
 */
export function getRequiredSkills(targetRole) {
  const key = resolveRoleKey(targetRole);
  return key ? ROLE_SKILL_MAP[key] : GENERIC_FALLBACK;
}

/**
 * Compares a candidate's extracted resume skills against the expected list
 * for their target role. Matching is case-insensitive and tolerant of
 * partial phrases (e.g. candidate skill "ReactJS" matches required "React").
 *
 * @param {string[]} candidateSkills - from candidateProfile.skills (analyzeResume output)
 * @param {string} targetRole
 * @returns {{ required: string[], matched: string[], missing: string[], matchPct: number }}
 */
export function matchResumeSkills(candidateSkills = [], targetRole = '') {
  const required = getRequiredSkills(targetRole);
  const normalizedCandidate = (candidateSkills || []).map(s => String(s).toLowerCase());

  const matched = [];
  const missing = [];

  required.forEach(reqSkill => {
    const reqLower = reqSkill.toLowerCase();
    const reqTokens = reqLower.split(/[\s/().-]+/).filter(t => t.length > 2);

    const isMatch = normalizedCandidate.some(candSkill => {
      if (candSkill.includes(reqLower) || reqLower.includes(candSkill)) return true;
      return reqTokens.some(tok => candSkill.includes(tok));
    });

    if (isMatch) matched.push(reqSkill);
    else missing.push(reqSkill);
  });

  const matchPct = required.length ? Math.round((matched.length / required.length) * 100) : 0;

  return { required, matched, missing, matchPct };
}

export default { getRequiredSkills, matchResumeSkills };