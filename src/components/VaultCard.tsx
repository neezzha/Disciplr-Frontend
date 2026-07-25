import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Text } from './Text';
import { VaultProgressBar } from './VaultProgressBar';
import { CountdownDeadline } from './CountdownDeadline';
import { Badge } from './Badge';
import type { BadgeTone } from './Badge';
import type { VaultStatus } from '../types/vault';

export type { VaultStatus };

export interface VaultCardProps {
  id: string;
  name: string;
  amount: number;
  currency: string;
  status: VaultStatus;
  deadline: string;
  progressPct: number;
  linkTo?: string;
}

/** Vaults with <= 24 h remaining are classified as critical. */
export const URGENCY_CRITICAL_MS = 24 * 60 * 60 * 1000;
/** Vaults with > 24 h and <= 7 d remaining are classified as soon. */
export const URGENCY_SOON_MS = 7 * 24 * 60 * 60 * 1000;

export type UrgencyTier = 'safe' | 'soon' | 'critical' | 'expired';

/** Returns urgency tier based on time remaining. Invalid deadlines return 'safe'. */
export function deadlineUrgency(deadline: string, now: Date | number = Date.now()): UrgencyTier {
  const deadlineMs = new Date(deadline).getTime();
  const nowMs = typeof now === 'number' ? now : now.getTime();

  if (Number.isNaN(deadlineMs)) return 'safe';

  const msRemaining = deadlineMs - nowMs;
  if (msRemaining <= 0) return 'expired';
  if (msRemaining <= URGENCY_CRITICAL_MS) return 'critical';
  if (msRemaining <= URGENCY_SOON_MS) return 'soon';
  return 'safe';
}

const URGENCY_BADGE_CONFIG: Record<
  Exclude<UrgencyTier, 'safe'>,
  { label: string; tone: BadgeTone; ariaLabel: string }
> = {
  critical: {
    label: 'Expires soon!',
    tone: 'danger',
    ariaLabel: 'Critical: expires within 24 hours',
  },
  soon: {
    label: 'Due soon',
    tone: 'warning',
    ariaLabel: 'Deadline approaching: due within 7 days',
  },
  expired: {
    label: 'Overdue',
    tone: 'danger',
    ariaLabel: 'Overdue: deadline has passed',
  },
} as const;

function UrgencyBadge({ tier }: { tier: UrgencyTier }) {
  if (tier === 'safe') return null;
  const config = URGENCY_BADGE_CONFIG[tier];
  return (
    <Badge tone={config.tone} size="sm" aria-label={config.ariaLabel}>
      {config.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: VaultStatus }) {
  const config: Record<VaultStatus, { label: string; bg: string; fg: string }> = {
    active: { label: 'Active', bg: 'var(--accent-transparent)', fg: 'var(--accent)' },
    pending_validation: { label: 'Pending', bg: 'var(--warning-transparent)', fg: 'var(--warning)' },
    completed: { label: 'Completed', bg: 'var(--success-transparent)', fg: 'var(--success)' },
    failed: { label: 'Failed', bg: 'var(--danger-transparent)', fg: 'var(--danger)' },
    cancelled: { label: 'Cancelled', bg: 'rgba(156,163,175,0.1)', fg: 'var(--muted)' },
  };
  const badge = config[status];

  return (
    <span
      style={{
        background: badge.bg,
        color: badge.fg,
        border: `1px solid ${badge.fg}`,
        borderRadius: 'var(--radius-full)',
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {badge.label}
    </span>
  );
}

const VaultCard = memo(function VaultCard({
  id,
  name,
  amount,
  currency,
  status,
  deadline,
  progressPct,
  linkTo,
}: VaultCardProps) {
  const link = linkTo ?? `/vaults/${id}`;
  const isTerminal = status === 'completed' || status === 'failed';
  const urgency = isTerminal ? 'safe' : deadlineUrgency(deadline);
  const borderColor = urgency === 'critical' || urgency === 'expired'
    ? 'var(--danger)'
    : urgency === 'soon'
      ? 'var(--warning)'
      : 'var(--border)';

  return (
    <Link to={link} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={{
          background: 'var(--bg)',
          border: `1px solid ${borderColor}`,
          borderRadius: 'var(--radius)',
          padding: '0.875rem 1rem',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: '0.75rem',
          marginBottom: 4,
          boxShadow: 'var(--elevated)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Text role="body" as="div" style={{ fontWeight: 600, marginBottom: 2 }}>
            {name}
          </Text>
          <Text role="caption" as="div" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            {amount.toLocaleString()} {currency}
          </Text>
          <Text role="caption" as="div" style={{ color: 'var(--muted)' }}>
            Deadline:{' '}
            <CountdownDeadline deadline={deadline} />
          </Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UrgencyBadge tier={urgency} />
          <StatusBadge status={status} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <VaultProgressBar value={progressPct} label={`${name} progress`} />
        </div>
      </div>
    </Link>
  );
});

export default VaultCard;

