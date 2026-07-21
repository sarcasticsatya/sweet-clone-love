## Export Tech Architecture as Downloadable Diagram

Deliver a single downloadable architecture diagram of the Nythic AI platform as a chat artifact (Mermaid `.mmd`, renders inline with light/dark theme). No Lovable references anywhere; Supabase is named where it accurately describes the backend. The backend core is labeled **AIWOS Gateway (Supabase)**.

### Layers shown

1. **Client Layer** — React 18 + Vite + TypeScript + Tailwind + shadcn/ui + React Router + TanStack Query; all app pages (Landing, Auth, Student, Admin, Select Course, Payment Status, Profile, Reset/Update Password, Policies).
2. **Edge / Access Layer** — Cloudflare Worker proxy (`snowy-hat-87c1.workers.dev`) as India access tunnel + CORS handler.
3. **AIWOS Gateway (Supabase backend)** — Auth (JWT, email verification, single-device, 30-min inactivity), PostgreSQL with all core tables, Row-Level Security via `has_role()` SECURITY DEFINER, Storage buckets (chapter PDFs with signed URLs, receipts), Edge Functions runtime.
4. **Edge Functions** — `chat-with-chapter`, `generate-flashcards`, `generate-quiz`/`submit-quiz`, `generate-mindmap`, `generate-infographic`, `extract-pdf-text`, PhonePe trio, email senders, session/student management.
5. **AI Layer — AIWOS AI Gateway** — Google Gemini 2.5 Flash, strict source-bound answering, codepoint-based Kannada/Hindi/English detection, Markdown-only output.
6. **External Integrations** — PhonePe (exclusive payment gateway), Resend (email), YouTube IFrame API (timestamp seeking), GA4 / GTM / Meta Pixel (analytics).

Arrows show real request flow: Browser → Cloudflare Worker → AIWOS Gateway → (DB / Storage / Edge Functions → Gemini + External APIs), plus the PhonePe → webhook return path.

### Deliverable

- File: `/mnt/documents/AIWOS_Gateway_Architecture.mmd`
- Delivered inline in chat via `<lov-artifact ... mime_type="text/vnd.mermaid">` so you can preview and download from the message
- Zero Lovable/Nythic-agent branding; Supabase referenced factually as the backend platform under the AIWOS Gateway label

Approve to generate and post the artifact.