import { motion } from 'framer-motion';
import SEO from '@/components/SEO';
import DeferredThreeMount from '@/components/three/DeferredThreeMount';
import { HeroCanvas, GlobeScene } from '@/components/three';

const VALUES = [
  {
    title: 'First-Time Voter Focus',
    description: 'Every major flow is tuned for the questions a first-time voter actually asks: registration, booth lookup, accepted ID, EVM and VVPAT, and polling-day confidence.',
    icon: '⚖️',
  },
  {
    title: 'Official-Source Discipline',
    description: 'When a question depends on live schedules, polling booths, or current result information, the product directs users back to ECI channels.',
    icon: '📡',
  },
  {
    title: 'Practical Accessibility',
    description: 'Dense election procedures are translated into plain-language actions that first-time voters can follow without already knowing election jargon.',
    icon: '🔓',
  },
];

export default function AboutPage() {
  return (
    <main className="relative bg-void min-h-screen pt-24 pb-20 overflow-hidden">
      <SEO
        title="About CivicMind"
        description="Learn how CivicMind uses Gemini, Firestore, and focused first-time-voter guidance to explain Indian election procedures clearly and responsibly."
        path="/about"
      />

      <div className="fixed inset-0 pointer-events-none opacity-20" aria-hidden="true">
        <DeferredThreeMount className="h-full w-full" fallback={<div className="h-full w-full" />}>
          <HeroCanvas />
        </DeferredThreeMount>
      </div>

      <div className="relative z-10 content-width px-6">
        <header className="max-w-3xl mb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-5xl md:text-6xl font-display text-white mb-8">
              Built for <span className="gold-gradient-text">First-Time Voter Clarity</span>
            </h1>
            <p className="text-xl text-text-secondary leading-relaxed font-body">
              CivicMind is a practical assistant for first-time voters navigating Indian election procedures. It is designed to move users from confusion to action with clear steps, verified process guidance, and strong non-partisan boundaries.
            </p>
          </motion.div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
          {VALUES.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="p-8 bg-abyss border border-border rounded-card hover:border-gold/30 transition-all group"
            >
              <span className="text-4xl block mb-6 group-hover:scale-110 transition-transform">{value.icon}</span>
              <h3 className="text-xl font-semibold text-white mb-3">{value.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl font-display text-white mb-6">A Focused Product, Not A Generic Chatbot</h2>
            <div className="space-y-6 text-text-secondary leading-relaxed">
              <p>
                The product pairs a high-context frontend with a Cloud Run backend that uses Gemini for answer generation and Firestore for conversation persistence. Static election knowledge, stage-aware prompting, and official-source rules sit in the backend so every feature follows the same logic.
              </p>
              <p>
                The result is a system that does more than answer questions. It stays anchored on the first-time-voter journey, avoids invented dates, and keeps users tied to official ECI verification whenever real-world details can change.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="aspect-square bg-abyss border border-gold/10 rounded-[2rem] flex items-center justify-center relative overflow-hidden shadow-2xl shadow-gold/5"
          >
             {/* The Interactive 3D Component */}
             <div className="absolute inset-0 z-0">
               <DeferredThreeMount className="h-full w-full" fallback={<div className="h-full w-full" />}>
                 <GlobeScene />
               </DeferredThreeMount>
             </div>
            <div className="relative z-10 flex h-full w-full flex-col justify-between p-8">
              <div className="flex flex-wrap gap-2">
                {['Registration', 'Booth Check', 'Polling Day', 'Results'].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-gold/20 bg-void/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gold"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold/80">
                    First-Time Voter Flow
                  </p>
                  <ol className="mt-3 space-y-2 text-sm leading-relaxed text-text-secondary">
                    <li>1. Verify your name in the voter roll.</li>
                    <li>2. Confirm your booth and accepted ID.</li>
                    <li>3. Understand EVM and VVPAT before polling day.</li>
                    <li>4. Re-check live details only through ECI channels.</li>
                  </ol>
                </div>
                <div className="text-center pointer-events-none">
                  <div className="inline-block px-3 py-1 bg-void/60 backdrop-blur-md border border-gold/20 rounded-full">
                    <p className="text-gold font-medium uppercase tracking-[0.2em] text-[10px]">
                      Gemini + Firestore + Civic UX
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <footer className="max-w-3xl mx-auto text-center py-12 border-t border-border">
          <h4 className="text-white font-semibold mb-4">Reliability Boundary</h4>
          <p className="text-sm text-text-secondary leading-relaxed mb-8">
            CivicMind is a decision-support assistant, not a substitute for official election notifications. Users should always verify live dates, polling locations, and constituency-specific instructions through the Election Commission of India and the Voters&apos; Service Portal.
          </p>
        </footer>
      </div>
    </main>
  );
}
