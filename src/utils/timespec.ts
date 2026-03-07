/**
 * Timespec parsing utility
 * Parses relative time strings like "4h", "2 hours ago", "3 days ago", etc.
 */

/**
 * Parse a timespec string into a Date object
 *
 * Supported formats:
 * - "4h" or "4H" - 4 hours ago
 * - "30m" or "30M" - 30 minutes ago
 * - "2d" or "2D" - 2 days ago
 * - "1w" or "1W" - 1 week ago
 * - "4 hours ago" - 4 hours ago
 * - "2 days ago" - 2 days ago
 * - "30 minutes ago" - 30 minutes ago
 * - ISO date string - parsed directly
 *
 * @param timespec The time specification string
 * @returns Date object representing the point in time
 */
export function parseTimespec(timespec: string): Date {
  const now = Date.now();
  const input = timespec.trim().toLowerCase();

  // Try short format: 4h, 30m, 2d, 1w
  const shortMatch = input.match(/^(\d+)\s*([hmsdw])$/i);
  if (shortMatch) {
    const value = parseInt(shortMatch[1], 10);
    const unit = shortMatch[2].toLowerCase();

    switch (unit) {
      case 'm':
        return new Date(now - value * 60 * 1000);
      case 'h':
        return new Date(now - value * 60 * 60 * 1000);
      case 'd':
        return new Date(now - value * 24 * 60 * 60 * 1000);
      case 'w':
        return new Date(now - value * 7 * 24 * 60 * 60 * 1000);
      case 's':
        return new Date(now - value * 1000);
    }
  }

  // Try long format: "4 hours ago", "2 days ago"
  const longMatch = input.match(/^(\d+)\s+(second|minute|hour|day|week)s?\s+ago$/i);
  if (longMatch) {
    const value = parseInt(longMatch[1], 10);
    const unit = longMatch[2].toLowerCase();

    switch (unit) {
      case 'second':
        return new Date(now - value * 1000);
      case 'minute':
        return new Date(now - value * 60 * 1000);
      case 'hour':
        return new Date(now - value * 60 * 60 * 1000);
      case 'day':
        return new Date(now - value * 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now - value * 7 * 24 * 60 * 60 * 1000);
    }
  }

  // Try parsing as ISO date string or other date format
  const parsed = new Date(timespec);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Default to 4 hours ago if parsing fails
  console.warn(`Could not parse timespec "${timespec}", defaulting to 4 hours ago`);
  return new Date(now - 4 * 60 * 60 * 1000);
}

/**
 * Format a duration in milliseconds as a human-readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Get a human-readable relative time string
 */
export function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  return formatDuration(diff) + ' ago';
}
