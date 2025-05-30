export function formatNumber(value) {
  if (value === 0) return '';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatNumberWithUnit(value, unit) {
  return `${formatNumber(value)} ${unit}`;
}
