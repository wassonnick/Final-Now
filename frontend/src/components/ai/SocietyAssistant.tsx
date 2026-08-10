import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, PhoneCall, RotateCcw, Scale, Send, SlidersHorizontal, Sparkles, Star } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';
import { PublicLeadModal } from '@/components/leads/PublicLeadModal';
import { trackAiPromptSubmitted, trackEvent, trackResultClicked } from '@/lib/analytics';

type Match = {
  id: number;
  society_name: string;
  slug?: string;
  sector?: string | null;
  score?: number | null;
  rent_range?: string | null;
  buy_range?: string | null;
  available_homes?: number;
  reason?: string;
  tags?: string[];
  url: string;
};
type Message = { role: 'user' | 'assistant'; content: string; matches?: Match[]; suggested?: string[] };
type AssistantAction =
  | { kind: 'follow_up'; label: string; prompt: string; icon: 'compare' | 'refine' }
  | { kind: 'lead'; label: string; intent: 'callback' | 'visit'; icon: 'callback' | 'visit' };

const TOKEN_KEY = 'sf_assistant_token_v1';
const TOKEN_SEEN_KEY = 'sf_assistant_token_seen_v1';
// A conversation is a sitting, not an account. The token used to live forever, so someone
// returning weeks later resumed a thread they no longer remembered — and every new question
// they clicked was appended to it or dropped entirely.
const TOKEN_TTL_MS = 60 * 60 * 1000;

function clearStoredToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(TOKEN_SEEN_KEY);
  } catch {
    // Blocked storage is survivable — the conversation just will not resume.
  }
}

function readStoredToken(): string {
  try {
    const value = window.localStorage.getItem(TOKEN_KEY) || '';
    if (!value) return '';
    // No timestamp means a token written before conversations expired at all, so its age is
    // unknowable and possibly months. Treat it as stale rather than resume it.
    const seen = Number(window.localStorage.getItem(TOKEN_SEEN_KEY) || 0);
    if (!seen || Date.now() - seen > TOKEN_TTL_MS) {
      clearStoredToken();
      return '';
    }
    return value;
  } catch {
    return '';
  }
}

function writeStoredToken(value: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, value);
    window.localStorage.setItem(TOKEN_SEEN_KEY, String(Date.now()));
  } catch {
    // As above: worth trying, not worth failing over.
  }
}
const THINKING = ['Reading your needs…', 'Searching verified societies…', 'Weighing scores, budget and location…', 'Shortlisting the best fits…'];
const STARTERS = [
  '3 BHK rental near Golf Course Road under ₹1 lakh, family with kids',
  'Best value 2 BHK to buy on Dwarka Expressway',
  'Pet-friendly society in Sector 65 with a clubhouse',
];

/** Minimal markdown → JSX: paragraphs, bullet lists and **bold**. Avoids a dependency. */
function renderRich(text: string) {
  const bold = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i} className="font-bold text-[#10251F]">{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
    );
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  const blocks: JSX.Element[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(<ul key={`ul-${blocks.length}`} className="my-1.5 ml-1 space-y-1">{bullets.map((b, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#8B6B32]" /><span>{bold(b)}</span></li>)}</ul>);
      bullets = [];
    }
  };
  lines.forEach((line, idx) => {
    const t = line.trim();
    if (/^[-*•]\s+/.test(t)) bullets.push(t.replace(/^[-*•]\s+/, ''));
    else { flush(); blocks.push(<p key={`p-${idx}`} className="leading-6">{bold(t)}</p>); }
  });
  flush();
  return <div className="space-y-2">{blocks}</div>;
}

function ScoreBadge({ score }: { score?: number | null }) {
  if (!score) return null;
  return <span className="inline-flex items-center gap-1 rounded-full bg-[#10251F] px-2 py-0.5 text-[11px] font-bold text-white"><Star className="h-3 w-3 fill-[#D7C18C] text-[#D7C18C]" />{score.toFixed(1)}</span>;
}

function SocietyCards({ matches, onOpen }: { matches: Match[]; onOpen: (match: Match) => void }) {
  if (!matches?.length) return null;
  return (
    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
      {matches.slice(0, 4).map((m) => (
        <Link key={m.id} to={m.url} onClick={() => onOpen(m)} className="group rounded-2xl border border-[#E7DCCB] bg-white p-3.5 transition hover:border-[#8B6B32] hover:shadow-[0_18px_40px_-30px_rgba(15,40,30,.5)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-[#10251F]">{m.society_name}</p>
              {m.sector ? <p className="text-xs text-[#6E756E]">{m.sector}</p> : null}
            </div>
            <ScoreBadge score={m.score} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#4A5049]">
            {m.rent_range ? <span><span className="text-[#8A8F89]">Rent</span> {m.rent_range}</span> : null}
            {m.buy_range ? <span><span className="text-[#8A8F89]">Buy</span> {m.buy_range}</span> : null}
          </div>
          {m.reason ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#6E756E]">{m.reason}</p> : null}
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#233B6E] group-hover:gap-1.5">View society <ArrowRight className="h-3 w-3 transition-all" /></p>
        </Link>
      ))}
    </div>
  );
}

/**
 * Where this chat was started from, and by which affordance. Recorded once per
 * conversation so admin can see which surfaces actually produce conversations —
 * and, paired with the exit outcome, which ones produce useful ones.
 */
export type AssistantEntry = { source?: string; label?: string };

export function SocietyAssistant({ initialQuery, entrySource = 'assistant' }: { initialQuery?: string; entrySource?: string } = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [thinkIdx, setThinkIdx] = useState(0);
  const [error, setError] = useState('');
  const [leadAction, setLeadAction] = useState<'callback' | 'visit' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firedInitial = useRef(false);
  const entryLabel = useRef<string>('typed');
  const outcomeSent = useRef<string>('');
  const token = () => readStoredToken();

  /**
   * Tell the backend how this conversation ended. Fired on the moments that matter
   * (a society opened, a callback started, a reset) and, as a beacon, when the page
   * is hidden with nothing else recorded. The server ranks outcomes, so the late
   * "abandoned" beacon can never overwrite a real one — but we also skip repeats
   * locally to keep the traffic negligible.
   */
  const reportOutcome = (outcome: string, detail?: string, beacon = false) => {
    const t = token();
    if (!t || outcomeSent.current === `${outcome}:${detail || ''}`) return;
    outcomeSent.current = `${outcome}:${detail || ''}`;
    const url = `${API_BASE_URL}/ai/chat/${t}/outcome`;
    const body = JSON.stringify({ outcome, detail });
    if (beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      // text/plain, not application/json. A JSON content type makes this a non-simple
      // cross-origin request, and the preflight it needs cannot complete while the page is
      // unloading — which is why every conversation showed "no exit recorded". The server
      // decodes the body by hand.
      navigator.sendBeacon(url, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
      return;
    }
    void fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
  };

  useEffect(() => {
    let cancelled = false;
    const q = (initialQuery || '').trim();

    const open = async () => {
      const saved = token();

      // Restore first, so a handed-off question threads onto the conversation already in
      // progress instead of racing it.
      if (saved) {
        try {
          const response = await fetch(`${API_BASE_URL}/ai/chat/${saved}`);
          const json = response.ok ? await response.json() : null;
          if (!cancelled && json?.data?.length) {
            setMessages(json.data.map((m: any) => ({ role: m.role, content: m.content, matches: m.role === 'assistant' ? m.context_entities || [] : undefined, suggested: m.role === 'assistant' ? m.suggested_replies || [] : undefined })));
          }
        } catch {
          // A transcript we could not fetch must not swallow the question below.
        }
      }

      // Clicking "Ask AI about this society" is a question, not a navigation. It used to
      // fire only when no conversation existed, so every returning visitor's click landed
      // on a stale transcript and was silently discarded — no answer, no error.
      if (!cancelled && q && !firedInitial.current) {
        firedInitial.current = true;
        void send(q, 'handoff_query');
      }
    };

    void open();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);
  // Scroll only the message container, never the whole window (the assistant is embedded on
  // tall pages, so scrollIntoView would yank the viewport past it).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // While thinking, keep the indicator in view. Once the reply lands, align its first
    // line to the top so the answer is read from the beginning and the cards and actions
    // sit naturally below it.
    if (thinking) { el.scrollTop = el.scrollHeight; return; }
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant') {
      const node = el.querySelector<HTMLElement>('[data-msg-last="1"]');
      if (node) { el.scrollTop = Math.max(0, node.offsetTop - el.offsetTop - 8); return; }
    }
    el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);
  useEffect(() => { if (!thinking) return; const id = setInterval(() => setThinkIdx((i) => (i + 1) % THINKING.length), 1100); return () => clearInterval(id); }, [thinking]);

  // A chat usually ends by the user simply leaving. Without this the outcome column
  // would only ever show the happy paths, and "how did it end" would be unanswerable
  // for the majority of conversations. pagehide covers the iOS case visibilitychange
  // misses.
  useEffect(() => {
    if (!messages.length) return;
    const bail = () => reportOutcome('abandoned', undefined, true);
    const onHide = () => { if (document.visibilityState === 'hidden') bail(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', bail);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', bail);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const send = async (text: string, label?: string) => {
    const message = text.trim();
    if (!message || thinking) return;
    if (label) entryLabel.current = label;
    const userTurn = messages.filter((item) => item.role === 'user').length + 1;
    trackAiPromptSubmitted({
      assistant: 'society_assistant',
      chat_stage: userTurn === 1 ? 'initial' : 'follow_up',
      user_turn: userTurn,
    });
    if (userTurn === 1) {
      trackEvent('ai_chat_started', { assistant: 'society_assistant' });
    }
    setInput(''); setError(''); setThinkIdx(0); setThinking(true);
    setMessages((cur) => [...cur, { role: 'user', content: message }]);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversation_token: token() || undefined,
          // Only meaningful on the first message; the server records it once, at creation.
          entry_source: entrySource,
          entry_label: entryLabel.current,
          entry_path: `${window.location.pathname}${window.location.search}`.slice(0, 255),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'The assistant is unavailable right now.');
      if (json.conversation_token) writeStoredToken(json.conversation_token);
      setMessages((cur) => [...cur, { role: 'assistant', content: json.reply, matches: json.matches || [], suggested: json.suggested_replies || [] }]);
      trackEvent('ai_answer_shown', {
        assistant: 'society_assistant',
        user_turn: userTurn,
        matches_count: Array.isArray(json.matches) ? json.matches.length : 0,
        provider: json.provider || 'unknown',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The assistant is unavailable right now.');
      reportOutcome('errored');
    } finally { setThinking(false); }
  };

  const reset = () => {
    reportOutcome('reset');
    clearStoredToken();
    outcomeSent.current = '';
    entryLabel.current = 'typed';
    setMessages([]); setError(''); setLeadAction(null);
  };
  const started = messages.length > 0;
  const latestAssistantIndex = useMemo(
    () => messages.reduce((latest, message, index) => (message.role === 'assistant' ? index : latest), -1),
    [messages],
  );
  const latestAssistant = latestAssistantIndex >= 0 ? messages[latestAssistantIndex] : undefined;
  const latestMatches = latestAssistant?.matches || [];
  // Answers to the question the assistant just asked. They live in the composer row
  // rather than under the bubble: that keeps them in view without scrolling and next
  // to the keyboard, so replying is a tap instead of typing on a phone.
  const quickReplies = (!thinking && !error && latestAssistantIndex === messages.length - 1 ? latestAssistant?.suggested : undefined) || [];
  const primaryMatch = latestMatches[0];
  const lastUserAsk = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
  const actions = useMemo<AssistantAction[]>(() => {
    if (!latestAssistant) return [];
    if (!latestMatches.length) {
      return [
        { kind: 'follow_up', label: 'Refine by budget', prompt: 'Help me refine this by budget. Ask me one short question first.', icon: 'refine' },
        { kind: 'follow_up', label: 'Refine by location', prompt: 'Help me refine this by sector or commute. Ask me one short question first.', icon: 'refine' },
        { kind: 'lead', label: 'Ask SocietyFlats', intent: 'callback', icon: 'callback' },
      ];
    }

    const names = latestMatches.slice(0, 2).map((match) => match.society_name).join(' and ');
    return [
      {
        kind: 'follow_up',
        label: 'Compare top matches',
        prompt: `Compare ${names} for my needs. Keep it concise and explain the main trade-off.`,
        icon: 'compare',
      },
      {
        kind: 'follow_up',
        label: 'Refine my shortlist',
        prompt: 'Ask me the single most useful question to refine these matches.',
        icon: 'refine',
      },
      { kind: 'lead', label: 'Check availability', intent: 'callback', icon: 'callback' },
      { kind: 'lead', label: 'Plan a site visit', intent: 'visit', icon: 'visit' },
    ];
  }, [latestAssistant, latestMatches]);

  // When the assistant offered tappable answers, the generic "Refine by…" buttons say
  // the same thing less well. Keep only the real next steps so the panel doesn't
  // compete with the chips.
  const visibleActions = quickReplies.length ? actions.filter((a) => a.kind === 'lead') : actions;

  const handleAction = (action: AssistantAction) => {
    trackEvent(action.kind === 'follow_up' ? 'ai_followup_clicked' : 'ai_cta_clicked', {
      assistant: 'society_assistant',
      action_label: action.label,
      action_type: action.kind === 'lead' ? action.intent : action.icon,
      society_slug: primaryMatch?.slug || '',
      matches_count: latestMatches.length,
    });
    if (action.kind === 'follow_up') {
      reportOutcome('refined', action.label);
      void send(action.prompt);
      return;
    }
    reportOutcome('lead_started', action.intent);
    setLeadAction(action.intent);
  };

  const handleSocietyOpen = (match: Match) => {
    trackResultClicked({
      assistant: 'society_assistant',
      result_type: 'society',
      society_slug: match.slug || '',
      result_position: latestMatches.findIndex((item) => item.id === match.id) + 1,
    });
    trackEvent('ai_society_opened', {
      assistant: 'society_assistant',
      society_slug: match.slug || '',
    });
    reportOutcome('society_opened', match.society_name);
  };

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] max-h-[720px] min-h-[440px] flex-col overflow-hidden rounded-[24px] border border-[#E7DCCB] bg-white shadow-[0_30px_80px_-50px_rgba(15,40,30,.5)] lg:h-[calc(100dvh-11rem)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#F0E9DC] bg-[#F7F4EF] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#10251F] text-white"><Sparkles className="h-4 w-4" /><span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#F7F4EF] bg-emerald-500" /></span>
          <div><p className="text-sm font-bold text-[#10251F]">SocietyFlats Assistant</p><p className="text-[11px] text-[#6E756E]">Reasons over verified societies only · never invents</p></div>
        </div>
        {started ? <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DCCB] px-3 py-1.5 text-xs font-bold text-[#6E756E] hover:bg-[#F8F3EA]"><RotateCcw className="h-3.5 w-3.5" />New chat</button> : null}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {!started ? (
          <div className="mx-auto max-w-md pt-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1EEE6] text-[#10251F]"><Sparkles className="h-6 w-6" /></span>
            <p className="mt-4 font-display text-xl font-medium text-[#10251F]">Tell me what home you're after.</p>
            <p className="mt-1.5 text-sm leading-6 text-[#6E756E]">Budget, area, commute, family, pets — in your own words. I'll reason over verified societies and show you why each fits.</p>
          </div>
        ) : null}

        {messages.map((m, i) => (
          <div key={i} data-msg-last={i === messages.length - 1 ? '1' : undefined} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            {m.role === 'assistant' ? (
              <div className="max-w-[92%]">
                <div className="rounded-2xl rounded-tl-sm border border-[#EDE6D8] bg-[#FBF9F4] px-4 py-3 text-sm text-[#3A4038]">{renderRich(m.content)}</div>
                {m.matches?.length ? <SocietyCards matches={m.matches} onOpen={handleSocietyOpen} /> : null}
                {i === latestAssistantIndex && !thinking && !error && visibleActions.length ? (
                  <div className="mt-3 rounded-2xl border border-[#DDE4F1] bg-[#F6F8FC] p-3">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#64708A]">What would help next?</p>
                    <div className="flex flex-wrap gap-2">
                      {visibleActions.map((action) => {
                        const Icon = action.icon === 'compare'
                          ? Scale
                          : action.icon === 'refine'
                            ? SlidersHorizontal
                            : action.icon === 'visit'
                              ? CalendarCheck
                              : PhoneCall;
                        const primary = action.kind === 'lead';
                        return (
                          <button
                            key={action.label}
                            type="button"
                            onClick={() => handleAction(action)}
                            className={primary
                              ? 'inline-flex items-center gap-1.5 rounded-full bg-[#233B6E] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#192D58]'
                              : 'inline-flex items-center gap-1.5 rounded-full border border-[#CBD5E7] bg-white px-3 py-2 text-xs font-bold text-[#233B6E] transition hover:border-[#8296BF]'}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#233B6E] px-4 py-2.5 text-sm leading-6 text-white">{m.content}</div>
            )}
          </div>
        ))}

        {thinking ? (
          <div className="flex justify-start"><div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-[#EDE6D8] bg-[#FBF9F4] px-4 py-3">
            <span className="flex gap-1">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8B6B32]" style={{ animationDelay: `${d * 120}ms` }} />)}</span>
            <span className="text-xs font-medium text-[#6E756E]">{THINKING[thinkIdx]}</span>
          </div></div>
        ) : null}
      </div>

      {error ? (
        <div className="mx-4 mb-2 shrink-0 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
          <p className="text-sm font-semibold text-amber-900">{error}</p>
          <p className="mt-1 text-sm text-amber-800">
            You can still browse verified societies, or ask our team to carry on the shortlist with you.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/search?tab=societies"
              onClick={() => {
                trackEvent('ai_cta_clicked', { assistant: 'society_assistant', action_label: 'Browse verified societies', action_type: 'error_recovery_search' });
                reportOutcome('errored', 'browse_societies');
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E9] bg-white px-4 py-2 text-sm font-bold text-[#1D1D1F] transition hover:bg-[#F5F5F7]"
            >
              Browse verified societies
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                trackEvent('ai_cta_clicked', { assistant: 'society_assistant', action_label: 'Ask SocietyFlats', action_type: 'error_recovery_lead' });
                reportOutcome('lead_started', 'error_recovery');
                setLeadAction('callback');
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#0F7B63] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0C6853]"
            >
              <PhoneCall className="h-4 w-4" />
              Ask SocietyFlats
            </button>
          </div>
        </div>
      ) : null}

      <div className="shrink-0 border-t border-[#F0E9DC] px-4 pb-4 pt-3">
        {!started ? <div className="mb-2.5 flex flex-wrap gap-2">
          {STARTERS.map((s) => <button key={s} onClick={() => void send(s, 'starter_chip')} disabled={thinking} className="rounded-full border border-[#E7DCCB] bg-[#F8F3EA] px-3 py-1.5 text-xs font-medium text-[#4A5049] hover:border-[#8B6B32] disabled:opacity-50">{s}</button>)}
        </div> : null}

        {quickReplies.length ? (
          <div className="mb-2.5">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A8F89]">Tap to answer</p>
            <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => {
                    trackEvent('ai_quick_reply_clicked', { assistant: 'society_assistant', action_label: reply, user_turn: messages.filter((m) => m.role === 'user').length + 1 });
                    reportOutcome('refined', reply);
                    void send(reply, 'quick_reply');
                  }}
                  disabled={thinking}
                  className="shrink-0 whitespace-nowrap rounded-full border border-[#0F7B63]/25 bg-[#ECF6F2] px-3.5 py-2 text-[13px] font-bold text-[#0F7B63] transition hover:border-[#0F7B63] disabled:opacity-50"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            value={input} maxLength={1500} rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); } }}
            placeholder="Ask about any Gurgaon society…"
            className="min-h-11 flex-1 resize-none rounded-2xl border border-[#E7DCCB] bg-white px-4 py-3 text-sm text-[#25302B] outline-none placeholder:text-[#8A8F89] focus:border-[#8B6B32]"
          />
          <button onClick={() => void send(input)} disabled={thinking || !input.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#10251F] text-white transition hover:bg-[#1a3a2f] disabled:opacity-40"><Send className="h-4 w-4" /></button>
        </div>
      </div>
      <PublicLeadModal
        open={leadAction !== null}
        title={leadAction === 'visit' ? 'Plan a site visit' : 'Check current availability'}
        subtitle="Share your contact details and SocietyFlats will help with the next step."
        source={leadAction === 'visit' ? 'ai_chat_site_visit' : 'ai_chat_availability'}
        ctaLabel={leadAction === 'visit' ? 'Plan a site visit' : 'Check availability'}
        leadIntent={leadAction === 'visit' ? 'site_visit' : 'society_availability'}
        societyName={primaryMatch?.society_name}
        defaultRequirement={leadAction === 'visit' ? 'Visit' : 'Callback'}
        defaultMessage={lastUserAsk ? `AI shortlist context: ${lastUserAsk}` : ''}
        submitLabel={leadAction === 'visit' ? 'Request site visit' : 'Request availability callback'}
        trackingContext={{
          entity_type: primaryMatch ? 'society' : 'general',
          entity_slug: primaryMatch?.slug || '',
          cta_label: leadAction === 'visit' ? 'Plan a site visit' : 'Check availability',
          lead_intent: leadAction === 'visit' ? 'site_visit' : 'society_availability',
        }}
        onClose={() => setLeadAction(null)}
      />
    </div>
  );
}
