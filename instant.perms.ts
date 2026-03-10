import type { InstantRules } from '@instantdb/react';
import type { AppSchema } from './src/db';

const rules = {
  /**
   * Default: deny all access unless explicitly allowed below.
   */
  $default: {
    allow: {
      $default: 'false',
    },
  },

  accounts: {
    bind: {
      isOwner: 'auth.id != null && auth.id == data.userId',
      isStillOwner: 'auth.id != null && auth.id == newData.userId',
    },
    allow: {
      view: 'isOwner',
      create: 'isStillOwner',
      update: 'isOwner && isStillOwner',
      delete: 'isOwner',
    },
  },

  categories: {
    bind: {
      isOwner: 'auth.id != null && auth.id == data.userId',
      isStillOwner: 'auth.id != null && auth.id == newData.userId',
    },
    allow: {
      view: 'isOwner',
      create: 'isStillOwner',
      update: 'isOwner && isStillOwner',
      delete: 'isOwner',
    },
  },

  transactions: {
    bind: {
      isOwner: 'auth.id != null && auth.id == data.userId',
      isStillOwner: 'auth.id != null && auth.id == newData.userId',
    },
    allow: {
      view: 'isOwner',
      create: 'isStillOwner',
      update: 'isOwner && isStillOwner',
      delete: 'isOwner',
    },
  },

  budgets: {
    bind: {
      isOwner: 'auth.id != null && auth.id == data.userId',
      isStillOwner: 'auth.id != null && auth.id == newData.userId',
    },
    allow: {
      view: 'isOwner',
      create: 'isStillOwner',
      update: 'isOwner && isStillOwner',
      delete: 'isOwner',
    },
  },

  holdings: {
    bind: {
      isOwner: 'auth.id != null && auth.id == data.userId',
      isStillOwner: 'auth.id != null && auth.id == newData.userId',
    },
    allow: {
      view: 'isOwner',
      create: 'isStillOwner',
      update: 'isOwner && isStillOwner',
      delete: 'isOwner',
    },
  },
} satisfies InstantRules<AppSchema>;

export default rules;
