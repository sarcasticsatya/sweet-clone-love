

# Cloudflare Worker Proxy Integration

## Overview
Route all app traffic through your Cloudflare Worker (`https://snowy-hat-87c1.aiwasinc-06d.workers.dev`) so Indian users can access the app without hitting the DNS block on `*.supabase.co`.

## How It Works
No data migration. The proxy is a transparent tunnel:

```text
Student Browser (India)
        |
        v
snowy-hat-87c1.aiwasinc-06d.workers.dev  (not blocked)
        |
        v
lnoeofoucvyopmhcfwes.supabase.co  (blocked client-side only)
```

## Changes

### 1. Create proxy Supabase client (`src/lib/supabaseProxy.ts`)
A new file that creates a Supabase client pointing to `https://snowy-hat-87c1.aiwasinc-06d.workers.dev` instead of the direct backend URL. Uses the same anon key and auth configuration (persistent sessions, auto-refresh tokens).

### 2. Update all 27 files to use proxy client
Every file that currently imports from `@/integrations/supabase/client` will be updated to import from `@/lib/supabaseProxy` instead. This is a simple find-and-replace across these files:

**Pages (10 files):**
- `Auth.tsx`, `StudentDashboard.tsx`, `AdminDashboard.tsx`, `SelectCourse.tsx`, `PaymentStatus.tsx`, `VerifyEmail.tsx`, `NotVerified.tsx`, `UserProfile.tsx`, `ResetPassword.tsx`, `UpdatePassword.tsx`, `Index.tsx`

**Student components (8 files):**
- `ChatPanel.tsx`, `SourcesPanel.tsx`, `FlashcardsView.tsx`, `QuizView.tsx`, `MindmapView.tsx`, `InfographicView.tsx`, `VideosView.tsx`, `ToolsPanel.tsx`

**Admin components (7 files):**
- `ManageStudents.tsx`, `ManageContent.tsx`, `ManageVideos.tsx`, `ManageCourses.tsx`, `ManageCoupons.tsx`, `ManagePayments.tsx`, `ViewReports.tsx`, `DataExport.tsx`

**Hooks (1 file):**
- `use-inactivity-logout.ts`

### 3. No edge function changes needed
Edge functions run server-side (on Supabase/Deno infrastructure), so they are not affected by the India DNS block. They will continue to work as-is.

## What Won't Change
- All data remains in the existing backend -- no migration
- Edge functions remain unchanged (server-side, not blocked)
- The auto-generated `client.ts` and `types.ts` files are left untouched
- Auth flows, RLS policies, storage -- all work identically through the proxy

## After Implementation
You will need to **Publish** the app for the changes to go live. Students in India should then be able to access the app normally.

