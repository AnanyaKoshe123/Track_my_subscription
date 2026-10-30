import React, { useState } from 'react';
import { Check, Zap, Crown, Shield, Sparkles, X } from 'lucide-react';
import { db, formatCurrency, formatSupabaseError } from '../services/supabase';

interface PricingViewProps {
  currentCurrency: string;
}

export const PricingView: React.FC<PricingViewProps> = ({ currentCurrency }) => {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const activePlan = 'Free';
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isStartingGoogleSignIn, setIsStartingGoogleSignIn] = useState(false);
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);
  const [enterpriseSubmitted, setEnterpriseSubmitted] = useState(false);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      priceMonthly: 0,
      priceYearly: 0,
      description: 'Essential subscription tracking for casual users getting started.',
      features: [
        'Track up to 10 subscriptions',
        'Basic renewal reminders',
        'Standard multi-currency support',
        'Manual subscription entry',
        'Community support'
      ],
      popular: false,
      badge: 'Free'
    },
    {
      id: 'pro',
      name: 'Pro SaaS',
      priceMonthly: 9,
      priceYearly: 90,
      description: 'Advanced automation, AI assistant, and invoice parsing for power users.',
      features: [
        'Unlimited active subscriptions',
        'AI Subscription Assistant & Insights',
        'AI Invoice & Receipt OCR Parser',
        'Advanced Spending Analytics & Reports',
        'Custom categories & multi-currency conversion',
        'Chrome Extension auto-sync'
      ],
      popular: true,
      badge: 'Most Popular'
    },
    {
      id: 'enterprise',
      name: 'Enterprise Team',
      priceMonthly: 29,
      priceYearly: 290,
      description: 'For power teams and businesses managing shared SaaS portfolios.',
      features: [
        'Everything in Pro Tier',
        'Multi-user workspace & shared access',
        'Webhook API endpoints & event logs',
        'Dedicated account manager',
        'Priority 24/7 support & security audit logs'
      ],
      popular: false,
      badge: 'Team Hub'
    }
  ];

  const handleSelectPlan = async (planName: string) => {
    if (planName === 'Free') {
      setAuthError(null);
      setIsStartingGoogleSignIn(true);
      try {
        await db.signInWithGoogle();
      } catch (error) {
        setAuthError(formatSupabaseError(error));
        setIsStartingGoogleSignIn(false);
      }
    } else if (planName === 'Pro SaaS') {
      setSuccessMessage('Successfully upgraded to Pro SaaS plan! All premium features are now unlocked.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } else if (planName === 'Enterprise Team') {
      setIsEnterpriseModalOpen(true);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#7657E8]/10 text-[#7657E8] text-xs font-bold">
          <Crown className="w-4 h-4" />
          <span>Flexible Subscription Plans</span>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Invest in Complete Financial Clarity</h2>
        <p className="text-sm text-gray-500">
          Choose the plan that fits your personal or team SaaS tracking needs. Switch or cancel anytime.
        </p>

        {successMessage && (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm animate-bounce">
            <Check className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        )}
        {authError && (
          <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-sm font-medium">
            {authError}
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 pt-4">
          <span className={`text-xs font-semibold ${billingInterval === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>Monthly Billing</span>
          <button
            onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'yearly' : 'monthly')}
            className="w-12 h-6 bg-[#7657E8] rounded-full p-1 relative transition-colors cursor-pointer"
          >
            <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${billingInterval === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <span className={`text-xs font-semibold flex items-center gap-1 ${billingInterval === 'yearly' ? 'text-gray-900' : 'text-gray-400'}`}>
            <span>Yearly Billing</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Save 20%</span>
          </span>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        {plans.map((plan, idx) => {
          const rawPrice = billingInterval === 'monthly' ? plan.priceMonthly : plan.priceYearly;
          const displayPrice = rawPrice === 0 ? '0' : formatCurrency(rawPrice, 'USD', currentCurrency);
          const isCurrent = activePlan === plan.name;

          return (
            <div
              key={idx}
              className={`bg-white rounded-3xl p-8 border relative flex flex-col justify-between transition-all shadow-sm hover:shadow-xl ${
                plan.popular ? 'border-[#7657E8] ring-2 ring-[#7657E8]/20 shadow-lg scale-105 z-10' : 'border-gray-200/80'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#7657E8] text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-md">
                  {plan.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  {isCurrent ? (
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Active
                    </span>
                  ) : (
                    <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-6 leading-relaxed">{plan.description}</p>

                <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-gray-100">
                  <span className="text-4xl font-extrabold text-gray-900">{displayPrice}</span>
                  <span className="text-xs text-gray-500 font-medium">/ {billingInterval === 'monthly' ? 'month' : 'year'}</span>
                </div>

                <div className="space-y-3 mb-8">
                  {plan.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 text-xs text-gray-700">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => void handleSelectPlan(plan.name)}
                disabled={isStartingGoogleSignIn}
                className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all shadow-md ${
                  isCurrent
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-emerald-600/20'
                    : plan.popular
                    ? 'bg-[#7657E8] text-white hover:bg-[#6444d4] shadow-[#7657E8]/30 cursor-pointer'
                    : 'bg-[#172B3A] text-white hover:bg-[#004547] cursor-pointer'
                }`}
              >
                {isStartingGoogleSignIn && plan.name === 'Free'
                  ? 'Connecting to Google...'
                  : plan.name === 'Free'
                    ? 'Free'
                    : isCurrent
                      ? 'Current Plan'
                      : plan.name === 'Pro SaaS'
                        ? 'Upgrade to Pro'
                        : 'Contact Enterprise'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Enterprise Contact Modal */}
      {isEnterpriseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative border border-gray-100">
            <button 
              onClick={() => { setIsEnterpriseModalOpen(false); setEnterpriseSubmitted(false); }}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>

            {enterpriseSubmitted ? (
              <div className="text-center space-y-4 py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Enterprise Inquiry Received!</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Our enterprise solutions team has received your request and will contact you via email within 24 hours.
                </p>
                <button
                  onClick={() => { setIsEnterpriseModalOpen(false); setEnterpriseSubmitted(false); }}
                  className="w-full py-3 bg-[#7657E8] text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setEnterpriseSubmitted(true); }} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Contact Enterprise Team</h3>
                  <p className="text-xs text-gray-500 mt-1">Get custom workspace setup and priority support.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email</label>
                  <input type="email" required placeholder="you@company.com" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name & Team Size</label>
                  <input type="text" required placeholder="Acme Corp (15 members)" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
                </div>

                <button type="submit" className="w-full py-3 bg-[#7657E8] text-white rounded-xl text-xs font-semibold shadow-md hover:bg-[#6444d4]">
                  Submit Enterprise Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
