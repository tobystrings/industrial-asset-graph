# Private wrapper package builder

This directory contains the reproducible native archive builder. Actual machine records and controlled source files remain in the private handoff directory outside public assets and Git history.

Run from the repository root:

```powershell
npx tsx facilities/lieb-foods/wulftec/build-package.ts <private-package-directory>
```

The input directory contains `native/patch.json` and `native/attachments.json`. The builder validates the additive patch against the selected facility schema, checks duplicate application and attachment hashes, creates the private insertion ZIP, and generates a genuine portable `.iag` using `exportPlantArchive`. It validates the native archive round-trip in isolated fake IndexedDB storage.

The builder also reads the recovered JSON registers and dossier section 9. It maps their rows into 15 native structured document registers, preserving raw values, explicit nulls, distinct snapshots, source IDs, inherited review, and equipment references. `native/integrated-patch.json` records the resulting patch; the original input patch and source attachments are retained. Rebuild after updating source registers, review any import conflicts, and retain the pre-import recovery ZIP.

After insertion, open Assets → the wrapper → Record → Machine knowledge, or open its Machine registers in Documents. Registers provide search, verification filters, source-document links, and review notes saved as facility-scoped observations and shown beside their source row after reload. Original source values are retained when adding notes. The empty verified-current wiring register is intentional. Register metadata stays inside controlled native documents and is excluded from portable export with its source evidence.

The importer reads back and verifies the recovery archive before insertion. Schema checks reject invalid register references, public register evidence, and cross-asset document attachment ownership. Test builds use disposable browser authentication and storage; those results do not mean an authenticated live facility has been updated.

Use **Plant Manager → Plant Database → Add Private Asset Package** to insert the private ZIP. It retains current rows on conflict and relinks original evidence into facility-scoped local storage. The existing full-database importer is a different operation. The portable `.iag` omits controlled evidence and dependent records under the current export contract.

The private handoff includes the populated dossier, source register, recovered originals, parameter snapshots, wire registers, conflicts and field-verification list. Its integration README explains recovery and remaining evidence limits. No private media is included by this builder in the frontend bundle.

The responsive audit always covers a synthetic private equipment import. To test a real private bundle, set `IAG_PRIVATE_VISUAL_BUNDLE` to its ZIP path and `IAG_PRIVATE_VISUAL_OUTPUT` to a private screenshot directory, then run `npm run test:visual`.

## Deployed Pages and private records

Deploy the application code before using structured registers on Pages. A localhost import does not populate the deployed site: IndexedDB is scoped to the exact browser profile and origin. Sign in at the deployed Pages URL, then use More → Plant database → Add Private Asset Package to import the private ZIP there. Verify reload and repeat-import results at that URL. Signing in alone does not synchronize private records between devices. Never place the private ZIP, evidence files, or populated controlled registers in the public Pages artifact.
