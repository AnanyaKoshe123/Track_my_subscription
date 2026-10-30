import React, { useState } from 'react';
import { X, Calendar, CreditCard, ExternalLink, Trash2, Edit, Check, AlertCircle } from 'lucide-react';
import { Subscription, Category, BillingCycle, SubscriptionStatus } from '../types';
import { CURRENCY_SYMBOLS, formatDateForPreference, formatSupabaseError, getCategoryName } from '../services/supabase';

interface SubscriptionDetailModalProps {
  subscription: Subscription | null;
  onClose: () => void;
  onUpdateSubscription: (sub: Subscription) => Promise<void>;
  onDeleteSubscription: (id: string) => Promise<void>;
  categories: Category[];
  dateFormat: string;
}

export const SubscriptionDetailModal: React.FC<SubscriptionDetailModalProps> = ({
  subscription,
  onClose,
  onUpdateSubscription,
  onDeleteSubscription,
  categories,
  dateFormat,
}) => {
  if (!subscription) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [serviceName, setServiceName] = useState(subscription.service_name);
  const [planName, setPlanName] = useState(subscription.plan_name);
  const [amount, setAmount] = useState(subscription.amount);
  const [currency, setCurrency] = useState(subscription.currency);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(subscription.billing_cycle);
  const [nextBillingDate, setNextBillingDate] = useState(subscription.next_billing_date);
  const [status, setStatus] = useState<SubscriptionStatus>(subscription.status);
  const [paymentMethod, setPaymentMethod] = useState(subscription.payment_method_label || '');
  const [notes, setNotes] = useState(subscription.notes || '');
  const [operationError, setOperationError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperationError(null);
    try {
      await onUpdateSubscription({
        ...subscription,
        service_name: serviceName,
        plan_name: planName,
        amount: Number(amount),
        currency,
        billing_cycle: billingCycle,
        next_billing_date: nextBillingDate,
        status,
        payment_method_label: paymentMethod,
        notes,
        updated_at: new Date().toISOString(),
      });
      setIsEditing(false);
    } catch (error) {
      setOperationError(formatSupabaseError(error));
    }
  };

  const symbol = CURRENCY_SYMBOLS[subscription.currency] || '$';
  const categoryName = getCategoryName(categories, subscription.category_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 my-8">
        {/* Header */}
        <div className="p-6 bg-[#172B3A] text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={subscription.logo_url} alt={subscription.service_name} className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20" />
            <div>
              <h3 className="text-xl font-bold">{subscription.service_name}</h3>
              <p className="text-xs text-white/60">{categoryName} • {subscription.plan_name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {operationError && (
            <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {operationError}
            </div>
          )}
          {!isEditing ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-2xl">
                <div>
                  <span className="text-xs text-gray-500 font-medium">Amount</span>
                  <h4 className="text-xl font-bold text-gray-900 mt-0.5">{symbol}{subscription.amount} <span className="text-xs font-normal text-gray-500">({subscription.currency})</span></h4>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-medium">Billing Cycle</span>
                  <h4 className="text-sm font-bold text-gray-900 capitalize mt-1">{subscription.billing_cycle}</h4>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-medium">Status</span>
                  <div>
                    <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase mt-1 ${
                      subscription.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {subscription.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-500">Next Renewal Date</span>
                  <span className="font-semibold text-gray-900">{formatDateForPreference(subscription.next_billing_date, dateFormat)}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-500">Payment Source</span>
                  <span className="font-semibold text-gray-900">{subscription.payment_method_label || 'Not specified'}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-500">Start Date</span>
                  <span className="font-semibold text-gray-900">{subscription.start_date ? formatDateForPreference(subscription.start_date, dateFormat) : 'N/A'}</span>
                </div>
                {subscription.website_url && (
                  <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                    <span className="text-gray-500">Official Website</span>
                    <a href={subscription.website_url} target="_blank" rel="noreferrer" className="font-semibold text-[#7657E8] hover:underline flex items-center gap-1">
                      <span>Open site</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {subscription.notes && (
                <div className="bg-[#F0EDFF] p-4 rounded-2xl border border-[#7657E8]/20">
                  <h5 className="text-xs font-bold text-[#7657E8] uppercase tracking-wider mb-1">Notes & Credentials info</h5>
                  <p className="text-xs text-gray-700 leading-relaxed">{subscription.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  onClick={async () => {
                    setOperationError(null);
                    try {
                      await onDeleteSubscription(subscription.id);
                    } catch (error) {
                      setOperationError(formatSupabaseError(error));
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Subscription</span>
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#7657E8] text-white hover:bg-[#6444d4] text-xs font-semibold transition-colors shadow-md"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Details</span>
                </button>
              </div>
            </div>
          ) : (
            /* Edit Form */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Service Name</label>
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Plan Name</label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cycle</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Next Renewal Date</label>
                  <input
                    type="date"
                    value={nextBillingDate}
                    onChange={(e) => setNextBillingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-[#7657E8] text-white rounded-xl shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
