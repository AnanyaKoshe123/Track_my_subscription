# Technical Architecture: Track My Subscription

## 1. Frontend Architecture
- **Framework**: React 19 SPA powered by Vite.
- **Styling**: Tailwind CSS v4.
- **Icons**: Lucide React.
- **State Management**: React local state (`useState`, `useEffect`) synchronized with Supabase client and LocalStorage persistence wrapper (`db` in `src/services/supabase.ts`).

## 2. Backend & Database Architecture
- **Database**: Supabase PostgreSQL.
- **Authentication**: Demo sign-in with locally stored user profiles; Supabase Auth is not currently wired.
- **Data Sync**: Asynchronous Supabase table operations with a LocalStorage fallback.

## 3. Environment Configuration
- `VITE_SUPABASE_URL`: Supabase project URL from the project's API settings.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable API key.
