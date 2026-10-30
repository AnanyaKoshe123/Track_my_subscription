import React from 'react';
import { CreditCard, Sparkles, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';

interface WelcomeViewProps {
  onOpenLogin: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onOpenLogin }) => {
  return (
    <div className="min-h-screen bg-[#172B3A] text-white flex flex-col justify-between p-6 lg:p-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(118,87,232,0.2),transparent_60%)] pointer-events-none" />

      {/* Top Navbar */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7657E8] to-[#12B886] flex items-center justify-center shadow-lg">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Track My Subscription</span>
        </div>
        <button
          onClick={onOpenLogin}
          className="px-6 py-2.5 rounded-xl bg-[#7657E8] text-white hover:bg-[#6444d4] font-semibold text-sm transition-all shadow-lg shadow-[#7657E8]/30 cursor-pointer"
        >
          Login
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 my-auto py-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-[#12B886]" />
          <span>Next-Generation SaaS & Expense Hub</span>
        </div>
        <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-tight">
          Manage All Your Recurring Subscriptions in One Place
        </h1>
        <p className="text-gray-300 text-sm lg:text-base max-w-2xl mx-auto leading-relaxed">
          Monitor monthly and yearly expenses, receive proactive renewal alerts, parse invoices with AI, and optimize your portfolio effortlessly.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onOpenLogin}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#7657E8] text-white hover:bg-[#6444d4] font-bold text-base transition-all shadow-xl shadow-[#7657E8]/40 flex items-center justify-center gap-3 cursor-pointer"
          >
            <span>Login to Dashboard</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left max-w-3xl mx-auto">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <CheckCircle2 className="w-5 h-5 text-[#12B886] mb-2" />
            <h4 className="font-bold text-sm">Multi-Currency Support</h4>
            <p className="text-xs text-gray-400 mt-1">Convert and track across INR, USD, EUR, GBP, and AED seamlessly.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <Sparkles className="w-5 h-5 text-[#7657E8] mb-2" />
            <h4 className="font-bold text-sm">AI Assistant & OCR Parser</h4>
            <p className="text-xs text-gray-400 mt-1">Extract invoice details and get actionable spending insights.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <Shield className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="font-bold text-sm">Admin Access Approval</h4>
            <p className="text-xs text-gray-400 mt-1">Secure role-based authentication and membership requests.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 max-w-7xl mx-auto w-full text-center text-xs text-gray-500 pt-6 border-t border-white/10">
        &copy; {new Date().getFullYear()} Track My Subscription. All rights reserved.
      </div>
    </div>
  );
};
