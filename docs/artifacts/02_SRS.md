# Software Requirements Specification (SRS): Track My Subscription

## 1. Scope and Boundaries
- **In-Scope**: Subscription portfolio management, multi-currency conversion, renewal timeline alerts, AI invoice parsing, webhook management, pricing tiers, and admin approval workflows.
- **Out-of-Scope**: Direct banking API integrations (Plaid/Yodlee) in MVP; payment gateway checkout processing (handled via mock billing or manual entry).

## 2. Functional Requirements (FR)
- **FR-001 [Authentication & Access]**: The system shall require user authentication and admin approval (`approval_status = 'approved'`) before granting access to the main dashboard.
- **FR-002 [Subscription Management]**: Users shall be able to create, read, update, and delete subscription records with fields including service name, plan name, amount, currency, billing cycle, start date, next renewal date, status, and payment method.
- **FR-003 [Multi-Currency Conversion]**: The system shall convert monetary amounts across INR, USD, EUR, GBP, and AED using baseline exchange rates.
- **FR-004 [Category Management]**: Users shall be able to view, add, and delete custom categories with icon and color customization.
- **FR-005 [AI Invoice Parser]**: The system shall parse uploaded invoices/receipts, extract merchant name, invoice date, amount, currency, tax, and billing period, and optionally add them as subscriptions.
- **FR-006 [Renewals & Notifications]**: The system shall generate renewal reminder notifications and allow marking them as read.
- **FR-007 [Webhook Integrations]**: Users shall be able to register, enable/disable, and delete webhook endpoints for event notifications.
- **FR-008 [Admin Dashboard]**: Admins shall be able to view all registered users, approve pending accounts, suspend active users, and toggle admin roles.

## 3. Non-Functional Requirements (NFR)
- **NFR-001 [Performance]**: Page navigation and UI updates shall render within 100ms.
- **NFR-002 [Security]**: Row Level Security (RLS) policies shall ensure users can only access their own data, while admins have elevated privileges.
- **NFR-003 [Reliability]**: LocalStorage persistence shall act as a robust fallback in case of network interruptions.
- **NFR-004 [Responsiveness]**: The layout shall be fully responsive across mobile, tablet, and desktop viewports.
