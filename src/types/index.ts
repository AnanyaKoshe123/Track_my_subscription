export type UserRole = 'user' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface UserPreferences {
  phone_number: string;
  country_region: string;
  language: string;
  date_format: string;
  first_day_of_week: 'Sunday' | 'Monday';
  notifications: {
    email: boolean;
    browser_push: boolean;
    renewal_reminders: boolean;
    trial_ending_alerts: boolean;
    payment_due_reminders: boolean;
    failed_payment_alerts: boolean;
    weekly_summary: boolean;
    monthly_summary: boolean;
    default_reminder_days: 1 | 3 | 7 | 14;
  };
  subscription: {
    default_expense_view: 'monthly' | 'yearly';
    default_dashboard_view: 'dashboard' | 'subscriptions' | 'renewals';
    default_sort: 'name' | 'price' | 'renewal';
    sort_order: 'ascending' | 'descending';
    show_cancelled: boolean;
    show_trials: boolean;
    group_by_category: boolean;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  approval_status: ApprovalStatus;
  preferred_currency: string;
  timezone: string;
  preferences?: UserPreferences;
  created_at: string;
  updated_at: string;
}

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly' | 'custom';
export type SubscriptionStatus = 'active' | 'trial' | 'paused' | 'cancelled' | 'expired';

export interface Subscription {
  id: string;
  user_id: string;
  template_id?: string;
  category_id: string;
  service_name: string;
  logo_url: string;
  plan_name: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  custom_interval?: number; // in days if custom
  start_date: string;
  next_billing_date: string;
  trial_end_date?: string;
  status: SubscriptionStatus;
  payment_method_label?: string;
  reminder_preferences: number[]; // e.g. [7, 3, 1] days before
  notes?: string;
  website_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id?: string | null;
  name: string;
  icon: string;
  color: string;
  created_at?: string;
}

export interface SubscriptionTemplate {
  id: string;
  service_name: string;
  slug: string;
  logo_url: string;
  category_id: string;
  country_code: string; // 'IN', 'US', 'GLOBAL'
  supported_currencies: string[];
  indicative_price: number;
  billing_options: BillingCycle[];
  official_website: string;
  is_active: boolean;
}

export interface Invoice {
  id: string;
  user_id: string;
  subscription_id?: string;
  storage_path?: string;
  invoice_number?: string;
  merchant_name: string;
  invoice_date: string;
  amount: number;
  currency: string;
  tax_amount?: number;
  billing_period_start?: string;
  billing_period_end?: string;
  parsing_status: 'success' | 'failed' | 'pending';
  extracted_data?: any;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  subscription_id?: string;
  notification_type: 'renewal_reminder' | 'trial_ending' | 'payment_failed' | 'system';
  message: string;
  scheduled_at: string;
  sent_at?: string;
  read_at?: string;
  status: 'pending' | 'sent' | 'read';
}

export interface WebhookEndpoint {
  id: string;
  user_id: string;
  endpoint_url: string;
  subscribed_events: string[];
  signing_secret: string;
  enabled: boolean;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_id: string;
  event_type: string;
  response_status: number;
  attempt_count: number;
  delivered_at: string;
  status: 'success' | 'failed';
}

export interface AiChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ExchangeRate {
  base: string;
  rates: Record<string, number>;
  updated_at: string;
}
