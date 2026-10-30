# Project Overview: Track My Subscription

## 1. Executive Summary
"Track My Subscription" is a next-generation SaaS and recurring expense management platform built for individuals, power users, and enterprise teams. The application provides centralized monitoring of recurring monthly and yearly software subscriptions, proactive renewal alerts, multi-currency conversion (INR, USD, EUR, GBP, AED), AI-powered invoice OCR parsing, automated webhook integrations, and role-based access control with administrative approval workflows.

## 2. Core Objectives
- **Expense Visibility**: Provide a unified dashboard showing total monthly/yearly spending, active subscriptions, and renewal timelines.
- **Proactive Management**: Prevent unwanted auto-renewals through automated reminder alerts.
- **AI & Automation**: Extract receipt/invoice line items via AI and interact with an intelligent financial assistant.
- **Enterprise Security**: Implement robust role-based access control (RBAC) requiring administrative approval for user accounts.
- **Supabase Backend**: Fully integrate with Supabase for persistent data storage across profiles, categories, subscriptions, invoices, notifications, and webhooks.

## 3. Key User Roles
- **User**: Can manage their personal subscription portfolio, add/edit subscriptions, view analytics, parse invoices, chat with the AI assistant, and configure webhooks.
- **Admin**: Has all user capabilities plus access to the Admin & Access Control Dashboard to review pending registrations, approve or suspend user access, and manage user roles.

## 4. Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons.
- **Build Tool**: Vite.
- **Backend / DB**: Supabase (PostgreSQL with Row Level Security).
- **Hosting / Runtime**: Node.js / Express development server with Vite middleware.
