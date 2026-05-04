export const HERO_SUBTITLE =
  'Ask practical questions about voter enrolment, EVM and VVPAT, polling-day preparation, nomination stages, and counting workflows with Google Gemini-backed guidance.';

export interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

export const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: '🧾',
    title: 'Voter Enrolment Clarity',
    description: 'Understand new registration, corrections, address transfer, and electoral roll checks without legal jargon.',
  },
  {
    icon: '🗓️',
    title: 'Election Timeline Map',
    description: 'Follow the full India election cycle from schedule announcement to counting and government formation.',
  },
  {
    icon: '🤖',
    title: 'Context-Aware Assistant',
    description: 'Switch between first-time voter, returning voter, candidate, and observer contexts for more relevant answers.',
  },
  {
    icon: '🧠',
    title: 'EVM and Ballot Decoder',
    description: 'Decode terms like constituency, candidate symbol, NOTA, affidavit, EVM, and VVPAT in plain language.',
  },
  {
    icon: '✅',
    title: 'Polling-Day Planning',
    description: 'Generate a practical checklist for documents, booth verification, travel timing, and official last-mile checks.',
  },
  {
    icon: '🏛️',
    title: 'Official-Source First',
    description: 'The assistant avoids inventing dates and pushes users back to official ECI resources whenever live verification matters.',
  },
];

export interface HowItWorksStep {
  step: string;
  title: string;
  description: string;
}

export const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    step: '01',
    title: 'Choose Your Context',
    description: 'Start as a first-time voter, returning voter, candidate, or observer so the assistant can respond more intelligently.',
  },
  {
    step: '02',
    title: 'Ask a Real Election Question',
    description: 'Query the process in plain language, whether you need enrolment help, polling guidance, or election-stage clarity.',
  },
  {
    step: '03',
    title: 'Get Actionable Steps',
    description: 'Receive concise, non-partisan answers with follow-up prompts and official verification links when the issue is time-sensitive.',
  },
];
