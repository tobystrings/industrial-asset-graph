# RTK, Graphify, and Token Manager — Project Acceptance Checklist

Project: Industrial Asset Graph — Kosme Sensicol Labeler Reliability

Overall status: **OPEN — NOT YET VERIFIED**

## A. Execution-path inventory

- [ ] Identify the exact local repository and project working directory.
- [ ] Record every intended path: PowerShell CLI, direct `codex`, `cg`, Desktop, IDE, cloud, and delegated execution.
- [ ] Mark each path as hard-governed, observable-only, or not locally governable.
- [ ] Confirm the Governor directory is never accidentally treated as the project workspace.
- [ ] Confirm governed execution starts in and returns to the caller's actual project directory.

## B. Native fail-safe baseline

- [ ] In a fresh PowerShell session, verify native Codex defaults to Luna/SAFE.
- [ ] Verify low reasoning.
- [ ] Verify Fast mode is off.
- [ ] Verify approval policy is on-request.
- [ ] Verify sandbox is workspace-write.
- [ ] Capture the effective `$env:USERPROFILE\.codex\config.toml` settings.
- [ ] Confirm no stale Terra default remains.

## C. Governor installation and routing

- [ ] Verify `C:\Users\tobys\AppData\Local\CodexGovernor` resolves correctly.
- [ ] Verify `cg.ps1`, `cg.cmd`, `settings.json`, `ledger.csv`, and `backups\` exist and are readable as appropriate.
- [ ] Verify normal `cg` execution selects Luna by default.
- [ ] Verify `cg route` is dry-run only.
- [ ] Verify `cg auto` may select Luna or Terra but never Sol.
- [ ] Verify `cg run luna` explicitly selects Luna.
- [ ] Verify `cg run terra` requires and records explicit escalation.
- [ ] Verify `cg run sol` requires explicit human confirmation and records the escalation.
- [ ] Verify `cg inspect` enforces the intended read-only path.
- [ ] Verify direct/bypass paths produce a visible warning where designed.

## D. Ledger integrity

- [ ] Run a controlled governed test and verify exactly one correct ledger entry.
- [ ] Confirm mode, model/profile, timestamp, caller project path, and observable usage fields are accurate.
- [ ] Confirm dry runs do not create execution ledger entries.
- [ ] Confirm failed launches and cancellations follow the documented ledger semantics.
- [ ] Confirm unobservable Desktop/IDE/cloud/delegated work is not fabricated in the ledger.
- [ ] Verify `cg report` reconciles with the local ledger.
- [ ] State that OpenAI `/usage` is authoritative for billed usage.

## E. RTK

- [ ] Record installed RTK version.
- [ ] Verify RTK runs from the project's actual execution path.
- [ ] Resolve or disprove the previously observed savings/history database access-denied failure.
- [ ] Verify representative supported Git, test, package, discovery, and output-heavy commands.
- [ ] Compare at least one RTK-wrapped result with the unwrapped command for technical equivalence.
- [ ] Confirm a clear method exists to request full raw output when required.
- [ ] Capture savings/report evidence.
- [ ] Document commands or situations where RTK must not be used.

## F. Graphify

- [ ] Record installed Graphify version.
- [ ] Verify global registration/configuration.
- [ ] Verify it actually fires in the exact Bash/tool execution path used by this project.
- [ ] Verify PowerShell, Desktop, IDE, cloud, and delegated paths separately rather than assuming hook coverage.
- [ ] Capture evidence of Graphify context supplied to a controlled project task.
- [ ] Confirm Graphify failure degrades visibly and does not silently claim success.
- [ ] Document bypass and unsupported paths.
- [ ] Confirm Graphify output is not treated as proof of physical machine topology.

## G. Project enforcement

- [ ] Add project instructions requiring RTK for supported output-heavy commands when appropriate.
- [ ] Add project instructions requiring Graphify before applicable code/dependency work.
- [ ] Add project instructions requiring Luna/SAFE by default.
- [ ] Require an escalation record for Terra or Sol.
- [ ] Require milestone reports to include tool use, exceptions, model/profile, and governance status.
- [ ] Add a stop condition preventing “fully implemented” status until every applicable acceptance item passes.

## Acceptance result

- [ ] PASS — Fully implemented and verified on every claimed execution path.
- [ ] CONDITIONAL PASS — Local governed path verified; named Desktop/IDE/cloud/delegated limitations remain visible.
- [ ] FAIL — One or more required controls are absent, conflicting, bypassed without warning, or unverified.

Final status must list evidence, exact failed items, limitations, corrective actions, and retest results. Installation or configuration presence alone is not acceptance evidence.
