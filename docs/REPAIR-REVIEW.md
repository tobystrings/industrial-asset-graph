# Repairs and shared administrator review

## Technician workflow

Open Equipment, choose a known machine, and select Start repair. Notes, observations, checks, measurements, changes, parts, results and original photos save automatically on this device. My work resumes them. Related manuals, history and parts preserve the repair context. Voice capture is optional; typing always works.

The status distinguishes local storage, waiting to upload, and a shared acknowledgement. Finish opens an editable summary. Submit sends the received version to the shared inbox and returns a receipt. Unclassified notes, questions, corrections and app-change requests use the same capture path without requiring AI.

The optional Genie sends entered text and relevant facility records/documents to the existing server-side Gemini integration. It does not send photo bytes. Its draft, citations, unknowns and generation time remain separate from originals. Using a suggested summary is explicit. Provider errors leave capture, submission and review available.

## Administrator workflow

Administration → Review Inbox opens one submission per page. Review the original notes, photos and any separate AI suggestion. Choose a destination and record, correct the proposal, and save it. The proposal includes the destination value against which application will be checked. Clarification and replies remain in the audit history.

Approve records approval of that proposal revision. Apply performs the shared database transaction. A changed destination reports a conflict: reload, compare and save a revised proposal, then approve again. Repeating a completed application returns its existing receipt.

Destinations are machine description, repair history, inventory notes, document title, and an app-change draft. Original source evidence and approver/applicator IDs and timestamps remain linked. An app-change draft is tracked in Administration → App requests; record approval never executes code. Use the repository PR and deployment process and record its URL in the request.

## Persistence and authorization

- IndexedDB stores device work and original file bytes in facility-scoped stores. Existing package migration retains the original package and adds missing seeded evidence without replacing authored records.
- Supabase migration `server/migrations/004_repair_review.sql` adds current work, append-only work revisions, immutable submission snapshots, review events, and app requests. Existing publication and evidence tables remain intact.
- Private `iag-work` storage uses facility/author/work paths and immutable uploads. Hash verification protects duplicate-upload retries and backups. Signed reading links renew while a page stays open.
- Authors can read their work and receipts. Administrators can read shared submissions; database functions check administrator permission when correcting, approving or applying records. Clients cannot directly mutate the review tables.
- Work saves use a base version and stable request ID. Submission is unique for work/version. Applying a record locks the shared publication, compares the proposed base, publishes the change and writes the receipt in one transaction.

## Recovery

My work → backup exports the signed-in author's work with original bytes and SHA-256 hashes. Recovery accepts only the same facility/account, validates every original before writing, and keeps differing existing drafts as separate copies. Keep the backup outside OneDrive. A metadata-only export is not a photo backup.

For a device conflict, compare the shared and phone versions. Keeping the shared version first preserves the phone version and verified original bytes as a separate work copy. Keeping the phone version rebases it explicitly against the displayed shared version. Do not clear browser storage to fix a synchronization error.

Database migration 004 is additive; do not drop its tables to roll back the UI. Export the database and private storage through the existing Supabase recovery process before any destructive server maintenance. `004_repair_review.check.sql` is a transactional verification harness: run it inside BEGIN/ROLLBACK. It changes test destinations during execution and must never be committed as production data.

## Verification and deployment

Required repository gates remain `npm test`, `npm run verify:data`, `npm run verify:visual-contract`, `npm run build`, and `npm run test:visual`. Additional journeys: `test:repairs`, `test:publication`, `test:map-editor`, and `test:large-print`. `verify:publication` verifies public source bytes. Browser fixtures test separate technician/admin sessions and failure behavior; they are distinct from the live transactional database harness and live deployment smoke checks.

The `repair-assistant` Edge Function uses the existing server-only GEMINI_API_KEY and Gemini 3.1 Flash-Lite with minimal thinking. The original 2.5 Flash request returned HTTP 404 from the provider during live verification. Google documents a free API tier for 3.1 Flash-Lite: https://ai.google.dev/gemini-api/docs/pricing . This does not enable billing or change the older Map Studio model policy. Its handler validates bearer tokens through Supabase Auth; `verify_jwt=false` delegates validation to that handler, consistent with Map Studio. Never put provider keys in Vite variables. A deployed endpoint or secret name alone does not prove provider success.

GitHub Pages publishes main via `.github/workflows/deploy-pages.yml`. Release evidence and any live verification gaps belong in the Slate completion report.
