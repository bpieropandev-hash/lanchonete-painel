import { formatBRL } from "@/lib/format";

type Icon = React.ComponentType<{ size?: number; className?: string }>;

export function Metric({
  icon: Icone,
  label,
  value,
  note,
}: {
  icon: Icon;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-sm font-medium text-gray-600">
        <span>{label}</span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
          <Icone size={18} />
        </span>
      </div>
      <p className="mt-3 break-words text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-tight tracking-tight tabular-nums text-gray-950">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-gray-500">{note}</p>
    </div>
  );
}

export function PaymentRow({
  icon: Icone,
  label,
  value,
  percent,
  bar,
}: {
  icon: Icon;
  label: string;
  value: number;
  percent: number;
  bar: string;
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
          <Icone size={18} />
        </span>
        <span className="flex-1 text-sm font-medium text-gray-800">
          {label}
        </span>
        <strong className="whitespace-nowrap text-sm tabular-nums text-gray-950">
          {formatBRL(value)}
        </strong>
      </div>
      <div className="ml-12 mt-2 flex items-center gap-3">
        <div
          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-label={`${label}: ${percent}% das vendas`}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full ${bar}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="w-9 text-right text-xs tabular-nums text-gray-500">
          {percent}%
        </span>
      </div>
    </div>
  );
}

