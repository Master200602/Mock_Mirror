/**
 * Structured list of IT and Computer Science career domains for MockMirror.
 * Categorized by industry domain with searchable helper utilities.
 */

export const DOMAIN_GROUPS = [
  {
    category: 'Software Development',
    roles: [
      'Software Developer',
      'Software Engineer',
      'Backend Developer',
      'Frontend Developer',
      'Full Stack Developer',
      'Mobile App Developer',
      'Android Developer',
      'iOS Developer',
      'Flutter Developer',
      'React Developer',
      'Java Developer',
      'Python Developer',
      '.NET Developer',
      'C/C++ Developer',
    ],
  },
  {
    category: 'Data',
    roles: [
      'Data Analyst',
      'Data Scientist',
      'Data Engineer',
      'Machine Learning Engineer',
      'AI Engineer',
      'Generative AI Engineer',
      'Business Intelligence Analyst',
      'Big Data Engineer',
    ],
  },
  {
    category: 'Web',
    roles: [
      'Web Developer',
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'Web Application Developer',
    ],
  },
  {
    category: 'Cloud / DevOps',
    roles: [
      'Cloud Engineer',
      'AWS Cloud Engineer',
      'Azure Cloud Engineer',
      'Google Cloud Engineer',
      'DevOps Engineer',
      'Site Reliability Engineer',
      'Cloud Architect',
    ],
  },
  {
    category: 'Cybersecurity',
    roles: [
      'Cybersecurity Analyst',
      'Security Engineer',
      'Ethical Hacker',
      'Penetration Tester',
      'SOC Analyst',
      'Network Security Engineer',
      'Information Security Analyst',
    ],
  },
  {
    category: 'Networking',
    roles: [
      'Network Engineer',
      'Network Administrator',
      'Network Security Engineer',
    ],
  },
  {
    category: 'Database',
    roles: [
      'Database Administrator',
      'Database Developer',
      'SQL Developer',
    ],
  },
  {
    category: 'AI / ML',
    roles: [
      'Machine Learning Engineer',
      'AI Engineer',
      'Deep Learning Engineer',
      'NLP Engineer',
      'Computer Vision Engineer',
      'Generative AI Engineer',
    ],
  },
  {
    category: 'QA / Testing',
    roles: [
      'QA Engineer',
      'Software Tester',
      'Automation Tester',
      'Test Engineer',
      'SDET',
    ],
  },
  {
    category: 'Other IT Roles',
    roles: [
      'System Administrator',
      'Systems Engineer',
      'Solutions Architect',
      'Technical Support Engineer',
      'IT Consultant',
      'Business Analyst',
      'Technical Product Manager',
      'UI/UX Designer',
      'Blockchain Developer',
      'Game Developer',
    ],
  },
];

// Flat unique list of all roles
export const ALL_DOMAINS = Array.from(
  new Set(DOMAIN_GROUPS.flatMap(group => group.roles))
);

export default {
  DOMAIN_GROUPS,
  ALL_DOMAINS,
};
