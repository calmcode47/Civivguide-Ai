import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import SEO from '@/components/SEO';
import { GoldButton } from '@/components/ui';

interface Milestone {
  id: string;
  label: string;
  window: string;
  description: string;
  status: 'prepare' | 'watch' | 'act';
  icon: string;
}

const ELECTION_MILESTONES: Milestone[] = [
  {
    id: 'roll',
    label: 'Check Electoral Roll',
    window: 'Before the schedule is announced',
    description: 'Verify your name, address, and voter details well before the election cycle becomes busy.',
    status: 'prepare',
    icon: '01',
  },
  {
    id: 'notification',
    label: 'Track the Official Notification',
    window: 'When ECI releases the schedule',
    description: 'Once the schedule is published, official deadlines and the Model Code of Conduct take effect.',
    status: 'watch',
    icon: '02',
  },
  {
    id: 'campaign',
    label: 'Watch the Campaign and Silence Window',
    window: 'Leading up to polling day',
    description: 'Keep an eye on candidate information and remember that active campaigning stops during the silence period.',
    status: 'watch',
    icon: '03',
  },
  {
    id: 'polling',
    label: 'Prepare for Polling Day',
    window: 'Your chosen polling date',
    description: 'Confirm your booth, ID proof, travel time, and any assistance arrangements before you leave home.',
    status: 'act',
    icon: '04',
  },
  {
    id: 'counting',
    label: 'Follow Counting and Results',
    window: 'After polling concludes',
    description: 'Use official ECI channels for counting updates, result declaration, and post-result constitutional steps.',
    status: 'watch',
    icon: '05',
  },
];

function formatDate(date: Date) {
  return `${date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })} • ${date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export default function MilestonesPage() {
  const [targetDate, setTargetDate] = useState<Date | null>(() => {
    const saved = localStorage.getItem('civicmind_target_date');
    if (!saved) return null;
    const parsed = new Date(saved);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('08:00');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const updateCountdown = () => {
      const difference = targetDate.getTime() - Date.now();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [targetDate]);

  const progress = useMemo(() => {
    if (!targetDate) return 35;
    return timeLeft.days > 30 ? 55 : timeLeft.days > 7 ? 78 : 92;
  }, [targetDate, timeLeft.days]);

  const openEditor = () => {
    if (targetDate) {
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const hours = String(targetDate.getHours()).padStart(2, '0');
      const minutes = String(targetDate.getMinutes()).padStart(2, '0');
      setEditDate(`${year}-${month}-${day}`);
      setEditTime(`${hours}:${minutes}`);
    }
    setIsEditing(true);
  };

  const saveDate = () => {
    setFormError(null);
    if (!editDate) {
      setFormError('Choose a date before saving.');
      return;
    }

    const nextDate = new Date(`${editDate}T${editTime || '08:00'}`);
    if (Number.isNaN(nextDate.getTime())) {
      setFormError('Enter a valid date and time.');
      return;
    }

    setTargetDate(nextDate);
    localStorage.setItem('civicmind_target_date', nextDate.toISOString());
    setIsEditing(false);
  };

  const clearDate = () => {
    setTargetDate(null);
    localStorage.removeItem('civicmind_target_date');
    setIsEditing(false);
    setFormError(null);
  };

  return (
    <main className="min-h-screen bg-void pt-24 pb-20 px-6">
      <SEO
        title="Election Milestones"
        description="Follow the major stages of an Indian election cycle and set your own polling-day countdown without assuming unofficial dates."
        path="/milestones"
      />

      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest mb-4"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                Election Readiness Dashboard
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">
                Key <span className="text-gold">Milestones</span>
              </h1>
              <p className="text-text-secondary max-w-xl">
                This view does not assume live election dates. Use it as a first-time-voter readiness guide, and add an official polling date only after it is announced by ECI.
              </p>
            </div>

            <div className="bg-abyss/40 border border-border/40 rounded-2xl p-5 backdrop-blur-md min-w-[280px]">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-3">
                <span>Readiness Score</span>
                <span className="text-gold">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gold shadow-[0_0_10px_rgba(212,160,23,0.5)]"
                />
              </div>
              <p className="text-[9px] text-text-secondary/60 mt-3 uppercase tracking-tighter">
                Current focus: <span className="text-white">{targetDate ? 'Polling preparation' : 'Pre-announcement verification'}</span>
              </p>
            </div>
          </div>
        </header>

        <section className="mb-12">
          <div className="bg-void border border-gold/20 rounded-[2.5rem] p-10 sm:p-14 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gold-gradient opacity-[0.03] pointer-events-none" />

            {targetDate ? (
              <>
                <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  {[
                    { label: 'Days', value: timeLeft.days },
                    { label: 'Hours', value: timeLeft.hours },
                    { label: 'Minutes', value: timeLeft.minutes },
                    { label: 'Seconds', value: timeLeft.seconds },
                  ].map((unit) => (
                    <div key={unit.label} className="flex flex-col items-center">
                      <div className="text-5xl md:text-7xl font-display font-black text-white tabular-nums tracking-tighter mb-2">
                        {String(unit.value).padStart(2, '0')}
                      </div>
                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-gold/60">
                        {unit.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-12 text-center">
                  <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest">Countdown to Your Official Polling Date</h3>
                  <p className="text-sm text-text-secondary">{formatDate(targetDate)}</p>
                </div>
              </>
            ) : (
              <div className="relative z-10 max-w-2xl">
                <h2 className="text-3xl font-display text-white mb-4">No official polling date saved yet</h2>
                <p className="text-text-secondary leading-relaxed mb-6">
                  Once your election schedule is officially announced, add the polling date here to turn this page into a personal countdown dashboard. Until then, the milestone cards below focus on preparation stages rather than assumed calendar dates.
                </p>
              </div>
            )}

            <div className="relative z-10 mt-8 flex flex-wrap gap-3">
              <GoldButton onClick={openEditor}>{targetDate ? 'Edit Polling Date' : 'Add Polling Date'}</GoldButton>
              {targetDate ? (
                <GoldButton variant="outline" onClick={clearDate}>
                  Clear Date
                </GoldButton>
              ) : null}
            </div>
          </div>
        </section>

        {isEditing ? (
          <section className="mb-10">
            <div className="bg-abyss/40 border border-border/40 rounded-3xl p-6 flex flex-wrap items-end gap-6 shadow-xl">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-[10px] font-bold text-gold uppercase tracking-[0.2em] mb-2">Official Polling Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(event) => setEditDate(event.target.value)}
                  className="w-full bg-void border border-border/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="block text-[10px] font-bold text-gold uppercase tracking-[0.2em] mb-2">Time</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(event) => setEditTime(event.target.value)}
                  className="w-full bg-void border border-border/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <GoldButton onClick={saveDate}>Save Date</GoldButton>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-3 rounded-xl border border-white/10 text-[10px] font-bold text-text-secondary uppercase tracking-widest hover:text-white transition-all"
              >
                Cancel
              </button>
            </div>
            {formError ? <p className="mt-3 text-sm text-danger">{formError}</p> : null}
          </section>
        ) : null}

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ELECTION_MILESTONES.map((milestone, index) => (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`p-6 rounded-3xl border flex flex-col gap-5 h-full ${
                milestone.status === 'act'
                  ? 'bg-gold/5 border-gold/30 ring-1 ring-gold/20 shadow-[0_10px_40px_rgba(212,160,23,0.1)]'
                  : 'bg-abyss/40 border-border/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-display text-gold">{milestone.icon}</span>
                <span
                  className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                    milestone.status === 'prepare'
                      ? 'bg-white/5 text-text-secondary'
                      : milestone.status === 'watch'
                      ? 'bg-blue-500/10 text-blue-300'
                      : 'bg-gold text-void'
                  }`}
                >
                  {milestone.status}
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white mb-2">{milestone.label}</h2>
                <p className="text-[10px] uppercase tracking-widest text-gold/70 mb-3">{milestone.window}</p>
                <p className="text-sm text-text-secondary leading-relaxed">{milestone.description}</p>
              </div>
            </motion.div>
          ))}
        </section>
      </div>
    </main>
  );
}
