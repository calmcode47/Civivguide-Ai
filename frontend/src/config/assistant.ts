import type { StageContext, UserContext } from '@/types';

export const USER_CONTEXTS: UserContext[] = [
  'First-Time Voter',
  'Returning Voter',
  'Candidate',
  'Observer',
];

export const STAGE_CONTEXTS: StageContext[] = [
  'Pre-Announcement',
  'Registration & Roll Check',
  'Campaign Period',
  'Polling Day',
  'Counting & Results',
];

export const TRANSLATION_LANGUAGES = [
  { code: 'hi', label: 'Hindi' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'bn', label: 'Bengali' },
] as const;
