import React from 'react';
import { Search, Bell, Plus, Sparkles, Menu, Globe2 } from 'lucide-react';
import { CURRENCY_SYMBOLS } from '../services/supabase';

interface TopNavbarProps {
  currentCurrency: string;
  setCurrentCurrency: (currency: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenAddModal: () => void;
  onToggleAiPanel: () => void;
  onToggleMobileSidebar: () => void;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentCurrency,
  setCurrentCurrency,
  searchQuery,
  setSearchQuery,
  onOpenAddModal,
  onToggleAiPanel,
  onToggleMobileSidebar,
  unreadNotificationsCount,
  onOpenNotifications,
}) => {
  const currencies = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/80 px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Left: Mobile menu toggle & Global search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Toggle mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subscriptions, services, or plans..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20 focus:border-[#7657E8] transition-all"
          />
        </div>
      </div>

      {/* Right: Currency Selector, Notification, Add Sub, AI Assistant Toggle */}
      <div className="flex items-center gap-3">
        {/* Currency Selector */}
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
          <Globe2 className="w-4 h-4 text-gray-500" />
          <select
            value={currentCurrency}
            onChange={(e) => setCurrentCurrency(e.target.value)}
            className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer"
          >
            {currencies.map((curr) => (
              <option key={curr} value={curr}>
                {curr} ({CURRENCY_SYMBOLS[curr]})
              </option>
            ))}
          </select>
        </div>

        {/* Notifications Button */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E5484D] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* AI Assistant Toggle Button */}
        <button
          onClick={onToggleAiPanel}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F0EDFF] text-[#7657E8] hover:bg-[#7657E8] hover:text-white transition-all text-sm font-semibold shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Assistant</span>
        </button>

        {/* Add Subscription Button */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#004547] text-white hover:bg-[#172B3A] transition-all text-sm font-semibold shadow-md shadow-[#004547]/20"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Subscription</span>
        </button>
      </div>
    </header>
  );
};
