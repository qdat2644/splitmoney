// formatters.js — Formatting utilities

/**
 * Format number as Vietnamese currency (VND)
 */
export function formatCurrency(amount, compact = false) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return '0đ';

  const sign = numeric < 0 ? '-' : '';
  const absolute = Math.abs(Math.round(numeric));

  if (compact && absolute >= 1_000_000) {
    const value = absolute / 1_000_000;
    return `${sign}${value.toLocaleString('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: value >= 10 ? 0 : 1,
    })}trđ`;
  }

  if (compact && absolute >= 1_000) {
    return `${sign}${Math.round(absolute / 1_000).toLocaleString('vi-VN')}kđ`;
  }

  return `${sign}${absolute.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}đ`;
}

/**
 * Format large raw integer amounts inside generated finance copy.
 * Leaves short counts and percentages alone.
 */
export function formatCurrencyText(text, compact = false) {
  if (text == null) return '';
  return String(text).replace(/(^|[^\d.,])(-?\d{4,})(?![\d.,%])/g, (match, prefix, value) => {
    return `${prefix}${formatCurrency(Number(value), compact)}`;
  });
}

/**
 * Format date string to Vietnamese locale
 */
export function formatDate(dateStr, options = {}) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  const defaults = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return date.toLocaleDateString('vi-VN', { ...defaults, ...options });
}

/**
 * Format date to relative (e.g., "2 ngày trước")
 */
export function formatRelativeDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`;
  return `${Math.floor(diffDays / 365)} năm trước`;
}

/**
 * Get initials from name (up to 2 chars)
 */
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLen = 30) {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

/**
 * Format today's date as YYYY-MM-DD for inputs
 */
export function todayStr() {
  return new Date().toISOString().split('T')[0];
}
