import React, { useState } from 'react';
import { Calendar, Bell, CheckCircle2, Clock, AlertCircle, ShieldAlert } from 'lucide-react';
import { Subscription, NotificationItem } from '../types';
import { CURRENCY_SYMBOLS, formatCurrency, formatDateForPreference } from '../services/supabase';

interface RenewalsViewProps {
  subscriptions: Subscription[];
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  currentCurrency: string;
  dateFormat: string;
  firstDayOfWeek: 'Sunday' | 'Monday';
  defaultReminderDays: number;
}

export const RenewalsView: React.FC<RenewalsViewProps> = ({
  subscriptions,
  notifications,
  onMarkNotificationRead,
  currentCurrency,
  dateFormat,
  firstDayOfWeek,
  defaultReminderDays,
}) => {
  const [reminderDays, setReminderDays] = useState(defaultReminderDays);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const today = new Date();
  const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'trial');

  // Categorize renewals
  const renewalsToday = activeSubs.filter(s => {
    const d = new Date(s.next_billing_date);
    return d.toDateString() === today.toDateString();
  });

  const next7DaysEnd = new Date(today.getTime() + 7 * 86400000);
  const renewalsNext7Days = activeSubs.filter(s => {
    const d = new Date(s.next_billing_date);
    return d > today && d <= next7DaysEnd;
  });

  const next30DaysEnd = new Date(today.getTime() + 30 * 86400000);
  const renewalsNext30Days = activeSubs.filter(s => {
    const d = new Date(s.next_billing_date);
    return d > next7DaysEnd && d <= next30DaysEnd;
  });

  // Calendar calculations
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekStartOffset = firstDayOfWeek === 'Monday' ? 1 : 0;
  const startDayOfWeek = (firstDayOfMonth.getDay() - weekStartOffset + 7) % 7;
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const orderedWeekDays = [...weekDays.slice(weekStartOffset), ...weekDays.slice(0, weekStartOffset)];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const getRenewalsForDate = (y: number, m: number, d: number) => {
    const mStr = String(m + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const dateStr = `${y}-${mStr}-${dStr}`;
    return activeSubs.filter(sub => sub.next_billing_date === dateStr);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Upcoming Renewals & Reminders</h2>
          <p className="text-xs text-gray-500 mt-1">Never get caught off guard by automatic subscription charges again</p>
        </div>
      </div>

      {/* Reminder Preference Settings Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7657E8]/10 text-[#7657E8] flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">Default Notification Schedule</h4>
            <p className="text-xs text-gray-500">Receive in-app alerts and notifications prior to billing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 font-medium">Alert me before:</span>
          <select 
            value={reminderDays}
            onChange={(e) => setReminderDays(Number(e.target.value))}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
          >
            <option value={1}>1 Day before</option>
            <option value={3}>3 Days before</option>
            <option value={7}>7 Days before</option>
            <option value={14}>14 Days before</option>
          </select>
        </div>
      </div>

      {/* Interactive Renewal Calendar */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7657E8]/10 text-[#7657E8] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Renewal Calendar</h3>
              <p className="text-xs text-gray-500">Visual calendar of your upcoming subscription billing dates</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-900">
              {monthNames[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentMonthDate(new Date(year, month - 1, 1))}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold"
              >
                &larr; Prev
              </button>
              <button
                onClick={() => setCurrentMonthDate(new Date(year, month + 1, 1))}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-semibold text-gray-400 uppercase">
          {orderedWeekDays.map(day => <div key={day}>{day}</div>)}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: startDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-24 bg-gray-50/40 rounded-xl border border-transparent" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayRenewals = getRenewalsForDate(year, month, dayNum);
            const isToday = 
              dayNum === today.getDate() && 
              month === today.getMonth() && 
              year === today.getFullYear();

            return (
              <div
                key={`day-${dayNum}`}
                className={`h-24 p-2 rounded-xl border flex flex-col justify-between transition-all overflow-y-auto custom-scrollbar ${
                  isToday 
                    ? 'border-[#7657E8] bg-[#F0EDFF]/30 ring-1 ring-[#7657E8]/20' 
                    : dayRenewals.length > 0 
                      ? 'border-amber-200 bg-amber-50/20' 
                      : 'border-gray-100 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isToday ? 'bg-[#7657E8] text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>
                    {dayNum}
                  </span>
                  {dayRenewals.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {dayRenewals.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1 mt-1">
                  {dayRenewals.map(sub => (
                    <div 
                      key={sub.id} 
                      className="bg-white px-2 py-1 rounded-lg border border-gray-200 text-[10px] shadow-xs flex items-center justify-between gap-1"
                    >
                      <span className="font-bold text-gray-900 truncate">{sub.service_name}</span>
                      <span className="text-gray-600 font-semibold shrink-0">{formatCurrency(sub.amount, sub.currency, currentCurrency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Renewal Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Due Today */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span>Due Today</span>
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
              {renewalsToday.length}
            </span>
          </div>

          <div className="space-y-3">
            {renewalsToday.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No renewals due today.</p>
            ) : (
              renewalsToday.map(sub => (
                <div key={sub.id} className="p-3.5 rounded-xl border border-red-100 bg-red-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={sub.logo_url} alt={sub.service_name} className="w-9 h-9 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{sub.service_name}</h4>
                      <p className="text-[11px] text-red-600 font-medium">Due Today!</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-900">{formatCurrency(sub.amount, sub.currency, currentCurrency)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Due in Next 7 Days */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Next 7 Days</span>
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
              {renewalsNext7Days.length}
            </span>
          </div>

          <div className="space-y-3">
            {renewalsNext7Days.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No renewals in the next 7 days.</p>
            ) : (
              renewalsNext7Days.map(sub => (
                <div key={sub.id} className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={sub.logo_url} alt={sub.service_name} className="w-9 h-9 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{sub.service_name}</h4>
                      <p className="text-[11px] text-gray-500">Renews {formatDateForPreference(sub.next_billing_date, dateFormat)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-900">{formatCurrency(sub.amount, sub.currency, currentCurrency)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Due in Next 30 Days */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7657E8]" />
              <span>Next 30 Days</span>
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#7657E8]/10 text-[#7657E8]">
              {renewalsNext30Days.length}
            </span>
          </div>

          <div className="space-y-3">
            {renewalsNext30Days.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No renewals in the next 30 days.</p>
            ) : (
              renewalsNext30Days.map(sub => (
                <div key={sub.id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={sub.logo_url} alt={sub.service_name} className="w-9 h-9 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{sub.service_name}</h4>
                      <p className="text-[11px] text-gray-500">Renews {formatDateForPreference(sub.next_billing_date, dateFormat)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-900">{formatCurrency(sub.amount, sub.currency, currentCurrency)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Notifications History */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4">In-App Notifications History</h3>
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div key={notif.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#7657E8]/10 text-[#7657E8] flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{notif.message}</p>
                  <span className="text-[11px] text-gray-400">Scheduled: {formatDateForPreference(notif.scheduled_at, dateFormat)}</span>
                </div>
              </div>
              <button
                onClick={() => onMarkNotificationRead(notif.id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
              >
                Mark as Read
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
