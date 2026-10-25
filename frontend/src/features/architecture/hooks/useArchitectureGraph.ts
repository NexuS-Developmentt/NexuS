/**
 * useArchitectureGraph
 *
 * Single source of truth for the canvas node/edge state.
 * Components stay thin — they call these handlers instead of managing state
 * themselves.
 */

import { useCallback } from 'react';
import {
  useNodesState,
  useEdgesState,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
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
}

export function useArchitectureGraph(): UseArchitectureGraphReturn {
  const { nodes: initNodes, edges: initEdges } = getDemoArchitecture();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ArchitectureNodeData>>(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<ArchitectureEdgeData>>(initEdges);

  const onConnect = useCallback<OnConnect>(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const resetDemo = useCallback(() => {
    const { nodes: freshNodes, edges: freshEdges } = getDemoArchitecture();
    setNodes(freshNodes);
    setEdges(freshEdges);
  }, [setNodes, setEdges]);

  return { nodes, edges, onNodesChange, onEdgesChange, onConnect, resetDemo };
}
