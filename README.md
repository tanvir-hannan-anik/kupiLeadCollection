# Kupi — Lead Generation & Management

A one-screen "Let's Get in Touch" lead form for [Kupi](https://kupi-dzon.onrender.com) plus a protected admin dashboard for following up on enquiries.

- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · React Hook Form + Zod · Supabase (Postgres + Auth)
- **Brand:** Night / Flame / Paper palette, Baloo Da 2 + Anek Bangla + IBM Plex Mono, Shikha mascot — matching the main site.

## What's where

| Path | Purpose |
| --- | --- |
| `src/app/page.tsx` | Public one-screen lead page (brand panel + form) |
| `src/components/lead-form/lead-form.tsx` | The form (client): inline validation, loading/success/error states, honeypot |
| `src/config/lead-form.ts` | **Interest options**, contact methods, statuses, phone countries, consent wording |
| `src/lib/validation/lead.ts` | Shared Zod schema (browser + server), phone normalisation to E.164 |
| `src/app/api/leads/route.ts` | `POST /api/leads` — validation, spam checks, rate limit, dedupe, insert, notify |
| `src/app/admin/login/*` | Passwordless admin sign-in (magic link or 6-digit code) |
| `src/app/admin/(dashboard)/leads` | Dashboard: stats, search, filters, table, pagination |
| `src/app/admin/(dashboard)/leads/[id]` | Lead details, status update, internal notes |
| `src/app/admin/(dashboard)/admins` | Add / remove administrators |
| `src/app/api/admin/leads/export/route.ts` | CSV export (respects current filters) |
| `src/proxy.ts` | Session refresh + redirect of signed-out users away from `/admin` |
| `supabase/migrations/0001_lead_management.sql` | Tables, indexes, RLS policies, functions, admin seed |

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the migrations — either `npm run db:migrate` (uses `SUPABASE_DB_URL`), or paste each file in `supabase/migrations/` into **SQL Editor** in order and **Run**.
   This creates `leads`, `lead_notes`, `admins`, `rate_limits`, enables Row Level Security, turns on Realtime for `leads` / `lead_notes`, and seeds the three admins:
   `251-16-021@diu.edu.bd`, `251-16-012@diu.edu.bd`, `251-16-017@diu.edu.bd`.
3. **Authentication → URL Configuration:**
   - *Site URL*: your app URL (e.g. `https://leads.example.com`, or `http://localhost:3000` locally)
   - *Redirect URLs*: add `https://<your-app>/auth/callback` (and `http://localhost:3000/auth/callback`)
4. **Authentication → Email Templates → Magic Link** — to let admins sign in from any device, include the code as well as the link:
   ```html
   <h2>Sign in to Kupi Leads</h2>
   <p><a href="{{ .ConfirmationURL }}">Sign in</a></p>
   <p>Or enter this code: <strong>{{ .Token }}</strong></p>
   ```
5. *(Recommended for production)* **Authentication → SMTP Settings** — plug in a real SMTP provider; Supabase's built-in sender is heavily rate limited.

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API), `NEXT_PUBLIC_APP_URL` and a random `RATE_LIMIT_SALT`. Email notification keys are optional. See comments in `.env.example`.

> `SUPABASE_SERVICE_ROLE_KEY` is a secret. It is only read in server files that import `server-only`, so it can never be bundled into browser code.

### 3. Run

```bash
npm install
npm run dev        # http://localhost:3000  — form
                   # http://localhost:3000/admin  — dashboard
npm test           # unit tests (validation, phone numbers, CSV safety, filters)
npm run typecheck
npm run build
```

## Configuring interest categories

Edit `INTEREST_OPTIONS` in `src/config/lead-form.ts`:

```ts
export const INTEREST_OPTIONS = [
  { value: "class_6_8_plan", label: "Class 6–8 learning plan" },
  { value: "class_9_10_plan", label: "Class 9–10 learning plan" },
  { value: "school_partnership", label: "School partnership" },
  { value: "others", label: "Others" },
] as const;
```

- `label` is what people see — reword freely.
- `value` is stored in the database — keep it stable once leads exist (old leads with a removed value still display, showing the raw value).
- No migration needed; the form, API validation, dashboard filter and CSV export all read from this list.

Consent wording (`CONSENT_TEXT`) and the phone-code country list live in the same file. The privacy link defaults to `https://kupi-dzon.onrender.com/privacy` (`NEXT_PUBLIC_PRIVACY_URL`).

## Admin access

- Sign in at `/admin/login` with an email on the `admins` list → receive a magic link / code. Non-admins get the same neutral message and no email (no account enumeration).
- Any admin can add or remove admins at **/admin/admins**. Admins can't remove themselves, so there's always at least one.
- Access is enforced in three layers: the proxy (redirect), a server-side `requireAdmin()` check in every page/action/route, and **Postgres RLS** using `is_admin()` — even a leaked anon key can't read leads.
- Admins can only change a lead's `status` (column-level grant); visitor-submitted data is read-only. Leads cannot be deleted through the API.

## Security & privacy

| Concern | How it's handled |
| --- | --- |
| Validation | Same Zod schema on client and server; strings trimmed, control/zero-width chars stripped, length-capped |
| Phone numbers | `libphonenumber-js` validation; stored as E.164 (`+8801712345678`). Bangladeshi local formats (`01712-345678`, `8801…`) accepted |
| Spam | Hidden honeypot field + minimum fill time (silently accepted, not stored); per-IP rate limit (5 / 10 min) in Postgres keyed by a salted IP hash; origin check; 10 KB body cap |
| Repeat submissions | Same email or phone + same interest within 24 h → acknowledged without creating a duplicate; button disabled while submitting |
| Secrets | Only the public anon key reaches the browser; service-role key is server-only |
| Consent | Required checkbox (unchecked by default); `consent_given`, `consent_timestamp` and the exact `consent_text` are stored |
| Data minimisation | Only the form fields + UTM tags are stored. No raw IP, no user agent |
| CSV export | Admin-only, `no-store`, spreadsheet formula injection neutralised, UTF-8 BOM for Bangla names |
| Headers | `X-Frame-Options: DENY`, `nosniff`, strict referrer policy; `/admin` is `noindex` |

## Realtime dashboard

Every admin page subscribes to Supabase Realtime (`src/components/admin/live-updates.tsx`):

- **New lead** → a toast appears with a *View* button, stats and the table refresh in place, and the browser tab shows `(n) New lead` if it's in the background.
- **Status change / new note** (by any admin) → the open page refreshes automatically.
- The header pill shows **Live** (green), **Connecting…** or **Offline**.

Realtime respects RLS, so only signed-in admins receive events. Requires `NEXT_PUBLIC_SUPABASE_ANON_KEY` and migration `0002_realtime.sql`.

## Follow-up emails

Each lead's page has a **Follow-up email** panel:

1. The email is **pre-written automatically** from the template matching the lead's interest, personalised with their name, enquiry date, city, their own message and Kupi links.
2. The admin can switch template, edit the subject/message, **Preview** the branded email, then **Send follow-up**.
3. Every email is logged under **Emails sent** (who sent it, when, sent/failed). Replies go to the sending admin.
4. A **New** lead becomes **Contacted** automatically; other admins' dashboards update live.
5. Safety: only leads who gave consent can be emailed, and the same lead can't be emailed twice within a minute.

No provider configured? **Open in my email app** opens the same pre-filled email in Gmail/Outlook, and **Copy text** copies it.

**Edit the templates** in `src/config/follow-up-templates.ts` (one per interest; placeholders like `{{name}}`, `{{city}}`, `{{message}}` are documented at the top). If you add a new interest option, add a matching template — a test checks this.

### Sending setup

Pick one provider in `.env.local` (see `.env.example`):

- **Gmail / any SMTP** — `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (a Gmail *App Password*), and `EMAIL_FROM` set to the same address. Easiest to start with; Gmail allows ~500 emails/day.
- **Resend** — `RESEND_API_KEY` and an `EMAIL_FROM` on a domain you've verified in Resend. Best for production deliverability.

## Email notifications (optional)

With a provider configured, set `LEAD_NOTIFY_EMAIL` (comma-separated) to get an internal alert for each new lead with name, email, phone, interest and a dashboard link.

- The lead is saved **first**; the email is sent after the response (`after()`), with a timeout, and failures are only logged.
- Emails go to staff only. The system never emails visitors, so no marketing mail is sent without consent.

## Deploying

Works on any Node host (Vercel, Render, etc.):

1. Push the repo, create the project, set every variable from `.env.example` in the host's environment settings.
2. **Supabase → Authentication → URL Configuration** (required, or admin sign-in links point to localhost):
   - *Site URL*: your production URL, e.g. `https://kupi-lead-collection.vercel.app`
   - *Redirect URLs*: add `https://kupi-lead-collection.vercel.app/**` (and keep `http://localhost:3000/**` for local dev)
   Set `NEXT_PUBLIC_APP_URL` to the deployed URL too.
   **Supabase → Authentication → SMTP Settings**: without custom SMTP, Supabase only emails members of your Supabase team, so other admins never receive their sign-in email. Use the same Gmail App Password as the follow-up emails.
3. Build `npm run build`, start `npm start` (Render: build command `npm install && npm run build`, start command `npm start`).
4. To embed or post to the API from the main site, add its origin to `LEAD_ALLOWED_ORIGINS`.

### Post-deploy checklist

- [ ] Submit the form → lead appears in `/admin/leads`
- [ ] Submit the same email + interest again → "We already have your request"
- [ ] Sign in as each seeded admin; sign in as a non-admin → no access
- [ ] Change status, add a note, export CSV
- [ ] (If configured) notification email arrives
