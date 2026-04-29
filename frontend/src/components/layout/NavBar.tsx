import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// =============================================================================
// Types
// =============================================================================

interface NavLinkItem {
  label: string;
  href: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Assistant', href: '/assistant' },
  { label: 'Timeline', href: '/timeline' },
  { label: 'Voting Plan', href: '/voting-plan' },
  { label: 'Ballot Decoder', href: '/ballot-decoder' },
  { label: 'Milestones', href: '/milestones' },
  { label: 'About', href: '/about' },
];

// =============================================================================
// Sub-components
// =============================================================================

/** Ballot-style SVG icon rendered before the logo wordmark. */
function BallotIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="2" width="14" height="16" rx="2" stroke="#d4a017" strokeWidth="1.5" />
      <rect x="6" y="6" width="8" height="1.5" rx="0.75" fill="#d4a017" />
      <rect x="6" y="9.25" width="6" height="1.5" rx="0.75" fill="#d4a017" opacity="0.7" />
      <path d="M6 13l2 2 4-4" stroke="#00c9a7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Hamburger / close toggle icon. */
function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {isOpen ? (
        <>
          <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M6 6l12 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M4 7h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M4 12h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M4 17h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// =============================================================================
// NavBar
// =============================================================================

export default function NavBar() {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Scroll listener
  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 50);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const isActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Main bar                                                            */}
      {/* ------------------------------------------------------------------ */}
      <motion.header
        role="banner"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed top-0 left-0 right-0 z-[100] h-16 flex items-center px-6 md:px-8 justify-between bg-void/70 backdrop-blur-xl border-b border-gold/10 transition-shadow duration-300"
        style={{
          boxShadow: isScrolled ? '0 4px 30px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          aria-label="CivicMind — Home"
          className="flex items-center gap-2 no-underline"
        >
          <BallotIcon />
          <span
            className="font-display text-xl font-bold text-white tracking-tight"
          >
            CivicMind
          </span>
        </Link>

        {/* Centre nav — desktop only */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-8"
        >
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              to={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={`font-body text-sm transition-colors duration-200 ${
                isActive(href)
                  ? 'text-gold font-medium underline underline-offset-8'
                  : 'text-text-secondary hover:text-gold'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* CTA — desktop */}
          <Link
            to="/assistant"
            aria-label="Open AI assistant"
            className="hidden md:flex items-center gap-1 px-5 py-2 rounded-full bg-gold-gradient text-void font-medium text-sm transition-all hover:scale-105 hover:brightness-110 shadow-gold-glow"
          >
            Ask AI →
          </Link>

          {/* Hamburger — mobile only */}
          <button
            aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setIsMobileOpen(prev => !prev)}
            className="md:hidden"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#e8ecf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem',
              borderRadius: '0.375rem',
              transition: 'color 200ms ease',
            }}
          >
            <HamburgerIcon isOpen={isMobileOpen} />
          </button>
        </div>
      </motion.header>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile full-screen drawer                                           */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: 'fixed',
              top: '64px',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99,
              background: 'rgba(7,8,13,0.97)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2.5rem',
              padding: '2rem',
            }}
          >
            {NAV_LINKS.map(({ label, href }, i) => (
              <motion.div
                key={href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 + 0.05 }}
              >
                <Link
                  to={href}
                  aria-current={isActive(href) ? 'page' : undefined}
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: '2rem',
                    fontWeight: isActive(href) ? 700 : 400,
                    color: isActive(href) ? '#d4a017' : '#e8ecf4',
                    textDecoration: 'none',
                    transition: 'color 200ms ease',
                  }}
                >
                  {label}
                </Link>
              </motion.div>
            ))}

            {/* Mobile CTA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: NAV_LINKS.length * 0.07 + 0.1 }}
            >
              <Link
                to="/assistant"
                aria-label="Open AI assistant"
                style={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: '#07080d',
                  background: 'linear-gradient(135deg, #d4a017, #f0c040)',
                  padding: '0.875rem 2.5rem',
                  borderRadius: '9999px',
                  textDecoration: 'none',
                  display: 'inline-block',
                  marginTop: '0.5rem',
                }}
              >
                Ask AI →
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
