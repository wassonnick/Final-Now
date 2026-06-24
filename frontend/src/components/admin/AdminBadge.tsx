import { cn } from "@/lib/utils";
import { adminClassForValue, adminToneClass, type AdminTone } from "@/lib/adminColorTokens";

type AdminBadgeProps = {
  children: React.ReactNode;
  tone?: AdminTone;
  /** Look up the tone from the shared status/priority/source token map instead of passing one directly. */
  value?: string | null;
  className?: string;
};

export function AdminBadge({ children, tone, value, className }: AdminBadgeProps) {
  const toneClass = tone ? adminToneClass(tone) : adminClassForValue(value);

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold", toneClass, className)}>
      {children}
    </span>
  );
}
