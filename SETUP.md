# Life Drive — env var setup

Step-by-step for every secret the app needs. Add each to **Vercel → Project Settings → Environment Variables** (and to your local `.env.local` if you want the dev server to work). After you add or change env vars on Vercel, hit **Redeploy**.

---

## 1. Supabase (3 vars)

### 1a. Create the project

1. Go to https://supabase.com → **Start your project** → sign in.
2. **New project**. Pick the closest region (e.g. US West 2). Set a strong DB password and store it in your password manager.
3. Wait ~2 minutes for provisioning.

### 1b. `NEXT_PUBLIC_SUPABASE_URL`

- In the project sidebar: **Project Settings** (gear icon at bottom-left) → **API**.
- Copy **Project URL**. Looks like `https://abcdefghij.supabase.co`.

### 1c. `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- Same page (**Project Settings → API**).
- Under **Project API keys**, copy the `anon` `public` key. It's a long JWT starting with `eyJ...`.
- This one is safe to expose to the browser.

### 1d. `SUPABASE_SERVICE_ROLE_KEY` (secret — never expose)

- Same page.
- Click the **Reveal** toggle next to `service_role` and copy it.
- This bypasses RLS. In Vercel, **uncheck** the "Preview" and "Development" environments unless you really want it there — only Production needs it for the seed flow.

### 1e. Apply the schema

You have two options:

**Option A — Local CLI (recommended).** From the LifeDrive directory:

```bash
brew install supabase/tap/supabase   # if you don't have it
supabase login                       # opens a browser, paste the access token from supabase.com/dashboard/account/tokens
supabase link --project-ref <YOUR_PROJECT_REF>   # the abcdefghij part of the URL
supabase db push                     # applies supabase/migrations/0001_init.sql
```

**Option B — Web SQL editor.** Open the Supabase dashboard → **SQL Editor** → New query. Paste the contents of `supabase/migrations/0001_init.sql`. Hit **Run**.

---

## 2. Anthropic (1 required + 3 optional)

### 2a. `ANTHROPIC_API_KEY`

1. Go to https://console.anthropic.com → sign in.
2. Sidebar → **API Keys** → **Create Key**.
3. Name it `life-drive-prod`. Copy the value (starts with `sk-ant-...`). **You can't see it again.**
4. Console → **Plans & Billing** → add a payment method and put $5–10 on the account (the triage uses Haiku, so this lasts ages).

### 2b–2d. Model overrides (optional, defaults are already set in code)

These let you swap models without editing the codebase. The defaults match the build prompt:

- `ANTHROPIC_MODEL_TRIAGE` → `claude-haiku-4-5-20251001`
- `ANTHROPIC_MODEL_REASON` → `claude-sonnet-4-6`
- `ANTHROPIC_MODEL_HEAVY` → `claude-opus-4-7`

Skip these unless you want to override.

---

## 3. Google Calendar (3 vars)

### 3a. Create a Cloud project

1. Go to https://console.cloud.google.com.
2. Top bar → project dropdown → **New Project**. Call it `life-drive`. Create.
3. Make sure that project is selected in the top bar going forward.

### 3b. Enable the Calendar API

1. Sidebar → **APIs & Services** → **Library**.
2. Search for **Google Calendar API** → click it → **Enable**.

### 3c. Configure the OAuth consent screen

1. Sidebar → **APIs & Services** → **OAuth consent screen**.
2. Choose **External** → Create.
3. App name: `Life Drive`. User support email: yours.
4. Developer contact: yours. Save and continue.
5. **Scopes** step → **Add or remove scopes** → search for and add:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
6. Save and continue.
7. **Test users** step → add your own Gmail address (and Sarah's, if you want her testing). Save.
8. Leave the app in **Testing** status — that's fine for personal/family use. (You only need to submit for verification if you go public.)

### 3d. Create the OAuth client → `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`

1. Sidebar → **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. Name: `Life Drive Web`.
4. **Authorized JavaScript origins** — add (one per row):
   - `http://localhost:3000`
   - `https://<your-vercel-url>` (e.g. `https://lifedrive-abc123.vercel.app`)
   - `https://lifedrive.app` (if you add a custom domain later)
5. **Authorized redirect URIs** — add:
   - `http://localhost:3000/api/calendar/oauth/callback`
   - `https://<your-vercel-url>/api/calendar/oauth/callback`
6. **Create**. A modal pops up:
   - Copy **Client ID** → that's `GOOGLE_CLIENT_ID`.
   - Copy **Client secret** → that's `GOOGLE_CLIENT_SECRET`.

### 3e. `GOOGLE_OAUTH_REDIRECT_URL`

Set this to the **production** callback URL — it has to exactly match one of the redirect URIs you registered in step 3d. For Vercel:

```
https://<your-vercel-url>/api/calendar/oauth/callback
```

For local dev: `http://localhost:3000/api/calendar/oauth/callback`.

Each Vercel environment can have its own value (Production / Preview / Development).

---

## 4. App URL (1 var)

### `NEXT_PUBLIC_APP_URL`

- Production on Vercel: `https://<your-vercel-url>` (or your custom domain).
- Local: `http://localhost:3000`.

Used for: building absolute URLs in invite links, OG metadata, the manifest's `metadataBase`.

---

## 5. Optional polish (1 var)

### `LIFE_DRIVE_EVENT_TAG`

Defaults to `lifeDrive`. This is the key on Google Calendar's `extendedProperties.private` that tags events Life Drive created — it's how the app guarantees it only ever edits its own events, never your real meetings.

Only change this if you want a different label. If you do, set it consistently across all environments.

---

## 6. Seed script (local only, not a Vercel env var)

### `SEED_OWNER_EMAIL`

When you run `npm run seed`, the script needs to know which auth user is "you" so it can stamp the household ownership and profile. Pass it inline:

```bash
SEED_OWNER_EMAIL=schuette.markus@gmail.com npm run seed
```

Prerequisite: you must have signed in to the deployed app at least once (so an `auth.users` row exists for your email).

The seed:
- creates the **Home base** household + makes you owner
- imports the principles deck (~60), 7-day workout split, the 22 projects with subtasks + next actions, all ~71 single-action tasks (including the new 16 you added), and the vision_2030 someday lane
- is idempotent — running it again just patches existing rows

---

## TL;DR copy-paste into Vercel

After collecting all values, in **Vercel → Settings → Environment Variables** add (mark each as **Production** + **Preview** unless noted):

| Key | Source | Sensitive? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API | no |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API (reveal) | **yes — Production only** |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | **yes** |
| `GOOGLE_CLIENT_ID` | Google Cloud → Credentials | no |
| `GOOGLE_CLIENT_SECRET` | Google Cloud → Credentials | **yes** |
| `GOOGLE_OAUTH_REDIRECT_URL` | `https://<vercel-url>/api/calendar/oauth/callback` | no |
| `NEXT_PUBLIC_APP_URL` | `https://<vercel-url>` | no |

Then **Redeploy**.
