import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import SEO from '@/components/SEO';
import { GoldButton } from '@/components/ui';
import apiClient from '@/lib/apiClient';
import type { ApiResponse, OfficialResource } from '@/types';

interface PlanStep {
  id: string;
  title: string;
  question: string;
  options: { label: string; value: string; description: string }[];
}

interface VotingPlanPayload {
  plan_markdown: string;
  suggestions: string[];
  sources: OfficialResource[];
}

const WIZARD_STEPS: PlanStep[] = [
  {
    id: 'registration',
    title: 'Registration Status',
    question: 'Which best describes your voter registration situation?',
    options: [
      {
        label: 'I need new registration',
        value: 'Need new voter registration',
        description: 'I am enrolling for the first time or I am not yet sure I am on the voter list.',
      },
      {
        label: 'I am already registered',
        value: 'Already registered and mostly ready',
        description: 'I mainly need booth, document, and polling-day guidance.',
      },
      {
        label: 'I need correction or transfer',
        value: 'Need correction or address transfer',
        description: 'My name, address, or other voter details may need an update.',
      },
    ],
  },
  {
    id: 'location',
    title: 'Location Context',
    question: 'What is your voting situation right now?',
    options: [
      {
        label: 'Voting from home constituency',
        value: 'Voting from my home constituency',
        description: 'I expect to vote from the constituency where I normally live.',
      },
      {
        label: 'Away from home or recently moved',
        value: 'Away from home or recently moved',
        description: 'I need clarity on transfer, timing, or travel planning.',
      },
      {
        label: 'Need support or accessibility planning',
        value: 'Need accessibility or assistance planning',
        description: 'I want help planning booth access, assistance, or early preparation.',
      },
    ],
  },
  {
    id: 'focus',
    title: 'Planning Focus',
    question: 'What kind of plan should the assistant generate?',
    options: [
      {
        label: 'Booth and documents',
        value: 'Booth verification and document checklist',
        description: 'Focus on ID proof, voter details, and last-mile verification.',
      },
      {
        label: 'Travel and timing',
        value: 'Travel, timing, and backup planning',
        description: 'Focus on scheduling, travel, and avoiding last-minute issues.',
      },
      {
        label: 'Polling process clarity',
        value: 'Understand the polling-day process',
        description: 'Focus on what will happen step by step at the polling station.',
      },
    ],
  },
];

export default function VotingPlanPage() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [sources, setSources] = useState<OfficialResource[]>([]);
  const [error, setError] = useState<string | null>(null);

  const currentStep = WIZARD_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  const handleSelect = (value: string) => {
    setSelections((prev) => ({ ...prev, [currentStep.id]: value }));
    if (!isLastStep) {
      setTimeout(() => setCurrentStepIndex((prev) => prev + 1), 250);
    }
  };

  const generatePlan = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await apiClient.post<ApiResponse<VotingPlanPayload>>('/api/voting-plan', {
        registration_status: selections.registration,
        location_context: selections.location,
        planning_focus: selections.focus,
        language: 'en',
      });

      setGeneratedPlan(response.data.data.plan_markdown);
      setSources(response.data.data.sources ?? []);
    } catch {
      setError('Failed to generate your plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetWizard = () => {
    setSelections({});
    setCurrentStepIndex(0);
    setGeneratedPlan(null);
    setSources([]);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-void pt-20 pb-20 px-6 overflow-x-hidden">
      <SEO
        title="Voting Plan"
        description="Create a personalised Indian election voting checklist with booth checks, document preparation, and polling-day guidance."
        path="/voting-plan"
      />

      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-12 no-print">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest mb-4"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            Voting Preparation Flow
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
            Build Your <span className="text-gold">Polling-Day Plan</span>
          </h1>
          <p className="text-text-secondary max-w-md mx-auto text-sm sm:text-base leading-relaxed">
            Answer three short questions and generate a practical, India-focused election checklist with official verification points.
          </p>
        </header>

        <div className="relative min-h-[420px]">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-6" />
                <p className="text-gold font-bold uppercase tracking-widest animate-pulse">Generating your plan...</p>
                <p className="text-text-secondary text-xs mt-2">Combining your context with official election guidance</p>
              </motion.div>
            ) : generatedPlan ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-abyss/40 border border-border/40 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-center justify-between mb-8 border-b border-border/40 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4a017" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <path d="M22 4L12 14.01l-3-3" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">Your Personal Checklist</h2>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="text-xs text-text-secondary hover:text-gold transition-colors flex items-center gap-1.5 font-bold uppercase tracking-widest no-print"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Print
                  </button>
                </div>

                <div className="prose prose-invert prose-gold max-w-none prose-sm sm:prose-base">
                  <ReactMarkdown>{generatedPlan}</ReactMarkdown>
                </div>

                {sources.length > 0 ? (
                  <div className="mt-8 pt-6 border-t border-border/40">
                    <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-widest">Official Verification Links</h3>
                    <div className="flex flex-wrap gap-3">
                      {sources.map((source) => (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-full border border-gold/20 bg-gold/5 text-gold text-xs hover:bg-gold/10 transition-colors"
                        >
                          {source.title}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-10 pt-8 border-t border-border/40 flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <p className="text-[10px] text-text-secondary/60 uppercase tracking-wider italic">
                    Always verify live dates and booth assignments through official ECI channels.
                  </p>
                  <GoldButton variant="outline" size="sm" onClick={resetWizard} className="no-print">
                    Start Over
                  </GoldButton>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`step-${currentStep.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-abyss/40 border border-border/40 rounded-3xl p-6 sm:p-10 shadow-xl"
              >
                <div className="flex gap-2 mb-8">
                  {WIZARD_STEPS.map((step, index) => (
                    <div
                      key={step.id}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                        index <= currentStepIndex ? 'bg-gold' : 'bg-white/5'
                      }`}
                    />
                  ))}
                </div>

                <span className="text-[10px] text-gold font-bold uppercase tracking-[0.3em] mb-2 block">
                  Step {String(currentStepIndex + 1).padStart(2, '0')}
                </span>
                <h2 className="text-2xl sm:text-3xl text-white font-display mb-3">{currentStep.question}</h2>
                <p className="text-text-secondary text-sm mb-8 max-w-xl">
                  The assistant uses your answers to prioritise the most useful official checks and election steps.
                </p>

                <div className="space-y-4">
                  {currentStep.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSelect(option.value)}
                      className="w-full text-left p-5 rounded-2xl border border-border/40 bg-surface/40 hover:border-gold/40 hover:bg-gold/5 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-white font-semibold mb-2 group-hover:text-gold transition-colors">{option.label}</h3>
                          <p className="text-sm text-text-secondary leading-relaxed">{option.description}</p>
                        </div>
                        <span className="text-gold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </div>
                    </button>
                  ))}
                </div>

                {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}

                {isLastStep && selections.registration && selections.location ? (
                  <div className="mt-8 pt-6 border-t border-border/30 flex justify-end">
                    <GoldButton onClick={generatePlan}>Generate My Plan</GoldButton>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
