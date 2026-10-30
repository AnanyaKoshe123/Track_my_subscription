import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Grid, 
  List, 
  Download, 
  Trash2, 
  Edit, 
  ExternalLink, 
  CheckSquare, 
  Square,
  MoreVertical,
  Calendar,
  CreditCard
} from 'lucide-react';
import { Subscription, Category, UserPreferences } from '../types';
import { convertCurrency, formatCurrency, formatDateForPreference, CURRENCY_SYMBOLS, getCategoryName, matchesCategoryFilter } from '../services/supabase';

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  categories: Category[];
  currentCurrency: string;
  dateFormat: string;
  preferences: UserPreferences['subscription'];
  selectedCategory: string;
  setSelectedCategory: (catId: string) => void;
  onOpenAddModal: () => void;
  onSelectSubscription: (sub: Subscription) => void;
  onDeleteSubscription: (id: string) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<boolean>;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  subscriptions,
  categories,
  currentCurrency,
  dateFormat,
  preferences,
  selectedCategory,
  setSelectedCategory,
  onOpenAddModal,
  onSelectSubscription,
  onDeleteSubscription,
  onBulkDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCycle, setSelectedCycle] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filtering
  const filtered = subscriptions.filter(sub => {
    const matchesSearch = sub.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sub.plan_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (sub.notes && sub.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = matchesCategoryFilter(selectedCategory, sub.category_id);
    const matchesStatus = selectedStatus === 'all' || sub.status === selectedStatus;
    const matchesCycle = selectedCycle === 'all' || sub.billing_cycle === selectedCycle;
    const matchesVisibility = (preferences.show_cancelled || sub.status !== 'cancelled')
      && (preferences.show_trials || sub.status !== 'trial');
    return matchesSearch && matchesCat && matchesStatus && matchesCycle && matchesVisibility;
  }).sort((a, b) => {
    const direction = preferences.sort_order === 'ascending' ? 1 : -1;
    if (preferences.group_by_category) {
      const categoryComparison = getCategoryName(categories, a.category_id)
        .localeCompare(getCategoryName(categories, b.category_id));
      if (categoryComparison !== 0) return categoryComparison;
    }

    if (preferences.default_sort === 'name') {
      return direction * a.service_name.localeCompare(b.service_name);
    }
    if (preferences.default_sort === 'price') {
      return direction * (
        convertCurrency(a.amount, a.currency, currentCurrency)
        - convertCurrency(b.amount, b.currency, currentCurrency)
      );
    }
    return direction * a.next_billing_date.localeCompare(b.next_billing_date);
  });

  // Calculate total monthly spending for applicable (active or trial) subscriptions
  const activeSubs = subscriptions.filter(s =>
    s.status === 'active' || (preferences.show_trials && s.status === 'trial')
  );
  const totalMonthlySpending = activeSubs.reduce((sum, s) => {
    let monthly = s.amount;
    if (s.billing_cycle === 'yearly') monthly = s.amount / 12;
    else if (s.billing_cycle === 'quarterly') monthly = s.amount / 3;
    else if (s.billing_cycle === 'half-yearly') monthly = s.amount / 6;
    else if (s.billing_cycle === 'weekly') monthly = (s.amount * 52) / 12;
    return sum + convertCurrency(monthly, s.currency, currentCurrency);
  }, 0);
  const displayedSpending = preferences.default_expense_view === 'yearly'
    ? totalMonthlySpending * 12
    : totalMonthlySpending;
  const formattedSpending = formatCurrency(displayedSpending, currentCurrency, currentCurrency);

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(s => s.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const exportCSV = () => {
    const headers = ['Service Name,Plan,Amount,Currency,Billing Cycle,Next Renewal,Status,Payment Method\n'];
    const rows = filtered.map(s => 
      `"${s.service_name}","${s.plan_name}",${s.amount},"${s.currency}","${s.billing_cycle}","${s.next_billing_date}","${s.status}","${s.payment_method_label || ''}"`
    );
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscriptions_export.csv';
    a.click();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            My Subscriptions ({activeSubs.length})
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Total Subscription Spending: <span className="font-bold text-base text-[#7657E8]">{formattedSpending}</span> / {preferences.default_expense_view === 'yearly' ? 'year' : 'month'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all text-sm font-semibold shadow-sm"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#004547] text-white hover:bg-[#172B3A] transition-all text-sm font-semibold shadow-md shadow-[#004547]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by service name, plan, or notes..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20 focus:border-[#7657E8]"
            />
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
            {/* Category Filter */}
            <select
              value={selectedCategory === 'all' ? 'cat-all' : selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
            >
              <option value="cat-all">All Categories</option>
              {categories.filter(c => c.id !== 'cat-all').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Billing Cycle Filter */}
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
            >
              <option value="all">All Cycles</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="quarterly">Quarterly</option>
              <option value="weekly">Weekly</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#7657E8]' : 'text-gray-500'}`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#7657E8]' : 'text-gray-500'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar if selected */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-[#F0EDFF] px-4 py-2.5 rounded-xl border border-[#7657E8]/30">
            <span className="text-xs font-semibold text-[#7657E8]">
              {selectedIds.length} subscriptions selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  if (await onBulkDelete(selectedIds)) setSelectedIds([]);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#E5484D] text-white rounded-lg text-xs font-semibold hover:bg-[#d43b40] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subscriptions Grid / List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200/80 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No subscriptions found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search or filters, or add a new subscription to get started.
          </p>
          <button
            onClick={onOpenAddModal}
            className="mt-4 px-4 py-2 bg-[#7657E8] text-white rounded-xl text-xs font-semibold shadow-md"
          >
            Add Subscription
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sub) => {
            const isSelected = selectedIds.includes(sub.id);
            const symbol = CURRENCY_SYMBOLS[sub.currency] || '$';
            const catName = getCategoryName(categories, sub.category_id);

            return (
              <div
                key={sub.id}
                onClick={() => onSelectSubscription(sub)}
                className={`
                  bg-white rounded-2xl p-5 border transition-all cursor-pointer relative hover:shadow-md
                  ${isSelected ? 'border-[#7657E8] ring-2 ring-[#7657E8]/20 bg-[#F0EDFF]/30' : 'border-gray-200/80'}
                `}
              >
                {/* Select Checkbox */}
                <button
                  onClick={(e) => toggleSelectOne(sub.id, e)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-[#7657E8]"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-[#7657E8]" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-300" />
                  )}
                </button>

                <div className="flex items-start gap-3.5 mb-4">
                  <img src={sub.logo_url} alt={sub.service_name} className="w-12 h-12 rounded-2xl object-cover border border-gray-200 shadow-sm" />
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">{sub.service_name}</h4>
                    <span className="inline-block text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md mt-0.5">
                      {catName}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">{formatCurrency(sub.amount, sub.currency, currentCurrency)}</span>
                    <span className="text-xs text-gray-500 ml-1">/ {sub.billing_cycle}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' :
                    sub.status === 'trial' ? 'bg-amber-500/10 text-amber-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {sub.status}
                  </span>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Renews {formatDateForPreference(sub.next_billing_date, dateFormat)}</span>
                  </div>
                  <span className="font-medium text-gray-700 truncate max-w-[100px]">{sub.payment_method_label || 'Card'}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4 w-10">
                  <input 
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded text-[#7657E8] focus:ring-[#7657E8]"
                  />
                </th>
                <th className="p-4">Service</th>
                <th className="p-4">Category</th>
                <th className="p-4">Plan & Amount</th>
                <th className="p-4">Billing Cycle</th>
                <th className="p-4">Next Renewal</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filtered.map((sub) => {
                const isSelected = selectedIds.includes(sub.id);
                const symbol = CURRENCY_SYMBOLS[sub.currency] || '$';
                const catName = getCategoryName(categories, sub.category_id);

                return (
                  <tr 
                    key={sub.id} 
                    onClick={() => onSelectSubscription(sub)}
                    className={`hover:bg-gray-50/80 cursor-pointer transition-colors ${isSelected ? 'bg-[#F0EDFF]/30' : ''}`}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelectOne(sub.id, e as any)}
                        className="rounded text-[#7657E8] focus:ring-[#7657E8]"
                      />
                    </td>
                    <td className="p-4 flex items-center gap-3">
                      <img src={sub.logo_url} alt={sub.service_name} className="w-9 h-9 rounded-xl object-cover border border-gray-200" />
                      <div>
                        <h4 className="font-bold text-gray-900">{sub.service_name}</h4>
                        <p className="text-xs text-gray-500">{sub.payment_method_label || 'Default payment'}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                        {catName}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-gray-900">{formatCurrency(sub.amount, sub.currency, currentCurrency)}</span>
                      <span className="text-xs text-gray-500 ml-1">({sub.billing_cycle})</span>
                    </td>
                    <td className="p-4 text-xs font-medium text-gray-600 capitalize">
                      {sub.billing_cycle}
                    </td>
                    <td className="p-4 text-xs text-gray-600 font-medium">
                      {formatDateForPreference(sub.next_billing_date, dateFormat)}
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectSubscription(sub)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { void onDeleteSubscription(sub.id).catch(() => undefined); }}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
