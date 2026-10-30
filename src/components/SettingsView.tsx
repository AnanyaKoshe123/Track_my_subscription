import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, Bell, Check, ChevronRight, CircleUserRound, Download, FileText,
  Link2, LoaderCircle, LogOut, Shield, Upload,
  SlidersHorizontal, UserRound, X,
} from 'lucide-react';
import { UserPreferences, UserProfile } from '../types';
import { db, DEFAULT_USER_PREFERENCES, formatDateForPreference, formatSupabaseError } from '../services/supabase';

type SettingsSection = 'profile' | 'security' | 'notifications' | 'subscriptions' | 'integrations' | 'privacy';
type AuthAccountInfo = Awaited<ReturnType<typeof db.getAuthAccountInfo>>;

interface SettingsViewProps {
  user: UserProfile;
  onUpdateProfile: (updated: UserProfile) => Promise<UserProfile>;
  onUploadAvatar: (file: File) => Promise<string>;
  onRemoveAvatar: () => Promise<void>;
  onLogout: () => Promise<void>;
  onNavigateIntegrations: () => void;
  currencyRatesStatus: 'loading' | 'live' | 'fallback';
  currencyRatesUpdatedAt: string | null;
}

const sections: { id: SettingsSection; label: string; icon: typeof UserRound }[] = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'security', label: 'Login & Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'subscriptions', label: 'Subscription Preferences', icon: SlidersHorizontal },
  { id: 'integrations', label: 'Connected Apps', icon: Link2 },
  { id: 'privacy', label: 'Data & Privacy', icon: FileText },
];

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#004547] focus:outline-none focus:ring-2 focus:ring-[#004547]/10';
const selectClass = inputClass;
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#004547] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#00383a] disabled:cursor-not-allowed disabled:opacity-60';

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = `setting-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <label htmlFor={id} className={`flex items-center justify-between gap-4 py-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition-colors checked:bg-[#004547] before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-[18px] disabled:cursor-not-allowed"
      />
    </label>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Status({ children, positive = false }: { children: React.ReactNode; positive?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${positive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${positive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {children}
    </span>
  );
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onUpdateProfile,
  onUploadAvatar,
  onRemoveAvatar,
  onLogout,
  onNavigateIntegrations,
  currencyRatesStatus,
  currencyRatesUpdatedAt,
}) => {
  const initialPreferences = user.preferences ?? DEFAULT_USER_PREFERENCES;
  const [section, setSection] = useState<SettingsSection>('profile');
  const [fullName, setFullName] = useState(user.full_name);
  const [currency, setCurrency] = useState(user.preferred_currency);
  const [timezone, setTimezone] = useState(user.timezone);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [securityInfo, setSecurityInfo] = useState<AuthAccountInfo | null>(null);
  const [securityLoading, setSecurityLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    void db.getAuthAccountInfo()
      .then(info => { if (active) setSecurityInfo(info); })
      .catch(error => { if (active) setActionError(formatSupabaseError(error)); })
      .finally(() => { if (active) setSecurityLoading(false); });
    return () => { active = false; };
  }, []);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(current => ({ ...current, ...updates }));
    setSaved(false);
  };
  const updateNotifications = (updates: Partial<UserPreferences['notifications']>) => {
    setPreferences(current => ({ ...current, notifications: { ...current.notifications, ...updates } }));
    setSaved(false);
  };
  const updateSubscriptionPreferences = (updates: Partial<UserPreferences['subscription']>) => {
    setPreferences(current => ({ ...current, subscription: { ...current.subscription, ...updates } }));
    setSaved(false);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) {
      setSaveError('Full name cannot be empty.');
      return;
    }
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: timezone }).format();
    } catch {
      setSaveError('Enter a valid IANA timezone, such as Asia/Kolkata or America/New_York.');
      return;
    }
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await onUpdateProfile({
        ...user,
        full_name: fullName.trim(),
        preferred_currency: currency,
        timezone: timezone.trim(),
        preferences,
        updated_at: new Date().toISOString(),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3500);
    } catch (error) {
      setSaveError(formatSupabaseError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFullName(user.full_name);
    setCurrency(user.preferred_currency);
    setTimezone(user.timezone);
    setPreferences(user.preferences ?? DEFAULT_USER_PREFERENCES);
    setSaveError(null);
    setSaved(false);
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAvatarBusy(true);
    setActionError(null);
    try {
      const uploadedAvatarUrl = await onUploadAvatar(file);
      setAvatarUrl(uploadedAvatarUrl);
    } catch (error) {
      setActionError(formatSupabaseError(error));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Remove your profile photo?')) return;
    setAvatarBusy(true);
    setActionError(null);
    try {
      await onRemoveAvatar();
      setAvatarUrl('');
    } catch (error) {
      setActionError(formatSupabaseError(error));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMessage(null);
    setActionError(null);
    if (newPassword.length < 8) {
      setActionError('Choose a password with at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setActionError('The passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      await db.changePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password updated successfully.');
    } catch (error) {
      setActionError(formatSupabaseError(error));
    } finally {
      setChangingPassword(false);
    }
  };

  const exportData = async (format: 'json' | 'csv') => {
    setExporting(true);
    setActionError(null);
    try {
      const subscriptions = await db.fetchSubscriptions();
      const content = format === 'json'
        ? await Promise.all([
            db.fetchInvoices(),
            db.fetchNotifications(),
            db.fetchWebhooks(),
            db.fetchCategories(),
          ]).then(([invoices, notifications, webhooks, categories]) => JSON.stringify({
              exported_at: new Date().toISOString(),
              profile: {
                full_name: user.full_name,
                email: user.email,
                avatar_url: user.avatar_url,
                preferred_currency: user.preferred_currency,
                timezone: user.timezone,
                preferences,
                role: user.role,
                approval_status: user.approval_status,
                created_at: user.created_at,
              },
              subscriptions,
              invoices,
              notifications,
              categories: categories.filter(category => category.user_id === user.id),
              webhooks: webhooks.map(({ id, endpoint_url, subscribed_events, enabled, created_at }) => ({
                id, endpoint_url, subscribed_events, enabled, created_at,
              })),
            }, null, 2))
        : [
            ['Service Name', 'Plan', 'Amount', 'Currency', 'Billing Cycle', 'Next Renewal', 'Status', 'Payment Method'],
            ...subscriptions.map(subscription => [
              subscription.service_name,
              subscription.plan_name,
              String(subscription.amount),
              subscription.currency,
              subscription.billing_cycle,
              subscription.next_billing_date,
              subscription.status,
              subscription.payment_method_label || '',
            ]),
          ].map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(',')).join('\r\n');
      const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `track-my-subscription-export.${format}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setActionError(formatSupabaseError(error));
    } finally {
      setExporting(false);
    }
  };

  const handleConnectGoogle = async () => {
    setActionError(null);
    try {
      await db.connectGoogleAccount();
    } catch (error) {
      setActionError(formatSupabaseError(error));
    }
  };

  const hasGoogle = Boolean(securityInfo?.providers.includes('google'));
  const emailProviderEnabled = Boolean(securityInfo?.providers.includes('email'));
  const displayName = sections.find(item => item.id === section)?.label ?? 'Profile';
  const statusLabel = user.approval_status === 'approved'
    ? 'Approved'
    : user.approval_status === 'pending'
      ? 'Pending Approval'
      : user.approval_status === 'suspended'
        ? 'Suspended'
        : 'Rejected';

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Account & Preferences</h2>
        <p className="mt-1 text-sm text-slate-500">Manage your profile, preferences, and account security.</p>
      </header>

      {saved && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><Check className="h-4 w-4" />Changes saved.</div>}
      {(saveError || actionError) && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError || actionError}</div>}

      <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav aria-label="Account settings" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 lg:block lg:space-y-1 lg:self-start">
          {sections.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setSection(item.id); setActionError(null); }}
                aria-current={section === item.id ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors lg:w-full ${section === item.id ? 'bg-[#004547] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <form onSubmit={handleSave} className="min-w-0 space-y-5">
          <div className="mb-1">
            <h3 className="text-lg font-bold text-slate-900">{displayName}</h3>
          </div>

          {section === 'profile' && (
            <>
              <Card title="Profile Preferences" description="Update your personal details and regional display preferences.">
                <div className="mb-5 flex flex-wrap items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400">
                    {avatarUrl ? <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" /> : <CircleUserRound className="h-9 w-9" />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className={`${buttonClass} cursor-pointer`}>
                      {avatarBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Upload photo
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={handleAvatarChange} disabled={avatarBusy} />
                    </label>
                    {avatarUrl && <button type="button" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => void handleRemoveAvatar()} disabled={avatarBusy}>Remove</button>}
                    <span className="self-center text-xs text-slate-500">JPEG, PNG, WebP or GIF; up to 5 MB.</span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">Full Name
                    <input className={`mt-1.5 ${inputClass}`} value={fullName} required maxLength={120} onChange={event => setFullName(event.target.value)} />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">Email Address
                    <input className={`mt-1.5 ${inputClass} cursor-not-allowed bg-slate-100`} type="email" disabled value={user.email} />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">Phone Number (include country code)
                    <input className={`mt-1.5 ${inputClass}`} type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={preferences.phone_number} onChange={event => updatePreferences({ phone_number: event.target.value })} />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">Country or Region
                    <input className={`mt-1.5 ${inputClass}`} autoComplete="country-name" value={preferences.country_region} onChange={event => updatePreferences({ country_region: event.target.value })} />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">Preferred Currency
                    <select className={`mt-1.5 ${selectClass}`} value={currency} onChange={event => { setCurrency(event.target.value); setSaved(false); }}>
                      <option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option><option value="AED">AED (د.إ)</option>
                    </select>
                    <span className="mt-1 block font-normal text-slate-500">
                      {currencyRatesStatus === 'live' && currencyRatesUpdatedAt
                        ? `Converted using live reference rates last updated ${currencyRatesUpdatedAt}.`
                        : currencyRatesStatus === 'fallback'
                          ? 'Live rates are unavailable; built-in reference estimates are being used.'
                          : 'Loading live reference rates; built-in estimates are used until they are available.'}
                    </span>
                  </label>
                  <label className="text-xs font-semibold text-slate-700">Timezone
                    <input className={`mt-1.5 ${inputClass}`} value={timezone} onChange={event => { setTimezone(event.target.value); setSaved(false); }} placeholder="Asia/Kolkata" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">Preferred Language
                    <select className={`mt-1.5 ${selectClass}`} value={preferences.language} onChange={event => updatePreferences({ language: event.target.value })}>
                      <option value="en">English</option><option value="hi">Hindi</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option>
                    </select>
                    <span className="mt-1 block font-normal text-slate-500">Language is saved as a preference; translated UI is not yet available.</span>
                  </label>
                  <label className="text-xs font-semibold text-slate-700">Date Format
                    <select className={`mt-1.5 ${selectClass}`} value={preferences.date_format} onChange={event => updatePreferences({ date_format: event.target.value })}>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="MM/DD/YYYY">MM/DD/YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-700">First Day of the Week
                    <select className={`mt-1.5 ${selectClass}`} value={preferences.first_day_of_week} onChange={event => updatePreferences({ first_day_of_week: event.target.value as UserPreferences['first_day_of_week'] })}>
                      <option value="Monday">Monday</option><option value="Sunday">Sunday</option>
                    </select>
                  </label>
                </div>
              </Card>

              <Card title="Account Status" description="Read-only account details from your authenticated profile.">
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-slate-500">Account Status</dt><dd className="mt-1"><Status positive={user.approval_status === 'approved'}>{statusLabel}</Status></dd></div>
                  <div><dt className="text-xs text-slate-500">User Role</dt><dd className="mt-1 font-semibold capitalize text-slate-800">{user.role}</dd></div>
                  <div><dt className="text-xs text-slate-500">Account Created</dt><dd className="mt-1 text-slate-800">{formatDateForPreference(user.created_at, preferences.date_format, timezone)}</dd></div>
                  <div><dt className="text-xs text-slate-500">Last Sign-In</dt><dd className="mt-1 text-slate-800">{securityInfo?.lastSignInAt ? formatDateForPreference(securityInfo.lastSignInAt, preferences.date_format, timezone) : 'Not available'}</dd></div>
                </dl>
              </Card>
            </>
          )}

          {section === 'security' && (
            <>
              <Card title="Login & Security" description="Authentication providers reported by Supabase for your account.">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3">
                  <div><p className="text-sm font-semibold text-slate-800">Connected authentication providers</p><p className="mt-1 text-xs text-slate-500">{securityLoading ? 'Checking providers…' : securityInfo?.providers.length ? securityInfo.providers.join(', ') : 'Provider status unavailable'}</p></div>
                  {securityLoading ? <Status>Checking</Status> : securityInfo
                    ? <Status positive={Boolean(securityInfo.providers.length)}>{securityInfo.providers.length ? 'Connected' : 'No providers found'}</Status>
                    : <Status>Status unknown</Status>}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3">
                  <div><p className="text-sm font-semibold text-slate-800">Two-factor authentication</p><p className="mt-1 text-xs text-slate-500">MFA enrollment and verification are not implemented in this app.</p></div><Status>Setup required</Status>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div><p className="text-sm font-semibold text-slate-800">Active sessions and devices</p><p className="mt-1 text-xs text-slate-500">This app cannot list or revoke individual sessions. Sign out below to end this session.</p></div><Status>Unavailable</Status>
                </div>
              </Card>

              {emailProviderEnabled && (
                <Card title="Change Password" description="Update the password for your email and password sign-in.">
                  {passwordMessage && <p role="status" className="mb-3 text-sm text-emerald-700">{passwordMessage}</p>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-700">New Password<input className={`mt-1.5 ${inputClass}`} type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label>
                    <label className="text-xs font-semibold text-slate-700">Confirm New Password<input className={`mt-1.5 ${inputClass}`} type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
                  </div>
                  <button type="button" className={`${buttonClass} mt-4`} disabled={changingPassword || !newPassword || !confirmPassword} onClick={() => void handlePasswordChange()}>{changingPassword ? 'Updating…' : 'Update Password'}</button>
                </Card>
              )}
              <Card title="Sign Out" description="Sign out of this account on this device.">
                <button type="button" className={buttonClass} onClick={() => void onLogout()}><LogOut className="h-4 w-4" />Sign Out</button>
              </Card>
            </>
          )}

          {section === 'notifications' && (
            <Card title="Notifications & Reminders" description="These preferences are saved to your profile. This app currently provides in-app notification history only; email, push, and scheduled reminder delivery workflows are not configured.">
              <div className="divide-y divide-slate-100">
                <Toggle label="Email Notifications" checked={preferences.notifications.email} onChange={email => updateNotifications({ email })} description="Preference only; no email delivery workflow is configured." />
                <Toggle label="Browser Push Notifications" checked={preferences.notifications.browser_push} onChange={async enabled => {
                  if (enabled && !('Notification' in window)) {
                    setActionError('Browser notifications are not supported in this browser.');
                    return;
                  }
                  if (enabled && Notification.permission !== 'granted') {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                      setActionError('Browser notification permission was not granted.');
                      return;
                    }
                  }
                  updateNotifications({ browser_push: enabled });
                }} description={`Browser permission: ${'Notification' in window ? Notification.permission : 'unsupported'}. Push delivery is not implemented.`} />
                <Toggle label="Upcoming Renewal Reminders" checked={preferences.notifications.renewal_reminders} onChange={renewal_reminders => updateNotifications({ renewal_reminders })} />
                <Toggle label="Trial Ending Alerts" checked={preferences.notifications.trial_ending_alerts} onChange={trial_ending_alerts => updateNotifications({ trial_ending_alerts })} />
                <Toggle label="Payment Due Reminders" checked={preferences.notifications.payment_due_reminders} onChange={payment_due_reminders => updateNotifications({ payment_due_reminders })} />
                <Toggle label="Failed Payment Alerts" checked={preferences.notifications.failed_payment_alerts} onChange={failed_payment_alerts => updateNotifications({ failed_payment_alerts })} />
                <Toggle label="Weekly Subscription Summary" checked={preferences.notifications.weekly_summary} onChange={weekly_summary => updateNotifications({ weekly_summary })} description="Preference only; scheduled summaries are not sent." />
                <Toggle label="Monthly Spending Summary" checked={preferences.notifications.monthly_summary} onChange={monthly_summary => updateNotifications({ monthly_summary })} description="Preference only; scheduled summaries are not sent." />
              </div>
              <label className="mt-4 block max-w-sm text-xs font-semibold text-slate-700">Default Reminder Timing
                <select className={`mt-1.5 ${selectClass}`} value={preferences.notifications.default_reminder_days} onChange={event => updateNotifications({ default_reminder_days: Number(event.target.value) as UserPreferences['notifications']['default_reminder_days'] })}>
                  <option value={1}>1 day before</option><option value={3}>3 days before</option><option value={7}>7 days before</option><option value={14}>14 days before</option>
                </select>
              </label>
            </Card>
          )}

          {section === 'subscriptions' && (
            <Card title="Subscription Preferences" description="Defaults for subscription lists and spending summaries. Preferred currency remains linked to your Profile settings.">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">Default Expense View
                  <select className={`mt-1.5 ${selectClass}`} value={preferences.subscription.default_expense_view} onChange={event => updateSubscriptionPreferences({ default_expense_view: event.target.value as UserPreferences['subscription']['default_expense_view'] })}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select>
                </label>
                <label className="text-xs font-semibold text-slate-700">Default Dashboard View
                  <select className={`mt-1.5 ${selectClass}`} value={preferences.subscription.default_dashboard_view} onChange={event => updateSubscriptionPreferences({ default_dashboard_view: event.target.value as UserPreferences['subscription']['default_dashboard_view'] })}><option value="dashboard">Overview</option><option value="subscriptions">Subscriptions</option><option value="renewals">Upcoming Renewals</option></select>
                </label>
                <label className="text-xs font-semibold text-slate-700">Default Subscription Sort
                  <select className={`mt-1.5 ${selectClass}`} value={preferences.subscription.default_sort} onChange={event => updateSubscriptionPreferences({ default_sort: event.target.value as UserPreferences['subscription']['default_sort'] })}><option value="name">Name</option><option value="price">Price</option><option value="renewal">Next Renewal Date</option></select>
                </label>
                <label className="text-xs font-semibold text-slate-700">Default Sort Order
                  <select className={`mt-1.5 ${selectClass}`} value={preferences.subscription.sort_order} onChange={event => updateSubscriptionPreferences({ sort_order: event.target.value as UserPreferences['subscription']['sort_order'] })}><option value="ascending">Ascending</option><option value="descending">Descending</option></select>
                </label>
              </div>
              <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                <Toggle label="Show Cancelled Subscriptions" checked={preferences.subscription.show_cancelled} onChange={show_cancelled => updateSubscriptionPreferences({ show_cancelled })} />
                <Toggle label="Show Trial Subscriptions" checked={preferences.subscription.show_trials} onChange={show_trials => updateSubscriptionPreferences({ show_trials })} />
                <Toggle label="Group Subscriptions by Category" checked={preferences.subscription.group_by_category} onChange={group_by_category => updateSubscriptionPreferences({ group_by_category })} />
              </div>
              <p className="mt-3 text-xs text-slate-500">Default reminder timing is shared with Notifications & Reminders.</p>
            </Card>
          )}

          {section === 'integrations' && (
            <>
              <Card title="Connected Apps & Integrations" description="Google sign-in and Gmail mailbox access are separate permissions.">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3">
                  <div><p className="text-sm font-semibold text-slate-800">Google Sign-In</p><p className="mt-1 text-xs text-slate-500">{securityLoading ? 'Checking connection…' : hasGoogle ? 'Google identity linked to this Supabase account.' : 'No Google identity is linked.'}</p></div>
                  {securityLoading ? <Status>Checking</Status> : securityInfo
                    ? <Status positive={hasGoogle}>{hasGoogle ? 'Connected' : 'Not connected'}</Status>
                    : <Status>Status unknown</Status>}
                  {!securityLoading && !hasGoogle && <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => void handleConnectGoogle()}>Connect / Reconnect Google</button>}
                </div>
                <div className="border-b border-slate-100 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-800">Gmail Subscription Detection</p><p className="mt-1 text-xs text-slate-500">Gmail API access is not implemented. Google sign-in does not grant mailbox permissions.</p></div><Status>Not connected</Status></div>
                  <p className="mt-2 text-xs text-slate-500">Gmail scopes: none requested. Sync timestamp: unavailable; no Gmail sync backend exists.</p>
                  <button type="button" disabled className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 disabled:cursor-not-allowed">Gmail setup required</button>
                  <button type="button" disabled className="ml-2 mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 disabled:cursor-not-allowed">Disconnect Gmail</button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                  <div><p className="text-sm font-semibold text-slate-800">Webhook Integrations</p><p className="mt-1 text-xs text-slate-500">Webhook endpoints are available in Integrations.</p></div>
                  <button type="button" onClick={onNavigateIntegrations} className="inline-flex items-center gap-1 text-xs font-semibold text-[#004547] hover:underline">Manage webhooks<ChevronRight className="h-4 w-4" /></button>
                </div>
              </Card>
              <Card title="Google Permission Management" description="This app currently requests only the Google identity scopes needed for sign-in. It does not have Gmail mailbox access.">
                <p className="text-sm text-slate-600">Connected Google identity: {securityLoading ? 'Checking…' : hasGoogle ? 'Yes' : 'No'}.</p>
              </Card>
            </>
          )}

          {section === 'privacy' && (
            <>
              <Card title="Data & Privacy" description="Exports use Supabase queries scoped to your authenticated user.">
                <div className="flex flex-wrap gap-3">
                  <button type="button" className={buttonClass} onClick={() => void exportData('csv')} disabled={exporting}><Download className="h-4 w-4" />Export Subscriptions CSV</button>
                  <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[#004547] px-4 py-2.5 text-sm font-semibold text-[#004547] hover:bg-slate-50 disabled:opacity-60" onClick={() => void exportData('json')} disabled={exporting}><Download className="h-4 w-4" />Export My Data JSON</button>
                </div>
                {exporting && <p role="status" className="mt-3 text-xs text-slate-500">Preparing your user-scoped export…</p>}
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
                  <div className="flex items-center justify-between gap-4"><span className="text-slate-700">Connected Google services and permissions</span><span className="text-xs text-slate-500">{hasGoogle ? 'Google identity only; no Gmail access' : 'No Google service connected'}</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-slate-700">Privacy Policy</span><span className="text-xs text-slate-500">Not published in this app</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-slate-700">Terms of Service</span><span className="text-xs text-slate-500">Not published in this app</span></div>
                </div>
              </Card>
              <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-3 flex items-center gap-2 text-red-800"><AlertTriangle className="h-5 w-5" /><h3 className="font-bold">Danger Zone</h3></div>
                <p className="text-xs leading-relaxed text-slate-600">Account deletion is not available in this app. A secure server-side deletion workflow is required to remove the Supabase Auth user and associated data safely. Contact your administrator to request deletion.</p>
                <button type="button" disabled className="mt-4 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 opacity-60">Request Account Deletion — Setup Required</button>
              </section>
            </>
          )}

          {['profile', 'notifications', 'subscriptions'].includes(section) && (
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={handleCancel} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><X className="h-4 w-4" />Cancel</button>
              <button type="submit" disabled={saving} className={buttonClass}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
