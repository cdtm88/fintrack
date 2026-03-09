import { CURRENCIES } from '../types';

export function formatCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const currency = CURRENCIES.find(c => c.code === currencyCode);
    const symbol = currency?.symbol ?? currencyCode;
    return `${symbol}${Math.abs(amount).toFixed(2)}`;
  }
}

export function formatCompact(amount: number, currencyCode: string): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return formatCurrency(amount / 1_000_000, currencyCode).replace(/(\.\d{2})$/, '') + 'M';
  }
  if (abs >= 1_000) {
    return formatCurrency(amount / 1_000, currencyCode).replace(/(\.\d{2})$/, '') + 'K';
  }
  return formatCurrency(amount, currencyCode);
}
