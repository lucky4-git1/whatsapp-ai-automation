# Implementation Roadmap & Modernization Plan — WhatsApp AI Automation

**Project**: WhatsApp AI Automation (Commercial SaaS Upgrade)  
**Author**: Principal SaaS Product Architect  
**Architecture**: React 18, Vite 5, Fastify 4, Prisma ORM, PostgreSQL 18, BullMQ, Redis

---

## 1. Architectural Strategy

Transform the platform from an early-stage prototype into an enterprise-ready WhatsApp Business Automation suite following the official Meta WhatsApp Cloud API specifications.

### Guiding Principles:
1. **Commercial SaaS Craft**: Refined aesthetics, clean visual hierarchy, restrained green accents (`#25D366`), dark slate navigation, no generic AI slop.
2. **Strict Bootstrap 5 Consistency**: Modernized using Bootstrap 5 utilities, CSS custom properties, and responsive drawer navigation. No Tailwind or unnecessary dependencies.
3. **End-to-End Connectivity**: Every interactive control, form, button, and table must communicate with real backend endpoints and persist to PostgreSQL.
4. **Meta Compliance**: Built exclusively for the official Meta WhatsApp Cloud API (Graph API v18.0) with strict 24-hour customer care window compliance, approved template requirements, and consent enforcement.

---

## 2. Priority Phases

### Priority 1: Core Channels, Campaigns & Contacts
- **WhatsApp Connections Onboarding**:
  - Meta Business account registration UI with Phone Number ID, WABA ID, and access token validation.
  - Template synchronization from Meta Graph API.
  - Interactive Test Message modal to verify end-to-end delivery to the admin's personal number.
- **Contact Management & 9-Step Guided Import Wizard**:
  - CSV/XLSX file drag-and-drop.
  - Column auto-detection and field mapping.
  - E.164 phone normalization (including Indian 10-digit mobile `+91` normalization).
  - Duplicate detection and consent tracking (Explicit Opt-In, Implied Opt-In, Opt-Out).
  - Contact tagging and CSV export.
- **Campaign Management & Broadcast Engine**:
  - Backend `campaign.routes.ts` with BullMQ queue dispatching.
  - Frontend 10-step wizard campaign builder: Details → Account → Audience → Template → Variable Mapping → Preview → Test Message → Scheduling → Review → Launch.
  - Campaign lifecycle management: Draft, Scheduled, Running, Paused, Completed, Cancelled.

### Priority 2: Shared Inbox, AI Studio & Analytics
- **Shared WhatsApp Inbox**:
  - 3-pane responsive layout: Conversation List, Chat Canvas, Customer Profile Sidebar.
  - Real-time conversation status filters (Open, Waiting, Escalated, Resolved).
  - 24-hour customer care window status indicator with template fallback warning.
  - Human takeover toggle, agent assignment, and internal team notes.
- **AI Studio Experience**:
  - Promotional campaign copywriting generator with tone selector (Formal, Friendly, Persuasive, Urgent).
  - Bidirectional Telugu (`te`) and English (`en`) translation with WhatsApp character counter.
  - Interactive test sandbox with workspace AI assistant preview.
- **Real Analytics & Intelligence**:
  - Backend `analytics.routes.ts` executing real Prisma aggregations.
  - KPI overview: Total Contacts, Verified Opt-Ins, Total Broadcasts, Delivery Rate (%), Read Rate (%), Avg Response Time.
  - Delivery funnel breakdown: Sent → Delivered → Read → Failed.

### Priority 3: Visual Automation Builder & Navigation Unification
- **Visual Automation Builder (`/automation`)**:
  - Node-based trigger, condition, and action builder.
  - Triggers (Incoming Message, New Contact, Keyword).
  - Conditions (Keyword Match, Tag Check, Business Hours, Consent Check).
  - Actions (Send Template, Send Session Message, Add Tag, Assign Agent, Trigger AI).
  - Workflow execution history and execution step inspector.
- **Unified Navigation Architecture**:
  - Redesign `DashboardLayout` into 11 commercial SaaS sections:
    1. Overview (`/`)
    2. WhatsApp Connections (`/connections`)
    3. Contacts (`/contacts`)
    4. Audiences (`/audiences`)
    5. Campaigns (`/campaigns`)
    6. Automation (`/automation`)
    7. Inbox (`/inbox`)
    8. AI Studio (`/ai-studio`)
    9. Templates (`/templates`)
    10. Analytics (`/analytics`)
    11. Settings (`/settings`)

---

## 3. Execution Schedule & Milestones

1. **Step 1: Backend Infrastructure Extension**:
   - Add `campaign.routes.ts`, `analytics.routes.ts`, and contact bulk import/export endpoints.
   - Register routes in Fastify `server.ts`.
2. **Step 2: Unified Navigation & Layout Redesign**:
   - Update `DashboardLayout.tsx` with modern professional sidebar, workspace badge, user profile menu, and responsive mobile drawer.
   - Configure React Router paths for all 11 core SaaS modules.
3. **Step 3: Priority 1 Module Implementations**:
   - Build `WhatsAppConnectionsPage.tsx` with Live Health, Template Sync, and Test Message.
   - Build `ContactsPage.tsx` with 9-step `ImportWizardModal.tsx` and CSV export.
   - Build `CampaignsPage.tsx` with 10-step `CampaignBuilderModal.tsx`.
4. **Step 4: Priority 2 Module Implementations**:
   - Refactor `InboxPage.tsx` with 24-hour window compliance and AI suggestions.
   - Build `AIStudioPage.tsx` with copy generation and Telugu translation.
   - Build `AnalyticsPage.tsx` with real database metric visualizations.
   - Build `TemplatesPage.tsx` with Meta approved template synchronization.
   - Build `AudiencesPage.tsx` for dynamic contact segmentation.
5. **Step 5: Visual Automation Builder Polish**:
   - Build `AutomationPage.tsx` with node builder, template selector, and execution logs.
6. **Step 6: End-to-End Verification & Commit**:
   - Validate every form, button, and endpoint.
   - Run type-check and full build.
   - Commit all production changes to git.
