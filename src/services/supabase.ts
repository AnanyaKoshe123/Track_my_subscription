import { UserProfile, UserPreferences, Subscription, Category, Invoice, NotificationItem, WebhookEndpoint, BillingCycle, SubscriptionStatus } from '../types';
import { supabase } from '../lib/supabase';

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  phone_number: '',
  country_region: '',
  language: 'en',
  date_format: 'DD/MM/YYYY',
  first_day_of_week: 'Monday',
  notifications: {
    email: true,
    browser_push: false,
    renewal_reminders: true,
    trial_ending_alerts: true,
    payment_due_reminders: true,
    failed_payment_alerts: true,
    weekly_summary: false,
    monthly_summary: true,
    default_reminder_days: 3,
  },
  subscription: {
    default_expense_view: 'monthly',
    default_dashboard_view: 'dashboard',
    default_sort: 'renewal',
    sort_order: 'ascending',
    show_cancelled: true,
    show_trials: true,
    group_by_category: false,
  },
};

function mergeUserPreferences(value: unknown): UserPreferences {
  const saved = value && typeof value === 'object' ? value as Partial<UserPreferences> : {};
  return {
    ...DEFAULT_USER_PREFERENCES,
    ...saved,
    notifications: {
      ...DEFAULT_USER_PREFERENCES.notifications,
      ...(saved.notifications || {}),
    },
    subscription: {
      ...DEFAULT_USER_PREFERENCES.subscription,
      ...(saved.subscription || {}),
    },
  };
}

// Currency conversion baseline against INR
export const EXCHANGE_RATES: Record<string, number> = {
  INR: 1.0,
  USD: 83.2,
  EUR: 90.5,
  GBP: 105.4,
  AED: 22.6,
};

export let exchangeRatesUpdatedAt: string | null = null;

export async function refreshExchangeRates(): Promise<string> {
  const response = await fetch('https://open.er-api.com/v6/latest/INR', {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Exchange-rate service returned HTTP ${response.status}.`);
  }
  const result = await response.json() as {
    result?: string;
    rates?: Record<string, number>;
    time_last_update_utc?: string;
  };
  if (result.result !== 'success' || !result.rates) {
    throw new Error('Exchange-rate service returned an invalid response.');
  }

  const currencies = ['USD', 'EUR', 'GBP', 'AED'];
  const updatedRates: Record<string, number> = { INR: 1 };
  for (const currency of currencies) {
    const unitsPerInr = result.rates[currency];
    if (!Number.isFinite(unitsPerInr) || unitsPerInr <= 0) {
      throw new Error(`Exchange-rate service did not return a valid ${currency} rate.`);
    }
    updatedRates[currency] = 1 / unitsPerInr;
  }

  Object.assign(EXCHANGE_RATES, updatedRates);
  exchangeRatesUpdatedAt = result.time_last_update_utc || new Date().toISOString();
  return exchangeRatesUpdatedAt;
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
};

export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;
  const inrAmount = amount * (EXCHANGE_RATES[fromCurrency] || 1);
  const targetRate = EXCHANGE_RATES[toCurrency] || 1;
  return Number((inrAmount / targetRate).toFixed(2));
}

export function formatCurrency(amount: number, fromCurrency: string, targetCurrency: string): string {
  const converted = convertCurrency(amount, fromCurrency, targetCurrency);
  const symbol = CURRENCY_SYMBOLS[targetCurrency] || targetCurrency;
  return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: targetCurrency === 'INR' ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function formatDateForPreference(value: string, format: string, timezone?: string): string {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  let date: { year: string; month: string; day: string } | null = dateMatch
    ? { year: dateMatch[1], month: dateMatch[2], day: dateMatch[3] }
    : null;
  if (!date) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    try {
      const parts = new Intl.DateTimeFormat('en', {
        timeZone: timezone || undefined,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(parsed);
      date = {
        year: parts.find(part => part.type === 'year')?.value || '',
        month: parts.find(part => part.type === 'month')?.value || '',
        day: parts.find(part => part.type === 'day')?.value || '',
      };
    } catch {
      date = {
        year: String(parsed.getFullYear()),
        month: String(parsed.getMonth() + 1).padStart(2, '0'),
        day: String(parsed.getDate()).padStart(2, '0'),
      };
    }
  }
  if (!date) return value;
  if (format === 'MM/DD/YYYY') return `${date.month}/${date.day}/${date.year}`;
  if (format === 'YYYY-MM-DD') return `${date.year}-${date.month}-${date.day}`;
  return `${date.day}/${date.month}/${date.year}`;
}

// Helper to check if a string is a valid UUID
export function isUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Map categorical slug IDs to their corresponding canonical Supabase UUIDs
export const CATEGORY_SLUG_TO_UUID: Record<string, string> = {
  'cat-entertainment': '00000000-0000-0000-0000-000000000001',
  'cat-music': '00000000-0000-0000-0000-000000000002',
  'cat-productivity': '00000000-0000-0000-0000-000000000003',
  'cat-ai': '00000000-0000-0000-0000-000000000004',
  'cat-cloud': '00000000-0000-0000-0000-000000000005',
  'cat-education': '00000000-0000-0000-0000-000000000006',
  'cat-fitness': '00000000-0000-0000-0000-000000000007',
  'cat-shopping': '00000000-0000-0000-0000-000000000008',
  'cat-food': '00000000-0000-0000-0000-000000000009',
  'cat-telecom': '00000000-0000-0000-0000-000000000010',
  'cat-finance': '00000000-0000-0000-0000-000000000011',
  'cat-gaming': '00000000-0000-0000-0000-000000000012',
  'cat-news': '00000000-0000-0000-0000-000000000013',
  'cat-utilities': '00000000-0000-0000-0000-000000000014',
  'cat-other': '00000000-0000-0000-0000-000000000015',
};

export const UUID_TO_CATEGORY_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SLUG_TO_UUID).map(([slug, uuid]) => [uuid, slug])
);

// Deterministic UUID mapping for legacy demo IDs so they NEVER generate random shifting UUIDs
export const LEGACY_ID_TO_UUID: Record<string, string> = {
  'sub-1': '22222222-2222-2222-2222-222222222201',
  'sub-2': '22222222-2222-2222-2222-222222222202',
  'sub-3': '22222222-2222-2222-2222-222222222203',
  'sub-4': '22222222-2222-2222-2222-222222222204',
  'sub-5': '22222222-2222-2222-2222-222222222205',
  'sub-6': '22222222-2222-2222-2222-222222222206',
  'inv-1': '33333333-3333-3333-3333-333333333301',
  'notif-1': '44444444-4444-4444-4444-444444444401',
  'notif-2': '44444444-4444-4444-4444-444444444402',
  'wh-1': '55555555-5555-5555-5555-555555555501',
  'usr-demo-1': 'a0000000-0000-0000-0000-000000000001',
};

// Deterministic string-to-UUID generator for any custom legacy strings
function stringToDeterministicUUID(str: string): string {
  let hash1 = 0x811c9dc5;
  let hash2 = 0x22119955;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash1 = (hash1 ^ ch) * 0x01000193;
    hash2 = (hash2 ^ (ch << 1)) * 0x01000193;
  }
  const h1 = Math.abs(hash1).toString(16).padStart(8, '0');
  const h2 = Math.abs(hash2).toString(16).padStart(8, '0');
  const h3 = Math.abs(hash1 ^ hash2).toString(16).padStart(8, '0');
  const h4 = Math.abs((hash1 + hash2) >>> 0).toString(16).padStart(8, '0');
  const full = (h1 + h2 + h3 + h4).slice(0, 32);
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

// Convert any ID into a stable, valid UUID
export function toValidUUID(id?: string | null): string {
  if (!id) {
    return typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : '00000000-0000-4000-a000-000000000000';
  }
  if (isUUID(id)) return id;
  if (LEGACY_ID_TO_UUID[id]) return LEGACY_ID_TO_UUID[id];
  if (CATEGORY_SLUG_TO_UUID[id]) return CATEGORY_SLUG_TO_UUID[id];
  return stringToDeterministicUUID(id);
}

// Robust Category Resolver & Display Name Helper
export function getCategoryName(categories: Category[], categoryId?: string | null): string {
  if (!categoryId) return 'General';
  const found = categories.find(c => 
    c.id === categoryId || 
    c.id === CATEGORY_SLUG_TO_UUID[categoryId] || 
    CATEGORY_SLUG_TO_UUID[c.id] === categoryId ||
    c.id === UUID_TO_CATEGORY_SLUG[categoryId] ||
    UUID_TO_CATEGORY_SLUG[c.id] === categoryId
  );
  return found?.name || 'General';
}

// Helper to check if a category matches active filter
export function matchesCategoryFilter(filterId: string, itemCatId?: string | null): boolean {
  if (!filterId || filterId === 'all' || filterId === 'cat-all') return true;
  if (!itemCatId) return false;
  if (filterId === itemCatId) return true;
  const filterUUID = CATEGORY_SLUG_TO_UUID[filterId] || filterId;
  const itemUUID = CATEGORY_SLUG_TO_UUID[itemCatId] || itemCatId;
  return filterUUID === itemUUID;
}

// Sanitize subscription data to strictly match Supabase schema constraints
export function sanitizeSubscriptionForSupabase(s: Partial<Subscription>, authenticatedUserId: string) {
  if (!isUUID(authenticatedUserId)) {
    throw new Error('An authenticated Supabase user UUID is required to save a subscription.');
  }

  const validId = toValidUUID(s.id);
  const amount = Number(s.amount);
  if (s.amount == null || !Number.isFinite(amount)) {
    throw getSupabaseError({ code: 'INVALID_AMOUNT', message: 'Subscription amount must be a finite number.' });
  }
  if (!s.service_name?.trim()) {
    throw getSupabaseError({ code: 'INVALID_SERVICE_NAME', message: 'Subscription service name is required.' });
  }
  
  let validCategoryId: string | null = null;
  if (s.category_id) {
    if (isUUID(s.category_id)) {
      validCategoryId = s.category_id;
    } else if (CATEGORY_SLUG_TO_UUID[s.category_id]) {
      validCategoryId = CATEGORY_SLUG_TO_UUID[s.category_id];
    } else {
      throw getSupabaseError({ code: 'INVALID_CATEGORY_ID', message: 'The selected category ID is not a valid database UUID.' });
    }
  }

  // Catalog templates can be local-only; only persist a template relation when it is a database UUID.
  const validTemplateId = s.template_id && isUUID(s.template_id) ? s.template_id : null;

  const validCycles = ['weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly', 'custom'];
  if (!s.billing_cycle || !validCycles.includes(s.billing_cycle)) {
    throw getSupabaseError({ code: 'INVALID_BILLING_CYCLE', message: 'The selected billing cycle is not supported.' });
  }
  const billing_cycle = s.billing_cycle;

  const validStatuses = ['active', 'trial', 'paused', 'cancelled', 'expired'];
  if (!s.status || !validStatuses.includes(s.status)) {
    throw getSupabaseError({ code: 'INVALID_SUBSCRIPTION_STATUS', message: 'The selected subscription status is not supported.' });
  }
  const status = s.status;

  return {
    id: validId,
    user_id: authenticatedUserId,
    category_id: validCategoryId,
    template_id: validTemplateId,
    service_name: s.service_name.trim(),
    logo_url: s.logo_url || null,
    plan_name: s.plan_name || 'Standard Plan',
    amount,
    currency: s.currency || 'INR',
    billing_cycle,
    custom_interval: s.custom_interval ?? null,
    start_date: s.start_date || new Date().toISOString().split('T')[0],
    next_billing_date: s.next_billing_date || new Date().toISOString().split('T')[0],
    trial_end_date: s.trial_end_date || null,
    status,
    payment_method_label: s.payment_method_label || null,
    reminder_preferences: Array.isArray(s.reminder_preferences) ? s.reminder_preferences : [7, 3, 1],
    notes: s.notes || null,
    website_url: s.website_url || null,
    created_at: s.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Convert Supabase row into frontend Subscription model
export function mapSupabaseSubscriptionToFrontend(row: any): Subscription {
  return {
    id: row.id,
    user_id: row.user_id,
    category_id: row.category_id ? (UUID_TO_CATEGORY_SLUG[row.category_id] || row.category_id) : 'cat-other',
    template_id: row.template_id,
    service_name: row.service_name,
    logo_url: row.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
    plan_name: row.plan_name || 'Standard Plan',
    amount: Number(row.amount) || 0,
    currency: row.currency || 'INR',
    billing_cycle: row.billing_cycle || 'monthly',
    start_date: row.start_date || new Date().toISOString().split('T')[0],
    next_billing_date: row.next_billing_date || new Date().toISOString().split('T')[0],
    trial_end_date: row.trial_end_date,
    status: row.status || 'active',
    payment_method_label: row.payment_method_label || 'Default Method',
    reminder_preferences: Array.isArray(row.reminder_preferences) ? row.reminder_preferences : [7, 3, 1],
    notes: row.notes || '',
    website_url: row.website_url || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Initial mock seeded user data for instant marvelous demo experience
export const INITIAL_USER: UserProfile = {
  id: 'a0000000-0000-0000-0000-000000000001',
  email: 'ananyarkoshe@gmail.com',
  full_name: 'Ananya Koshe',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  role: 'admin',
  approval_status: 'approved',
  preferred_currency: 'INR',
  timezone: 'Asia/Kolkata',
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
};

export const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: '22222222-2222-2222-2222-222222222201',
    user_id: 'a0000000-0000-0000-0000-000000000001',
    template_id: '0ed49a6c-31af-4d24-9312-74bb0dc7ac9d',
    category_id: 'cat-entertainment',
    service_name: 'Netflix',
    logo_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=100&auto=format&fit=crop&q=80',
    plan_name: 'Premium 4K',
    amount: 649,
    currency: 'INR',
    billing_cycle: 'monthly',
    start_date: '2025-01-15',
    next_billing_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    status: 'active',
    payment_method_label: 'HDFC Credit Card ending 4829',
    reminder_preferences: [7, 3, 1],
    notes: 'Shared with family members',
    website_url: 'https://www.netflix.com',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222202',
    user_id: 'a0000000-0000-0000-0000-000000000001',
    template_id: '60717214-1ab1-41cd-ade7-e2a742dd0171',
    category_id: 'cat-ai',
    service_name: 'ChatGPT Plus',
    logo_url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=100&auto=format&fit=crop&q=80',
    plan_name: 'Monthly Plus',
    amount: 20,
    currency: 'USD',
    billing_cycle: 'monthly',
    start_date: '2025-02-10',
    next_billing_date: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
    status: 'active',
    payment_method_label: 'ICICI Visa ending 9102',
    reminder_preferences: [3, 1],
    notes: 'Used daily for coding and writing assistant',
    website_url: 'https://openai.com/chatgpt',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222203',
    user_id: 'a0000000-0000-0000-0000-000000000001',
    template_id: '3395f451-6fcd-4c1c-95f5-f7a1b7e160f2',
    category_id: 'cat-music',
    service_name: 'Spotify Premium',
    logo_url: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=100&auto=format&fit=crop&q=80',
    plan_name: 'Individual Plan',
    amount: 119,
    currency: 'INR',
    billing_cycle: 'monthly',
    start_date: '2024-11-01',
    next_billing_date: new Date(Date.now() + 18 * 86400000).toISOString().split('T')[0],
    status: 'active',
    payment_method_label: 'UPI Autopay',
    reminder_preferences: [3, 1],
    notes: 'Ad-free lossless audio streaming',
    website_url: 'https://www.spotify.com',
    created_at: new Date(Date.now() - 150 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222204',
    user_id: 'a0000000-0000-0000-0000-000000000001',
    template_id: undefined,
    category_id: 'cat-ai',
    service_name: 'GitHub Copilot',
    logo_url: 'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=100&auto=format&fit=crop&q=80',
    plan_name: 'Individual Monthly',
    amount: 10,
    currency: 'USD',
    billing_cycle: 'monthly',
    start_date: '2025-01-01',
    next_billing_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    status: 'active',
    payment_method_label: 'PayPal',
    reminder_preferences: [3, 1],
    notes: 'Essential AI pair programmer',
    website_url: 'https://github.com/features/copilot',
    created_at: new Date(Date.now() - 100 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222205',
    user_id: 'a0000000-0000-0000-0000-000000000001',
    template_id: undefined,
    category_id: 'cat-shopping',
    service_name: 'Amazon Prime',
    logo_url: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=100&auto=format&fit=crop&q=80',
    plan_name: 'Annual Membership',
    amount: 1499,
    currency: 'INR',
    billing_cycle: 'yearly',
    start_date: '2024-05-12',
    next_billing_date: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
    status: 'active',
    payment_method_label: 'Amazon Pay Balance',
    reminder_preferences: [14, 7, 1],
    notes: 'Includes Prime Video, fast delivery, and Music',
    website_url: 'https://www.amazon.in',
    created_at: new Date(Date.now() - 200 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222206',
    user_id: 'a0000000-0000-0000-0000-000000000001',
    template_id: undefined,
    category_id: 'cat-cloud',
    service_name: 'Supabase Pro',
    logo_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=100&auto=format&fit=crop&q=80',
    plan_name: 'Pro Tier',
    amount: 25,
    currency: 'USD',
    billing_cycle: 'monthly',
    start_date: '2025-02-01',
    next_billing_date: new Date(Date.now() + 22 * 86400000).toISOString().split('T')[0],
    status: 'active',
    payment_method_label: 'Stripe Credit Card',
    reminder_preferences: [3, 1],
    notes: 'Database hosting & auth for production SaaS',
    website_url: 'https://supabase.com',
    created_at: new Date(Date.now() - 80 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '44444444-4444-4444-4444-444444444401',
    user_id: 'a0000000-0000-0000-0000-000000000001',
    subscription_id: '22222222-2222-2222-2222-222222222204',
    notification_type: 'renewal_reminder',
    message: 'GitHub Copilot subscription renews in 2 days ($10.00)',
    scheduled_at: new Date().toISOString(),
    status: 'pending',
  },
  {
    id: '44444444-4444-4444-4444-444444444402',
    user_id: 'a0000000-0000-0000-0000-000000000001',
    subscription_id: '22222222-2222-2222-2222-222222222201',
    notification_type: 'renewal_reminder',
    message: 'Netflix Premium subscription renews in 4 days (₹649)',
    scheduled_at: new Date().toISOString(),
    status: 'pending',
  }
];

export const INITIAL_WEBHOOKS: WebhookEndpoint[] = [
  {
    id: '55555555-5555-5555-5555-555555555501',
    user_id: 'a0000000-0000-0000-0000-000000000001',
    endpoint_url: 'https://api.mycompany.com/webhooks/subscriptions',
    subscribed_events: ['subscription.created', 'subscription.renewal_approaching', 'invoice.parsed'],
    signing_secret: 'whsec_tms_98f7a6b5c4d3e2f1',
    enabled: true,
    created_at: new Date().toISOString(),
  }
];

export interface SupabaseOperationError {
  code: string | null;
  message: string;
  details: string | null;
  hint: string | null;
}

export const GOOGLE_OAUTH_PENDING_KEY = 'tms.google-oauth-pending';

export function getSupabaseError(error: unknown): SupabaseOperationError {
  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>;
    return {
      code: typeof candidate.code === 'string' ? candidate.code : null,
      message: typeof candidate.message === 'string' ? candidate.message : 'An unexpected Supabase error occurred.',
      details: typeof candidate.details === 'string' ? candidate.details : null,
      hint: typeof candidate.hint === 'string' ? candidate.hint : null,
    };
  }

  return {
    code: null,
    message: error instanceof Error ? error.message : String(error),
    details: null,
    hint: null,
  };
}

export function normalizeEmail(email: string): string {
  return email
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();
}

export function isValidEmailAddress(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function formatSupabaseError(error: unknown): string {
  const { code, message, details, hint } = getSupabaseError(error);
  const authError = `${code ?? ''} ${message}`.toLowerCase();
  if (code === 'ACCOUNT_NOT_APPROVED') {
    if (message.includes("'pending'")) {
      return 'Your account is awaiting administrator approval. You can sign in after your access is approved.';
    }
    if (message.includes("'rejected'")) {
      return 'Your access request was rejected. Contact an administrator if you believe this is a mistake.';
    }
    if (message.includes("'suspended'")) {
      return 'Your account is suspended. Contact an administrator for help restoring access.';
    }
  }
  if (code === 'provider_disabled' || /provider.*(?:not enabled|disabled)/.test(authError)) {
    return 'Google sign-in is not enabled for this Supabase project. Enable the Google provider in Supabase Authentication settings.';
  }
  if (/redirect_uri|redirect url mismatch|redirect_uri_mismatch/.test(authError)) {
    return 'Google sign-in could not complete because the redirect URL does not match. Check the OAuth callback URL in Google Cloud and the allowed redirect URLs in Supabase.';
  }
  if (/invalid_grant|flow_state|pkce|authorization code|oauth state/.test(authError)) {
    return 'The Google sign-in response expired or was invalid. Start Google sign-in again.';
  }
  if (/network|failed to fetch|fetch failed/.test(authError)) {
    return 'Could not connect to Supabase to start Google sign-in. Check your internet connection and try again.';
  }

  if (code === 'email_address_invalid') {
    return 'Supabase Auth rejected this email address. Check its spelling and try again. If the address is correct, check your Supabase Auth email provider and address restrictions.';
  }

  return [
    `Code: ${code ?? 'not provided'}`,
    `Message: ${message}`,
    `Details: ${details ?? 'not provided'}`,
    `Hint: ${hint ?? 'not provided'}`,
  ].join(' | ');
}

function throwOnSupabaseError(error: unknown): void {
  if (error) {
    throw getSupabaseError(error);
  }
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  throwOnSupabaseError(error);
  if (!data.user) {
    throw getSupabaseError({ code: 'AUTH_REQUIRED', message: 'A valid Supabase session is required.' });
  }
  return data.user;
}

async function signOutCurrentUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  throwOnSupabaseError(error);
}

function profileFromAuthUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Omit<UserProfile, 'role' | 'approval_status' | 'preferred_currency' | 'timezone' | 'created_at' | 'updated_at'> {
  const metadataName = user.user_metadata?.full_name;
  const metadataAvatar = user.user_metadata?.avatar_url;
  return {
    id: user.id,
    email: user.email || '',
    full_name: typeof metadataName === 'string' && metadataName.trim()
      ? metadataName.trim()
      : (user.email || 'user').split('@')[0],
    ...(typeof metadataAvatar === 'string' ? { avatar_url: metadataAvatar } : {}),
  };
}

async function ensureProfileForAuthUser(user: Awaited<ReturnType<typeof getAuthenticatedUser>>): Promise<UserProfile> {
  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  throwOnSupabaseError(selectError);

  if (existing) {
    const profile = existing as UserProfile;
    return { ...profile, preferences: mergeUserPreferences(profile.preferences) };
  }

  if (user.email) {
    const { data: emailProfile, error: emailError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', user.email)
      .maybeSingle();
    throwOnSupabaseError(emailError);
    if (emailProfile && emailProfile.id !== user.id) {
      throw getSupabaseError({
        code: 'PROFILE_AUTH_ID_MISMATCH',
        message: 'A profile already exists for this email with a different ID. Apply migration 20261028010000_reconcile_auth_profile_ids.sql in the Supabase SQL Editor, then sign in again.',
        details: `Profile ID ${emailProfile.id} does not match Auth user ID ${user.id}.`,
        hint: 'The migration updates existing profile IDs to the matching Supabase Auth UUID and cascades linked foreign keys.',
      });
    }
  }

  const profile = profileFromAuthUser(user);
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select('*')
    .single();
  if (error?.code === '23505') {
    throw getSupabaseError({
      ...error,
      message: 'A profile already exists for this email with a different ID. Apply migration 20261028010000_reconcile_auth_profile_ids.sql in the Supabase SQL Editor, then sign in again.',
      hint: 'The migration reconciles existing profile IDs to Supabase Auth UUIDs and cascades linked foreign keys.',
    });
  }
  throwOnSupabaseError(error);
  const createdProfile = data as UserProfile;
  return { ...createdProfile, preferences: mergeUserPreferences(createdProfile.preferences) };
}

// Supabase Auth-backed database service. Local demo data is not used as a fallback for live operations.
export const db = {
  signUp: async (email: string, password: string, fullName: string) => {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmailAddress(normalizedEmail)) {
      throw getSupabaseError({ code: 'email_address_invalid', message: 'Email address invalid.' });
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    throwOnSupabaseError(error);

    if (data.user && data.session) {
      const profile = await ensureProfileForAuthUser(data.user);
      return { user: profile, requiresEmailConfirmation: false };
    }

    return { user: null, requiresEmailConfirmation: Boolean(data.user) };
  },

  signIn: async (email: string, password: string): Promise<UserProfile> => {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmailAddress(normalizedEmail)) {
      throw getSupabaseError({ code: 'email_address_invalid', message: 'Email address invalid.' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    throwOnSupabaseError(error);
    if (!data.user) {
      throw getSupabaseError({ code: 'AUTH_USER_MISSING', message: 'Supabase Auth returned no user for this session.' });
    }

    const profile = await ensureProfileForAuthUser(data.user);
    if (profile.approval_status !== 'approved') {
      await signOutCurrentUser();
      throw getSupabaseError({
        code: 'ACCOUNT_NOT_APPROVED',
        message: `Account status is '${profile.approval_status}'. An administrator must approve your access before you can log in.`,
      });
    }
    return profile;
  },

  signInWithGoogle: async (): Promise<void> => {
    window.sessionStorage.setItem(GOOGLE_OAUTH_PENDING_KEY, String(Date.now()));
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        window.sessionStorage.removeItem(GOOGLE_OAUTH_PENDING_KEY);
        throw getSupabaseError(error);
      }
    } catch (error) {
      window.sessionStorage.removeItem(GOOGLE_OAUTH_PENDING_KEY);
      throw error;
    }
  },

  connectGoogleAccount: async (): Promise<void> => {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    throwOnSupabaseError(error);
  },

  getAuthAccountInfo: async (): Promise<{ providers: string[]; lastSignInAt: string | null }> => {
    const authUser = await getAuthenticatedUser();
    const metadataProviders = authUser.app_metadata.providers;
    const providers = new Set<string>(
      Array.isArray(metadataProviders) ? metadataProviders.filter((provider): provider is string => typeof provider === 'string') : []
    );
    for (const identity of authUser.identities || []) {
      providers.add(identity.provider);
    }
    if (typeof authUser.app_metadata.provider === 'string') {
      providers.add(authUser.app_metadata.provider);
    }
    return {
      providers: Array.from(providers),
      lastSignInAt: authUser.last_sign_in_at || null,
    };
  },

  changePassword: async (password: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password });
    throwOnSupabaseError(error);
  },

  uploadProfileAvatar: async (file: File): Promise<string> => {
    const user = await getAuthenticatedUser();
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      throw getSupabaseError({
        code: 'INVALID_AVATAR',
        message: 'Choose a JPEG, PNG, WebP, or GIF image under 5 MB.',
      });
    }

    const objectPath = `${user.id}/avatar`;
    const { error } = await supabase.storage
      .from('profile-avatars')
      .upload(objectPath, file, { cacheControl: '3600', contentType: file.type, upsert: true });
    throwOnSupabaseError(error);
    const { data: publicUrl } = supabase.storage.from('profile-avatars').getPublicUrl(objectPath);
    const avatarUrl = `${publicUrl.publicUrl}?updated=${Date.now()}`;
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    throwOnSupabaseError(profileError);
    return avatarUrl;
  },

  removeProfileAvatar: async (): Promise<void> => {
    const user = await getAuthenticatedUser();
    const { error: storageError } = await supabase.storage
      .from('profile-avatars')
      .remove([`${user.id}/avatar`]);
    throwOnSupabaseError(storageError);
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    throwOnSupabaseError(profileError);
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmailAddress(normalizedEmail)) {
      throw getSupabaseError({ code: 'email_address_invalid', message: 'Email address invalid.' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: window.location.origin,
    });
    throwOnSupabaseError(error);
  },

  completePasswordReset: async (password: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password });
    throwOnSupabaseError(error);
    await signOutCurrentUser();
  },

  signOut: async () => {
    await signOutCurrentUser();
  },

  getAuthenticatedProfile: async (): Promise<UserProfile> => {
    const authUser = await getAuthenticatedUser();
    const profile = await ensureProfileForAuthUser(authUser);
    if (profile.approval_status !== 'approved') {
      await signOutCurrentUser();
      throw getSupabaseError({
        code: 'ACCOUNT_NOT_APPROVED',
        message: `Account status is '${profile.approval_status}'. An administrator must approve your access before you can log in.`,
      });
    }
    return profile;
  },

  updateUserProfile: async (profile: UserProfile): Promise<UserProfile> => {
    const authUser = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        preferred_currency: profile.preferred_currency,
        timezone: profile.timezone,
        preferences: mergeUserPreferences(profile.preferences),
        updated_at: new Date().toISOString(),
      })
      .eq('id', authUser.id)
      .select('*')
      .single();
    throwOnSupabaseError(error);
    const savedProfile = data as UserProfile;
    return { ...savedProfile, preferences: mergeUserPreferences(savedProfile.preferences) };
  },

  // Subscriptions - Live Read & Mutate
  fetchSubscriptions: async (): Promise<Subscription[]> => {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    throwOnSupabaseError(error);
    return (data || []).map(mapSupabaseSubscriptionToFrontend);
  },

  addSubscription: async (sub: Subscription): Promise<Subscription> => {
    const user = await getAuthenticatedUser();
    const sanitized = sanitizeSubscriptionForSupabase(sub, user.id);
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(sanitized)
      .select('*')
      .single();
    throwOnSupabaseError(error);
    return mapSupabaseSubscriptionToFrontend(data);
  },

  updateSubscription: async (sub: Subscription): Promise<Subscription> => {
    const user = await getAuthenticatedUser();
    const sanitized = sanitizeSubscriptionForSupabase(sub, user.id);
    const { id, user_id: _userId, created_at: _createdAt, ...updates } = sanitized;
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();
    throwOnSupabaseError(error);
    return mapSupabaseSubscriptionToFrontend(data);
  },

  deleteSubscription: async (id: string): Promise<void> => {
    const user = await getAuthenticatedUser();
    if (!isUUID(id)) throw getSupabaseError({ code: 'INVALID_UUID', message: 'A valid subscription UUID is required.' });
    const { data, error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .single();
    throwOnSupabaseError(error);
    if (!data) throw getSupabaseError({ code: 'ROW_NOT_FOUND', message: 'Subscription was not found for the authenticated user.' });
  },

  bulkDeleteSubscriptions: async (ids: string[]): Promise<void> => {
    const user = await getAuthenticatedUser();
    if (ids.some(id => !isUUID(id))) {
      throw getSupabaseError({ code: 'INVALID_UUID', message: 'All subscription IDs must be valid UUIDs.' });
    }
    if (ids.length === 0) return;
    const { data, error } = await supabase
      .from('subscriptions')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id)
      .select('id');
    throwOnSupabaseError(error);
    if (data?.length !== ids.length) {
      throw getSupabaseError({
        code: 'ROW_NOT_FOUND',
        message: 'One or more subscriptions were not found for the authenticated user; no local changes were made.',
        details: `Requested ${ids.length}; deleted ${data?.length || 0}.`,
      });
    }
  },

  // Categories
  fetchCategories: async (): Promise<Category[]> => {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order('name', { ascending: true });
    throwOnSupabaseError(error);
    const allOption: Category = { id: 'cat-all', name: 'All', icon: 'LayoutGrid', color: '#172B3A' };
    const fetched: Category[] = (data || []).map(d => ({
      id: UUID_TO_CATEGORY_SLUG[d.id] || d.id,
      user_id: d.user_id,
      name: d.name,
      icon: d.icon || 'Tag',
      color: d.color || '#7657E8',
    }));
    return [allOption, ...fetched];
  },

  addCategory: async (cat: Category): Promise<Category> => {
    const user = await getAuthenticatedUser();
    const sanitizedCat = {
      id: toValidUUID(cat.id),
      user_id: user.id,
      name: cat.name,
      icon: cat.icon || 'Tag',
      color: cat.color || '#7657E8',
    };
    const { data, error } = await supabase
      .from('categories')
      .insert(sanitizedCat)
      .select('*')
      .single();
    throwOnSupabaseError(error);
    return { ...cat, id: data.id, user_id: data.user_id };
  },

  deleteCategory: async (id: string): Promise<void> => {
    const user = await getAuthenticatedUser();
    const targetId = CATEGORY_SLUG_TO_UUID[id] || id;
    if (!isUUID(targetId)) throw getSupabaseError({ code: 'INVALID_UUID', message: 'A valid category UUID is required.' });
    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', targetId)
      .eq('user_id', user.id)
      .select('id')
      .single();
    throwOnSupabaseError(error);
    if (!data) throw getSupabaseError({ code: 'ROW_NOT_FOUND', message: 'Category was not found for the authenticated user.' });
  },

  // Invoices
  fetchInvoices: async (): Promise<Invoice[]> => {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    throwOnSupabaseError(error);
    return (data || []) as Invoice[];
  },

  addInvoice: async (inv: Invoice): Promise<Invoice> => {
    const user = await getAuthenticatedUser();
    const subscriptionId = inv.subscription_id ? toValidUUID(inv.subscription_id) : null;
    const amount = Number(inv.amount);
    if (inv.amount == null || !Number.isFinite(amount)) {
      throw getSupabaseError({ code: 'INVALID_AMOUNT', message: 'Invoice amount must be a finite number.' });
    }
    if (!inv.merchant_name?.trim()) {
      throw getSupabaseError({ code: 'INVALID_MERCHANT_NAME', message: 'Invoice merchant name is required.' });
    }
    const taxAmount = inv.tax_amount == null ? null : Number(inv.tax_amount);
    if (taxAmount !== null && !Number.isFinite(taxAmount)) {
      throw getSupabaseError({ code: 'INVALID_TAX_AMOUNT', message: 'Invoice tax amount must be a finite number.' });
    }
    const sanitized = {
      id: toValidUUID(inv.id),
      user_id: user.id,
      subscription_id: subscriptionId && isUUID(subscriptionId) ? subscriptionId : null,
      invoice_number: inv.invoice_number || `INV-${Date.now()}`,
      merchant_name: inv.merchant_name.trim(),
      invoice_date: inv.invoice_date || new Date().toISOString().split('T')[0],
      amount,
      currency: inv.currency || 'INR',
      tax_amount: taxAmount,
      billing_period_start: inv.billing_period_start || null,
      billing_period_end: inv.billing_period_end || null,
      parsing_status: inv.parsing_status || 'success',
      extracted_data: inv.extracted_data ?? null,
    };
    const { data, error } = await supabase
      .from('invoices')
      .insert(sanitized)
      .select('*')
      .single();
    throwOnSupabaseError(error);
    return data as Invoice;
  },

  // Notifications
  fetchNotifications: async (): Promise<NotificationItem[]> => {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: false });
    throwOnSupabaseError(error);
    return (data || []) as NotificationItem[];
  },

  updateNotificationStatus: async (id: string, status: string): Promise<void> => {
    const user = await getAuthenticatedUser();
    if (!isUUID(id)) throw getSupabaseError({ code: 'INVALID_UUID', message: 'A valid notification UUID is required.' });
    const { data, error } = await supabase
      .from('notifications')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .single();
    throwOnSupabaseError(error);
    if (!data) throw getSupabaseError({ code: 'ROW_NOT_FOUND', message: 'Notification was not found for the authenticated user.' });
  },

  // Webhooks
  fetchWebhooks: async (): Promise<WebhookEndpoint[]> => {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    throwOnSupabaseError(error);
    return (data || []) as WebhookEndpoint[];
  },

  addWebhook: async (hook: WebhookEndpoint): Promise<WebhookEndpoint> => {
    const user = await getAuthenticatedUser();
    const sanitized = {
      id: toValidUUID(hook.id),
      user_id: user.id,
      endpoint_url: hook.endpoint_url,
      subscribed_events: hook.subscribed_events,
      signing_secret: hook.signing_secret,
      enabled: hook.enabled,
    };
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .insert(sanitized)
      .select('*')
      .single();
    throwOnSupabaseError(error);
    return data as WebhookEndpoint;
  },

  deleteWebhook: async (id: string): Promise<void> => {
    const user = await getAuthenticatedUser();
    if (!isUUID(id)) throw getSupabaseError({ code: 'INVALID_UUID', message: 'A valid webhook UUID is required.' });
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .single();
    throwOnSupabaseError(error);
    if (!data) throw getSupabaseError({ code: 'ROW_NOT_FOUND', message: 'Webhook was not found for the authenticated user.' });
  },

  // Profiles
  fetchAllUsers: async (): Promise<UserProfile[]> => {
    await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    throwOnSupabaseError(error);
    return (data || []) as UserProfile[];
  },

  updateUserApprovalStatus: async (id: string, status: UserProfile['approval_status']): Promise<UserProfile> => {
    const authUser = await getAuthenticatedUser();
    if (!isUUID(id)) throw getSupabaseError({ code: 'INVALID_UUID', message: 'A valid profile UUID is required.' });
    const { data, error } = await supabase
      .from('profiles')
      .update({ approval_status: status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    throwOnSupabaseError(error);
    if (id === authUser.id && status !== 'approved') {
      await signOutCurrentUser();
    }
    return data as UserProfile;
  },

  updateUserRole: async (id: string, role: UserProfile['role']): Promise<UserProfile> => {
    await getAuthenticatedUser();
    if (!isUUID(id)) throw getSupabaseError({ code: 'INVALID_UUID', message: 'A valid profile UUID is required.' });
    const { data, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    throwOnSupabaseError(error);
    return data as UserProfile;
  }
};
