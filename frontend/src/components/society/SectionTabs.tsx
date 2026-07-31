// Sticky section tabs for long detail pages.
//
// A society page runs to roughly thirteen phone screens. Without a way to jump,
// everything past the scores is effectively unreachable — you either scroll for
// half a minute or give up. This pins a scrollable strip under the header and
// highlights whichever section you're actually in.
import { useEffect, useRef, useState } from "react";

const ACCENT = "#0F7B63";

export type SectionTab = { id: string; label: string };

export function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const [active, setActive] = useState("");
  const [present, setPresent] = useState<SectionTab[]>([]);
  const stripRef = useRef<HTMLDivElement>(null);

  // Sections are conditional — only offer tabs whose target actually rendered.
  useEffect(() => {
    setPresent(tabs.filter((t) => document.getElementById(t.id)));
  }, [tabs]);

  useEffect(() => {
    if (!present.length) return;
    const nodes = present.map((t) => document.getElementById(t.id)).filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    // Track the last heading to have crossed the top band; that's the section
    // you're reading, which is not the same as "most visible on screen".
    const observer = new IntersectionObserver(
      () => {
        const line = 150;
        let current = nodes[0].id;
        for (const node of nodes) {
          if (node.getBoundingClientRect().top <= line) current = node.id;
        }
        setActive(current);
      },
      { rootMargin: "-140px 0px -60% 0px", threshold: [0, 1] },
    );
    nodes.forEach((n) => observer.observe(n));

    const onScroll = () => {
      const line = 150;
      let current = nodes[0].id;
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= line) current = node.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [present]);

  // Keep the active chip in view as you scroll the page.
  useEffect(() => {
    if (!active || !stripRef.current) return;
    const chip = stripRef.current.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!chip) return;
    const strip = stripRef.current;
    const left = chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  if (present.length < 2) return null;

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="sticky top-[3.9rem] z-30 -mx-4 mb-4 border-b border-[#E4E4E9] bg-white/95 backdrop-blur lg:hidden">
      <div ref={stripRef} className="scrollbar-hide flex gap-1 overflow-x-auto px-4 py-2">
        {present.map((tab) => {
          const on = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-tab={tab.id}
              onClick={() => jump(tab.id)}
              aria-current={on ? "true" : undefined}
              className="shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold transition"
              style={on ? { background: "#ECF6F2", color: ACCENT } : { color: "#6E6E73" }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
