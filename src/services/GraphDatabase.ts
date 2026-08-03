import { GraphNode, GraphEdge, EdgeType } from '../types/graph';

export class IndustrialGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  
  // Adjacency lists for rapid traversal lookups
  private outEdges: Map<string, string[]> = new Map(); // source -> array of edgeIds
  private inEdges: Map<string, string[]> = new Map();  // target -> array of edgeIds

  // Clear database and load new datasets
  public loadGraph(nodes: GraphNode[], edges: GraphEdge[]) {
    this.nodes.clear();
    this.edges.clear();
    this.outEdges.clear();
    this.inEdges.clear();

    nodes.forEach(node => this.addNode(node));
    edges.forEach(edge => this.addEdge(edge));
  }

  public addNode(node: GraphNode) {
    this.nodes.set(node.id, node);
    if (!this.outEdges.has(node.id)) this.outEdges.set(node.id, []);
    if (!this.inEdges.has(node.id)) this.inEdges.set(node.id, []);
  }

  public addEdge(edge: GraphEdge) {
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
      console.warn(`Cannot link missing nodes: ${edge.source} -> ${edge.target}`);
      return;
    }
    this.edges.set(edge.id, edge);
    this.outEdges.get(edge.source)?.push(edge.id);
    this.inEdges.get(edge.target)?.push(edge.id);
  }

  public getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Finds all downstream nodes connected by a specific relation type
   * Example: Get everything a Main Panel "FEEDS_POWER_TO"
   */
  public getDownstreamNeighbors(nodeId: string, relationFilter?: EdgeType): GraphNode[] {
    const edgeIds = this.outEdges.get(nodeId) || [];
    return edgeIds
      .map(edgeId => this.edges.get(edgeId)!)
      .filter(edge => !relationFilter || edge.type === relationFilter)
      .map(edge => this.nodes.get(edge.target)!)
      .filter(Boolean);
  }

  /**
   * Finds upstream dependencies
   * Example: What disconnect switch "IS_ISOLATED_BY" this Compressor?
   */
  public getUpstreamDependencies(nodeId: string, relationFilter?: EdgeType): GraphNode[] {
    const edgeIds = this.inEdges.get(nodeId) || [];
    return edgeIds
      .map(edgeId => this.edges.get(edgeId)!)
      .filter(edge => !relationFilter || edge.type === relationFilter)
      .map(edge => this.nodes.get(edge.source)!)
      .filter(Boolean);
  }
}

// Export a single global instance for the UI layer
export const db = new IndustrialGraph();