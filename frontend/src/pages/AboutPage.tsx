import { motion } from 'framer-motion';
import { GlobeScene, HeroCanvas } from '@/components/three';
import SEO from '@/components/SEO';

const VALUES = [
  {
    title: 'Non-Partisan Guidance',
    description: 'The assistant is designed to explain election process, not politics. It focuses on steps, rules, and official verification.',
    icon: '⚖️',
  },
  {
    title: 'Official-Source Discipline',
    description: 'When a question depends on live schedules, polling booths, or current result information, the product directs users back to ECI channels.',
    icon: '📡',
  },
  {
    title: 'Practical Accessibility',
    description: 'Dense election procedures are translated into plain-language actions that first-time voters and busy returning voters can actually use.',
    icon: '🔓',
  },
];

export default function AboutPage() {
  return (
    <main className="relative bg-void min-h-screen pt-24 pb-20 overflow-hidden">
      <SEO
        title="About CivicMind"
        description="Learn how CivicMind uses Gemini, Firestore, and an India-focused election knowledge layer to explain voting procedures clearly and responsibly."
        path="/about"
      />

      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <HeroCanvas />
      </div>

      <div className="relative z-10 content-width px-6">
        <header className="max-w-3xl mb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-5xl md:text-6xl font-display text-white mb-8">
              Built for <span className="gold-gradient-text">Election Clarity</span>
            </h1>
            <p className="text-xl text-text-secondary leading-relaxed font-body">
              CivicMind is a practical assistant for understanding Indian election procedures. It is designed to help users move from confusion to action with clear steps, verified process guidance, and strong non-partisan boundaries.
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
            <h2 className="text-3xl font-display text-white mb-6">Architecture for Google Prompt Wars</h2>
            <div className="space-y-6 text-text-secondary leading-relaxed">
              <p>
                The product pairs a high-context frontend with a Cloud Run backend that uses Gemini for answer generation and Firestore for conversation persistence. Static election knowledge, persona-aware prompting, and official-source rules sit in the backend so every feature follows the same logic.
              </p>
              <p>
                The result is a system that does more than answer questions. It distinguishes voter and candidate contexts, avoids invented dates, and keeps the user anchored to official ECI verification whenever real-world details can change.
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
            <div className="absolute inset-0 z-0">
              <GlobeScene />
            </div>

            <div className="absolute bottom-8 left-8 right-8 z-10 text-center pointer-events-none">
              <div className="inline-block px-3 py-1 bg-void/60 backdrop-blur-md border border-gold/20 rounded-full">
                <p className="text-gold font-medium uppercase tracking-[0.2em] text-[10px]">Gemini + Firestore + Civic UX</p>
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
