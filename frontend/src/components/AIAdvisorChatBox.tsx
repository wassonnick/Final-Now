import { FormEvent, useMemo, useState } from 'react';
import { Bot, MoreHorizontal, Send, Sparkles } from 'lucide-react';

type ChatRole = 'assistant' | 'user';

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

type AdvisorMatch = {
  id?: number;
  society_name: string;
  slug?: string;
  sector?: string;
  locality?: string;
  score?: number;
  rent_range?: string;
  buy_range?: string;
  available_homes?: number;
  reason?: string;
  tags?: string[];
};

type AdvisorResponse = {
  reply?: string;
  matches?: AdvisorMatch[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://final-now.onrender.com/api';

const demoMatches: AdvisorMatch[] = [
  {
    id: 1,
    society_name: 'DLF Crest',
    sector: 'DLF Phase V',
    score: 9.1,
    rent_range: 'Rs 85K-1.8L',
    reason: 'Excellent',
    tags: ['Excellent'],
  },
  {
    id: 2,
    society_name: 'DLF Park Place',
    sector: 'DLF Phase V',
    score: 8.7,
    rent_range: 'Rs 75K-1.6L',
    reason: 'Very Good',
    tags: ['Very Good'],
  },
  {
    id: 3,
    society_name: 'Ireo Skyon',
    sector: 'Sector 60',
    score: 8.4,
    rent_range: 'Rs 70K-1.4L',
    reason: 'Very Good',
    tags: ['Very Good'],
  },
];

const quickChips = ['Family', 'Metro', 'Pets', 'Under Rs 1L'];

export function AIAdvisorChatBox() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi! I'm your SocietyFlats AI advisor for Gurgaon. Tell me your needs and I'll help you find the right society.",
    },
    {
      id: 'demo-user',
      role: 'user',
      text: 'Best 3BHK near Cyber City under Rs 1L',
    },
    {
      id: 'demo-reply',
      role: 'assistant',
      text: 'Here are the top 3 societies that match your requirements near Cyber City for 3BHK homes.',
    },
  ]);
  const [matches, setMatches] = useState<AdvisorMatch[]>(demoMatches);
  const [usedFallback, setUsedFallback] = useState(false);

  const latestMatches = useMemo(() => matches.slice(0, 3), [matches]);

  const submitMessage = async (event?: FormEvent<HTMLFormElement>, chip?: string) => {
    event?.preventDefault();
    const message = (chip || input).trim();
    if (!message || loading) return;

    setInput('');
    setLoading(true);
    setUsedFallback(false);
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: message }]);

    try {
      const response = await fetch(`${API_BASE}/ai/advisor`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, intent: 'rent' }),
      });

      if (!response.ok) throw new Error('AI advisor request failed');

      const payload = (await response.json()) as AdvisorResponse;
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text:
            payload.reply ||
            'I found a few societies that match your requirement. Review these before scheduling a visit.',
        },
      ]);
      if (payload.matches?.length) setMatches(payload.matches);
    } catch {
      setUsedFallback(true);
      setMessages((current) => [
        ...current,
        {
          id: `fallback-${Date.now()}`,
          role: 'assistant',
          text: 'I could not fetch live recommendations right now. Please request a callback and our team will help you.',
        },
      ]);
      setMatches(demoMatches);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="hidden w-full min-w-0 max-w-[330px] overflow-hidden rounded-[1.25rem] border border-blue-100 bg-white/95 p-2 shadow-premium backdrop-blur lg:block xl:max-w-[350px]">
      <div className="mb-1 flex items-center gap-2 rounded-[0.85rem] bg-blue-50 px-2.5 py-1.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-[10px] font-black text-white">
          SF
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[11px] font-black text-navy-950">SocietyFlats AI</p>
            <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-blue-700">
              Advisor
            </span>
          </div>
          <p className="text-[9.5px] font-bold text-emerald-700">Gurgaon expert · Online</p>
        </div>
        <MoreHorizontal className="ml-auto h-4 w-4 text-navy-300" />
      </div>

      <div className="space-y-1">
        {messages.slice(-2).map((message) => (
          <div
            key={message.id}
            className={`max-w-[92%] rounded-xl px-2.5 py-1 text-[9.5px] font-semibold leading-3 shadow-sm ${
              message.role === 'user'
                ? 'ml-auto bg-blue-700 text-white'
                : 'bg-ivory-100 text-navy-600'
            }`}
          >
            {message.text}
          </div>
        ))}
        {loading && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-ivory-100 px-3 py-1 text-[9.5px] font-bold text-navy-500">
            <Sparkles className="h-3.5 w-3.5 text-blue-700" />
            Finding best society matches...
          </div>
        )}
      </div>

      <div className="my-1 rounded-[0.95rem] border border-blue-100 bg-blue-50/70 p-1.5">
        <div className="mb-1 flex items-center justify-between px-1">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">Top matches</p>
          {usedFallback && <span className="text-[11px] font-bold text-gold-700">Demo fallback</span>}
        </div>
        <div className="space-y-1">
          {latestMatches.map((match, index) => (
            <div key={`${match.society_name}-${index}`} className="flex items-center gap-2 rounded-lg bg-white px-2 py-0.5 shadow-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-700 text-[10px] font-black text-white">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-black text-navy-950">{match.society_name}</p>
                <p className="truncate text-[9.5px] font-semibold text-navy-400">{match.locality || match.sector || 'Gurgaon'}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black text-blue-700">{Number(match.score || 0).toFixed(1)}</p>
                <p className="text-[9px] font-bold text-navy-400">{match.tags?.[0] || match.reason || 'Very Good'}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-1 h-6 rounded-lg bg-[#dce8f0] p-1">
          <div className="relative h-full overflow-hidden rounded-xl bg-blue-100">
            <span className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 bg-white" />
            <span className="absolute bottom-0 left-1/3 top-0 w-1 bg-white" />
            <span className="absolute bottom-0 left-2/3 top-0 w-1 bg-white" />
            {[9.1, 8.7, 8.4].map((score, index) => (
              <span
                key={score}
                className="absolute flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-blue-700 text-[6.5px] font-black text-white shadow-md"
                style={{ left: `${32 + index * 20}%`, top: `${42 + index * 13}%` }}
              >
                {score}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-1 flex flex-nowrap gap-1 overflow-hidden">
        {quickChips.map((chip) => (
          <button
            key={chip}
            onClick={() => submitMessage(undefined, chip)}
            className="shrink-0 rounded-full border border-blue-100 bg-white px-2 py-0.5 text-[9px] font-bold text-navy-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            {chip}
          </button>
        ))}
      </div>

      <form onSubmit={submitMessage} className="flex items-center gap-2 rounded-full border border-blue-100 bg-white px-2.5 py-1 shadow-sm">
        <Bot className="h-4 w-4 shrink-0 text-blue-700" />
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about societies, locality, budget..."
          className="h-6 min-w-0 flex-1 border-0 bg-transparent text-xs font-semibold text-navy-950 outline-none placeholder:text-navy-300"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send AI advisor message"
        >
          {loading ? <Sparkles className="h-3.5 w-3.5 animate-pulse" /> : <Send className="h-3.5 w-3.5" />}
        </button>
      </form>

    </aside>
  );
}
