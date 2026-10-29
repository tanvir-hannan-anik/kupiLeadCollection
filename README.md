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
| `src/app/admin/login/*` | Admin email + password sign-in (JWT session cookie) |
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
3. Give the first admin a password (stored only as a scrypt hash):
   ```bash
   ADMIN_PASSWORD='choose-a-strong-password' npm run admin:password -- 251-16-021@diu.edu.bd
   ```
   Further admins can be added (or given new passwords) from **/admin/admins**.

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API), `NEXT_PUBLIC_APP_URL`, a random `RATE_LIMIT_SALT` and a random `ADMIN_JWT_SECRET` (32+ characters). Email notification keys are optional. See comments in `.env.example`.

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

- Sign in at `/admin/login` with **email + password**. On success the server issues a signed **JWT** (HS256, 8-hour expiry) in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production) — page scripts can't read it.
- Every admin page, server action and API route verifies the JWT **and** checks the admin still exists with a password and that the token's **session version** is current. Removing an admin, **signing out** (signs out every device) or **changing the password** (signs out every other device) revokes older tokens immediately.
- Passwords are stored only as salted **scrypt** hashes. Wrong email and wrong password give the same message and take the same time; logins are rate limited per IP and per account (10 per 15 min).
- At **/admin/admins** any admin can add an admin with a starting password, set the first password for an admin marked *No password yet*, or remove another admin (not themselves). **Existing passwords can only be changed by their owner** (*Change my password*, which requires the current password) — so one admin can't take over another's account.
- The server talks to Supabase with the service-role key only after these checks. The database grants **nothing** to the `anon` or `authenticated` roles (RLS on, no policies), so neither the public anon key nor a Supabase Auth sign-up can read any data.
- Server Actions are public HTTP endpoints by design, so every exported action checks the admin first, and helpers like issuing the session cookie live in `server-only` modules instead.

## Security & privacy

| Concern | How it's handled |
| --- | --- |
| Validation | Same Zod schema on client and server; strings trimmed, control/zero-width chars stripped, length-capped |
| Phone numbers | `libphonenumber-js` validation; stored as E.164 (`+8801712345678`). Bangladeshi local formats (`01712-345678`, `8801…`) accepted |
| Spam | Hidden honeypot field + minimum fill time (silently accepted, not stored); per-IP rate limit (5 / 10 min) in Postgres keyed by a salted IP hash; origin check; 10 KB body cap |
| Repeat submissions | Same email or phone + same interest within 24 h → acknowledged without creating a duplicate; button disabled while submitting |
| Secrets | The browser never talks to Supabase; the service-role key and `ADMIN_JWT_SECRET` are server-only |
| Consent | Required checkbox (unchecked by default); `consent_given`, `consent_timestamp` and the exact `consent_text` are stored |
| Data minimisation | Only the form fields + UTM tags are stored. No raw IP, no user agent |
| CSV export | Admin-only, `no-store`, spreadsheet formula injection neutralised, UTF-8 BOM for Bangla names |
| Headers | Content-Security-Policy (same-origin only), HSTS, `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, COOP; `/admin` is `noindex`, `no-store` |
| Database | `anon`/`authenticated` have no table or function access; dashboard realtime uses a private channel only the server can read |

## Realtime dashboard

Database triggers publish to a **private** Supabase Realtime channel that only the service role can read. Each admin page opens a same-origin Server-Sent Events stream (`/api/admin/events`), which checks the admin's JWT and relays the messages (`src/components/admin/live-updates.tsx`). Nobody can listen to or spoof the feed with the public key:

- **New lead** → a toast appears with a *View* button, stats and the table refresh in place, and the browser tab shows `(n) New lead` if it's in the background.
- **Status change / new note** (by any admin) → the open page refreshes automatically.
- The header pill shows **Live** (green), **Connecting…** or **Offline**.

Broadcast messages contain only `{ table, op, id }` — never names, emails or phone numbers. The dashboard then fetches the details through the server, which checks the admin's JWT.

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
2. Make sure `ADMIN_JWT_SECRET` is set in the host's environment (a different random value from your local one is fine) and set `NEXT_PUBLIC_APP_URL` to the deployed URL. No Supabase Auth or SMTP setup is needed for admin sign-in.
3. Build `npm run build`, start `npm start` (Render: build command `npm install && npm run build`, start command `npm start`).
4. To embed or post to the API from the main site, add its origin to `LEAD_ALLOWED_ORIGINS`.

### Post-deploy checklist

- [ ] Submit the form → lead appears in `/admin/leads`
- [ ] Submit the same email + interest again → "We already have your request"
- [ ] Sign in as each seeded admin; sign in as a non-admin → no access
- [ ] Change status, add a note, export CSV
- [ ] (If configured) notification email arrives
