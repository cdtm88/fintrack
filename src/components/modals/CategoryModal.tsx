import { useState } from 'react';
import { id } from '@instantdb/react';
import { db } from '../../db';
import { useUser } from '../../context/UserContext';
import type { Category } from '../../types';
import { CATEGORY_COLORS } from '../../types';
import { X } from 'lucide-react';
import EmojiPicker from '../EmojiPicker';

interface Props {
  category?: Category;
  existingCategories: Category[];
  onClose: () => void;
}

export default function CategoryModal({ category, existingCategories, onClose }: Props) {
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? '📦');
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [type, setType] = useState(category?.type ?? 'expense');
  const [showPicker, setShowPicker] = useState(false);
  const user = useUser();

  const isEdit = !!category;

  const isDuplicate = name.trim().length > 0 && existingCategories.some(
    c => c.name.toLowerCase() === name.trim().toLowerCase() && c.id !== category?.id
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || isDuplicate) return;

    const data = {
      name: name.trim(),
      icon,
      color,
      type,
      createdAt: category?.createdAt ?? Date.now(),
      userId: user.id,
    };

    if (isEdit) {
      db.transact(db.tx.categories[category.id].update(data));
    } else {
      db.transact(db.tx.categories[id()].update(data));
    }
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-primary">{isEdit ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name + emoji row */}
          <div className="flex gap-3 items-end">
            <div className="relative">
              <label className="label">Icon</label>
              <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="w-11 h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-xl hover:border-indigo-500 transition-colors"
              >
                {icon}
              </button>
              {showPicker && (
                <EmojiPicker
                  onSelect={setIcon}
                  onClose={() => setShowPicker(false)}
                />
              )}
            </div>
            <div className="flex-1">
              <label className="label">Category Name</label>
              <input
                className={`input ${isDuplicate ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                placeholder="e.g. Groceries"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
              {isDuplicate && (
                <p className="text-xs text-red-500 mt-1">A category with this name already exists.</p>
              )}
            </div>
          </div>

          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              {(['expense', 'income', 'both'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${type === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  onClick={() => setType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CATEGORY_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: color + '30', border: `2px solid ${color}` }}
            >
              {icon}
            </span>
            <div>
              <p className="text-sm font-medium text-primary">{name || 'Category Name'}</p>
              <p className="text-xs text-muted capitalize">{type}</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isDuplicate}>
              {isEdit ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
