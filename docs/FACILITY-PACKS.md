# Facility packs

Industrial Asset Graph is the reusable application. Facility truth enters through a `FacilityPackage`; generic modules must not import a facility implementation directly.

The dependency boundary is:

`facilities/<facility-id>/` → `FacilityPackage` → `facilities/registry.ts` → selected package → `FacilityProvider` → generic UI and services.

## Add a facility

1. Create `facilities/<facility-id>/index.ts` and export a function returning a valid `FacilityPackage`.
2. Keep all facility-specific names, IDs, maps, relationships, documents, evidence, media paths, and display configuration inside that folder.
3. Register the loader in `facilities/registry.ts`.
4. Select it at build time with `VITE_FACILITY=<facility-id>`, or at runtime with `?facilityId=<facility-id>`.
5. Run `npm test`, `npm run verify:data`, `npm run verify:visual-contract`, `npm run build`, and `npm run test:visual`.

An unset selection intentionally defaults to `lieb-foods` for backward compatibility. An explicit unknown ID is an error and must never silently load J. Lieb.

Facility identity is the persistence namespace. Runtime IndexedDB databases and facility review/audit local-storage keys are separated by `facility.id`. Existing unscoped J. Lieb review state is read once into the J. Lieb namespace; it is never migrated into another facility.

Facility packages may import shared contracts from `src/facility` and `src/types`. Generic `src/` modules may not import `facilities/lieb-foods` or depend on J. Lieb identifiers. Runtime consumers read the selected canonical package from `activeFacility.ts`; `FacilityProvider` keeps that package synchronized with facility-scoped persistence. There is no parallel compatibility projection.

Every registry entry declares both its public selection key and canonical `facility.id`. Loading validates schema structure, duplicate IDs, asset/area/component/document/evidence references, map bindings, required feature configuration, and registry identity. Invalid packages fail with an actionable error.

`facilities/test-facility` is deliberately synthetic and exists only to prove portability and isolation. It is not plant truth.
