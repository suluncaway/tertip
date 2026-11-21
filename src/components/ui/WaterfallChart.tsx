import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface WaterfallStep {
  id?: string;
  label: string;
  value: number;
  kind: 'start' | 'delta' | 'up' | 'down' | 'end';
}

export interface WaterfallChartProps {
  steps: WaterfallStep[];
  title?: string;
  subtitle?: string;
  unit?: string;
  valueFormatter?: (value: number, signed?: boolean) => string;
  heightClassName?: string;
  className?: string;
}

interface ComputedDatum {
  label: string;
  value: number;
  kind: WaterfallStep['kind'];
  range: [number, number];
  fill: string;
}

function defaultFormatCurrency(value: number, signed = false): string {
  const abs = Math.abs(value);
  const sign = signed ? (value > 0 ? '+' : value < 0 ? '-' : '') : value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}₺${(abs / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}M`;
  }
  if (abs >= 1_000) {
    return `${sign}₺${Math.round(abs).toLocaleString('tr-TR')}`;
  }
  return `${sign}₺${abs.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
}

function compactAxisTick(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000)}B`;
  }
  return `${value}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ComputedDatum }>;
  formatter: (value: number, signed?: boolean) => string;
}

const WaterfallTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  formatter,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  const kindLabel =
    item.kind === 'start'
      ? 'Başlangıç Kârı'
      : item.kind === 'end'
        ? 'Dönem Sonu Kârı'
        : item.value >= 0
          ? 'Pozitif Etki'
          : 'Negatif Etki';

  const isDelta = item.kind !== 'start' && item.kind !== 'end';

  return (
    <div className="rounded-[var(--tertip-radius-sm)] border border-[var(--tertip-border-strong)] bg-[var(--tertip-surface)] px-3 py-2 shadow-[var(--tertip-shadow-md)] text-xs">
      <div className="font-semibold text-[var(--tertip-ink)]">{item.label}</div>
      <div className="mt-0.5 text-[11px] text-[var(--tertip-ink-muted)]">{kindLabel}</div>
      <div className="mt-1 font-[var(--tertip-font-display)] text-sm font-bold text-[var(--tertip-ink)] tertip-tabular">
        {formatter(item.value, isDelta)}
      </div>
    </div>
  );
};

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  steps,
  title = 'Kâr Köprüsü (Dönem Değişim Ayrıştırması)',
  subtitle = 'Başlangıç kârından dönem sonu kârına hacim, fiyat ve maliyet etkileri',
  valueFormatter = defaultFormatCurrency,
  heightClassName = 'h-56 sm:h-72',
  className = '',
}) => {
  const data = useMemo<ComputedDatum[]>(() => {
    let running = 0;

    return steps.map((step) => {
      if (step.kind === 'start') {
        running = step.value;
        return {
          label: step.label,
          value: step.value,
          kind: 'start',
          range: step.value >= 0 ? [0, step.value] : [step.value, 0],
          fill: 'var(--tertip-accent)',
        };
      }

      if (step.kind === 'end') {
        return {
          label: step.label,
          value: step.value,
          kind: 'end',
          range: step.value >= 0 ? [0, step.value] : [step.value, 0],
          fill: 'var(--tertip-gold)',
        };
      }

      const prev = running;
      const next = running + step.value;
      running = next;

      return {
        label: step.label,
        value: step.value,
        kind: 'delta',
        range: [Math.min(prev, next), Math.max(prev, next)],
        fill: step.value >= 0 ? 'var(--tertip-success)' : 'var(--tertip-danger)',
      };
    });
  }, [steps]);

  if (data.length === 0) return null;

  return (
    <div
      className={[
        'rounded-[var(--tertip-radius-lg)] border border-[var(--tertip-border)] bg-[var(--tertip-surface)] p-4 sm:p-5 shadow-[var(--tertip-shadow-xs)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h3 className="font-[var(--tertip-font-display)] text-sm sm:text-base font-semibold text-[var(--tertip-ink)]">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--tertip-ink-muted)]">{subtitle}</p>
          )}
        </div>

        {/* Compact Legend */}
        <div className="flex items-center gap-3 flex-wrap text-[11px] font-medium text-[var(--tertip-ink-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-[var(--tertip-accent)]" aria-hidden="true" />
            Başlangıç
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-[var(--tertip-success)]" aria-hidden="true" />
            Artış
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-[var(--tertip-danger)]" aria-hidden="true" />
            Azalış
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-[var(--tertip-gold)]" aria-hidden="true" />
            Bitiş
          </span>
        </div>
      </div>

      <div className={`w-full ${heightClassName}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 8, left: -8, bottom: 4 }}
            barCategoryGap="22%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--tertip-border)"
              strokeOpacity={0.75}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--tertip-ink-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--tertip-border)' }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tickFormatter={compactAxisTick}
              tick={{ fill: 'var(--tertip-ink-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <ReferenceLine y={0} stroke="var(--tertip-border-strong)" />
            <Tooltip
              cursor={{ fill: 'var(--tertip-surface-subtle)', fillOpacity: 0.55 }}
              content={<WaterfallTooltip formatter={valueFormatter} />}
            />
            <Bar dataKey="range" radius={[6, 6, 6, 6]} maxBarSize={56}>
              {data.map((entry, index) => (
                <Cell key={`${entry.label}-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
