# User Journeys and Workflow Specifications: Track My Subscription

## 1. Authentication and Access Workflow
1. **User Action**: Loads application URL -> Views Welcome page (`WelcomeView.tsx`).
2. **User Action**: Clicks "Login" -> Opens Auth Modal (`AuthModal.tsx`).
3. **User Action**: Enters email and password, submits form.
4. **System Response**:
   - If existing user and `approval_status === 'approved'`, logs user into Dashboard.
   - If new user, creates account with `approval_status = 'pending'` (unless admin email), displays pending approval notice.
5. **Admin Workflow**:
   - Admin logs in -> Navigates to Admin Panel -> Reviews pending user -> Clicks "Approve".
   - System updates user `approval_status` to `'approved'`, allowing user login.

## 2. Subscription Creation Workflow
1. **User Action**: Clicks "Add Subscription" button in Top Navbar or Subscriptions view.
2. **System Response**: Opens `AddSubscriptionModal.tsx`.
3. **User Action**: Selects template or enters service name, plan, amount, currency, billing cycle, and renewal date.
4. **Validation**: Amount > 0, service name and renewal date required.
5. **Database Operation**: Upserts subscription record to Supabase and local storage state.
6. **Success**: Subscription appears immediately in Dashboard and Subscriptions views.
