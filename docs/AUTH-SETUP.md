# Account sign-in setup

The application now opens on a login page. It requires a Supabase session verified with `getUser()` before mounting the facility workspace. Cached local names, roles and the former demo PIN do not grant access. Passwords are checked by Supabase Auth, never stored by application code. Device PINs are used through passkeys; there is no separate website PIN.

## Project configuration

1. Keep Email authentication enabled in Supabase. Invite the intended users. Existing magic-link users can use Forgot password to set their first password. The app does not offer public registration. If this is an invite-only workspace, disable new user signups in Supabase after checking the intended account policy.
2. Set the Site URL to `https://tobystrings.github.io/industrial-asset-graph/`. Allow these redirect URLs:
   - `https://tobystrings.github.io/industrial-asset-graph/`
   - `https://tobystrings.github.io/industrial-asset-graph/?auth=reset`
   - The equivalent local URLs at `http://localhost:5173/industrial-asset-graph/` (and port 4174 if testing the preview).
3. Check the password-reset email template preserves `{{ .ConfirmationURL }}`. Configure email delivery appropriate for real users; verify a real reset email arrives. Choose a minimum password length of at least 12 in the project. The reset form also enforces this minimum.
4. Assign `iag_role: admin` in server-controlled **app metadata** only for trusted administrators. Other accounts default to technician. User-editable metadata cannot grant admin rights.

## Passkeys and device PINs

The installed SDK supports Supabase's experimental passkey API; the client explicitly opts in. In Authentication → Passkeys, enable passkeys and set:

- Display name: `Industrial Asset Graph`
- Relying party ID: `tobystrings.github.io`
- Allowed origin: `https://tobystrings.github.io`

The relying party ID is a hostname, not the repository URL/path. Keep it stable after enrollment. Test local passkeys with a separate development project configured for localhost. A passkey enrolled for localhost does not sign in to github.io.

Users first sign in with email and password, open Users → Account security, and select Add a passkey. They complete the device prompt themselves. Subsequently Use a passkey on the login page invokes the browser/OS ceremony. The device may offer its PIN, fingerprint or face recognition; the site never receives the device PIN. Cancellation, unsupported browsers and disabled server support leave password sign-in available.

## Username aliases

Run `supabase/migrations/202609070001_usernames.sql` against the intended project, then deploy `supabase/functions/username-login` using the Supabase CLI or Dashboard. The checked-in config sets `verify_jwt = false` **only for this login endpoint**, because users have no session until they sign in. Password validation still happens in Supabase Auth.

The function uses the platform-provided `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`; the service key must never enter browser configuration. Optional `IAG_AUTH_ORIGINS` is a comma-separated origin allowlist, defaulting to `https://tobystrings.github.io`. Add local origins only when needed for development.

The migration creates private alias and rate-limit tables. Anonymous clients cannot read aliases. Authenticated users can retrieve/change only their own username through the two scoped RPCs. Only the server service role can resolve an alias. The login endpoint returns tokens only after checking the password; failed/unknown aliases share a generic response. Attempts are limited per hashed username and IP over a 15-minute window. Old buckets expire. No passwords are written to those tables or logged.

Once deployed, users choose a unique username under Account security. Until they choose one, they can sign in with email. If the migration/function is unavailable, email/password still works and username sign-in reports a recoverable failure.

## GitHub Pages build

Set repository variable `VITE_SUPABASE_URL` and repository secret `VITE_SUPABASE_ANON_KEY` using the existing project's URL and publishable/anon key. The workflow passes them into the build. This key is intentionally a browser key and is included in the compiled client; never use a secret/service-role key. Missing configuration fails closed on the login page.

GitHub Pages hosts only the frontend. The existing shared PostgreSQL API requires its own host, `SUPABASE_URL`, allowed origins and deployment configuration if cross-device sync is desired. Login alone does not deploy that API. Existing bundled public files and a public Git repository remain public; a client login gate cannot make those assets confidential. Controlled evidence remains in the private local storage path.

## Validation

### Live configuration verified 2026-09-07

The existing Supabase project now has the production Site URL and both production redirects above, a 12-character minimum password, and passkeys enabled for `tobystrings.github.io` with display name Industrial Asset Graph. Its public passkey options endpoint returns HTTP 200 with a challenge.

The username migration has been applied and `username-login` deployed with its own password validation and legacy JWT precheck disabled. Live probes confirmed a generic HTTP 400 for an unknown username, HTTP 403 for an unapproved origin, and permission-denied responses for anonymous alias resolution and username changes. No real password was submitted and no account alias was changed by these probes.

Custom SMTP remains unconfigured. The default reset template includes `{{ .ConfirmationURL }}`. Supabase's [default mail service](https://supabase.com/docs/guides/auth/auth-smtp) sends only to project team addresses and is limited to two messages per hour; configure custom SMTP before relying on resets for other users. Actual receipt, password reset, and hardware passkey enrollment still require the account holder to complete the live flow.

`npm test` covers callback paths, role provenance, identifier handling and rejected/incomplete username sessions. The responsive audit uses an isolated Auth network fixture rather than an application bypass. It exercises first-visit login, forged local identity rejection, username/password sign-in, persisted sessions, reset request and callback, mismatched passwords and real SDK sign-out on desktop/phone, alongside the unchanged workspace checks. These fixtures send no real email and do not prove live mail delivery or hardware passkey enrollment.

Before release, verify one real account can sign in, receive/reset a password, enroll/use a passkey and sign out on the target hostname. Confirm admin/technician behavior with actual server-controlled roles. Usernames additionally require the deployed migration and Edge Function.
