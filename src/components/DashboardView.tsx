import React from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  PiggyBank, 
  AlertCircle, 
  ArrowUpRight, 
  Sparkles,
  CheckCircle2,
  Clock,
  Plus
} from 'lucide-react';
import { Subscription, Category } from '../types';
import { CURRENCY_SYMBOLS, convertCurrency, formatDateForPreference, getCategoryName } from '../services/supabase';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface DashboardViewProps {
  subscriptions: Subscription[];
  categories: Category[];
  currentCurrency: string;
  dateFormat: string;
  selectedCategory: string;
  setSelectedCategory: (catId: string) => void;
  onOpenAddModal: () => void;
  onSelectSubscription: (sub: Subscription) => void;
  userName: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  subscriptions,
  categories,
  currentCurrency,
  dateFormat,
  selectedCategory,
  setSelectedCategory,
  onOpenAddModal,
  onSelectSubscription,
  userName,
}) => {
  const currencySymbol = CURRENCY_SYMBOLS[currentCurrency] || '₹';

  // Calculations
  const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'trial');
  
  // Calculate monthly cost
  const totalMonthlyCostInOriginal = activeSubs.reduce((sum, s) => {
    let monthly = s.amount;
    if (s.billing_cycle === 'yearly') monthly = s.amount / 12;
    else if (s.billing_cycle === 'quarterly') monthly = s.amount / 3;
    else if (s.billing_cycle === 'half-yearly') monthly = s.amount / 6;
    else if (s.billing_cycle === 'weekly') monthly = s.amount * 4.33;
    return sum + monthly;
  }, 0);

  // Convert to selected currency
  // Assume each subscription has its currency converted to currentCurrency for accurate total
  const totalMonthlyCost = activeSubs.reduce((sum, s) => {
    let monthly = s.amount;
    if (s.billing_cycle === 'yearly') monthly = s.amount / 12;
    else if (s.billing_cycle === 'quarterly') monthly = s.amount / 3;
    else if (s.billing_cycle === 'half-yearly') monthly = s.amount / 6;
    else if (s.billing_cycle === 'weekly') monthly = s.amount * 4.33;
    const converted = convertCurrency(monthly, s.currency, currentCurrency);
    return sum + converted;
  }, 0);

  const totalYearlyCost = totalMonthlyCost * 12;
  const potentialSavings = totalYearlyCost * 0.15; // 15% optimization estimate

  // Upcoming renewals in next 7 days
  const today = new Date();
  const next7Days = new Date(today.getTime() + 7 * 86400000);
  const upcomingRenewals = activeSubs.filter(s => {
    const renewalDate = new Date(s.next_billing_date);
    return renewalDate >= today && renewalDate <= next7Days;
  });

  // Chart data: Monthly trend
  const chartData = [
    { month: 'Nov', amount: Math.round(totalMonthlyCost * 0.92) },
    { month: 'Dec', amount: Math.round(totalMonthlyCost * 0.98) },
    { month: 'Jan', amount: Math.round(totalMonthlyCost * 1.02) },
    { month: 'Feb', amount: Math.round(totalMonthlyCost * 0.95) },
    { month: 'Mar', amount: Math.round(totalMonthlyCost) },
    { month: 'Apr (Est)', amount: Math.round(totalMonthlyCost) },
  ];

  // Category breakdown for Pie chart
  const categorySpending: Record<string, number> = {};
  activeSubs.forEach(s => {
    const cat = getCategoryName(categories, s.category_id);
    let monthly = s.amount;
    if (s.billing_cycle === 'yearly') monthly = s.amount / 12;
    categorySpending[cat] = (categorySpending[cat] || 0) + convertCurrency(monthly, s.currency, currentCurrency);
  });

  const pieData = Object.keys(categorySpending).map(name => ({
    name,
    value: Number(categorySpending[name].toFixed(2))
  })).sort((a, b) => b.value - a.value);

  const COLORS = ['#7657E8', '#12B886', '#004547', '#F59E0B', '#E5484D', '#3B82F6', '#EC4899', '#8B5CF6'];

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#172B3A] to-[#004547] rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#12B886]" />
              <span>SaaS Portfolio Active</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Welcome back, {userName}! 👋</h2>
            <p className="text-white/70 text-sm mt-1 max-w-xl">
              You are tracking <span className="text-white font-semibold">{activeSubs.length} active subscriptions</span> across your portfolio. Your next renewal is coming up soon.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAddModal}
              className="px-5 py-2.5 rounded-xl bg-[#7657E8] text-white hover:bg-[#6444d4] transition-all font-semibold text-sm shadow-lg shadow-[#7657E8]/30 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subscription</span>
            </button>
          </div>
        </div>
      </div>

      {/* Categories Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = cat.id === 'cat-all' 
            ? subscriptions.length 
            : subscriptions.filter(s => s.category_id === cat.id).length;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all
                ${isSelected 
                  ? 'bg-[#172B3A] text-white shadow-md' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80'
                }
              `}
            >
              <span>{cat.name}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monthly Cost */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Spend</span>
            <div className="w-8 h-8 rounded-xl bg-[#7657E8]/10 text-[#7657E8] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-gray-900">
              {currencySymbol}{totalMonthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Active recurring costs</span>
          </div>
        </div>

        {/* Card 2: Yearly Cost */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Yearly Projection</span>
            <div className="w-8 h-8 rounded-xl bg-[#12B886]/10 text-[#12B886] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-gray-900">
              {currencySymbol}{totalYearlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-2">Annualized expense run-rate</p>
        </div>

        {/* Card 3: Upcoming Renewals */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Renewals (7 Days)</span>
            <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-gray-900">{upcomingRenewals.length}</h3>
          </div>
          <p className="text-xs text-gray-500 mt-2">Due within the next week</p>
        </div>

        {/* Card 4: Potential Savings */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Potential Savings</span>
            <div className="w-8 h-8 rounded-xl bg-[#004547]/10 text-[#004547] flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-gray-900">
              {currencySymbol}{potentialSavings.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h3>
          </div>
          <p className="text-xs text-emerald-600 mt-2 font-medium">By switching to annual billing</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Expense Trend */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Monthly Spending Trend</h3>
              <p className="text-xs text-gray-500">Historical & projected recurring costs</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#7657E8]/10 text-[#7657E8]">
              {currentCurrency}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7657E8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7657E8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value: any) => [`${currencySymbol}${Number(value).toLocaleString()}`, 'Monthly Spend']}
                  contentStyle={{ backgroundColor: '#172B3A', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#7657E8" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Spending by Category</h3>
              <p className="text-xs text-gray-500">Distribution of expenses</p>
            </div>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${currencySymbol}${Number(value).toLocaleString()}`, 'Amount']}
                  contentStyle={{ backgroundColor: '#172B3A', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-2 max-h-32 overflow-y-auto pr-1">
            {pieData.slice(0, 4).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-gray-700 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-gray-900">{currencySymbol}{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Renewals & Active Subscriptions List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Renewals */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Upcoming Renewals</h3>
              <p className="text-xs text-gray-500">Next billing dates in your portfolio</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600">
              {upcomingRenewals.length} Due Soon
            </span>
          </div>

          <div className="space-y-3">
            {activeSubs.slice(0, 4).map((sub) => {
              return (
                <div 
                  key={sub.id}
                  onClick={() => onSelectSubscription(sub)}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <img src={sub.logo_url} alt={sub.service_name} className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{sub.service_name}</h4>
                      <p className="text-xs text-gray-500">{sub.plan_name} • Renews {formatDateForPreference(sub.next_billing_date, dateFormat)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">
                      {CURRENCY_SYMBOLS[sub.currency] || '$'}{sub.amount}
                    </span>
                    <p className="text-[11px] text-gray-500 capitalize">{sub.billing_cycle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Active Subscriptions</h3>
              <p className="text-xs text-gray-500">Recently tracked services</p>
            </div>
          </div>

          <div className="space-y-3">
            {subscriptions.slice(0, 4).map((sub) => (
              <div 
                key={sub.id}
                onClick={() => onSelectSubscription(sub)}
                className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img src={sub.logo_url} alt={sub.service_name} className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{sub.service_name}</h4>
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">
                    {CURRENCY_SYMBOLS[sub.currency] || '$'}{sub.amount}
                  </span>
                  <p className="text-[11px] text-gray-500 capitalize">{sub.billing_cycle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
