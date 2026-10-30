import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { DashboardView } from './components/DashboardView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { AddSubscriptionModal } from './components/AddSubscriptionModal';
import { SubscriptionDetailModal } from './components/SubscriptionDetailModal';
import { RenewalsView } from './components/RenewalsView';
import { AnalyticsView } from './components/AnalyticsView';
import { CategoriesView } from './components/CategoriesView';
import { InvoiceParserView } from './components/InvoiceParserView';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import { IntegrationsView } from './components/IntegrationsView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { SettingsView } from './components/SettingsView';
import { PricingView } from './components/PricingView';
import { AuthModal } from './components/AuthModal';
import { 
  UserProfile, 
  Subscription, 
  Category, 
  Invoice, 
  NotificationItem, 
  WebhookEndpoint,
  ApprovalStatus 
} from './types';
import { db, DEFAULT_USER_PREFERENCES, exchangeRatesUpdatedAt, formatSupabaseError, GOOGLE_OAUTH_PENDING_KEY, refreshExchangeRates, toValidUUID } from './services/supabase';
import { supabase } from './lib/supabase';

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [currencyRatesStatus, setCurrencyRatesStatus] = useState<'loading' | 'live' | 'fallback'>('loading');
  const [currencyRatesUpdatedAt, setCurrencyRatesUpdatedAt] = useState<string | null>(null);

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [currentCurrency, setCurrentCurrency] = useState('INR');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('cat-all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  useEffect(() => {
    let active = true;
    void refreshExchangeRates()
      .then(updatedAt => {
        if (active) {
          setCurrencyRatesUpdatedAt(updatedAt);
          setCurrencyRatesStatus('live');
        }
      })
      .catch(() => {
        if (active) {
          setCurrencyRatesUpdatedAt(exchangeRatesUpdatedAt);
          setCurrencyRatesStatus('fallback');
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    let passwordRecovery = typeof window !== 'undefined' && (
      new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery' ||
      new URLSearchParams(window.location.search).get('type') === 'recovery'
    );
    if (passwordRecovery) setIsPasswordRecovery(true);
    const loadProfile = async () => {
      try {
        const profile = await db.getAuthenticatedProfile();
        if (active) {
          setUser(profile);
          setCurrentCurrency(profile.preferred_currency);
          setCurrentTab(profile.preferences?.subscription.default_dashboard_view || 'dashboard');
          setOperationError(null);
        }
      } catch (error) {
        if (active) {
          setUser(null);
          setOperationError(formatSupabaseError(error));
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        passwordRecovery = true;
        if (active) {
          setIsPasswordRecovery(true);
          setAuthLoading(false);
        }
        return;
      }

      if (!session) {
        if (active) {
          setIsPasswordRecovery(false);
          setUser(null);
          setAuthLoading(false);
          setSubscriptions([]);
          setCategories([]);
          setInvoices([]);
          setNotifications([]);
          setWebhooks([]);
          setAllUsers([]);
          setSelectedSubscription(null);
          setIsAddModalOpen(false);
          setOperationError(null);
        }
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      if (data.session && !passwordRecovery) {
        window.sessionStorage.removeItem(GOOGLE_OAUTH_PENDING_KEY);
        return loadProfile();
      }
      if (active) setAuthLoading(false);
      return undefined;
    }).catch(error => {
      if (active) {
        setOperationError(formatSupabaseError(error));
        setAuthLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || user.approval_status !== 'approved') return;
    let active = true;
    setSubscriptions([]);
    setCategories([]);
    setInvoices([]);
    setNotifications([]);
    setWebhooks([]);
    setAllUsers([]);
    setSelectedSubscription(null);
    const loadData = async () => {
      const results = await Promise.all([
        db.fetchSubscriptions().then(data => ({ data })).catch(error => ({ error })),
        db.fetchCategories().then(data => ({ data })).catch(error => ({ error })),
        db.fetchInvoices().then(data => ({ data })).catch(error => ({ error })),
        db.fetchNotifications().then(data => ({ data })).catch(error => ({ error })),
        db.fetchWebhooks().then(data => ({ data })).catch(error => ({ error })),
        (user.role === 'admin' ? db.fetchAllUsers() : Promise.resolve([user]))
          .then(data => ({ data }))
          .catch(error => ({ error })),
      ]);
      if (!active) return;
      const failures = results.flatMap(result => 'error' in result ? [formatSupabaseError(result.error)] : []);
      if ('data' in results[0]) setSubscriptions(results[0].data);
      if ('data' in results[1]) setCategories(results[1].data);
      if ('data' in results[2]) setInvoices(results[2].data);
      if ('data' in results[3]) setNotifications(results[3].data);
      if ('data' in results[4]) setWebhooks(results[4].data);
      if ('data' in results[5]) setAllUsers(results[5].data);
      setOperationError(failures.length ? failures.join(' || ') : null);
    };
    void loadData();
    return () => { active = false; };
  }, [user?.id, user?.role, user?.approval_status]);

  const reportFailure = (error: unknown) => setOperationError(formatSupabaseError(error));

  const refreshUsers = async () => {
    try {
      const users = await db.fetchAllUsers();
      setAllUsers(users);
      setOperationError(null);
    } catch (error) {
      reportFailure(error);
    }
  };

  useEffect(() => {
    if (currentTab === 'admin-panel' && user?.role === 'admin') {
      void refreshUsers();
    }
  }, [currentTab, user?.id, user?.role]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Checking secure session...</div>;
  }

  if (!user || user.approval_status !== 'approved') {
    return (
      <>
        <AuthModal
          isPasswordRecovery={isPasswordRecovery}
          initialAuthError={operationError}
          onPasswordResetComplete={() => setIsPasswordRecovery(false)}
          onLogin={(profile) => {
            setUser(profile);
            setCurrentCurrency(profile.preferred_currency);
            setCurrentTab(profile.preferences?.subscription.default_dashboard_view || 'dashboard');
            setOperationError(null);
          }}
        />
      </>
    );
  }

  const userPreferences = user.preferences ?? DEFAULT_USER_PREFERENCES;

  const handleAddSubscription = async (newSubData: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : toValidUUID('sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));

    const newSub: Subscription = {
      ...newSubData,
      id: newId,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const saved = await db.addSubscription(newSub);
      setSubscriptions(prev => [saved, ...prev]);
      setOperationError(null);
    } catch (error) {
      reportFailure(error);
      throw error;
    }
  };

  const handleUpdateSubscription = async (updated: Subscription) => {
    try {
      const saved = await db.updateSubscription(updated);
      setSubscriptions(prev => prev.map(s => s.id === saved.id ? saved : s));
      setSelectedSubscription(null);
      setOperationError(null);
    } catch (error) {
      reportFailure(error);
      throw error;
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    try {
      await db.deleteSubscription(id);
      setSubscriptions(prev => prev.filter(s => s.id !== id));
      setSelectedSubscription(null);
      setOperationError(null);
    } catch (error) {
      reportFailure(error);
      throw error;
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await db.bulkDeleteSubscriptions(ids);
      setSubscriptions(prev => prev.filter(s => !ids.includes(s.id)));
      setOperationError(null);
      return true;
    } catch (error) {
      reportFailure(error);
      return false;
    }
  };

  const handleAddCategory = async (name: string, color: string) => {
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : toValidUUID('cat-' + Date.now());

    const newCat: Category = {
      id: newId,
      user_id: user.id,
      name,
      icon: 'Tag',
      color,
      created_at: new Date().toISOString(),
    };

    try {
      const saved = await db.addCategory(newCat);
      setCategories(prev => [...prev, saved]);
      setOperationError(null);
      return true;
    } catch (error) {
      reportFailure(error);
      return false;
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await db.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      setOperationError(null);
      return true;
    } catch (error) {
      reportFailure(error);
      return false;
    }
  };

  const handleAddWebhook = async (url: string, events: string[]) => {
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : toValidUUID('wh-' + Date.now());

    const newHook: WebhookEndpoint = {
      id: newId,
      user_id: user.id,
      endpoint_url: url,
      subscribed_events: events,
      signing_secret: 'whsec_' + Math.random().toString(36).substring(2),
      enabled: true,
      created_at: new Date().toISOString(),
    };

    try {
      const saved = await db.addWebhook(newHook);
      setWebhooks(prev => [...prev, saved]);
      setOperationError(null);
      return true;
    } catch (error) {
      reportFailure(error);
      return false;
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await db.deleteWebhook(id);
      setWebhooks(prev => prev.filter(w => w.id !== id));
      setOperationError(null);
      return true;
    } catch (error) {
      reportFailure(error);
      return false;
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: ApprovalStatus) => {
    try {
      const updated = await db.updateUserApprovalStatus(userId, status);
      setAllUsers(prev => prev.map(existing => existing.id === updated.id ? updated : existing));
      if (user.id === updated.id) {
        setUser(updated);
      }
      setOperationError(null);
    } catch (error) {
      reportFailure(error);
    }
  };

  const unreadCount = notifications.filter(n => n.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex text-[#1F2937] font-sans">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={user}
        onLogout={async () => {
          try {
            await db.signOut();
            setUser(null);
            setOperationError(null);
          } catch (error) {
            reportFailure(error);
          }
        }}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar
          currentCurrency={currentCurrency}
          setCurrentCurrency={setCurrentCurrency}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onToggleAiPanel={() => setIsAiPanelOpen(!isAiPanelOpen)}
          onToggleMobileSidebar={() => setIsOpenMobile(!isOpenMobile)}
          unreadNotificationsCount={unreadCount}
          onOpenNotifications={() => setCurrentTab('renewals')}
        />

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {operationError && (
            <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {operationError}
            </div>
          )}
          {currencyRatesStatus === 'fallback' && currentCurrency !== 'INR' && (
            <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              Live exchange rates are unavailable. Amounts are shown using built-in reference estimates.
            </div>
          )}
          {currentTab === 'dashboard' && (
            <DashboardView
              subscriptions={subscriptions}
              categories={categories}
              currentCurrency={currentCurrency}
              dateFormat={userPreferences.date_format}
              selectedCategory={selectedCategory}
              setSelectedCategory={(catId) => {
                setSelectedCategory(catId);
                setCurrentTab('subscriptions');
              }}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onSelectSubscription={(sub) => setSelectedSubscription(sub)}
              userName={user.full_name}
            />
          )}

          {currentTab === 'subscriptions' && (
            <SubscriptionsView
              subscriptions={subscriptions}
              categories={categories}
              currentCurrency={currentCurrency}
              dateFormat={userPreferences.date_format}
              preferences={userPreferences.subscription}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onSelectSubscription={(sub) => setSelectedSubscription(sub)}
              onDeleteSubscription={handleDeleteSubscription}
              onBulkDelete={handleBulkDelete}
            />
          )}

          {currentTab === 'renewals' && (
            <RenewalsView
              subscriptions={subscriptions}
              notifications={notifications}
              onMarkNotificationRead={async (id) => {
                try {
                  await db.updateNotificationStatus(id, 'read');
                  setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
                  setOperationError(null);
                } catch (error) {
                  reportFailure(error);
                }
              }}
              currentCurrency={currentCurrency}
              dateFormat={userPreferences.date_format}
              firstDayOfWeek={userPreferences.first_day_of_week}
              defaultReminderDays={userPreferences.notifications.default_reminder_days}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView
              subscriptions={subscriptions}
              categories={categories}
              currentCurrency={currentCurrency}
            />
          )}

          {currentTab === 'categories' && (
            <CategoriesView
              categories={categories}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}

          {currentTab === 'invoices' && (
            <InvoiceParserView
              invoices={invoices}
              onAddInvoiceAndSubscription={async (inv, sub) => {
                const newInvId = (typeof crypto !== 'undefined' && crypto.randomUUID)
                  ? crypto.randomUUID()
                  : toValidUUID('inv-' + Date.now());

                const newInv: Invoice = {
                  ...inv,
                  id: newInvId,
                  user_id: user.id,
                  parsing_status: 'success',
                  created_at: new Date().toISOString()
                };
                try {
                  const savedInvoice = await db.addInvoice(newInv);
                  setInvoices(prev => [savedInvoice, ...prev]);
                  await handleAddSubscription(sub);
                  return true;
                } catch (error) {
                  reportFailure(error);
                  return false;
                }
              }}
            />
          )}

          {currentTab === 'ai-assistant' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">AI Subscription Assistant</h2>
              <p className="text-xs text-gray-500">Click the AI Assistant drawer toggle on the top right for interactive chat, or explore portfolio insights here.</p>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <button
                  onClick={() => setIsAiPanelOpen(true)}
                  className="px-6 py-3 bg-[#7657E8] text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  Open AI Chat Panel
                </button>
              </div>
            </div>
          )}

          {currentTab === 'integrations' && (
            <IntegrationsView
              webhooks={webhooks}
              onAddWebhook={handleAddWebhook}
              onDeleteWebhook={handleDeleteWebhook}
            />
          )}

          {currentTab === 'chrome-ext' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Chrome Extension Companion</h2>
              <p className="text-xs text-gray-500">Synchronize checkout pages and manage subscriptions directly from browser extension.</p>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
                <h4 className="font-bold text-gray-900">Manifest V3 Extension Setup</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  The extension companion connects securely to your Track My Subscription account using local authorization tokens.
                </p>
              </div>
            </div>
          )}

          {currentTab === 'notifications' && (
            <RenewalsView
              subscriptions={subscriptions}
              notifications={notifications}
              onMarkNotificationRead={async (id) => {
                try {
                  await db.updateNotificationStatus(id, 'read');
                  setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
                  setOperationError(null);
                } catch (error) {
                  reportFailure(error);
                }
              }}
              currentCurrency={currentCurrency}
              dateFormat={userPreferences.date_format}
              firstDayOfWeek={userPreferences.first_day_of_week}
              defaultReminderDays={userPreferences.notifications.default_reminder_days}
            />
          )}

          {currentTab === 'admin-panel' && user.role === 'admin' && (
            <AdminDashboardView
              users={allUsers}
              onRefreshUsers={refreshUsers}
              onUpdateUserStatus={handleUpdateUserStatus}
              onToggleAdminRole={async (id) => {
                const target = allUsers.find(existing => existing.id === id);
                if (!target) return;
                try {
                  const updated = await db.updateUserRole(id, target.role === 'admin' ? 'user' : 'admin');
                  setAllUsers(prev => prev.map(existing => existing.id === updated.id ? updated : existing));
                  setOperationError(null);
                } catch (error) {
                  reportFailure(error);
                }
              }}
            />
          )}

          {currentTab === 'pricing' && (
            <PricingView currentCurrency={currentCurrency} />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              user={user}
              onUpdateProfile={async (updated) => {
                const saved = await db.updateUserProfile(updated);
                setUser(saved);
                setCurrentCurrency(saved.preferred_currency);
                setOperationError(null);
                return saved;
              }}
              onUploadAvatar={async (file) => {
                const avatarUrl = await db.uploadProfileAvatar(file);
                setUser(current => current ? { ...current, avatar_url: avatarUrl } : current);
                return avatarUrl;
              }}
              onRemoveAvatar={async () => {
                await db.removeProfileAvatar();
                setUser(current => current ? { ...current, avatar_url: undefined } : current);
              }}
              onLogout={async () => {
                try {
                  await db.signOut();
                  setUser(null);
                } catch (error) {
                  reportFailure(error);
                }
              }}
              onNavigateIntegrations={() => setCurrentTab('integrations')}
              currencyRatesStatus={currencyRatesStatus}
              currencyRatesUpdatedAt={currencyRatesUpdatedAt}
            />
          )}
        </main>
      </div>

      {/* Modals & AI Panel */}
      <AddSubscriptionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddSubscription={handleAddSubscription}
        categories={categories}
      />

      <SubscriptionDetailModal
        subscription={selectedSubscription}
        onClose={() => setSelectedSubscription(null)}
        onUpdateSubscription={handleUpdateSubscription}
        onDeleteSubscription={handleDeleteSubscription}
        categories={categories}
        dateFormat={userPreferences.date_format}
      />

      <AIAssistantPanel
        isOpen={isAiPanelOpen}
        onClose={() => setIsAiPanelOpen(false)}
        subscriptions={subscriptions}
        currentCurrency={currentCurrency}
      />
    </div>
  );
}
export default App;
