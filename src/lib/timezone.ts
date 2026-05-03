// Utility for MSK (UTC+3) time handling
// Event times are input in MSK, stored in UTC, displayed in user's local timezone

const MSK_OFFSET = 3 * 60 * 60 * 1000; // UTC+3 in ms

// Convert MSK time (input) to UTC (storage)
export function mskToUTC(dateStr: string, timeStr: string): string {
  // Create date in local time first, then adjust
  const localDate = new Date(`${dateStr}T${timeStr}:00`);
  // Assume input is MSK, convert to UTC
  const utcTime = localDate.getTime() - MSK_OFFSET;
  return new Date(utcTime).toISOString();
}

// Convert stored UTC time to user's local timezone for display
export function utcToLocal(isoString: string): Date {
  return new Date(isoString);
}

// Format date/time in user's local timezone
export function formatLocal(datetime: Date): string {
  return datetime.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get MSK time string from local input (for forms)
export function getMskTimeString(): string {
  const now = new Date();
  // Add MSK offset to get MSK time
  const mskTime = new Date(now.getTime() + MSK_OFFSET);
  return mskTime.toTimeString().slice(0, 5);
}

// Convert stored event to display format
export function getEventDisplayTime(dateStr: string, timeStr: string): string {
  // dateStr and timeStr are in MSK, convert to local for display
  const mskDate = new Date(`${dateStr}T${timeStr}:00`);
  // Adjust to UTC first (since input was MSK)
  const utcTime = mskDate.getTime() - MSK_OFFSET;
  // Convert to local
  const localDate = new Date(utcTime);
  return formatLocal(localDate);
}
