import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';

import { GoldButton, ErrorBanner } from '@/components/ui';
import { trackEvent } from '@/lib/analytics';
import apiClient from '@/lib/apiClient';
import { type ElectionTimelineResponse, type StageContext } from '@/types';

// =============================================================================
// Constants & Helpers
// =============================================================================

const PHASE_STAGE_MAP: Record<string, StageContext> = {
  'Pre-Election': 'Pre-Announcement',
  Nomination: 'Campaign Period',
  Campaign: 'Campaign Period',
  Polling: 'Polling Day',
  Counting: 'Counting & Results',
  Result: 'Counting & Results',
};

// =============================================================================
// Sub-components
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="w-full flex flex-col gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-abyss border border-border overflow-hidden animate-pulse"
          style={{ borderLeftWidth: '3px', borderLeftColor: '#d4a01733' }}
        >
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-5 bg-border/40 rounded" />
              <div className="w-24 h-4 bg-border/30 rounded-full" />
            </div>
            <div className="w-3/4 h-5 bg-border/50 rounded mb-3" />
            <div className="space-y-2">
              <div className="w-full h-3 bg-border/30 rounded" />
              <div className="w-5/6 h-3 bg-border/30 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// TimelinePage
// =============================================================================

export default function TimelinePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] = useState<ElectionTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<string>('all');
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/timeline');
      if (response.data?.data) setData(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load election timeline. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── Hash navigation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (location.hash && data) {
      const id = location.hash.replace('#step-', '');
      setActiveStepId(id);
      cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [location.hash, data]);

  // ─── Derived state ────────────────────────────────────────────────────────
  const { filteredSteps, phases } = useMemo(() => {
    if (!data) return { filteredSteps: [], phases: [] };
    const allSteps = data.phases.flatMap(p => p.steps).sort((a, b) => a.order - b.order);
    const steps = activePhase === 'all' ? allSteps : allSteps.filter(s => s.phase === activePhase);
    return { filteredSteps: steps, phases: data.phases };
  }, [data, activePhase]);
  const selectedStep = useMemo(
    () => filteredSteps.find((step) => step.id === activeStepId) ?? filteredSteps[0] ?? null,
    [activeStepId, filteredSteps]
  );

  useEffect(() => {
    if (!filteredSteps.length) {
      setActiveStepId(null);
      return;
    }

    if (!activeStepId || !filteredSteps.some((step) => step.id === activeStepId)) {
      setActiveStepId(filteredSteps[0].id);
    }
  }, [activeStepId, filteredSteps]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleStepClick = (id: string) => {
    setActiveStepId(id);
    navigate(`#step-${id}`, { replace: true });
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const toggleExpand = (id: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAskAI = async (title: string, phase: string) => {
    const stageContext = PHASE_STAGE_MAP[phase] ?? 'Pre-Announcement';
    await trackEvent('timeline_ask_ai_clicked', {
      stage_context: stageContext,
    });
    navigate(
      `/assistant?prefill=${encodeURIComponent(`Tell me more about ${title}`)}&stage=${encodeURIComponent(stageContext)}`
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-void flex flex-col" style={{ paddingTop: '64px' }}>
      <SEO 
        title="Election Journey Timeline"
        description="Explore the Indian election process as a first-time voter journey, from roll checks and booth preparation to polling day and official results."
        path="/timeline"
      />

      {/* ═══════════════════════════════════════════════════════════════════
          Hero
      ════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative flex flex-col items-center justify-center overflow-hidden border-b border-border"
        style={{ minHeight: '44vh' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            zIndex: 0,
            background:
              'radial-gradient(circle at 18% 25%, rgba(212,160,23,0.18), transparent 22%), radial-gradient(circle at 82% 20%, rgba(79,109,245,0.14), transparent 24%), linear-gradient(180deg, rgba(16,19,34,0.96), rgba(7,8,13,0.98))',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          aria-hidden="true"
          style={{
            zIndex: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
          }}
        />

        <div className="relative text-center px-5 sm:px-10 py-10 sm:py-14" style={{ zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/25 bg-gold/5 mb-5"
          >
            <span className="text-[11px] font-semibold text-gold uppercase tracking-widest">
              India Election Workflow
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="font-display text-white leading-tight mb-3"
            style={{ fontSize: 'clamp(2rem, 7vw, 4rem)' }}
          >
            The <span className="gold-gradient-text">First-Time Voter Journey</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="text-text-secondary max-w-md mx-auto text-sm sm:text-base leading-relaxed"
          >
            Explore the steps a first-time voter should watch, from roll checks and booth preparation to polling day and official results.
          </motion.p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          Sticky Phase Filter
      ════════════════════════════════════════════════════════════════════ */}
      <div
        className="sticky z-30 bg-abyss/90 backdrop-blur-xl border-b border-border"
        style={{ top: '64px' }}
      >
        <div className="relative">

          <div
            className="flex items-center justify-center flex-wrap gap-2 px-6 py-3 no-scrollbar"
            aria-label="Filter by election phase"
          >
            <button
              onClick={() => setActivePhase('all')}
              className={`px-4 py-2 rounded-full text-[10px] font-bold border shrink-0 uppercase tracking-widest transition-all ${
                activePhase === 'all'
                  ? 'bg-gold text-void border-gold shadow-gold-glow'
                  : 'text-text-secondary border-border hover:border-gold/40 hover:text-gold'
              }`}
            >
              All Steps
            </button>
            {phases.map(phase => (
              <button
                key={phase.id}
                onClick={() => setActivePhase(phase.name)}
                className={`px-4 py-2 rounded-full text-[10px] font-bold border shrink-0 uppercase tracking-widest whitespace-nowrap transition-all ${
                  activePhase === phase.name
                    ? 'border-transparent text-void'
                    : 'text-text-secondary border-border hover:border-gold/40 hover:text-gold'
                }`}
                style={{
                  backgroundColor: activePhase === phase.name ? phase.color : 'transparent',
                }}
              >
                {phase.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Two-column body: LEFT = cards, RIGHT = sticky snapshot
          Outer wrapper: max-width centred, flex row on desktop
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row" style={{ minHeight: 0 }}>

        {/* ── LEFT: Scrollable content list ──────────────────────────── */}
        <section
          aria-label="Election process timeline"
          className="flex-1 py-8 sm:py-10 px-6 sm:px-10 lg:px-12 lg:pr-8 min-w-0 pb-12 lg:pb-10"
        >
          <div className="max-w-xl w-full mx-auto">

            {/* Meta row */}
            {!loading && !error && filteredSteps.length > 0 && (
              <div className="flex items-center justify-between mb-5">
                <p className="text-[11px] text-text-secondary uppercase tracking-widest">
                  Showing <span className="text-gold font-bold">{filteredSteps.length}</span> steps
                </p>
                {activePhase !== 'all' && (
                  <button
                    onClick={() => setActivePhase('all')}
                    className="text-[10px] text-gold border border-gold/25 rounded-full px-3 py-1 hover:bg-gold/10 transition-colors uppercase tracking-widest"
                  >
                    Clear ×
                  </button>
                )}
              </div>
            )}

            {!loading && !error && selectedStep ? (
              <div className="mb-5 rounded-2xl border border-gold/15 bg-gold/5 p-4 lg:hidden">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gold">
                      Current Focus
                    </p>
                    <h2 className="mt-2 text-base font-bold text-white">{selectedStep.title}</h2>
                  </div>
                  <span className="rounded-full border border-gold/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold">
                    {selectedStep.phase}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {selectedStep.description}
                </p>
              </div>
            ) : null}

            {/* States */}
            {loading ? (
              <LoadingSkeleton />
            ) : error ? (
              <div className="bg-danger/10 border border-danger/30 rounded-2xl p-8 text-center">
                <span className="text-3xl mb-3 block">⚠️</span>
                <h3 className="text-base text-white mb-2">Something went wrong</h3>
                <p className="text-text-secondary text-sm mb-6">{error}</p>
                <GoldButton onClick={fetchData}>Try Again</GoldButton>
              </div>
            ) : filteredSteps.length === 0 ? (
              <div className="text-center py-14">
                <span className="text-3xl mb-3 block opacity-30">🗳️</span>
                <p className="text-text-secondary text-sm mb-4">No steps found for this phase.</p>
                <button
                  onClick={() => setActivePhase('all')}
                  className="text-gold underline underline-offset-4 text-sm"
                >
                  View all steps
                </button>
              </div>
            ) : (
              <div role="list" aria-label="Election steps" className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredSteps.map((step) => {
                    const phaseColor = data?.phases.find(p => p.name === step.phase)?.color || '#d4a017';
                    const isExpanded = expandedSteps.has(step.id);
                    const isActive = activeStepId === step.id;

                    return (
                      <motion.div
                        key={step.id}
                        layout
                        initial={{ opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-30px' }}
                        transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
                        ref={(el) => (cardRefs.current[step.id] = el)}
                        role="listitem"
                        aria-label={`Step ${step.order}: ${step.title}`}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.target !== event.currentTarget) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleStepClick(step.id);
                          }
                        }}
                        className="relative bg-abyss border rounded-2xl overflow-hidden scroll-mt-32 transition-all duration-300 cursor-default"
                        style={{
                          borderWidth: '1px',
                          borderLeftWidth: '3px',
                          borderColor: isActive ? `${phaseColor}60` : 'var(--color-border)',
                          borderLeftColor: phaseColor,
                          boxShadow: isActive
                            ? `0 0 0 1px ${phaseColor}20, 0 6px 28px rgba(0,0,0,0.45)`
                            : '0 1px 4px rgba(0,0,0,0.2)',
                        }}
                      >
                        {/* Active pulse dot */}
                        {isActive && (
                          <span
                            className="absolute top-4 right-4 w-2 h-2 rounded-full animate-pulse"
                            style={{ backgroundColor: phaseColor }}
                            aria-hidden="true"
                          />
                        )}

                        <div className="p-5 flex flex-col gap-3">

                          {/* Header row */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="font-display text-base font-bold select-none leading-none"
                              style={{ color: phaseColor, opacity: 0.55 }}
                            >
                              #{step.order}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                              style={{
                                backgroundColor: `${phaseColor}18`,
                                color: phaseColor,
                                border: `1px solid ${phaseColor}30`,
                              }}
                            >
                              {step.phase}
                            </span>
                            <span className="ml-auto text-[10px] text-text-secondary whitespace-nowrap flex items-center gap-1 shrink-0">
                              <span style={{ color: phaseColor }}>⏱</span>
                              {step.duration}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-sm sm:text-base font-bold text-white font-body leading-snug">
                            {step.title}
                          </h3>

                          {/* Description */}
                          <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
                            {step.description}
                          </p>

                          {/* Expanded details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.28, ease: 'easeOut' }}
                                className="overflow-hidden"
                              >
                                <ul className="mt-1 pt-3 border-t border-border/40 space-y-2">
                                  {step.details.map((detail: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2.5 text-xs text-text-secondary group">
                                      <span
                                        className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0 group-hover:scale-150 transition-transform"
                                        style={{ backgroundColor: phaseColor }}
                                      />
                                      <span className="group-hover:text-text-primary transition-colors leading-relaxed">
                                        {detail}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-border/35 gap-2">
                            <button
                              onClick={() => toggleExpand(step.id)}
                              aria-expanded={isExpanded}
                              className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-opacity hover:opacity-80"
                              style={{ color: phaseColor }}
                            >
                              {isExpanded ? <>Hide <span aria-hidden="true">↑</span></> : <>Details <span aria-hidden="true">↓</span></>}
                            </button>
                            <button
                              onClick={() => void handleAskAI(step.title, step.phase)}
                              className="px-3 py-1 rounded-full text-[9px] font-bold text-text-secondary border border-border/40 hover:border-gold hover:text-gold hover:bg-gold/5 transition-all uppercase tracking-widest whitespace-nowrap"
                            >
                              Ask AI →
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>

        {!loading && !error && filteredSteps.length > 0 && selectedStep ? (
          <aside
            className="hidden lg:flex flex-col"
            style={{
              width: '360px',
              flexShrink: 0,
              position: 'sticky',
              top: '128px',
              height: 'calc(100vh - 128px)',
              borderLeft: '1px solid var(--color-border)',
              background: 'linear-gradient(180deg, #0a0c18 0%, #07080d 100%)',
            }}
            aria-label="Current timeline snapshot"
          >
            <div
              className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at 50% 0%, rgba(212,160,23,0.07) 0%, transparent 70%)',
                zIndex: 1,
              }}
            />

            <div
              className="flex items-center gap-2.5 px-6 py-4 border-b border-border/40"
              style={{ zIndex: 2 }}
            >
              <span className="w-2 h-2 rounded-full bg-gold" />
              <span className="text-xs uppercase tracking-widest text-text-secondary font-bold">
                Process Snapshot
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="rounded-3xl border border-gold/15 bg-gold/5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-gold/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold">
                    {selectedStep.phase}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-text-secondary">
                    Step {selectedStep.order}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-bold text-white">{selectedStep.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {selectedStep.description}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] uppercase tracking-widest text-text-secondary">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <p className="text-[9px] text-text-secondary/60">Stage Context</p>
                    <p className="mt-2 font-bold text-white">
                      {PHASE_STAGE_MAP[selectedStep.phase] ?? 'Pre-Announcement'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <p className="text-[9px] text-text-secondary/60">Typical Window</p>
                    <p className="mt-2 font-bold text-white">{selectedStep.duration}</p>
                  </div>
                </div>
                <ul className="mt-5 space-y-2">
                  {selectedStep.details.slice(0, 3).map((detail) => (
                    <li key={detail} className="flex items-start gap-2 text-sm leading-relaxed text-text-secondary">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 rounded-3xl border border-border/50 bg-abyss/60 p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gold">
                  Election Phase Order
                </h3>
                <div className="mt-4 space-y-3">
                  {phases.map((phase) => {
                    const phaseSteps = phase.steps.filter((step) =>
                      filteredSteps.some((candidate) => candidate.id === step.id)
                    );
                    const isSelectedPhase = phase.name === selectedStep.phase;
                    return (
                      <button
                        key={phase.id}
                        type="button"
                        onClick={() => {
                          if (phaseSteps[0]) {
                            handleStepClick(phaseSteps[0].id);
                          }
                        }}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                          isSelectedPhase
                            ? 'border-gold/30 bg-gold/10'
                            : 'border-white/10 bg-white/5 hover:border-gold/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-white">{phase.name}</span>
                          <span className="text-[10px] uppercase tracking-widest text-text-secondary">
                            {phaseSteps.length} step{phaseSteps.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="mt-3 h-1.5 rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: isSelectedPhase ? '100%' : `${Math.max(18, phaseSteps.length * 22)}%`,
                              backgroundColor: phase.color,
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-border/50 bg-abyss/60 p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gold">
                  Official Verification
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  Use these official channels for live dates, polling-station details, and result updates before acting.
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  {(data?.sources ?? []).map((source) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-text-secondary transition-colors hover:border-gold/30 hover:text-white"
                    >
                      <span className="block font-semibold text-white">{source.title}</span>
                      <span className="mt-1 block break-all text-xs text-text-secondary">{source.url}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Global error banner
      ════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      </AnimatePresence>
    </main>
  );
}
