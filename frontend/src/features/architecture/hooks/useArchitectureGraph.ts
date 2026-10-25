/**
 * useArchitectureGraph
 *
 * Single source of truth for the canvas node/edge state, including selection.
 *
 * Selection rules:
 *  - Selecting a node clears any edge selection.
 *  - Selecting an edge clears any node selection.
 *  - Clicking the empty canvas pane clears all selection.
 *  - React Flow's built-in selection state (node.selected) drives visual
 *    highlighting; we mirror the selected IDs here so the properties panel
 *    can read them without traversing the node/edge arrays itself.
 */

import { useCallback, useState } from 'react';
import {
  useNodesState,
  useEdgesState,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnSelectionChangeParams,
  addEdge,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';

import { getDemoArchitecture } from '../data/demoArchitecture';
import type { ArchitectureNodeData, ArchitectureEdgeData } from '../types/architecture';

export interface UseArchitectureGraphReturn {
  nodes: Node<ArchitectureNodeData>[];
  edges: Edge<ArchitectureEdgeData>[];
  onNodesChange: OnNodesChange<Node<ArchitectureNodeData>>;
  onEdgesChange: OnEdgesChange<Edge<ArchitectureEdgeData>>;
  onConnect: OnConnect;
  resetDemo: () => void;
  /** ID of the currently selected node, or null. */
  selectedNodeId: string | null;
  /** ID of the currently selected edge, or null. */
  selectedEdgeId: string | null;
  /** Pass to ReactFlow's onSelectionChange prop. */
  onSelectionChange: (params: OnSelectionChangeParams) => void;
  /** Pass to ReactFlow's onPaneClick prop to clear selection. */
  onPaneClick: () => void;
}

export function useArchitectureGraph(): UseArchitectureGraphReturn {
  const { nodes: initNodes, edges: initEdges } = getDemoArchitecture();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ArchitectureNodeData>>(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<ArchitectureEdgeData>>(initEdges);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const onConnect = useCallback<OnConnect>(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const resetDemo = useCallback(() => {
    const { nodes: freshNodes, edges: freshEdges } = getDemoArchitecture();
    setNodes(freshNodes);
    setEdges(freshEdges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [setNodes, setEdges]);

  /**
   * React Flow fires this whenever the set of selected nodes/edges changes.
   * We take only the first selected item in each category and enforce mutual
   * exclusivity: a node selection clears the edge selection and vice versa.
   */
  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const firstNode = params.nodes[0] ?? null;
    const firstEdge = params.edges[0] ?? null;

    if (firstNode) {
      // Node clicked — clear edge selection
      setSelectedNodeId(firstNode.id);
      setSelectedEdgeId(null);
    } else if (firstEdge) {
      // Edge clicked — clear node selection
      setSelectedEdgeId(firstEdge.id);
      setSelectedNodeId(null);
    }
    // If both are empty React Flow is signalling a deselect — handled by onPaneClick
  }, []);

  /** Clicking the canvas pane clears all selection. */
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    resetDemo,
    selectedNodeId,
    selectedEdgeId,
    onSelectionChange,
    onPaneClick,
  };
}
