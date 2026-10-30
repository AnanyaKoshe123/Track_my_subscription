# Database and Data Model Specification: Track My Subscription

## 1. Identified Database Tables (PostgreSQL / Supabase)
- **`profiles`**: Extends `auth.users` with user metadata (`id`, `email`, `full_name`, `avatar_url`, `role`, `approval_status`, `preferred_currency`, `timezone`, timestamps).
- **`categories`**: Expense categorization (`id`, `user_id`, `name`, `icon`, `color`, `created_at`).
- **`subscription_templates`**: Pre-seeded catalog of SaaS services (`id`, `service_name`, `slug`, `logo_url`, `category_id`, `country_code`, `supported_currencies`, `indicative_price`, `billing_options`, `official_website`, `is_active`).
- **`subscriptions`**: Active user subscriptions (`id`, `user_id`, `template_id`, `category_id`, `service_name`, `logo_url`, `plan_name`, `amount`, `currency`, `billing_cycle`, `start_date`, `next_billing_date`, `status`, `payment_method_label`, `notes`, `website_url`, timestamps).
- **`invoices`**: Parsed invoice records (`id`, `user_id`, `subscription_id`, `invoice_number`, `merchant_name`, `invoice_date`, `amount`, `currency`, `tax_amount`, `parsing_status`, timestamps).
- **`notifications`**: Renewal alerts (`id`, `user_id`, `subscription_id`, `notification_type`, `message`, `scheduled_at`, `status`).
- **`webhook_endpoints`**: Outbound webhooks (`id`, `user_id`, `endpoint_url`, `subscribed_events`, `signing_secret`, `enabled`, `created_at`).
- **`audit_logs`**: Admin action tracking (`id`, `actor_user_id`, `action`, `target_user_id`, `metadata`, `created_at`).

## 2. Row Level Security (RLS) Policies
- Enabled on all tables (`profiles`, `categories`, `subscriptions`, `invoices`, `notifications`, `webhook_endpoints`, `audit_logs`).
- Users can CRUD their own records (`auth.uid() = user_id`).
- Admins can view and approve all user profiles and view audit logs.
