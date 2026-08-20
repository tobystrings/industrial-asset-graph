# Industrial Asset Graph

Industrial Asset Graph is a local-first facility knowledge system for equipment, electrical systems, controls, documents, evidence, procedures, relationships, and field observations.

## In-app plant management

The application can now manage plant records directly in the UI without editing source files:

- create, edit, move, and delete assets
- place graph-linked assets on the facility map
- create and edit power, control, interlock, data, mechanical, upstream, and downstream relationships
- attach photos, PDFs, drawings, manuals, and field evidence
- log field observations with verification state
- edit facility identity, areas, and map records
- persist local edits in IndexedDB
- export a portable `.iag` plant package
- import a `.iag` package in replace or merge mode
- restore the bundled facility baseline

A `.iag` package is a ZIP-based portable plant database containing a manifest, graph/map data, observations, attachment metadata, and the actual uploaded files. Legacy `.iag.json` backups remain importable.

## Facility separation

Reusable application code lives under `src/`. Facility-specific seed data and packaged documentation live under `facilities/`. The active facility package seeds the local database on first use; after initialization, field changes are managed through the application and portable plant database rather than by editing facility source records.

## Development

```bash
npm ci
npm test
npm run verify:data
npm run build
```
