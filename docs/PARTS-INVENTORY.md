# Parts Inventory

Open **Find a part** on Home or **Parts Inventory** under More → Everyday tasks. Equipment records, the cabinet, Wulftec, equipment field sheets, documentation and troubleshooting offer **Find a part / compatible spares**. A selected equipment ID carries into the finder.

## Capture a part

1. Choose **Take photo / Add part**, select the photo role, and take or upload clear photos. Add separate label, package, barcode, location and installed-reference photos where useful.
2. Choose **Read label text**. The bundled English OCR engine runs locally in a worker. No photo is sent to a recognition service. Its model and code load from the application’s own host. Unavailable or unreadable text can always be entered manually.
3. Compare extracted text with the photo. Explicit manufacturer, part number, model, description, serial/lot and rating fields appear as individual suggestions. Apply only useful suggestions, correct errors, then check the identity-review box. This does not verify machine compatibility.
4. Fill identity, specifications, unit, storage, purchasing, condition, notes and document references. Save the part. A new part starts at zero: open its stock actions and use **Receive** with the opening quantity and a reason.

Technician changes are submitted for administrator review; they do not change canonical stock until approved. Administrators save through the existing facility publication flow. Inventory starts empty in production. Browser test parts exist only in isolated test contexts.

## Find a breakdown spare

Open the finder from the affected machine. Search the failed component’s number or type, manufacturer, specifications, tags, label text or storage location. Barcode/QR photo scanning is available where the browser supports it, with typed-code search as a fallback.

Results put verified spares first, then documented approved alternates, verified installed records, and possibilities needing confirmation. “Not compatible” records are excluded for that machine. Check available stock, condition, ratings and the compatibility source. An alternate remains a substitute, not an exact match. If no available verified spare matches, record a review/reorder request with missing identity, ratings and machine-position information.

Open a part to add or update its machine link. Verified installed/spare links require a source; likely, unconfirmed and incompatible links remain explicit. Machine links navigate back to equipment. Alternate records require another part and a documented reason/application.

## Account for stock

Use **Receive**, **Issue / install**, **Return**, **Reserve**, **Release reservation**, **Adjust**, **Dispose**, or **Verify count**. Issue and reservation actions require a machine. Every event retains a person, date, quantity and work note. Adjust and Verify count set the actual total count; other actions record a quantity change. Available quantity is on-hand minus reserved quantity. Release reservations before issuing or reducing reserved stock.

Duplicate event IDs, stale sequences, negative availability and removal of existing movements are rejected. An old draft must be refreshed if another edit changed its history. Concurrent device stock edits stop publication for explicit review; complete publication revisions preserve both snapshots. Balances are the device’s last synchronized records, so synchronize before relying on shared availability. Physical reconciliation may be necessary after offline concurrent work.

**Activity** shows movements and review/reorder requests. **Low Stock** includes items at or below their threshold. **Locations** groups stored parts by their building/area/cabinet/rack/shelf/bin. Administrators can archive empty parts; their history remains available in backups and activity.

## Back up and restore

Advanced → **Download backup with inventory photos** downloads facility records plus inventory photos, including local-only inventory photos. Keep that backup in appropriate local storage. Standard portable facility exports omit local-only photo files and their inventory references. Restore JSON backups through Plant Database as an administrator, in the matching facility. Merge retains longer compatible stock histories and rejects divergent histories; replace cannot erase existing stock history.

The feature uses optional inventory schema version 1 inside facility schema version 2. Existing packages without inventory remain valid and mean no recorded parts. No server table or production data migration is needed; existing facility revision, access, and publication controls apply.

OCR implementation: [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md) and [local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md). Worker, engine and English model are generated from locked npm packages during build; generated binaries are not source-controlled.
