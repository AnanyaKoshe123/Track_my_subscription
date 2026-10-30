# API and Integration Specification: Track My Subscription

## 1. Supabase REST & Realtime API
- **Client Library**: `@supabase/supabase-js`.
- **Endpoints**: Standard Supabase project API (`${VITE_SUPABASE_URL}/rest/v1/...`).
- **Methods**: `.select()`, `.insert()`, `.update()`, `.upsert()`, `.delete()`.
- **Authentication**: Bearer token via publishable client key and user session.

## 2. Outbound Webhooks Integration
- **Purpose**: Notifying external systems on subscription events (`subscription.created`, `subscription.renewal_approaching`, `invoice.parsed`).
- **Headers**: `X-TMS-Signature`, `Content-Type: application/json`.
