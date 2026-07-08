import { Link, useLocation } from "react-router-dom";
import { CalendarDays, Image, PenLine, PlugZap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/social", label: "AI Drafts", icon: PenLine },
  { href: "/admin/social/generate", label: "Generate Social Posts", icon: Sparkles },
  { href: "/admin/social/assets", label: "Creative Assets", icon: Image },
  { href: "/admin/social/accounts", label: "Social Accounts", icon: PlugZap },
  { href: "/admin/social/calendar", label: "Content Calendar", icon: CalendarDays },
];

export function AdminSocialNav() {
  const location = useLocation();

  return (
    <div className="mb-6 flex flex-wrap gap-2 rounded-[1.5rem] border bg-white p-2 shadow-sm">
      {items.map((item) => {
        const Icon = item.icon;
        const active = location.pathname === item.href;

        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition",
              active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
