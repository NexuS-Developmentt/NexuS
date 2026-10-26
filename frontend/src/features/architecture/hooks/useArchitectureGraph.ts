/**
 * useArchitectureGraph
 *
 * Single source of truth for the canvas node/edge state, selection, and editing.
 *
 * Capabilities:
 *  - Interactive nodes and edges state
 *  - Selection mutual exclusivity (node vs edge)
 *  - Adding new nodes with non-stacking positions
 *  - Real-time node & edge data updating
 *  - Node and edge deletion with connected edge cleanup
 *  - Connection validation blocking self-links & duplicate source-target pairs
 *  - Non-blocking notification messages for blocked connections
 *  - Transient simulation status overlay (highlights bottlenecks without overwriting user data)
 *  - Automatically clears simulation highlights when graph is mutated or reset
 */

import { useCallback, useState, useMemo } from 'react';
import {
  useNodesState,
  useEdgesState,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnSelectionChangeParams,
  type Connection,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';

import { getDemoArchitecture } from '../data/demoArchitecture';
import type {
  ArchitectureNodeData,
  ArchitectureEdgeData,
  ArchitectureNodeKind,
} from '../types/architecture';
import {
  validateConnection,
  getDefaultNodeConfig,
  calculateNewNodePosition,
} from '../utils/graphValidation';

export interface UseArchitectureGraphReturn {
  nodes: Node<ArchitectureNodeData>[];
  rawNodes: Node<ArchitectureNodeData>[];
  edges: Edge<ArchitectureEdgeData>[];
  onNodesChange: OnNodesChange<Node<ArchitectureNodeData>>;
  onEdgesChange: OnEdgesChange<Edge<ArchitectureEdgeData>>;
  onConnect: OnConnect;
  resetDemo: () => void;

  /** ID of the currently selected node, or null. */
  selectedNodeId: string | null;
  /** ID of the currently selected edge, or null. */
  selectedEdgeId: string | null;

  /** Selection handlers */
  onSelectionChange: (params: OnSelectionChangeParams) => void;
  onPaneClick: () => void;
  clearSelection: () => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;

  /** Graph mutations */
  addNode: (kind: ArchitectureNodeKind) => string;
  updateNodeData: (nodeId: string, partialData: Partial<ArchitectureNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  updateEdgeData: (
    edgeId: string,
    partialData: Partial<ArchitectureEdgeData>,
    newLabel?: string,
  ) => void;
  deleteEdge: (edgeId: string) => void;

  /** Non-blocking feedback notification (e.g. for blocked connections) */
  notification: string | null;
  clearNotification: () => void;

  /** Simulation status highlights and per-node utilisation */
  simulationHighlights: Record<string, 'normal' | 'warning' | 'critical'> | null;
  simulationUtilisations: Record<string, number> | null;
  setSimulationHighlights: (
    highlights: Record<string, 'normal' | 'warning' | 'critical'> | null,
    utilisations?: Record<string, number> | null,
  ) => void;
  clearSimulationHighlights: () => void;

  /** Replace entire graph with imported diagram */
  loadGraph: (
    newNodes: Node<ArchitectureNodeData>[],
    newEdges: Edge<ArchitectureEdgeData>[],
  ) => void;
  showNotification: (message: string) => void;
}

export function useArchitectureGraph(): UseArchitectureGraphReturn {
  const { nodes: initNodes, edges: initEdges } = getDemoArchitecture();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ArchitectureNodeData>>(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<ArchitectureEdgeData>>(initEdges);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [simulationHighlights, setSimulationHighlightsState] = useState<
    Record<string, 'normal' | 'warning' | 'critical'> | null
  >(null);
  const [simulationUtilisations, setSimulationUtilisations] = useState<
    Record<string, number> | null
  >(null);

  const clearSimulationHighlights = useCallback(() => {
    setSimulationHighlightsState(null);
    setSimulationUtilisations(null);
  }, []);

  const setSimulationHighlights = useCallback(
    (
      highlights: Record<string, 'normal' | 'warning' | 'critical'> | null,
      utilisations?: Record<string, number> | null,
    ) => {
      setSimulationHighlightsState(highlights);
      setSimulationUtilisations(utilisations ?? null);
    },
    [],
  );

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setNotification((curr) => (curr === message ? null : curr));
    }, 4000);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const loadGraph = useCallback(
    (
      newNodes: Node<ArchitectureNodeData>[],
      newEdges: Edge<ArchitectureEdgeData>[],
    ) => {
      clearSelection();
      clearSimulationHighlights();
      setNodes(newNodes);
      setEdges(newEdges);
      showNotification('Architecture graph imported successfully.');
    },
    [clearSelection, clearSimulationHighlights, setNodes, setEdges, showNotification],
  );

  // ── Connection Handler ────────────────────────────────────────────────────────
  const onConnect = useCallback<OnConnect>(
    (connection: Connection) => {
      clearSimulationHighlights();
      const check = validateConnection(
        { source: connection.source, target: connection.target },
        edges,
      );

      if (!check.valid) {
        showNotification(check.reason ?? 'Cannot create connection.');
        return;
      }

      const newEdgeId = `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newEdge: Edge<ArchitectureEdgeData> = {
        id: newEdgeId,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'smoothstep',
        markerEnd: { type: 'arrow' as const },
        data: {
          kind: 'http',
          label: 'HTTP',
        },
        label: 'HTTP',
      };

      setEdges((eds) => [...eds, newEdge]);
      setSelectedEdgeId(newEdgeId);
      setSelectedNodeId(null);
    },
    [edges, setEdges, showNotification, clearSimulationHighlights],
  );

  // ── Reset ────────────────────────────────────────────────────────────────────
  const resetDemo = useCallback(() => {
    const { nodes: freshNodes, edges: freshEdges } = getDemoArchitecture();
    setNodes(freshNodes);
    setEdges(freshEdges);
    clearSelection();
    setNotification(null);
    clearSimulationHighlights();
  }, [setNodes, setEdges, clearSelection, clearSimulationHighlights]);

  // ── Add Node ─────────────────────────────────────────────────────────────────
  const addNode = useCallback(
    (kind: ArchitectureNodeKind): string => {
      clearSimulationHighlights();
      const id = `node-${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const config = getDefaultNodeConfig(kind);
      const position = calculateNewNodePosition(nodes);

      const newNode: Node<ArchitectureNodeData> = {
        id,
        type: 'architectureNode',
        position,
        data: {
          label: config.label,
          kind: config.kind,
          replicas: config.replicas,
          cpuCores: config.cpuCores,
          memoryMb: config.memoryMb,
          description: config.description,
          status: config.status,
        },
      };

      setNodes((currentNodes) => [...currentNodes, newNode]);
      setSelectedNodeId(id);
      setSelectedEdgeId(null);
      return id;
    },
    [nodes, setNodes, clearSimulationHighlights],
  );

  // ── Update Node Data ─────────────────────────────────────────────────────────
  const updateNodeData = useCallback(
    (nodeId: string, partialData: Partial<ArchitectureNodeData>) => {
      clearSimulationHighlights();
      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          if (n.id !== nodeId) return n;
          return {
            ...n,
            data: {
              ...n.data,
              ...partialData,
            },
          };
        }),
      );
    },
    [setNodes, clearSimulationHighlights],
  );

  // ── Delete Node ──────────────────────────────────────────────────────────────
  const deleteNode = useCallback(
    (nodeId: string) => {
      clearSimulationHighlights();
      // 1. Remove the node
      setNodes((prevNodes) => prevNodes.filter((n) => n.id !== nodeId));

      // 2. Remove all connected edges
      setEdges((prevEdges) =>
        prevEdges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );

      // 3. Clear selection if this node or a connected edge was selected
      setSelectedNodeId((curr) => (curr === nodeId ? null : curr));
      setSelectedEdgeId((currEdgeId) => {
        if (!currEdgeId) return null;
        const wasConnected = edges.some(
          (e) => e.id === currEdgeId && (e.source === nodeId || e.target === nodeId),
        );
        return wasConnected ? null : currEdgeId;
      });
    },
    [edges, setNodes, setEdges, clearSimulationHighlights],
  );

  // ── Update Edge Data ─────────────────────────────────────────────────────────
  const updateEdgeData = useCallback(
    (edgeId: string, partialData: Partial<ArchitectureEdgeData>, newLabel?: string) => {
      clearSimulationHighlights();
      setEdges((prevEdges) =>
        prevEdges.map((e) => {
          if (e.id !== edgeId) return e;
          const updatedLabel: string | undefined =
            newLabel !== undefined
              ? newLabel
              : (partialData.label ?? (typeof e.label === 'string' ? e.label : undefined));
          return {
            ...e,
            label: updatedLabel,
            data: {
              ...e.data,
              ...partialData,
              label: updatedLabel,
            },
          };
        }),
      );
    },
    [setEdges, clearSimulationHighlights],
  );

  // ── Delete Edge ──────────────────────────────────────────────────────────────
  const deleteEdge = useCallback(
    (edgeId: string) => {
      clearSimulationHighlights();
      setEdges((prevEdges) => prevEdges.filter((e) => e.id !== edgeId));
      setSelectedEdgeId((curr) => (curr === edgeId ? null : curr));
    },
    [setEdges, clearSimulationHighlights],
  );

  // ── Selection Handlers ───────────────────────────────────────────────────────
  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const firstNode = params.nodes[0] ?? null;
    const firstEdge = params.edges[0] ?? null;

    if (firstNode) {
      setSelectedNodeId(firstNode.id);
      setSelectedEdgeId(null);
    } else if (firstEdge) {
      setSelectedEdgeId(firstEdge.id);
      setSelectedNodeId(null);
    }
  }, []);

  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // ── Display Nodes with transient simulation overlay ──────────────────────────
  const displayNodes = useMemo(() => {
    if (!simulationHighlights && !simulationUtilisations) return nodes;
    return nodes.map((node) => {
      const simStatus = simulationHighlights?.[node.id];
      const simUtil = simulationUtilisations?.[node.id];
      if (!simStatus && simUtil === undefined) return node;
      return {
        ...node,
        data: {
          ...node.data,
          ...(simStatus ? { simulationStatus: simStatus } : {}),
          ...(simUtil !== undefined ? { simulationUtilisation: simUtil } : {}),
        },
      };
    });
  }, [nodes, simulationHighlights, simulationUtilisations]);

  return {
    nodes: displayNodes,
    rawNodes: nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    resetDemo,
    selectedNodeId,
    selectedEdgeId,
    onSelectionChange,
    onPaneClick,
    clearSelection,
    setSelectedNodeId,
    setSelectedEdgeId,
    addNode,
    updateNodeData,
    deleteNode,
    updateEdgeData,
    deleteEdge,
    notification,
    clearNotification,
    showNotification,
    simulationHighlights,
    simulationUtilisations,
    setSimulationHighlights,
    clearSimulationHighlights,
    loadGraph,
  };
}
