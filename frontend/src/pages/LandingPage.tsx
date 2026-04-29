import { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeroCanvas } from '@/components/three';
import SEO from '@/components/SEO';
import { GoldButton } from '@/components/ui';
import { HERO_SUBTITLE, FEATURE_CARDS, HOW_IT_WORKS } from '@/config/content';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// =============================================================================
// Sub-components
// =============================================================================

/** Google logo SVG for the footer. */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}

/** Arrow SVG for connecting steps on desktop. */
function StepArrow() {
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="hidden lg:block opacity-20 mx-4">
      <path d="M1 12h38m0 0l-8-8m8 8l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// =============================================================================
// LandingPage
// =============================================================================

export default function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const howRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  // ---- Animations -----------------------------------------------------------
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Reveal sections as they enter viewport
      const sections = [featuresRef.current, howRef.current, ctaRef.current];

      sections.forEach((section) => {
        if (!section) return;

        gsap.fromTo(
          section,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className="relative bg-void min-h-screen">
      <SEO 
        title="Your AI-Powered Election Rights Guide"
        description="Understand your election rights with AI. Get personalized, verified information on voting, registration, and election processes powered by Google Gemini."
        path="/"
      />
      {/* Background Layer */}
      <HeroCanvas />

      {/* -------------------------------------------------------------------- */}
      {/* SECTION 1: HERO                                                      */}
      {/* -------------------------------------------------------------------- */}
      <motion.section
        ref={heroRef}
        className="relative z-10 h-screen flex flex-col items-center justify-center px-4 overflow-hidden"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        <div className="max-w-content mx-auto flex flex-col items-center text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="px-4 py-1.5 rounded-full border border-gold/30 bg-gold-glow backdrop-blur-sm mb-8"
          >
            <span className="text-xs font-medium text-gold tracking-wider uppercase">
              🗳️ AI-Powered Civic Assistant
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-hero font-display leading-[1.1] mb-8 text-white max-w-[900px]"
          >
            Understand Your <br />
            <span className="gold-gradient-text">Election Rights</span> <br />
            With AI
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-lg text-text-secondary max-w-[580px] leading-relaxed mb-10"
          >
            {HERO_SUBTITLE}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <GoldButton size="lg" href="/assistant">
              Start Asking →
            </GoldButton>
            <GoldButton size="lg" variant="outline" href="/timeline">
              View Timeline
            </GoldButton>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
        >
          <span className="text-xs text-text-secondary uppercase tracking-[0.2em]">
            Scroll to explore
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
              <path d="M1 1l6 6 6-6" stroke="#7b8db0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* -------------------------------------------------------------------- */}
      {/* SECTION 2: FEATURE CARDS                                             */}
      {/* -------------------------------------------------------------------- */}
      <section
        ref={featuresRef}
        className="relative z-10 section-padding bg-void"
        style={{
          background: 'radial-gradient(circle at center, #13172a 0%, #07080d 100%)'
        }}
      >
        <div className="content-width">
          <h2 className="text-4xl text-center mb-16">Everything You Need to Know</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURE_CARDS.map((card, idx) => (
              <motion.div
                key={card.title}
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 30 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="group p-7 bg-abyss border border-border rounded-card hover:bg-surface hover:border-gold/30 hover:-translate-y-1 transition-all duration-300"
              >
                <span className="text-4xl block mb-4 grayscale group-hover:grayscale-0 transition-all">
                  {card.icon}
                </span>
                <h3 className="text-xl font-semibold text-white mb-2 font-body">
                  {card.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {card.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* SECTION 3: HOW IT WORKS                                              */}
      {/* -------------------------------------------------------------------- */}
      <section
        ref={howRef}
        className="relative z-10 section-padding bg-abyss"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 1px, transparent 10px)'
        }}
      >
        <div className="content-width text-center">
          <h2 className="text-4xl mb-16">How CivicMind Works</h2>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-0">
            {HOW_IT_WORKS.map((item, idx) => (
              <div key={item.step} className="flex-1 flex items-center w-full">
                <div className="relative p-8 bg-surface rounded-card border border-border text-left w-full h-full min-h-[160px]">
                  <span className="absolute top-4 left-4 text-6xl font-display text-gold opacity-10 pointer-events-none">
                    {item.step}
                  </span>
                  <div className="relative z-10">
                    <h3 className="text-lg font-semibold text-white mb-2 font-body mt-4">
                      {item.title}
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
                {idx < HOW_IT_WORKS.length - 1 && <StepArrow />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* SECTION 4: CTA BANNER                                                 */}
      {/* -------------------------------------------------------------------- */}
      <section ref={ctaRef} className="relative z-10 section-padding">
        <div className="content-width text-center bg-gold-glow border border-gold/10 rounded-[2rem] py-16 px-8 backdrop-blur-md">
          <h2 className="text-3xl mb-4">Ready to Become an Informed Voter?</h2>
          <p className="text-text-secondary mb-10 max-w-md mx-auto">
            Your AI guide to the democratic process is one click away.
          </p>
          <GoldButton size="lg" href="/assistant">
            Talk to CivicMind →
          </GoldButton>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* FOOTER                                                               */}
      {/* -------------------------------------------------------------------- */}
      <footer className="relative z-10 border-top border-border py-12 px-8">
        <div className="content-width flex flex-col md:flex-row items-center justify-between gap-8 text-sm text-text-secondary">
          {/* Logo Left */}
          <div className="flex items-center gap-2">
            <span className="font-display text-lg text-white font-bold">CivicMind</span>
          </div>

          {/* Center Powered By */}
          <div className="flex items-center gap-3">
            <span>Powered by</span>
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <GoogleLogo />
              <span className="font-medium text-white/90">Google Gemini</span>
            </div>
          </div>

          {/* Right Copyright */}
          <div>
            Built for Google Prompt Wars
          </div>
        </div>
      </footer>
    </div>
  );
}
