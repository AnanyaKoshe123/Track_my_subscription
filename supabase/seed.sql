-- ============================================================================
-- TRACK MY SUBSCRIPTION - SEED DATA
-- ============================================================================

-- Seed shared categories and templates only. User data is created through Supabase Auth.
INSERT INTO public.categories (id, user_id, name, icon, color) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'Entertainment', 'Film', '#E5484D'),
('00000000-0000-0000-0000-000000000002', NULL, 'Music', 'Music', '#12B886'),
('00000000-0000-0000-0000-000000000003', NULL, 'Productivity', 'Briefcase', '#7657E8'),
('00000000-0000-0000-0000-000000000004', NULL, 'AI Tools', 'Sparkles', '#F59E0B'),
('00000000-0000-0000-0000-000000000005', NULL, 'Cloud and Hosting', 'Cloud', '#004547')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;

-- Seed Subscription Templates Catalog
INSERT INTO public.subscription_templates (service_name, slug, logo_url, category_id, country_code, supported_currencies, indicative_price, billing_options, official_website) VALUES
('Netflix', 'netflix', 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=100&auto=format&fit=crop&q=80', '00000000-0000-0000-0000-000000000001', 'GLOBAL', ARRAY['INR', 'USD'], 649.00, ARRAY['monthly'], 'https://www.netflix.com'),
('Spotify Premium', 'spotify', 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=100&auto=format&fit=crop&q=80', '00000000-0000-0000-0000-000000000002', 'GLOBAL', ARRAY['INR', 'USD'], 119.00, ARRAY['monthly', 'yearly'], 'https://www.spotify.com'),
('ChatGPT Plus', 'chatgpt', 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=100&auto=format&fit=crop&q=80', '00000000-0000-0000-0000-000000000004', 'GLOBAL', ARRAY['USD', 'INR'], 20.00, ARRAY['monthly'], 'https://openai.com/chatgpt')
ON CONFLICT (slug) DO UPDATE SET
  indicative_price = EXCLUDED.indicative_price,
  official_website = EXCLUDED.official_website;
