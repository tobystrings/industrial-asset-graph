# Private wrapper package builder

This directory contains the reproducible native archive builder. Actual machine records and controlled source files remain in the private handoff directory outside public assets and Git history.

Run from the repository root:

```powershell
npx tsx facilities/lieb-foods/wulftec/build-package.ts <private-package-directory>
```

The input directory contains `native/patch.json` and `native/attachments.json`. The builder validates the additive patch against the selected facility schema, checks duplicate application and attachment hashes, creates the private insertion ZIP, and generates a genuine portable `.iag` using `exportPlantArchive`. It validates the native archive round-trip in isolated fake IndexedDB storage.

Use **Plant Manager → Plant Database → Add Private Asset Package** to insert the private ZIP. It retains current rows on conflict and relinks original evidence into facility-scoped local storage. The existing full-database importer is a different operation. The portable `.iag` omits controlled evidence and dependent records under the current export contract.

The private handoff includes the populated dossier, source register, recovered originals, parameter snapshots, wire registers, conflicts and field-verification list. Its integration README explains recovery and remaining evidence limits. No private media is included by this builder in the frontend bundle.

The responsive audit always covers a synthetic private equipment import. To test a real private bundle, set `IAG_PRIVATE_VISUAL_BUNDLE` to its ZIP path and `IAG_PRIVATE_VISUAL_OUTPUT` to a private screenshot directory, then run `npm run test:visual`.
