# Module and Feature Specification: Track My Subscription

## 1. Welcome & Authentication Module
- **Purpose**: Landing page introduction and access authorization.
- **Screens**: Welcome View (`WelcomeView.tsx`), Auth Modal (`AuthModal.tsx`).
- **Actions**: Login, Request Access (Signup), Back to Home.
- **Validation**: Email format required, password required, auto-pending state for new non-admin users.

## 2. Dashboard Module
- **Purpose**: High-level portfolio overview.
- **Components**: `DashboardView.tsx`.
- **Features**: Total monthly spending summary, active subscription count, upcoming renewals widget, category breakdown, quick action buttons.

## 3. Subscriptions Module ("My Subscriptions")
- **Purpose**: Comprehensive list and detail management of recurring expenses.
- **Components**: `SubscriptionsView.tsx`, `AddSubscriptionModal.tsx`, `SubscriptionDetailModal.tsx`.
- **Features**: Grid and List views, search, category filter, status filter, billing cycle filter, CSV export, bulk delete, add/edit/delete subscription.

## 4. Renewals & Notifications Module
- **Purpose**: Tracking upcoming renewal dates.
- **Components**: `RenewalsView.tsx`.
- **Features**: List of renewal alerts, mark as read action.

## 5. Analytics Module
- **Purpose**: Visual graphs and spending breakdowns.
- **Components**: `AnalyticsView.tsx`.
- **Features**: Spending by category, spending by billing cycle, currency distribution charts.

## 6. Categories Module
- **Purpose**: Organizing expenses by category.
- **Components**: `CategoriesView.tsx`.
- **Features**: Add category with custom name and color, delete category.

## 7. Invoice OCR Parser Module
- **Purpose**: Parsing receipts and bills.
- **Components**: `InvoiceParserView.tsx`.
- **Features**: Upload invoice files, simulate OCR extraction, view parsed data, add subscription from invoice.

## 8. AI Assistant Module
- **Purpose**: Conversational insights about spending portfolio.
- **Components**: `AIAssistantPanel.tsx`.
- **Features**: Chat drawer, quick prompt chips, smart answers regarding subscription costs and optimization.

## 9. Integrations & Webhooks Module
- **Purpose**: Connecting external services via webhooks.
- **Components**: `IntegrationsView.tsx`.
- **Features**: Add webhook endpoint URL and event subscriptions, view signing secrets, delete endpoints.

## 10. Admin Panel Module
- **Purpose**: User access control and moderation.
- **Components**: `AdminDashboardView.tsx`.
- **Features**: Search users, approve pending users, suspend users, toggle admin role.

## 11. Pricing & Plans Module
- **Purpose**: Subscription tiers and billing upgrade options.
- **Components**: `PricingView.tsx`.
- **Features**: Free, Pro SaaS, and Enterprise Team plans, monthly/yearly billing toggle, enterprise inquiry modal.

## 12. Settings Module
- **Purpose**: User profile and currency preferences.
- **Components**: `SettingsView.tsx`.
- **Features**: Update full name, email, preferred currency, timezone, logout.
