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
  AVAILABLE: '#34d399',
  RESERVED_SOON: '#fbbf24',
  BOOKED_NOW: '#ef4444',
  SEATED: '#f97316',
  BLOCKED: '#6b7280',
  DISABLED: '#374151',
  HIDDEN_BY_LAYOUT: '#111827'
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
