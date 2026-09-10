# Activate Gemini map editing

Map Studio calls the existing Supabase project at `/functions/v1/map-studio/status` and `/plan`. No separate server subscription, new database, or `VITE_IAG_API_URL` change is needed. The browser derives the function address from its existing `VITE_SUPABASE_URL`. Shared-data synchronization stays independent.

## Free-tier account setup

1. Create a Gemini key in https://aistudio.google.com/api-keys using a project on the free tier. Do not enable Cloud Billing. The application cannot inspect or disable Google billing; a key from a paid project can incur charges.
2. In your existing Supabase project, open Edge Functions → Secrets. Add `GEMINI_API_KEY` there. Never paste it in the map, GitHub repository, or browser environment variables.
3. Keep the existing Supabase project within its current free allowance. This change does not upgrade plans or provision paid services.

The planner uses `gemini-2.5-flash`, whose text input/output has a free tier at implementation time. Quotas and availability belong to Google. On HTTP 429, the app shows the quota/rate-limit message. There are no automatic retries, alternate models, or OpenAI fallback.

## Deploy from the repository root

Install/use the Supabase CLI, authenticate to your existing project, then run:

```sh
npx supabase login
npx supabase functions deploy map-studio --project-ref YOUR_EXISTING_PROJECT_REF
```

Deploy the repository's complete function directory, including `_shared/mapPlanner.ts` and `map-studio/handler.ts`; do not paste only index.ts into a dashboard editor. The checked-in config disables the gateway's legacy JWT precheck only for this function. The handler independently verifies every bearer token through Supabase Auth and requires server-controlled `app_metadata.iag_role` to equal `admin` before status or provider access. User-editable metadata never grants permission.

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are supplied by the Edge Function environment. The default allowed browser origin is `https://tobystrings.github.io`; use `IAG_ALLOWED_ORIGINS` only if another origin is deliberately needed.

## Verify

Sign in as admin. Open Map → Edit map → AI / text edits → Check connection. The status must be configured. Enable Use connected AI, select an existing object, enter an edit, and choose Preview edit. Inspect the proposal before Apply preview. Save Changes uses the existing save path. Check connection verifies the secret is present and your account is admin; only an actual preview tests Gemini.

Missing function: deploy it. Missing key: add the secret. Unauthorized: sign in again and verify server-controlled admin metadata. Quota error: wait or use offline commands. A blocked, truncated, malformed, or unknown-target response makes no edit. No API key is returned by status or sent to the browser. Gemini receives the instruction, object names/IDs, and selection, not attachments or photos.

## Release boundary

Repository tests use synthetic provider responses. Deployment of Pages does not deploy Supabase functions. Live AI is not verified until the function is deployed, its secret is configured, and an administrator receives a real preview.

Sources: https://ai.google.dev/gemini-api/docs/pricing ; https://ai.google.dev/gemini-api/docs/get-started ; https://supabase.com/docs/guides/functions/deploy
