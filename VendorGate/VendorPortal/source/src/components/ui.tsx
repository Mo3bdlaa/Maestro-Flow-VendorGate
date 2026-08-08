import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { TONE_CLASS, stage, statusName } from '../uipath-config';

/* ------------------------------- primitives -------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700 shadow-sm',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-500 shadow-sm',
  warning:
    'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
  ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
};

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...rest}
      className={
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ' +
        'transition-colors disabled:cursor-not-allowed disabled:opacity-50 ' +
        BUTTON_VARIANTS[variant] +
        ' ' +
        className
      }
    />
  );
}

export function TextInput({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ' +
        'placeholder:text-slate-400 transition-colors hover:border-slate-400 ' +
        'focus:border-brand-500 focus:outline-none ' +
        className
      }
    />
  );
}

export function Select({
  className = '',
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={
        'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ' +
        'transition-colors hover:border-slate-400 focus:border-brand-500 focus:outline-none ' +
        className
      }
    />
  );
}

export function FieldLabel({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

/* --------------------------------- surfaces -------------------------------- */

export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={'rounded-2xl border border-slate-200 bg-white shadow-card ' + className}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-base font-semibold tracking-tight text-slate-900">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 break-words text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

export function StatTile({ label, value, accent = false }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={'mt-1.5 text-2xl font-semibold tabular-nums ' + (accent ? 'text-brand-600' : 'text-slate-900')}>
        {value}
      </p>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export function StatusPill({ status }: { status: number | undefined }) {
  const s = stage(status);
  const cls = s ? TONE_CLASS[s.tone] : 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ' +
        cls
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {statusName(status)}
    </span>
  );
}

export function Banner({
  tone,
  title,
  children,
}: {
  tone: 'info' | 'attention' | 'good' | 'bad';
  title?: string;
  children: ReactNode;
}) {
  const map = {
    info: 'border-brand-100 bg-brand-50 text-brand-700',
    attention: 'border-amber-300 bg-amber-50 text-amber-900',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    bad: 'border-red-300 bg-red-50 text-red-900',
  } as const;
  return (
    <div className={'rounded-xl border p-4 text-sm ' + map[tone]} role={tone === 'bad' ? 'alert' : undefined}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? 'mt-0.5' : ''}>{children}</div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
      <p className="text-sm text-slate-500">{children}</p>
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-slate-500" role="status">
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
        aria-hidden
      />
      {label}
    </p>
  );
}

/* Product mark: simple geometric gate. Inline SVG, inherits currentColor. */
export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect x="2" y="2" width="28" height="28" rx="8" className="fill-brand-600" />
      <path
        d="M9 22V12.5L16 8l7 4.5V22"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 22v-5h6v5" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
