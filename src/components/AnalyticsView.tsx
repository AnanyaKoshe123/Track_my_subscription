import React from 'react';
import { PieChart as PieIcon, TrendingUp, Download, Printer, PiggyBank, Award } from 'lucide-react';
import { Subscription, Category } from '../types';
import { CURRENCY_SYMBOLS, convertCurrency, getCategoryName } from '../services/supabase';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from 'recharts';

interface AnalyticsViewProps {
  subscriptions: Subscription[];
  categories: Category[];
  currentCurrency: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  subscriptions,
  categories,
  currentCurrency,
}) => {
  const symbol = CURRENCY_SYMBOLS[currentCurrency] || '₹';
  const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'trial');

  // Calculate monthly costs per service
  const serviceCosts = activeSubs.map(s => {
    let monthly = s.amount;
    if (s.billing_cycle === 'yearly') monthly = s.amount / 12;
    else if (s.billing_cycle === 'quarterly') monthly = s.amount / 3;
    else if (s.billing_cycle === 'weekly') monthly = s.amount * 4.33;
    const converted = convertCurrency(monthly, s.currency, currentCurrency);
    return {
      name: s.service_name,
      monthly: Number(converted.toFixed(2)),
      yearly: Number((converted * 12).toFixed(2)),
      category: getCategoryName(categories, s.category_id)
    };
  }).sort((a, b) => b.monthly - a.monthly);

  const totalMonthly = serviceCosts.reduce((acc, curr) => acc + curr.monthly, 0);
  const totalYearly = totalMonthly * 12;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Spending Analytics & Reports</h2>
          <p className="text-xs text-gray-500 mt-1">Deep-dive into your recurring SaaS expenses and optimization potential</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all text-sm font-semibold shadow-sm"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase">Total Monthly Run-Rate</span>
          <h3 className="text-3xl font-bold text-gray-900 mt-2">{symbol}{totalMonthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs text-emerald-600 font-medium mt-2">Normalized across all billing cycles</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase">Total Yearly Run-Rate</span>
          <h3 className="text-3xl font-bold text-gray-900 mt-2">{symbol}{totalYearly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs text-gray-500 mt-2">Projected 12-month commitment</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase">Optimization Target</span>
          <h3 className="text-3xl font-bold text-[#7657E8] mt-2">{symbol}{(totalYearly * 0.15).toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
          <p className="text-xs text-gray-500 mt-2">Estimated savings via annual plans</p>
        </div>
      </div>

      {/* Bar Chart: Highest Cost Services */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-6">Subscription Expenses by Service (Monthly Equivalent)</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serviceCosts} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} fontSize={11} stroke="#64748B" />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip 
                formatter={(value: any) => [`${symbol}${Number(value).toLocaleString()}`, 'Monthly Cost']}
                contentStyle={{ backgroundColor: '#172B3A', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Bar dataKey="monthly" fill="#7657E8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Service Cost Table */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4">Complete Expense Breakdown</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <th className="p-3">Service Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Monthly Equivalent</th>
              <th className="p-3">Annual Projection</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {serviceCosts.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="p-3 font-bold text-gray-900">{item.name}</td>
                <td className="p-3 text-xs text-gray-600">
                  <span className="bg-gray-100 px-2.5 py-1 rounded-md font-medium">{item.category}</span>
                </td>
                <td className="p-3 font-semibold text-gray-900">{symbol}{item.monthly.toLocaleString()}</td>
                <td className="p-3 font-semibold text-gray-900">{symbol}{item.yearly.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
