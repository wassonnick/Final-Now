import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw, Send, Sparkles, Star } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';

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
type Message = { role: 'user' | 'assistant'; content: string; matches?: Match[] };

const TOKEN_KEY = 'sf_assistant_token_v1';
const THINKING = ['Reading your needs…', 'Searching verified societies…', 'Weighing scores, budget and location…', 'Shortlisting the best fits…'];
const STARTERS = [
  '3 BHK rental near Golf Course Road under ₹1 lakh, family with kids',
  'Best value 2 BHK to buy on Dwarka Expressway',
  'Pet-friendly society in Sector 65 with a clubhouse',
];
const FOLLOWUPS = ['Cheaper options', 'Which has the best schools?', 'Closest to Cyber City', 'Book a visit'];

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

function SocietyCards({ matches }: { matches: Match[] }) {
  if (!matches?.length) return null;
  return (
    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
      {matches.slice(0, 4).map((m) => (
        <Link key={m.id} to={m.url} className="group rounded-2xl border border-[#E7DCCB] bg-white p-3.5 transition hover:border-[#8B6B32] hover:shadow-[0_18px_40px_-30px_rgba(15,40,30,.5)]">
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

export function SocietyAssistant({ initialQuery }: { initialQuery?: string } = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [thinkIdx, setThinkIdx] = useState(0);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const firedInitial = useRef(false);
  const token = () => window.localStorage.getItem(TOKEN_KEY) || '';

  useEffect(() => {
    const saved = token();
    // Auto-fire a query handed off from a link (e.g. the homepage "Ask SocietyFlats AI" chips),
    // but only for a fresh visitor — don't hijack an existing conversation.
    if (!saved) {
      const q = (initialQuery || '').trim();
      if (q && !firedInitial.current) {
        firedInitial.current = true;
        void send(q);
      }
      return;
    }
    fetch(`${API_BASE_URL}/ai/chat/${saved}`).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (j?.data?.length) setMessages(j.data.map((m: any) => ({ role: m.role, content: m.content, matches: m.role === 'assistant' ? m.context_entities || [] : undefined })));
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);
  // Scroll only the message container, never the whole window (the assistant is embedded on
  // tall pages, so scrollIntoView would yank the viewport past it).
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, thinking]);
  useEffect(() => { if (!thinking) return; const id = setInterval(() => setThinkIdx((i) => (i + 1) % THINKING.length), 1100); return () => clearInterval(id); }, [thinking]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || thinking) return;
    setInput(''); setError(''); setThinkIdx(0); setThinking(true);
    setMessages((cur) => [...cur, { role: 'user', content: message }]);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversation_token: token() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'The assistant is unavailable right now.');
      if (json.conversation_token) window.localStorage.setItem(TOKEN_KEY, json.conversation_token);
      setMessages((cur) => [...cur, { role: 'assistant', content: json.reply, matches: json.matches || [] }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The assistant is unavailable right now.');
    } finally { setThinking(false); }
  };

  const reset = () => { window.localStorage.removeItem(TOKEN_KEY); setMessages([]); setError(''); };
  const started = messages.length > 0;
  const suggestions = useMemo(() => (started ? FOLLOWUPS : STARTERS), [started]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E7DCCB] bg-white shadow-[0_30px_80px_-50px_rgba(15,40,30,.5)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#F0E9DC] bg-[#F7F4EF] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#10251F] text-white"><Sparkles className="h-4 w-4" /><span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#F7F4EF] bg-emerald-500" /></span>
          <div><p className="text-sm font-bold text-[#10251F]">SocietyFlats Assistant</p><p className="text-[11px] text-[#6E756E]">Reasons over 66 verified societies · never invents</p></div>
        </div>
        {started ? <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DCCB] px-3 py-1.5 text-xs font-bold text-[#6E756E] hover:bg-[#F8F3EA]"><RotateCcw className="h-3.5 w-3.5" />New chat</button> : null}
      </div>

      <div ref={scrollRef} className="h-[44vh] max-h-[440px] min-h-[280px] space-y-4 overflow-y-auto px-4 py-5">
        {!started ? (
          <div className="mx-auto max-w-md pt-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1EEE6] text-[#10251F]"><Sparkles className="h-6 w-6" /></span>
            <p className="mt-4 font-display text-xl font-medium text-[#10251F]">Tell me what home you're after.</p>
            <p className="mt-1.5 text-sm leading-6 text-[#6E756E]">Budget, area, commute, family, pets — in your own words. I'll reason over verified societies and show you why each fits.</p>
          </div>
        ) : null}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            {m.role === 'assistant' ? (
              <div className="max-w-[92%]">
                <div className="rounded-2xl rounded-tl-sm border border-[#EDE6D8] bg-[#FBF9F4] px-4 py-3 text-sm text-[#3A4038]">{renderRich(m.content)}</div>
                {m.matches?.length ? <SocietyCards matches={m.matches} /> : null}
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

      {error ? <p className="px-4 pb-1 text-sm font-semibold text-rose-600">{error}</p> : null}

      <div className="border-t border-[#F0E9DC] px-4 pb-4 pt-3">
        <div className="mb-2.5 flex flex-wrap gap-2">
          {suggestions.map((s) => <button key={s} onClick={() => void send(s)} disabled={thinking} className="rounded-full border border-[#E7DCCB] bg-[#F8F3EA] px-3 py-1.5 text-xs font-medium text-[#4A5049] hover:border-[#8B6B32] disabled:opacity-50">{s}</button>)}
        </div>
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
    </div>
  );
}
