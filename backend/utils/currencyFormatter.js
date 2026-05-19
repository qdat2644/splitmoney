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

export function formatCurrencyText(text, compact = false) {
  if (text == null) return '';
  return String(text).replace(/(^|[^\d.,])(-?\d{4,})(?![\d.,%])/g, (match, prefix, value) => {
    return `${prefix}${formatCurrency(Number(value), compact)}`;
  });
}
