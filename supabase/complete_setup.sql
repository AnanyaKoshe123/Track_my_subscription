-- ============================================================================
-- TRACK MY SUBSCRIPTION - COMPLETE SUPABASE SETUP SCRIPT
-- Run this entire script in your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
    preferred_currency TEXT NOT NULL DEFAULT 'INR',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Tag',
    color TEXT NOT NULL DEFAULT '#7657E8',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Subscription Templates Catalog
CREATE TABLE IF NOT EXISTS public.subscription_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT NOT NULL,
    category_id UUID,
    country_code TEXT NOT NULL DEFAULT 'GLOBAL',
    supported_currencies TEXT[] NOT NULL DEFAULT ARRAY['INR', 'USD'],
    indicative_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    billing_options TEXT[] NOT NULL DEFAULT ARRAY['monthly'],
    official_website TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. User Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    template_id UUID,
    category_id UUID,
    service_name TEXT NOT NULL,
    logo_url TEXT,
    plan_name TEXT NOT NULL DEFAULT 'Standard',
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    custom_interval INTEGER,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    next_billing_date DATE NOT NULL,
    trial_end_date DATE,
    status TEXT NOT NULL DEFAULT 'active',
    payment_method_label TEXT,
    reminder_preferences INTEGER[] NOT NULL DEFAULT ARRAY[7, 3, 1],
    notes TEXT,
    website_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    subscription_id UUID,
    storage_path TEXT,
    invoice_number TEXT,
    merchant_name TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    tax_amount NUMERIC(10, 2),
    billing_period_start DATE,
    billing_period_end DATE,
    parsing_status TEXT NOT NULL DEFAULT 'success',
    extracted_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    subscription_id UUID,
    notification_type TEXT NOT NULL DEFAULT 'renewal_reminder',
    message TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending'
);

-- 7. Webhook Endpoints Table
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    endpoint_url TEXT NOT NULL,
    subscribed_events TEXT[] NOT NULL DEFAULT ARRAY['subscription.created'],
    signing_secret TEXT NOT NULL DEFAULT 'whsec_tms_secret',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID,
    action TEXT NOT NULL,
    target_user_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Apply supabase/migrations in timestamp order to install the Auth trigger,
-- user-scoped policies, and foreign keys before connecting the application.

-- Seed Categories
INSERT INTO public.categories (id, name, icon, color) VALUES
('00000000-0000-0000-0000-000000000001', 'Entertainment', 'Film', '#E5484D'),
('00000000-0000-0000-0000-000000000002', 'Music', 'Music', '#12B886'),
('00000000-0000-0000-0000-000000000003', 'Productivity', 'Briefcase', '#7657E8'),
('00000000-0000-0000-0000-000000000004', 'AI Tools', 'Sparkles', '#F59E0B'),
('00000000-0000-0000-0000-000000000005', 'Cloud and Hosting', 'Cloud', '#004547')
ON CONFLICT (id) DO NOTHING;

-- Seed Templates Catalog
INSERT INTO public.subscription_templates (service_name, slug, logo_url, category_id, country_code, supported_currencies, indicative_price, billing_options, official_website) VALUES
('Netflix', 'netflix', 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=100&auto=format&fit=crop&q=80', '00000000-0000-0000-0000-000000000001', 'GLOBAL', ARRAY['INR', 'USD'], 649.00, ARRAY['monthly'], 'https://www.netflix.com'),
('Spotify Premium', 'spotify', 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=100&auto=format&fit=crop&q=80', '00000000-0000-0000-0000-000000000002', 'GLOBAL', ARRAY['INR', 'USD'], 119.00, ARRAY['monthly', 'yearly'], 'https://www.spotify.com'),
('ChatGPT Plus', 'chatgpt', 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=100&auto=format&fit=crop&q=80', '00000000-0000-0000-0000-000000000004', 'GLOBAL', ARRAY['USD', 'INR'], 20.00, ARRAY['monthly'], 'https://openai.com/chatgpt')
ON CONFLICT (slug) DO NOTHING;
