export const HERO_SUBTITLE =
  'Get clear, non-partisan help for your first vote: registration, booth lookup, polling-day preparation, EVM and VVPAT, and official verification through Google-powered guidance.';

export interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

export const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: '🧾',
    title: 'Registration Made Clear',
    description: 'Understand first-time enrolment, corrections, address transfer, and electoral-roll checks without legal jargon.',
  },
  {
    icon: '🗓️',
    title: 'First-Time Voter Timeline',
    description: 'Follow the India election cycle in the order a first-time voter actually experiences it, from preparation to results.',
  },
  {
    icon: '🤖',
    title: 'Stage-Aware Assistant',
    description: 'Ask questions at any election stage and get concise answers focused on booth checks, documents, EVM/VVPAT, and official next steps.',
  },
  {
    icon: '🧠',
    title: 'EVM and Ballot Decoder',
    description: 'Decode terms like constituency, candidate symbol, NOTA, EVM, and VVPAT in plain language before polling day.',
  },
  {
    icon: '✅',
    title: 'Polling-Day Checklist',
    description: 'Generate a practical checklist for documents, booth verification, travel timing, and last-mile official checks.',
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
    title: 'Start With Your Stage',
    description: 'Choose the election stage you are dealing with so the assistant can focus on the right first-time-voter tasks.',
  },
  {
    step: '02',
    title: 'Ask A Real Voting Question',
    description: 'Use plain language to ask about registration, booth lookup, documents, EVM/VVPAT, or polling-day readiness.',
  },
  {
    step: '03',
    title: 'Get Actionable Steps',
    description: 'Receive concise, non-partisan answers with follow-up prompts and official verification links when the issue is time-sensitive.',
  },
];
