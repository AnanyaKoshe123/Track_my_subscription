import React, { useState } from 'react';
import { Tags, Plus, Trash2 } from 'lucide-react';
import { Category } from '../types';

interface CategoriesViewProps {
  categories: Category[];
  onAddCategory: (name: string, color: string) => Promise<boolean>;
  onDeleteCategory: (id: string) => Promise<boolean>;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  onAddCategory,
  onDeleteCategory,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#7657E8');

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Subscription Categories</h2>
        <p className="text-xs text-gray-500 mt-1">Organize your recurring expenses with custom tags and color coding</p>
      </div>

      {/* Add Category Form */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Category Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Developer Tools, Gaming"
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Theme Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-20 h-10 rounded-xl border border-gray-200 p-1 bg-gray-50 cursor-pointer"
          />
        </div>
        <button
          onClick={async () => {
            if (name.trim()) {
              if (await onAddCategory(name, color)) setName('');
            }
          }}
          className="px-6 py-2.5 bg-[#7657E8] text-white rounded-xl text-sm font-semibold shadow-md hover:bg-[#6444d4]"
        >
          Add Category
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
              <h4 className="font-bold text-gray-900 text-sm">{cat.name}</h4>
            </div>
            {cat.id !== 'cat-all' && (
              <button
                onClick={() => { void onDeleteCategory(cat.id); }}
                className="text-gray-400 hover:text-red-500 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
