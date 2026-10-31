/**
 * Real-world human interviewer personas for MockMirror.
 * Each persona has unique human traits, job title, avatar style,
 * and text-to-speech voice parameters (pitch, rate, preferred browser voice keywords).
 */

export const INTERVIEWER_PERSONAS = [
  {
    id: 'sarah-jenkins',
    name: 'Sarah Jenkins',
    title: 'Lead Technical Recruiter',
    company: 'Global Talent Tech',
    gender: 'female',
    avatarBg: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    avatarInitial: 'SJ',
    badgeColor: '#ec4899',
    personality: 'Warm, encouraging, and focused on practical achievements and communication skills.',
    voiceSettings: {
      pitch: 1.05,
      rate: 0.95,
      preferredVoices: ['Jenny', 'Samantha', 'Google US English', 'Zira', 'Victoria', 'Karen', 'Female'],
    },
    greetingIntro: "Hi there! I'm Sarah Jenkins, Lead Technical Recruiter. I'm really looking forward to learning about your background and recent projects today.",
  },
  {
    id: 'david-miller',
    name: 'David Miller',
    title: 'Senior Engineering Manager',
    company: 'Apex Systems',
    gender: 'male',
    avatarBg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    avatarInitial: 'DM',
    badgeColor: '#3b82f6',
    personality: 'Sharp, analytical, interested in system design, architecture, and team collaboration.',
    voiceSettings: {
      pitch: 0.93,
      rate: 0.93,
      preferredVoices: ['Guy', 'Daniel', 'David', 'Google US English', 'Alex', 'Male'],
    },
    greetingIntro: "Hello! David Miller here. As an Engineering Manager, I love diving into how developers approach real-world engineering problems. Let's get started!",
  },
  {
    id: 'elena-rostova',
    name: 'Elena Rostova',
    title: 'Principal Systems Architect',
    company: 'Nexus Scale Labs',
    gender: 'female',
    avatarBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    avatarInitial: 'ER',
    badgeColor: '#10b981',
    personality: 'Methodical, thorough, passionate about scalable software patterns and error resilience.',
    voiceSettings: {
      pitch: 1.0,
      rate: 0.94,
      preferredVoices: ['Samantha', 'Jenny', 'Google US English', 'Moira', 'Female'],
    },
    greetingIntro: "Welcome! I'm Elena Rostova, Principal Systems Architect. I'm excited to explore your technical foundation and design thinking with you.",
  },
  {
    id: 'marcus-vance',
    name: 'Marcus Vance',
    title: 'VP of Engineering',
    company: 'Horizon Cloud',
    gender: 'male',
    avatarBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    avatarInitial: 'MV',
    badgeColor: '#f59e0b',
    personality: 'Strategic, engaging, focuses on problem solving under pressure and business impact.',
    voiceSettings: {
      pitch: 0.9,
      rate: 0.96,
      preferredVoices: ['Guy', 'David', 'Daniel', 'Google US English', 'Male'],
    },
    greetingIntro: "Good day! I'm Marcus Vance, VP of Engineering. I'm glad we could connect today for this interactive technical discussion.",
  },
  {
    id: 'rachel-adams',
    name: 'Rachel Adams',
    title: 'Director of Product & Engineering',
    company: 'Starlight Tech',
    gender: 'female',
    avatarBg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    avatarInitial: 'RA',
    badgeColor: '#8b5cf6',
    personality: 'Insightful, empathetic, evaluates domain knowledge alongside leadership potential.',
    voiceSettings: {
      pitch: 1.08,
      rate: 0.96,
      preferredVoices: ['Jenny', 'Google US English', 'Samantha', 'Zira', 'Female'],
    },
    greetingIntro: "Hi! I'm Rachel Adams. As Director of Product & Engineering, I look forward to hearing your perspective and technical experiences.",
  },
  {
    id: 'james-thorne',
    name: 'James Thorne',
    title: 'Head of AI Infrastructure',
    company: 'Quantum Logic',
    gender: 'male',
    avatarBg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    avatarInitial: 'JT',
    badgeColor: '#06b6d4',
    personality: 'Inquisitive, supportive, loves deep technical discussion and real project anecdotes.',
    voiceSettings: {
      pitch: 0.92,
      rate: 0.94,
      preferredVoices: ['Daniel', 'Guy', 'Google US English', 'David', 'Male'],
    },
    greetingIntro: "Hello! I'm James Thorne, Head of AI Infrastructure. Let's make this session a natural, productive conversation about your background.",
  },
];

/**
 * Gets a random interviewer persona from the list.
 * If previousId is supplied, it ensures a DIFFERENT interviewer is picked every time.
 */
export function getRandomInterviewer(previousId = null) {
  const available = previousId
    ? INTERVIEWER_PERSONAS.filter(p => p.id !== previousId)
    : INTERVIEWER_PERSONAS;
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

/**
 * Gets persona by ID or returns default (Sarah Jenkins).
 */
export function getInterviewerById(id) {
  if (!id) return INTERVIEWER_PERSONAS[0];
  return INTERVIEWER_PERSONAS.find(p => p.id === id) || INTERVIEWER_PERSONAS[0];
}
