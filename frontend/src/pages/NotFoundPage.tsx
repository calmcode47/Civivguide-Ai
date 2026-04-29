import { motion } from 'framer-motion';
import { GoldButton } from '@/components/ui';
import SEO from '@/components/SEO';

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-void flex flex-col items-center justify-center px-6 text-center">
      <SEO 
        title="404 — Page Not Found"
        description="The page you are looking for does not exist. Return to CivicMind for election guidance."
        path="/404"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md"
      >
        <span className="text-8xl block mb-8">🗳️</span>
        <h1 className="text-5xl font-display font-bold text-white mb-4">404</h1>
        <h2 className="text-xl font-bold text-gold uppercase tracking-widest mb-6">Lost in the Ballot?</h2>
        <p className="text-text-secondary mb-10 leading-relaxed">
          The page you're looking for seems to have been misplaced or never existed. Let's get you back to the guide.
        </p>
        <GoldButton href="/">
          Return Home
        </GoldButton>
      </motion.div>
    </main>
  );
}
