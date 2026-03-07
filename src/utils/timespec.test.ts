import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseTimespec, formatDuration, timeAgo } from './timespec.js';

describe('parseTimespec', () => {
  const NOW = new Date('2024-01-15T12:00:00.000Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('short format', () => {
    it('should parse minutes (m)', () => {
      const result = parseTimespec('30m');
      const expected = new Date(NOW - 30 * 60 * 1000);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should parse hours (h)', () => {
      const result = parseTimespec('4h');
      const expected = new Date(NOW - 4 * 60 * 60 * 1000);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should parse days (d)', () => {
      const result = parseTimespec('2d');
      const expected = new Date(NOW - 2 * 24 * 60 * 60 * 1000);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should parse weeks (w)', () => {
      const result = parseTimespec('1w');
      const expected = new Date(NOW - 7 * 24 * 60 * 60 * 1000);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should parse seconds (s)', () => {
      const result = parseTimespec('45s');
      const expected = new Date(NOW - 45 * 1000);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should be case insensitive', () => {
      const lowerResult = parseTimespec('4h');
      const upperResult = parseTimespec('4H');
      expect(lowerResult.getTime()).toBe(upperResult.getTime());
    });

    it('should handle whitespace', () => {
      const result = parseTimespec('  4h  ');
      const expected = new Date(NOW - 4 * 60 * 60 * 1000);
      expect(result.getTime()).toBe(expected.getTime());
    });
  });

  describe('long format', () => {
    it('should parse "X hours ago"', () => {
      const result = parseTimespec('4 hours ago');
      const expected = new Date(NOW - 4 * 60 * 60 * 1000);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should parse "X hour ago" (singular)', () => {
      const result = parseTimespec('1 hour ago');
      const expected = new Date(NOW - 1 * 60 * 60 * 1000);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should parse "X minutes ago"', () => {
      const result = parseTimespec('30 minutes ago');
      const expected = new Date(NOW - 30 * 60 * 1000);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should parse "X days ago"', () => {
      const result = parseTimespec('3 days ago');
      const expected = new Date(NOW - 3 * 24 * 60 * 60 * 1000);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should parse "X weeks ago"', () => {
      const result = parseTimespec('2 weeks ago');
      const expected = new Date(NOW - 2 * 7 * 24 * 60 * 60 * 1000);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should parse "X seconds ago"', () => {
      const result = parseTimespec('45 seconds ago');
      const expected = new Date(NOW - 45 * 1000);
      expect(result.getTime()).toBe(expected.getTime());
    });
  });

  describe('ISO date format', () => {
    it('should parse ISO date strings', () => {
      const isoDate = '2024-01-10T08:00:00.000Z';
      const result = parseTimespec(isoDate);
      expect(result.toISOString()).toBe(isoDate);
    });
  });

  describe('invalid input', () => {
    it('should default to 4 hours ago for invalid input', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = parseTimespec('invalid');
      const expected = new Date(NOW - 4 * 60 * 60 * 1000);
      expect(result.getTime()).toBe(expected.getTime());
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe('formatDuration', () => {
  it('should format seconds', () => {
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(45000)).toBe('45s');
  });

  it('should format minutes', () => {
    expect(formatDuration(60000)).toBe('1m');
    expect(formatDuration(5 * 60 * 1000)).toBe('5m');
  });

  it('should format hours with remaining minutes', () => {
    expect(formatDuration(60 * 60 * 1000)).toBe('1h');
    expect(formatDuration(90 * 60 * 1000)).toBe('1h 30m');
    expect(formatDuration(2 * 60 * 60 * 1000)).toBe('2h');
  });

  it('should format days with remaining hours', () => {
    expect(formatDuration(24 * 60 * 60 * 1000)).toBe('1d');
    expect(formatDuration(36 * 60 * 60 * 1000)).toBe('1d 12h');
    expect(formatDuration(2 * 24 * 60 * 60 * 1000)).toBe('2d');
  });
});

describe('timeAgo', () => {
  const NOW = new Date('2024-01-15T12:00:00.000Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return relative time string', () => {
    const twoHoursAgo = new Date(NOW - 2 * 60 * 60 * 1000);
    expect(timeAgo(twoHoursAgo)).toBe('2h ago');
  });

  it('should handle minutes', () => {
    const thirtyMinutesAgo = new Date(NOW - 30 * 60 * 1000);
    expect(timeAgo(thirtyMinutesAgo)).toBe('30m ago');
  });
});
