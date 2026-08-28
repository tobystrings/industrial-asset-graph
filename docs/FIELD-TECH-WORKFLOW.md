# Field technician workflow

1. Find the known asset, or propose a new asset only when its identity is supported by field evidence.
2. Capture an observation or attach evidence. Browser attachments begin as `LOCAL_ONLY` and do not upload.
3. Choose the honest verification state. Unknown information stays `FIELD_VERIFY`; inferred or disputed information stays visibly uncertain.
4. Work offline when needed. The persistent status reports local storage and the number of queued changes.
5. Submit eligible information for review. A technician proposal remains separate from canonical plant truth.
6. Propose a relationship only when its endpoints and semantics have evidence. Empty semantic relationship types remain empty when facts are unavailable.
7. A reviewer inspects the proposed change before approval. Approval writes a versioned local revision and queues an eligible canonical mutation.
8. When connected to the shared backend, use the sync status control. `Synced` appears only after the canonical service accepts the mutation.
9. If another client changed the same entity version, review the displayed canonical and proposed values. Explicitly keep canonical or re-submit the proposed value against the current revision.
10. Continue exporting `.iag` archives for backup, controlled handoff, and offline portability. Archive merge is not multi-user synchronization.

The local administrator passphrase protects only this browser workflow. It is not production authentication. `LOCAL_ONLY` evidence must be deliberately promoted through a future approved access workflow before it can become transport-eligible.
