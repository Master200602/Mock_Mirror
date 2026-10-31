/**
 * Domain competencies, roles registry, sample questions, and general behavioral questions.
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

export const GENERAL_BEHAVIORAL_QUESTIONS = [
  'Tell me about a time you faced a tight deadline or high-pressure situation, and how you managed it.',
  'Can you describe a situation where you had a technical disagreement with a teammate or stakeholder and how you resolved it?',
  'Tell me about a project that did not go as planned. What went wrong and what lessons did you take away?',
  'How do you prioritize competing tasks and decide what to tackle first when resources are limited?',
  'Describe a time you had to learn a completely new technology or domain quickly to deliver a feature.',
  'Can you share an example of how you mentored a junior colleague or helped improve engineering practices on your team?',
];

const DOMAIN_COMPETENCIES_MAP = {
  'Software Developer': {
    category: 'Software Development',
    competencies: [
      'Object-Oriented Programming (OOP) & Design Principles',
      'Data Structures & Algorithms (DSA)',
      'Database Design & SQL Optimization',
      'REST APIs & Microservice Architecture',
      'Unit Testing, Integration Testing & TDD',
    ],
    sampleQuestions: {
      Beginner: [
        'Explain the concept of polymorphism and interface inheritance in OOP.',
        'What is the difference between relational and NoSQL databases, and how do you use Git version control?',
        'How does abstract class design differ from an interface in object-oriented development?',
      ],
      Intermediate: [
        'How do you design a robust RESTful API and handle database locking?',
        'How do you approach debugging a memory leak in production and applying unit testing with TDD?',
        'What strategies do you use for database transaction isolation and concurrency management?',
      ],
      Advanced: [
        'How do you design a distributed microservices system ensuring concurrency control and eventual consistency?',
        'Explain how database indexing, caching strategies, design patterns, and a CI/CD pipeline optimize high-throughput applications.',
        'How do you design fault-tolerant distributed transactions across independent microservices?',
      ],
    },
  },
  'Data Scientist': {
    category: 'Data',
    competencies: [
      'Statistics & Probability Foundations',
      'Python & Pandas Data Manipulation',
      'Supervised & Unsupervised Machine Learning',
      'Data Preprocessing & Feature Engineering',
      'Model Evaluation & Hyperparameter Tuning',
    ],
    sampleQuestions: {
      Beginner: [
        'Explain basic statistics and probability concepts and how you use Python and Pandas for data manipulation.',
        'What is the difference between supervised and unsupervised machine learning algorithms?',
      ],
      Intermediate: [
        'How do you evaluate supervised machine learning models and handle overfitting during data preprocessing?',
        'Can you explain feature engineering techniques and how you handle missing or skewed data using Pandas and NumPy?',
      ],
      Advanced: [
        'How do you architect distributed data pipelines and scale neural networks in production?',
        'How do you handle covariate shift and data drift in live machine learning prediction systems?',
      ],
    },
  },
  'Cybersecurity Analyst': {
    category: 'Cybersecurity',
    competencies: [
      'CIA Triad & Information Security Frameworks',
      'Networking & Firewalls Architecture',
      'Threat Modeling & Vulnerability Assessment',
      'Penetration Testing & Exploit Analysis',
      'Incident Response & SIEM Monitoring',
    ],
    sampleQuestions: {
      Beginner: [
        'Explain the CIA triad and the fundamentals of networking and firewalls.',
        'What is the difference between vulnerability scanning and penetration testing?',
      ],
      Intermediate: [
        'How do you conduct threat modeling and prioritize vulnerability assessment findings?',
        'Explain how you investigate anomalous traffic patterns detected across enterprise firewalls and network perimeters.',
      ],
      Advanced: [
        'Walk through incident response protocols during a complex APT attack or ransomware breach.',
        'How do you architect zero-trust defense architectures with granular network micro-segmentation?',
      ],
    },
  },
  'Cloud Engineer': {
    category: 'Cloud / DevOps',
    competencies: [
      'Cloud Architecture & Infrastructure as Code',
      'IAM Security Policies & Access Governance',
      'VPC & Subnet Networking Design',
      'Containers & Kubernetes Orchestration',
      'Monitoring, Observability & Disaster Recovery',
    ],
    sampleQuestions: {
      Beginner: [
        'Explain the principles of cloud architecture and how IAM policies manage access.',
        'What is the purpose of VPC subnets, route tables, and internet gateways in cloud environments?',
      ],
      Intermediate: [
        'How do you design a multi-region VPC with public and private subnets and secure IAM role delegation?',
        'How do you manage container lifecycle and ingress controllers using Docker and Kubernetes?',
      ],
      Advanced: [
        'How do you design zero-downtime multi-cloud deployments with Kubernetes and disaster recovery across regions?',
        'Explain how you architect auto-scaling infrastructure with latency-based routing and edge caching.',
      ],
    },
  },
};

export function getDomainCompetencies(domain = 'Software Developer') {
  if (DOMAIN_COMPETENCIES_MAP[domain]) {
    return DOMAIN_COMPETENCIES_MAP[domain];
  }

  // Look up by category in DOMAIN_GROUPS
  const group = DOMAIN_GROUPS.find(g => g.roles.some(r => r.toLowerCase() === domain.toLowerCase())) ||
                DOMAIN_GROUPS.find(g => domain.toLowerCase().includes(g.category.toLowerCase())) ||
                DOMAIN_GROUPS[0];

  const category = group.category;

  if (category === 'Data' || category === 'AI / ML') {
    return {
      category,
      competencies: [
        'Statistics & Probability',
        'Python & Pandas',
        'Supervised & Unsupervised Machine Learning',
        'Data Preprocessing & Feature Extraction',
      ],
      sampleQuestions: DOMAIN_COMPETENCIES_MAP['Data Scientist'].sampleQuestions,
    };
  }

  if (category === 'Cybersecurity') {
    return {
      category,
      competencies: [
        'CIA Triad & Information Security',
        'Networking & Firewalls',
        'Threat Modeling & Vulnerability Assessment',
      ],
      sampleQuestions: DOMAIN_COMPETENCIES_MAP['Cybersecurity Analyst'].sampleQuestions,
    };
  }

  if (category === 'Cloud / DevOps' || category === 'Networking') {
    return {
      category,
      competencies: [
        'Cloud Architecture',
        'IAM Security & Access',
        'VPC & Subnet Networking',
        'Containers & Kubernetes',
      ],
      sampleQuestions: DOMAIN_COMPETENCIES_MAP['Cloud Engineer'].sampleQuestions,
    };
  }

  // Default to Software Development
  return {
    category: category || 'Software Development',
    competencies: [
      'Object-Oriented Programming (OOP)',
      'Data Structures & Algorithms (DSA)',
      'Database Design & SQL',
      'REST APIs & Architecture',
      'Unit Testing & TDD',
    ],
    sampleQuestions: DOMAIN_COMPETENCIES_MAP['Software Developer'].sampleQuestions,
  };
}

export default {
  DOMAIN_GROUPS,
  GENERAL_BEHAVIORAL_QUESTIONS,
  getDomainCompetencies,
};
