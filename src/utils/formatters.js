// formatters.js — Formatting utilities

/**
 * Format number as Vietnamese currency (VND)
 */
export function formatCurrency(amount, compact = false) {
  if (compact && Math.abs(amount) >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  }
  if (compact && Math.abs(amount) >= 1_000) {
    return (amount / 1_000).toFixed(0) + 'k';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
