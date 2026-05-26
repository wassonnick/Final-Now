import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatCardProps = {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  className?: string;
};

export function StatCard({ title, value, change, icon: Icon, className }: StatCardProps) {
  return (
    <div className={cn('rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          {change ? <p className="mt-2 text-sm text-blue-600">{change}</p> : null}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
