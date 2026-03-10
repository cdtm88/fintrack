import { init, i } from '@instantdb/react';

const schema = i.schema({
  entities: {
    accounts: i.entity({
      name: i.string(),
      type: i.string(),
      currency: i.string(),
      initialBalance: i.number(),
      color: i.string(),
      createdAt: i.number(),
      userId: i.string(),
    }),
    categories: i.entity({
      name: i.string(),
      icon: i.string(),
      color: i.string(),
      type: i.string(),
      createdAt: i.number(),
      userId: i.string(),
    }),
    transactions: i.entity({
      amount: i.number(),
      type: i.string(),
      description: i.string(),
      date: i.number(),
      notes: i.string().optional(),
      isRecurring: i.boolean(),
      recurringInterval: i.string().optional(),
      transferId: i.string().optional(),
      createdAt: i.number(),
      userId: i.string(),
    }),
    budgets: i.entity({
      categoryId: i.string(),
      amount: i.number(),
      createdAt: i.number(),
      userId: i.string(),
    }),
    holdings: i.entity({
      symbol: i.string(),
      name: i.string(),
      assetType: i.string(),
      quantity: i.number(),
      costBasis: i.number(),
      currency: i.string(),
      priceId: i.string().optional(),
      manualPrice: i.number().optional(),
      lastKnownPrice: i.number().optional(),
      createdAt: i.number(),
      userId: i.string(),
    }),
  },
  links: {
    transactionAccount: {
      forward: { on: 'transactions', has: 'one', label: 'account' },
      reverse: { on: 'accounts', has: 'many', label: 'transactions' },
    },
    transactionCategory: {
      forward: { on: 'transactions', has: 'one', label: 'category' },
      reverse: { on: 'categories', has: 'many', label: 'transactions' },
    },
    holdingAccount: {
      forward: { on: 'holdings', has: 'one', label: 'account' },
      reverse: { on: 'accounts', has: 'many', label: 'holdings' },
    },
  },
});

export type AppSchema = typeof schema;

const APP_ID = import.meta.env.VITE_INSTANT_APP_ID;
export const db = init<AppSchema>({ appId: APP_ID || 'MISSING_APP_ID', schema });
