# Test Plan and Test Cases: Track My Subscription

## 1. Test Cases
- **TC-001 [Authentication Approval]**: Verify that unapproved users cannot access the dashboard and see a pending approval notice.
- **TC-002 [Subscription CRUD]**: Verify that users can add, edit, and delete subscription records, updating totals in real-time.
- **TC-003 [Currency Conversion]**: Verify that switching currencies correctly converts amounts using exchange rate multipliers.
- **TC-004 [Category Filtering]**: Verify that selecting a category correctly filters subscriptions in the My Subscriptions view.
- **TC-005 [Admin Panel]**: Verify that admins can approve pending users and toggle user roles.
- **TC-006 [Supabase Persistence]**: Verify that database writes successfully upsert to Supabase tables.
- **TC-007 [Responsive Layout]**: Verify mobile sidebar drawer toggle and grid responsiveness.
