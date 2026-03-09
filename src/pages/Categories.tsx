import { useState } from 'react';
import { db } from '../db';
import { useUser } from '../context/UserContext';
import type { Category, Transaction } from '../types';
import CategoryModal from '../components/modals/CategoryModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';

export default function Categories() {
  const [showModal, setShowModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | undefined>();
  const [deleteCategory, setDeleteCategory] = useState<Category | undefined>();
  const [activeTab, setActiveTab] = useState<'all' | 'expense' | 'income'>('all');

  const user = useUser();

  const { data, isLoading } = db.useQuery({
    categories: { $: { where: { userId: user.id } } },
    transactions: { $: { where: { userId: user.id } }, category: {} },
  });

  const categories = (data?.categories ?? []) as Category[];
  const transactions = (data?.transactions ?? []) as Transaction[];

  function handleDelete(c: Category) {
    db.transact(db.tx.categories[c.id].delete());
    setDeleteCategory(undefined);
  }

  function getCategoryStats(cat: Category) {
    const txns = transactions.filter(t => t.category?.id === cat.id);
    const total = txns.reduce((s, t) => t.type === 'expense' ? s + t.amount : s - t.amount, 0);
    return { count: txns.length, total };
  }

  const filtered = categories
    .filter(c => activeTab === 'all' || c.type === activeTab || c.type === 'both')
    .sort((a, b) => a.name.localeCompare(b.name));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5 whitespace-nowrap shrink-0" onClick={() => { setEditCategory(undefined); setShowModal(true); }}>
          <Plus size={16} /> <span className="hidden sm:inline">New </span>Category
        </button>
      </div>

      {/* Tab filter */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg w-fit">
        {(['all', 'expense', 'income'] as const).map(tab => (
          <button
            key={tab}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-muted hover:text-primary'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Tag size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h2 className="text-primary font-medium mb-1">
            {categories.length === 0 ? 'No categories yet' : `No ${activeTab} categories`}
          </h2>
          <p className="text-muted text-sm mb-4">
            {categories.length === 0
              ? 'Create categories to organise your transactions'
              : `Add a ${activeTab} category to get started`}
          </p>
          <button className="btn-primary" onClick={() => { setEditCategory(undefined); setShowModal(true); }}>
            Create Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(cat => {
            const stats = getCategoryStats(cat);
            return (
              <div key={cat.id} className="card group hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: cat.color + '20', border: `2px solid ${cat.color}` }}
                    >
                      {cat.icon}
                    </span>
                    <div>
                      <h3 className="text-primary font-medium text-sm">{cat.name}</h3>
                      <span
                        className="inline-block text-xs px-2 py-0.5 rounded-full mt-0.5 capitalize font-medium"
                        style={{ backgroundColor: cat.color + '20', color: cat.color }}
                      >
                        {cat.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button className="btn-ghost p-1.5" onClick={() => { setEditCategory(cat); setShowModal(true); }}>
                      <Pencil size={13} />
                    </button>
                    <button className="btn-ghost p-1.5 hover:text-red-500" onClick={() => setDeleteCategory(cat)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-muted text-xs">{stats.count} transaction{stats.count !== 1 ? 's' : ''}</span>
                  {stats.count > 0 && (
                    <span className="text-secondary text-xs font-medium">{stats.total.toFixed(2)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <CategoryModal
          category={editCategory}
          existingCategories={categories}
          onClose={() => { setShowModal(false); setEditCategory(undefined); }}
        />
      )}
      {deleteCategory && (
        <ConfirmModal
          title="Delete Category"
          message={`Delete "${deleteCategory.name}"? Transactions will be uncategorised but not deleted.`}
          onConfirm={() => handleDelete(deleteCategory)}
          onCancel={() => setDeleteCategory(undefined)}
        />
      )}
    </div>
  );
}
