import { cn } from "@/lib/utils";

type AdminMetricCardProps = {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  className?: string;
};

export function AdminMetricCard({ label, value, helper, className }: AdminMetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-slate-200 bg-white p-3.5 shadow-sm md:rounded-[22px] md:p-4",
        className,
      )}
    >
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-slate-950 md:mt-2 md:text-3xl">{value}</p>
      {helper ? <p className="mt-1.5 text-xs font-semibold text-blue-600 md:text-sm">{helper}</p> : null}
    </div>
  );
}
