# Local historical evidence

Open **More → Historical evidence** in the local application. Choose a prepared
`.iag` bundle, inspect the subject/ID reconciliation preview, and select **Stage
local evidence**. A verified private recovery backup downloads before staging.
Technicians and administrators can stage; administrators can append review
decisions with a rationale. REVIEWED means the historical assertion was reviewed,
not that installation, repairs, or commissioning were verified. Canonical promotion
is deliberately a separate existing record-edit/review workflow.

Historical batches live in the facility-scoped IndexedDB `historical-evidence`
store. Source blobs use immutable `history-` attachment IDs and LOCAL_ONLY access.
No plant graph, map, revision, line membership, observation, or sync-outbox record
is changed by staging. Exact candidate IDs link only when present in the selected
facility. Unknown candidates remain in the review ledger.

Batch IDs are stable. Repeating identical imports is a no-op, including reviews.
Changed content under an existing batch ID fails without writes; use a new batch
ID for a source revision, preserving the previous batch. All source SHA-256 hashes
and byte sizes are checked before the atomic ledger/attachment transaction.
Hashes establish file integrity, not the truth of source claims.

Ordinary portable archives omit the ledger and LOCAL_ONLY files. Portable merge
and replacement keep an existing local historical ledger and its source blobs.
Private recovery includes the ledger, reviews and original bytes, verifies facility
ownership and source integrity before restore, and supports pre-ledger backups.
An explicit **reset to baseline** clears both history and source attachments;
retain the private recovery file first. These are device-local controls, not an
encrypted vault or a new server authorization boundary.

Preparation uses a reviewed, facility-owned JSON plan, with no facility evidence
embedded in reusable application code:

```text
python scripts/prepare-history-bundle.py EVIDENCE_DIRECTORY REVIEWED_PLAN.json OUTPUT.iag
```

The plan uses `HistoryManifest` in `src/facility/historicalEvidence.ts` (without
`files`, `format`, `version`, or `access`, which preparation supplies). Source
paths are relative to the evidence directory. Sources require intact files;
assertions require source IDs and page/section/row locators. The prepared archive
uses stored ZIP entries, as required by the existing browser archive reader.
The original handoff ZIP is not itself a prepared application import.

Keep evidence, plans, prepared bundles, and source-bearing reports in the ignored
`facilities/<facility>/private/` directory. Never move them to `public/`, import
them from Vite code, or include them in a public deployment. Archived prompts and
machine procedures are retained as source text, never executed by preparation.

Validation includes synthetic tests independent of private files. To additionally
exercise a real private bundle, set `IAG_HISTORY_BUNDLE` to its local path while
running `npm test` and `npm run test:visual`. The latter uses isolated browser
contexts and synthetic authentication. It tests local persistence, repeat import,
review history and exact source downloads on desktop and phone; it does not
modify a production browser database or verify field equipment.
