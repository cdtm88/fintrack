import { useEffect } from 'react';
import { id } from '@instantdb/react';
import { db } from '../db';
import type { Category } from '../types';
import { DEFAULT_CATEGORIES } from '../types';

// In-memory guard for the current session (fast path)
const seededUsers = new Set<string>();

function seedKey(userId: string) {
  return `fintrack_seeded_${userId}`;
}

function isSeeded(userId: string): boolean {
  return seededUsers.has(userId) || !!localStorage.getItem(seedKey(userId));
}

function markSeeded(userId: string) {
  seededUsers.add(userId);
  localStorage.setItem(seedKey(userId), '1');
}

/** Call this after seeding categories outside the hook (e.g. during onboarding) */
export function markUserSeeded(userId: string) {
  markSeeded(userId);
}

export function useSeedCategories(categories: Category[], isLoading: boolean, userId: string) {
  useEffect(() => {
    if (isLoading || isSeeded(userId)) return;

    // Mark immediately so concurrent renders can't trigger a second seed
    markSeeded(userId);

    const existingNames = new Set(categories.map(c => c.name.toLowerCase()));
    const toAdd = DEFAULT_CATEGORIES.filter(c => !existingNames.has(c.name.toLowerCase()));

    if (toAdd.length === 0) return;

    const now = Date.now();
    db.transact(toAdd.map(cat => db.tx.categories[id()].update({ ...cat, createdAt: now, userId })));
  }, [isLoading, userId]);
}

/** Standalone function — call from Settings to restore any missing defaults */
export function restoreDefaultCategories(categories: Category[], userId: string) {
  const existingNames = new Set(categories.map(c => c.name.toLowerCase()));
  const toAdd = DEFAULT_CATEGORIES.filter(c => !existingNames.has(c.name.toLowerCase()));
  if (toAdd.length === 0) return 0;
  const now = Date.now();
  db.transact(toAdd.map(cat => db.tx.categories[id()].update({ ...cat, createdAt: now, userId })));
  return toAdd.length;
}
