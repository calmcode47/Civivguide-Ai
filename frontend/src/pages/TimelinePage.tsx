import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import axios from 'axios';

import { TimelineOrb, FloatingRings, ParticleField, ThreeErrorBoundary, WebGLCheck } from '@/components/three';
import { GoldButton, ErrorBanner } from '@/components/ui';
import { type ElectionTimelineResponse } from '@/types';

// =============================================================================
// Constants & Helpers
// =============================================================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Dynamic S-curve chain with depth and wobble.
 * Increased vertical and horizontal spread for a professional 'DNA-like' structure.
 */
/**
 * Dynamic chain with depth and wobble.
 * Supports both vertical (desktop) and horizontal (mobile) layouts.
 */
const getOrbPosition = (index: number, total: number, isMobile: boolean = false): [number, number, number] => {
  const spread = Math.max(total - 1, 1);
  if (isMobile) {
    // Horizontal layout for mobile strip
    const x = (index - spread / 2) * 1.8;
    const y = Math.sin(index * 1.2) * 0.3; // Gentle wave
    const z = Math.cos(index * 1.2) * 0.2;
    return [x, y, z];
  }
  // Vertical layout for desktop sidebar
  const x = Math.sin(index * 0.8) * 1.2;
  const y = (spread / 2 - index) * 1.4;
  const z = Math.cos(index * 0.8) * 0.4;
  return [x, y, z];
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

/** Right-side sticky 3D panel — shows all orbs in a vertical chain */
function OrbPanel({
  steps,
  phases,
  activeStepId,
  onOrbClick,
  onOrbHover,
}: {
  steps: any[];
  phases: any[];
  activeStepId: string | null;
  onOrbClick: (id: string) => void;
  onOrbHover?: (id: string) => void;
}) {
  const isMobile = steps.length > 0 && window.innerWidth < 1024;
  const spread = Math.max(steps.length - 1, 1) * (isMobile ? 1.8 : 1.4);
  const fov = isMobile ? 45 : 54;
  
  // Calculate camera distance based on spread
  const camDist = (spread / 2) / Math.tan((fov * Math.PI) / 360) + (isMobile ? 2.5 : 3.0);
  const camZ = isMobile ? camDist : Math.max(7, Math.min(camDist, 20));
  const camPos: [number, number, number] = isMobile ? [0, 0, camZ] : [0.4, 0, camZ];

  return (
    <div className={`relative w-full h-full flex ${isMobile ? 'flex-row' : 'flex-col'}`} aria-hidden="true">

      {/* ── Phase legend ──────────────────────────────────────────── */}
      <div className={`${isMobile ? 'hidden' : 'px-6 pt-4 pb-3 border-b border-border/30 flex flex-col gap-2'}`}>
        {phases.map(p => (
          <div key={p.id} className="flex items-center gap-2.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: p.color }}
            />
            <span
              className="text-[11px] uppercase tracking-wide font-medium"
              style={{ color: p.color, opacity: 0.9 }}
            >
              {p.name}
            </span>
          </div>
        ))}
      </div>

      {/* ── 3D Canvas ─────────────────────────────────────────────── */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <WebGLCheck>
          <ThreeErrorBoundary componentName="OrbPanelCanvas">
            <Canvas
              camera={{ position: camPos, fov }}
              style={{ background: 'transparent', touchAction: 'none' }}
              gl={{ antialias: true }}
              dpr={[1, 2]}
            >
              <Suspense fallback={null}>
                <ambientLight intensity={0.65} />
                <pointLight position={[3, 5, 5]} intensity={1.4} color="#d4a017" />
                <pointLight position={[-3, -3, 4]} intensity={0.5} color="#7b8db0" />

                {/* Connection spine */}
                {steps.length > 1 && (
                  <Line
                    points={steps.map((_, i) => getOrbPosition(i, steps.length, isMobile))}
                    color="#d4a017"
                    lineWidth={isMobile ? 12 : 8}
                    transparent
                    opacity={0.7}
                  />
                )}

                {/* Orbs */}
                {steps.map((step, i) => (
                  <group key={step.id} position={getOrbPosition(i, steps.length, isMobile)}>
                    <TimelineOrb
                      index={i}
                      phase={step.phase}
                      title={step.title}
                      isActive={activeStepId === step.id}
                      onClick={() => onOrbClick(step.id)}
                      onHover={() => !isMobile && onOrbHover?.(step.id)}
                    />
                  </group>
                ))}
              </Suspense>
            </Canvas>
          </ThreeErrorBoundary>
        </WebGLCheck>

        {/* Step counter */}
        <div
          className="absolute bottom-2 left-0 right-0 flex flex-col items-center gap-0.5 pointer-events-none"
          style={{ zIndex: 5 }}
        >
          <span className="text-[11px] text-gold font-bold uppercase tracking-widest">
            {steps.length} steps
          </span>
          <span className="text-[9px] text-text-secondary/60 uppercase tracking-wider">
            tap orb to navigate
          </span>
        </div>
      </div>
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
      const response = await axios.get(`${API_BASE}/api/timeline`);
      if (response.data?.data) setData(response.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load election timeline. Please try again.');
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

  const handleAskAI = (title: string) =>
    navigate(`/assistant?prefill=${encodeURIComponent(`Tell me more about ${title}`)}`);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-void flex flex-col" style={{ paddingTop: '64px' }}>
      <SEO 
        title="Election Journey Timeline"
        description="Explore the complete election process timeline from candidate registration to result certification. An interactive 3D map of democracy."
        path="/timeline"
      />

      {/* ═══════════════════════════════════════════════════════════════════
          Hero
      ════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative flex flex-col items-center justify-center overflow-hidden border-b border-border"
        style={{ minHeight: '44vh' }}
      >
        {/* Atmospheric background */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{ opacity: 0.25, zIndex: 0 }}
        >
          <WebGLCheck>
            <ThreeErrorBoundary componentName="HeroBg">
              <Canvas>
                <Suspense fallback={null}>
                  <FloatingRings />
                  <ParticleField />
                  <ambientLight intensity={0.4} />
                </Suspense>
              </Canvas>
            </ThreeErrorBoundary>
          </WebGLCheck>
        </div>

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
            The <span className="gold-gradient-text">Democratic Journey</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="text-text-secondary max-w-md mx-auto text-sm sm:text-base leading-relaxed"
          >
            Explore every major stage of an Indian election, from schedule announcement to government formation.
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
          Two-column body: LEFT = cards, RIGHT = sticky orb chain
          Outer wrapper: max-width centred, flex row on desktop
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row" style={{ minHeight: 0 }}>

        {/* ── LEFT: Scrollable content list ──────────────────────────── */}
        <section
          id="main-content"
          aria-label="Election process timeline"
          className="flex-1 py-8 sm:py-10 px-6 sm:px-10 lg:px-12 lg:pr-8 min-w-0 pb-40 lg:pb-10"
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
                              onClick={() => handleAskAI(step.title)}
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

        {/* ── RIGHT: Sticky 3D orb chain — desktop only ──────────────── */}
        {!loading && !error && filteredSteps.length > 0 && (
          <aside
            className="hidden lg:flex flex-col"
            style={{
              width: '380px',
              flexShrink: 0,
              position: 'sticky',
              top: '128px',
              height: 'calc(100vh - 128px)',
              borderLeft: '1px solid var(--color-border)',
              background: 'linear-gradient(180deg, #0a0c18 0%, #07080d 100%)',
            }}
            aria-hidden="true"
          >
            {/* Subtle glow top */}
            <div
              className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at 50% 0%, rgba(212,160,23,0.07) 0%, transparent 70%)',
                zIndex: 1,
              }}
            />

            {/* Panel title */}
            <div
              className="flex items-center gap-2.5 px-6 py-4 border-b border-border/40"
              style={{ zIndex: 2 }}
            >
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span className="text-xs uppercase tracking-widest text-text-secondary font-bold">
                Process Map
              </span>
            </div>

            {/* Canvas fills the rest */}
            <div className="flex-1 relative" style={{ minHeight: 0 }}>
              <OrbPanel
                steps={filteredSteps}
                phases={phases}
                activeStepId={activeStepId}
                onOrbClick={handleStepClick}
                onOrbHover={(id) => {
                  cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />
            </div>
          </aside>
        )}

        {/* ── Mobile 3D strip — sticky at bottom ─── */}
        {!loading && !error && filteredSteps.length > 0 && (
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 safe-area-bottom"
            style={{ 
              height: '140px', 
              background: 'rgba(7, 8, 13, 0.9)', 
              backdropFilter: 'blur(12px)',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
            }}
            aria-hidden="true"
          >
            <div className="absolute top-2 left-0 right-0 flex justify-center z-10 pointer-events-none">
               <div className="w-12 h-1 rounded-full bg-border/40" />
            </div>
            <OrbPanel
              steps={filteredSteps}
              phases={phases}
              activeStepId={activeStepId}
              onOrbClick={handleStepClick}
            />
          </div>
        )}
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
