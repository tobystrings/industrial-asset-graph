I am working on an industrial asset tracking app. Read this context file first to understand my strict database rules, TypeScript structures, and compression protocols:

[PASTE YOUR AI_CONTEXT.md TEXT HERE]

Now, please rewrite `src/components/Dashboard.tsx`. Update it to import and render the `MapView` component we created inside the left panel workspace. Ensure it passes `graphData`, the `selectedNodeId` state, and the `setSelectedNodeId` callback into `MapView` natively. Keep the right panel tabs exactly as they are. Provide the full code for the I am working on an industrial asset tracking app. Read this context file first to understand my strict database rules, TypeScript structures, and compression protocols:

[PASTE YOUR AI_CONTEXT.md TEXT HERE]

Please create a new React form component: `src/components/MaintenanceForm.tsx`.
This component must render a high-efficiency entry form for technicians.
- Fields: Technician ID/Name, Task Category (PM, Corrective, Breakdown), Work Description, Components Replaced, and Current Meter/Runtime reading.
- On Submit: It must compile these fields into a JSON object, compress that object using our `CompressionService.compress()`, and execute the `updateNodePayload` RTK Query mutation to update that specific equipment node in the graph.
- Styling: Use a clean, streamlined modern layout matching our dark aesthetic.

I am working on an industrial asset tracking app. Read this context file first to understand my strict database rules, TypeScript structures, and compression protocols:

[PASTE YOUR AI_CONTEXT.md TEXT HERE]

Please write a mock backend API server using Node.js, Express, and TypeScript: `server.ts` (or a single `server.js` file if easier).
- It must handle a GET request to `/api/graph` and serve the initial seed/mock verification data from our context file.
- It must handle a PATCH request to `/api/node/:id` to accept a fresh `compressedPayload` string payload and update that node in our active memory array.
- Include basic CORS configuration so our Vite frontend can query it natively.

I am working on an industrial asset tracking app. Read this context file first to understand my strict database rules, TypeScript structures, and compression protocols:

[PASTE YOUR AI_CONTEXT.md TEXT HERE]

Please build a technical sub-component: `src/components/SchematicViewer.tsx`.
This component will run inside our 'specs' tab. It should read the decompressed data payload from an equipment node and cleanly format technical electrical/mechanical information.
- It must render a clean, searchable table for: PLC Input/Output mappings (Terminal, Address, Device, Function), Supply Voltages, FLA, Transformer ratings, and Fuse profiles.
- Include a quick-search filter input box so a technician can type a wire or terminal number on their phone and find it instantly.


