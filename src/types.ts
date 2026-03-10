export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
  currency: string;
  initialBalance: number;
  color: string;
  createdAt: number;
  transactions?: Transaction[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
  createdAt: number;
  transactions?: Transaction[];
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: number;
  notes?: string;
  isRecurring: boolean;
  recurringInterval?: 'weekly' | 'monthly' | 'yearly';
  transferId?: string;
  createdAt: number;
  account?: Account;
  category?: Category;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  createdAt: number;
}

export interface Holding {
  id: string;
  symbol: string;          // Display ticker: AAPL, BTC, VUSA
  name: string;            // Full name: Apple Inc., Bitcoin
  assetType: 'stock' | 'etf' | 'crypto' | 'fund' | 'other';
  quantity: number;
  costBasis: number;       // Average cost per unit in the holding's currency
  currency: string;        // Native currency of the asset (USD for US stocks, etc.)
  priceId?: string;        // CoinGecko ID for crypto (e.g. 'bitcoin'); alt Yahoo symbol if needed
  manualPrice?: number;    // Optional override — used if live fetch fails
  lastKnownPrice?: number; // Auto-saved last live price — fallback when API is down
  createdAt: number;
  userId: string;
  account?: Account;
}

export const ASSET_TYPES = [
  { value: 'stock',  label: 'Stock' },
  { value: 'etf',    label: 'ETF' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'fund',   label: 'Fund' },
  { value: 'other',  label: 'Other' },
] as const;

export const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
] as const;

export const CURRENCIES = [
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
] as const;

export const CATEGORY_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#64748b', '#78716c', '#92400e',
] as const;

export const ACCOUNT_COLORS = [
  '#6366f1', '#8b5cf6', '#3b82f6', '#14b8a6', '#22c55e',
  '#f97316', '#ec4899', '#ef4444', '#eab308', '#06b6d4',
] as const;

export const DEFAULT_CATEGORIES: Array<{
  name: string; icon: string; color: string; type: 'income' | 'expense' | 'both';
}> = [
  // Expense
  { name: 'Housing',         icon: '🏠', color: '#6366f1', type: 'expense' },
  { name: 'Groceries',       icon: '🛒', color: '#22c55e', type: 'expense' },
  { name: 'Dining Out',      icon: '🍔', color: '#f97316', type: 'expense' },
  { name: 'Transport',       icon: '🚗', color: '#3b82f6', type: 'expense' },
  { name: 'Utilities',       icon: '💡', color: '#eab308', type: 'expense' },
  { name: 'Phone & Internet',icon: '📱', color: '#06b6d4', type: 'expense' },
  { name: 'Entertainment',   icon: '🎬', color: '#8b5cf6', type: 'expense' },
  { name: 'Shopping',        icon: '🛍️', color: '#ec4899', type: 'expense' },
  { name: 'Health',          icon: '💊', color: '#ef4444', type: 'expense' },
  { name: 'Travel',          icon: '✈️', color: '#0ea5e9', type: 'expense' },
  // Income
  { name: 'Salary',          icon: '💼', color: '#22c55e', type: 'income' },
  { name: 'Freelance',       icon: '💻', color: '#10b981', type: 'income' },
  { name: 'Investments',     icon: '📈', color: '#6366f1', type: 'income' },
  // Both
  { name: 'Transfer',        icon: '🔄', color: '#94a3b8', type: 'both'    },
];
