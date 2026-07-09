# AI Context: Industrial Asset Graph & Map Dashboard

## System Overview
This repository contains a high-performance, graph-structured Computerized Maintenance Management System (CMMS) and Enterprise Asset Management (EAM) dashboard. It maps a large physical facility using a spatial layer (Google Maps API) connected dynamically to an intricate, multi-tab asset data panel.

## Tech Stack & Paradigms
- **Frontend Framework:** React (Vite) + TypeScript + Tailwind CSS
- **State Management:** Redux Toolkit (RTK) & RTK Query
- **Data Architecture:** Graph Database Paradigm (Nodes & Edges structure)
- **Data Optimization:** Client-side UTF-16 compression via `lz-string` to handle massive machinery schematics, data logs, and maintenance records efficiently.

---

## Strict Coding Rules for Inter-LLM Compatibility
Because multiple AI engines (Gemini, ChatGPT, Claude, Grok, DeepSeek, Codex) collaborate on this codebase, you must strictly adhere to the following rules to prevent runtime failures and state corruption:

1. **Strict Type Adherence:** Never invent or alter property names. Always implement the explicit TypeScript contracts defined below.
2. **Compression Protocol:** All intricate data payloads (machinery specs, manuals, historical logs) must be handled through the client-side `CompressionService`. If a payload string starts with the prefix token `⚡`, it is compressed and must be run through the decompression utility before rendering.
3. **Deterministic UI States:** The asset tracking dashboard handles navigation strictly via the explicit layout union `'overview' | 'specs' | 'history' | 'jobs'`. Do not implement alternative tab keys.

---

## Strict Type Definitions & Graph Schema

```typescript
export type NodeType = 'ZONE' | 'EQUIPMENT' | 'COMPONENT' | 'JOB';
export type EdgeType = 'CONTAINS' | 'PART_OF' | 'REQUIRES_PM' | 'ASSIGNED_TO';

export interface GraphNode {
  id: string;                    // Format example: 'zone_1', 'eq_204', 'job_883'
  type: NodeType;
  label: string;
  coordinates?: [number, number]; // [latitude, longitude] - Exclusively for ZONE or surface assets
  compressedPayload: string;     // LZString compressed JSON object or raw text logs string prefixed with '⚡'
}

export interface GraphEdge {
  id: string;
  source: string;                // Source GraphNode ID
  target: string;                // Target GraphNode ID
  type: EdgeType;
}

export interface AssetGraph {
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
}
