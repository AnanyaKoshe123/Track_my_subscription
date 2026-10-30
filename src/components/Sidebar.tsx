import React from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  Calendar, 
  PieChart, 
  Tags, 
  FileText, 
  Sparkles, 
  Plug, 
  Chrome, 
  Bell, 
  Settings, 
  ShieldAlert, 
  LogOut,
  HelpCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Crown
} from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: UserProfile;
  onLogout: () => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onLogout,
  isOpenMobile,
  setIsOpenMobile,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'subscriptions', label: 'My Subscriptions', icon: CreditCard },
    { id: 'renewals', label: 'Upcoming Renewals', icon: Calendar },
    { id: 'analytics', label: 'Spending Analytics', icon: PieChart },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'invoices', label: 'Invoice Parser', icon: FileText },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles },
    { id: 'pricing', label: 'Pricing & Plans', icon: Crown },
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'chrome-ext', label: 'Chrome Extension', icon: Chrome },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(user.role === 'admin' ? [{ id: 'admin-panel', label: 'Admin Dashboard', icon: ShieldAlert }] : []),
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#172B3A] text-white flex flex-col transition-transform duration-300 ease-in-out
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo & Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7657E8] to-[#12B886] flex items-center justify-center shadow-lg">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Track My Sub</h1>
              <p className="text-xs text-white/60">SaaS Subscription Hub</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsOpenMobile(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-[#7657E8] text-white shadow-md shadow-[#7657E8]/30' 
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/60'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom User Profile & Status */}
        <div className="p-4 border-t border-white/10 bg-black/10">
          <div className="flex items-center gap-3 mb-3">
            <img 
              src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} 
              alt={user.full_name}
              className="w-10 h-10 rounded-full object-cover border-2 border-[#7657E8]" 
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold truncate">{user.full_name}</h4>
              <p className="text-xs text-white/60 truncate">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white/5 mb-3">
            <span className="text-white/70 font-medium">Access Status:</span>
            <span className={`flex items-center gap-1 font-semibold uppercase text-[10px] px-2 py-0.5 rounded-full ${
              user.approval_status === 'approved' ? 'bg-[#12B886]/20 text-[#12B886]' :
              user.approval_status === 'pending' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'bg-[#E5484D]/20 text-[#E5484D]'
            }`}>
              {user.approval_status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
              {user.approval_status === 'pending' && <Clock className="w-3 h-3" />}
              {user.approval_status === 'rejected' && <XCircle className="w-3 h-3" />}
              {user.approval_status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentTab('settings')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Support</span>
            </button>
            <button 
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-[#E5484D]/20 hover:bg-[#E5484D]/30 text-[#E5484D] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
