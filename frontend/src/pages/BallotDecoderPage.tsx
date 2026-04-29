import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import SEO from '@/components/SEO';
import apiClient from '@/lib/apiClient';
import type { ApiResponse, OfficialResource } from '@/types';

interface BallotTerm {
  term: string;
  context: string;
  category: 'legal' | 'position' | 'procedure' | 'technology' | 'voter-aid';
}

interface BallotSection {
  title: string;
  items: {
    label: string;
    description: string;
    terms: BallotTerm[];
  }[];
}

interface BallotDecodePayload {
  explanation: string;
  related_terms: string[];
  sources: OfficialResource[];
}

const SAMPLE_BALLOT_SECTIONS: BallotSection[] = [
  {
    title: 'Candidate Panel',
    items: [
      {
        label: 'Lok Sabha Candidate Listing',
        description: 'The EVM line or candidate panel shows the candidate name, party, and election symbol.',
        terms: [
          {
            term: 'Constituency',
            category: 'position',
            context: 'The geographic area represented by one elected member.',
          },
          {
            term: 'Candidate Symbol',
            category: 'voter-aid',
            context: 'The visual mark associated with a party or independent candidate on the voting machine.',
          },
        ],
      },
    ],
  },
  {
    title: 'Voting Technology',
    items: [
      {
        label: 'EVM and VVPAT',
        description: 'Indian elections use the Electronic Voting Machine along with a VVPAT verification display.',
        terms: [
          {
            term: 'EVM',
            category: 'technology',
            context: 'The Electronic Voting Machine used to record votes at the polling station.',
          },
          {
            term: 'VVPAT',
            category: 'technology',
            context: 'The Voter Verifiable Paper Audit Trail that briefly shows the chosen candidate symbol and name.',
          },
        ],
      },
    ],
  },
  {
    title: 'Voter Choice and Transparency',
    items: [
      {
        label: 'Candidate Information and NOTA',
        description: 'Voters may review public candidate information and can also choose NOTA if they do not want to vote for any listed candidate.',
        terms: [
          {
            term: 'NOTA',
            category: 'procedure',
            context: 'The None of the Above option available to a voter on the voting machine.',
          },
          {
            term: 'Affidavit',
            category: 'legal',
            context: 'The declaration submitted by a candidate covering details such as assets, liabilities, and criminal cases if any.',
          },
        ],
      },
    ],
  },
];

export default function BallotDecoderPage() {
  const [selectedTerm, setSelectedTerm] = useState<BallotTerm | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [relatedTerms, setRelatedTerms] = useState<string[]>([]);
  const [sources, setSources] = useState<OfficialResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAiExplanation = useCallback(async (term: BallotTerm) => {
    setSelectedTerm(term);
    setIsLoading(true);
    setAiExplanation(null);
    setRelatedTerms([]);
    setSources([]);

    try {
      const response = await apiClient.post<ApiResponse<BallotDecodePayload>>('/api/ballot/decode', {
        term: term.term,
        context: term.context,
        category: term.category,
        language: 'en',
      });

      setAiExplanation(response.data.data.explanation);
      setRelatedTerms(response.data.data.related_terms ?? []);
      setSources(response.data.data.sources ?? []);
    } catch {
      setAiExplanation(`**${term.term}**: ${term.context}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <main className="min-h-screen bg-void pt-24 pb-20 px-6">
      <SEO
        title="Ballot Decoder"
        description="Decode Indian election terms like EVM, VVPAT, constituency, candidate symbol, affidavit, and NOTA in simple language."
        path="/ballot-decoder"
      />

      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-start">
        <section className="order-2 lg:order-1">
          <header className="mb-8">
            <h1 className="text-3xl font-display font-bold text-white mb-2">
              The Interactive <span className="text-gold">Ballot Guide</span>
            </h1>
            <p className="text-text-secondary text-sm">Click any highlighted election term to decode it in plain language.</p>
          </header>

          <div className="bg-[#f6f1dc] rounded-sm shadow-2xl p-8 sm:p-12 text-void relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center rotate-[-15deg]">
              <span className="text-8xl font-bold uppercase tracking-[0.8em]">ELECTION GUIDE</span>
            </div>

            <div className="relative z-10 border-[3px] border-void p-6 sm:p-8">
              <header className="border-b-4 border-void pb-4 mb-8 text-center">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter mb-4">
                  <span>India Election Flow</span>
                  <span>Voter Help View</span>
                </div>
                <h2 className="text-2xl font-black uppercase tracking-widest leading-none">Sample Candidate and Booth Terms</h2>
                <p className="text-[10px] font-bold mt-2">Plain-language guide for EVM, VVPAT, candidate symbols, and voter options</p>
              </header>

              {SAMPLE_BALLOT_SECTIONS.map((section, sectionIndex) => (
                <div key={section.title} className="mb-10">
                  <h3 className="bg-void text-[#f6f1dc] text-xs font-black uppercase px-2 py-1 mb-6 tracking-widest inline-block">
                    {section.title}
                  </h3>

                  {section.items.map((item) => (
                    <div key={item.label} className="mb-8 group">
                      <div className="flex items-start gap-4 mb-2">
                        <div className="w-5 h-5 border-2 border-void flex-shrink-0 mt-1" />
                        <div>
                          <h4 className="text-base font-black uppercase leading-tight mb-1">{item.label}</h4>
                          <p className="text-xs font-medium leading-relaxed opacity-80 mb-3">{item.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {item.terms.map((term) => (
                              <button
                                key={term.term}
                                onClick={() => fetchAiExplanation(term)}
                                aria-label={`Explain the term ${term.term}`}
                                className={`text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                                  selectedTerm?.term === term.term
                                    ? 'border-gold text-gold scale-105'
                                    : 'border-void/20 hover:border-void'
                                }`}
                              >
                                {term.term}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {sectionIndex < SAMPLE_BALLOT_SECTIONS.length - 1 ? <div className="border-t border-void/10 my-8" /> : null}
                </div>
              ))}

              <footer className="mt-12 pt-6 border-t-2 border-void text-[9px] font-bold text-center uppercase tracking-widest">
                End of guided sample terms
              </footer>
            </div>
          </div>
        </section>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-28">
          <div className="bg-abyss/40 border border-border/40 rounded-3xl p-8 backdrop-blur-md shadow-xl">
            <AnimatePresence mode="wait">
              {!selectedTerm ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-gold/5 flex items-center justify-center mx-auto mb-6 border border-gold/10">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d4a017" strokeWidth="1.5">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Term Decoder</h3>
                  <p className="text-text-secondary text-sm max-w-xs mx-auto leading-relaxed">
                    Select any election term to get a voter-friendly explanation and understand why it matters.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={selectedTerm.term}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <header>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-gold/10 border border-gold/20 text-[10px] font-bold text-gold uppercase tracking-widest">
                        {selectedTerm.category}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="text-[10px] text-text-secondary uppercase tracking-widest">Election glossary</span>
                    </div>
                    <h2 className="text-2xl font-display text-white">{selectedTerm.term}</h2>
                  </header>

                  <div className="rounded-2xl border border-border/40 bg-void/60 p-5 min-h-[180px]">
                    {isLoading ? (
                      <div className="flex items-center gap-3 text-text-secondary text-sm">
                        <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                        Generating a simpler explanation...
                      </div>
                    ) : aiExplanation ? (
                      <div className="prose prose-invert prose-gold max-w-none prose-sm">
                        <ReactMarkdown>{aiExplanation}</ReactMarkdown>
                      </div>
                    ) : null}
                  </div>

                  {relatedTerms.length > 0 ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">Related Terms</h3>
                      <div className="flex flex-wrap gap-2">
                        {relatedTerms.map((term) => (
                          <span key={term} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-text-secondary">
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {sources.length > 0 ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">Official References</h3>
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </main>
  );
}
