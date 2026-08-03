export type NodeType = 'ZONE' | 'EQUIPMENT' | 'COMPONENT' | 'DISCONNECT';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  coordinates: [number, number]; // [latitude, longitude]
  payload: Record<string, any>;   // Flexible object for technical specs, manual links, or compressed strings
}

export type EdgeType = 'CONTAINS' | 'FEEDS_POWER_TO' | 'DEPENDS_ON' | 'IS_ISOLATED_BY';

export interface GraphEdge {
  id: string;
  source: string; // Origin Node ID
  target: string; // Destination Node ID
  type: EdgeType;
}