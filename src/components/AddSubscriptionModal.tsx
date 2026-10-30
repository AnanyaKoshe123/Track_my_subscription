import React, { useState } from 'react';
import { X, Search, Sparkles, Plus, Globe, Check, AlertCircle } from 'lucide-react';
import { Subscription, Category, BillingCycle, SubscriptionStatus } from '../types';
import { SUBSCRIPTION_TEMPLATES } from '../data/templates';
import { CATEGORY_SLUG_TO_UUID, UUID_TO_CATEGORY_SLUG, formatSupabaseError } from '../services/supabase';

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSubscription: (sub: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  categories: Category[];
}

export const AddSubscriptionModal: React.FC<AddSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onAddSubscription,
  categories,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  // Form state
  const [serviceName, setServiceName] = useState('');
  const [logoUrl, setLogoUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80');
  const [categoryId, setCategoryId] = useState(categories[1]?.id || 'cat-entertainment');
  const [planName, setPlanName] = useState('Standard Plan');
  const [amount, setAmount] = useState<number>(499);
  const [currency, setCurrency] = useState('INR');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextBillingDate, setNextBillingDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [notes, setNotes] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setServiceName(template.service_name);
    setLogoUrl(template.logo_url);
    const matchedCategory = categories.find(c => 
      c.id === template.category_id || 
      CATEGORY_SLUG_TO_UUID[c.id] === template.category_id ||
      UUID_TO_CATEGORY_SLUG[c.id] === template.category_id ||
      c.id === CATEGORY_SLUG_TO_UUID[template.category_id]
    );
    setCategoryId(matchedCategory ? matchedCategory.id : (categories[1]?.id || template.category_id));
    setAmount(template.indicative_price);
    setCurrency(template.supported_currencies[0] || 'INR');
    setBillingCycle(template.billing_options[0] || 'monthly');
    setWebsiteUrl(template.official_website);
    setActiveTab('custom'); // Switch to customizer form to confirm details
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onAddSubscription({
        template_id: selectedTemplate?.id,
        category_id: categoryId,
        service_name: serviceName,
        logo_url: logoUrl,
        plan_name: planName,
        amount: Number(amount),
        currency,
        billing_cycle: billingCycle,
        start_date: startDate,
        next_billing_date: nextBillingDate,
        status,
        payment_method_label: paymentMethod,
        reminder_preferences: [7, 3, 1],
        notes,
        website_url: websiteUrl,
      });
      onClose();
    } catch (error) {
      setSubmitError(formatSupabaseError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTemplates = SUBSCRIPTION_TEMPLATES.filter(t => 
    t.service_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-gray-100 my-8">
        {/* Header */}
        <div className="p-6 bg-[#172B3A] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7657E8] flex items-center justify-center shadow-md">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Add New Subscription</h3>
              <p className="text-xs text-white/60">Choose from catalog templates or add custom service</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        {submitError && (
          <div role="alert" className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            {submitError}
          </div>
        )}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-3">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'catalog' 
                ? 'border-[#7657E8] text-[#7657E8]' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Predefined Template Catalog
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'custom' 
                ? 'border-[#7657E8] text-[#7657E8]' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Custom Subscription Form
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'catalog' ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search popular Indian & global templates (Netflix, Spotify, ChatGPT, Cult.fit, AWS...)"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20 focus:border-[#7657E8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="p-4 rounded-2xl border border-gray-200 hover:border-[#7657E8] hover:shadow-md transition-all cursor-pointer flex items-center justify-between bg-white group"
                  >
                    <div className="flex items-center gap-3">
                      <img src={template.logo_url} alt={template.service_name} className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm group-hover:text-[#7657E8] transition-colors">{template.service_name}</h4>
                        <p className="text-xs text-gray-500">{template.supported_currencies[0]} {template.indicative_price}</p>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-gray-50 group-hover:bg-[#7657E8] group-hover:text-white text-gray-400 flex items-center justify-center transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Custom Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Service Name *</label>
                  <input
                    type="text"
                    required
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="e.g. Netflix, ChatGPT Plus"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20 focus:border-[#7657E8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20 focus:border-[#7657E8]"
                  >
                    {categories.filter(c => c.id !== 'cat-all').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Billing Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20 focus:border-[#7657E8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Currency *</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20 focus:border-[#7657E8]"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Billing Cycle *</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20 focus:border-[#7657E8]"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="weekly">Weekly</option>
                    <option value="half-yearly">Half-Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Plan Name</label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g. Premium 4K, Pro Plan"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20 focus:border-[#7657E8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Next Billing Date *</label>
                  <input
                    type="date"
                    required
                    value={nextBillingDate}
                    onChange={(e) => setNextBillingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20 focus:border-[#7657E8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Source / Card</label>
                  <input
                    type="text"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder="e.g. HDFC Credit Card ending 4829"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20 focus:border-[#7657E8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20 focus:border-[#7657E8]"
                  >
                    <option value="active">Active</option>
                    <option value="trial">Free Trial</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Description</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add any helpful reminders, login credentials reference, or sharing info..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20 focus:border-[#7657E8]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#7657E8] text-white hover:bg-[#6444d4] text-sm font-semibold transition-all shadow-md shadow-[#7657E8]/30"
                >
                  {isSubmitting ? 'Saving...' : 'Save Subscription'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
