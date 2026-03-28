export type BookingKind =
  | 'restaurant_table'
  | 'terrace_table'
  | 'lounger_bed'
  | 'bungalow'
  | 'pier_spot'
  | 'hookah_table'
  | 'vip_zone'
  | 'ticket_zone';

export type RuntimeObjectStatus =
  | 'AVAILABLE'
  | 'RESERVED_SOON'
  | 'BOOKED_NOW'
  | 'SEATED'
  | 'BLOCKED'
  | 'DISABLED'
  | 'HIDDEN_BY_LAYOUT';

export const RUNTIME_STATUS_COLOR: Record<RuntimeObjectStatus, string> = {
  AVAILABLE: '#22c55e',
  RESERVED_SOON: '#f59e0b',
  BOOKED_NOW: '#ef4444',
  SEATED: '#f97316',
  BLOCKED: '#6b7280',
  DISABLED: '#475569',
  HIDDEN_BY_LAYOUT: '#1f2937'
};

export const RUNTIME_STATUS_STYLE: Record<RuntimeObjectStatus, { outline: string; tint: string; badge: string; opacity: number }> = {
  AVAILABLE: { outline: '1px solid rgba(34, 197, 94, 0.8)', tint: 'rgba(34, 197, 94, 0.14)', badge: '#166534', opacity: 1 },
  RESERVED_SOON: { outline: '1px solid rgba(245, 158, 11, 0.86)', tint: 'rgba(245, 158, 11, 0.16)', badge: '#92400e', opacity: 1 },
  BOOKED_NOW: { outline: '1px solid rgba(239, 68, 68, 0.9)', tint: 'rgba(239, 68, 68, 0.2)', badge: '#7f1d1d', opacity: 1 },
  SEATED: { outline: '1px solid rgba(249, 115, 22, 0.88)', tint: 'rgba(249, 115, 22, 0.18)', badge: '#7c2d12', opacity: 1 },
  BLOCKED: { outline: '1px solid rgba(100, 116, 139, 0.85)', tint: 'rgba(100, 116, 139, 0.2)', badge: '#334155', opacity: 1 },
  DISABLED: { outline: '1px solid rgba(71, 85, 105, 0.8)', tint: 'rgba(71, 85, 105, 0.22)', badge: '#1e293b', opacity: 0.78 },
  HIDDEN_BY_LAYOUT: { outline: '1px dashed rgba(148, 163, 184, 0.45)', tint: 'rgba(15, 23, 42, 0.35)', badge: '#334155', opacity: 0.3 }
};

export function resolveMockRuntimeStatus({
  isVisible,
  isEnabled,
  isBookedNow,
  isReservedSoon,
  isSeated,
  isBlocked
}: {
  isVisible: boolean;
  isEnabled: boolean;
  isBookedNow?: boolean;
  isReservedSoon?: boolean;
  isSeated?: boolean;
  isBlocked?: boolean;
}): RuntimeObjectStatus {
  if (!isVisible) return 'HIDDEN_BY_LAYOUT';
  if (!isEnabled) return 'DISABLED';
  if (isBlocked) return 'BLOCKED';
  if (isSeated) return 'SEATED';
  if (isBookedNow) return 'BOOKED_NOW';
  if (isReservedSoon) return 'RESERVED_SOON';
  return 'AVAILABLE';
}
