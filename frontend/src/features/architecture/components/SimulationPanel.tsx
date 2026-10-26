/**
 * SimulationPanel
 *
 * Bottom collapsible panel for running heuristic architecture simulations.
 *
 * Capabilities:
 *  - Collapsible: compact header bar when collapsed, max-height 220px when expanded
 *    (ensuring canvas keeps at least 60% of viewport height on 1366x768).
 *  - Inputs: requestsPerMinute (default 12,000), scenario, targetNodeId (shown only
 *    for service-failure and scale-service scenarios).
 *  - Catches typed `SimulationValidationError` and displays inline errors next to fields.
 *  - Displays metrics (latency, CPU%, throughput), bottleneck node names,
 *    explanation, recommendations list, and "Mock estimate, not measured data" badge.
 *  - Highlights bottleneck nodes on canvas non-destructively via simulationStatus.
 *  - Clears results if the target node is deleted after a run.
 */

import { useState, useId } from 'react';
import type { Node, Edge } from '@xyflow/react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Play,
  Gauge,
  Cpu,
  Clock,
  AlertTriangle,
} from 'lucide-react';

import type {
  ArchitectureNodeData,
  ArchitectureEdgeData,
  SimulationInputs,
  SimulationResult,
} from '../types/architecture';
import {
  runMockSimulation,
  SimulationValidationError,
} from '../services/mockSimulation';
import styles from './SimulationPanel.module.css';

interface SimulationPanelProps {
  nodes: Node<ArchitectureNodeData>[];
  edges: Edge<ArchitectureEdgeData>[];
  onSetSimulationHighlights: (
    highlights: Record<string, 'normal' | 'warning' | 'critical'> | null,
    utilisations?: Record<string, number> | null,
  ) => void;
  onClearSimulationHighlights: () => void;
}

export function SimulationPanel({
  nodes,
  edges,
  onSetSimulationHighlights,
  onClearSimulationHighlights,
}: SimulationPanelProps) {
  const panelId = useId();
  const [isExpanded, setIsExpanded] = useState(true);

  // Form State
  const [rpmInput, setRpmInput] = useState('12000');
  const [scenario, setScenario] = useState<SimulationInputs['scenario']>('normal');

  // Results & Errors State
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [errors, setErrors] = useState<{
    requestsPerMinute?: string;
    scenario?: string;
    targetNodeId?: string;
    general?: string;
  }>({});

  // Track target node selected by user
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [lastRunTargetId, setLastRunTargetId] = useState<string | null>(null);

  // Derived effective target: user selection if valid, otherwise first node
  const effectiveTargetNodeId =
    selectedTargetId && nodes.some((n) => n.id === selectedTargetId)
      ? selectedTargetId
      : (nodes[0]?.id ?? '');

  // If target node was deleted after a run or graph is empty, clear results
  if (lastRunTargetId && !nodes.some((n) => n.id === lastRunTargetId)) {
    setLastRunTargetId(null);
    setResult(null);
  }
  if (nodes.length === 0 && result) {
    setResult(null);
  }

  // ── Handle Run Simulation ───────────────────────────────────────────────────

  const handleRunSimulation = () => {
    setErrors({});

    // Parse RPM
    const parsedRpm = Number(rpmInput);

    const inputs: SimulationInputs = {
      requestsPerMinute: parsedRpm,
      scenario,
      targetNodeId:
        scenario === 'service-failure' || scenario === 'scale-service'
          ? effectiveTargetNodeId
          : undefined,
    };

    try {
      const simResult = runMockSimulation(nodes, edges, inputs);
      setResult(simResult);
      setLastRunTargetId(
        scenario === 'service-failure' || scenario === 'scale-service'
          ? effectiveTargetNodeId
          : null,
      );

      // Apply bottleneck highlights to canvas
      const highlights: Record<string, 'normal' | 'warning' | 'critical'> = {};

      if (scenario === 'service-failure' && effectiveTargetNodeId) {
        highlights[effectiveTargetNodeId] = 'critical';
      }

      simResult.bottleneckNodeIds.forEach((id, index) => {
        if (!highlights[id]) {
          highlights[id] = index === 0 && scenario !== 'service-failure' ? 'critical' : 'warning';
        }
      });

      onSetSimulationHighlights(
        Object.keys(highlights).length > 0 ? highlights : null,
        simResult.nodeUtilisation ?? null,
      );
    } catch (err) {
      if (err instanceof SimulationValidationError) {
        if (err.field === 'requestsPerMinute') {
          setErrors({ requestsPerMinute: err.message });
        } else if (err.field === 'targetNodeId') {
          setErrors({ targetNodeId: err.message });
        } else if (err.field === 'scenario') {
          setErrors({ scenario: err.message });
        } else {
          setErrors({ general: err.message });
        }
      } else {
        setErrors({ general: (err as Error).message });
      }
      setResult(null);
      onClearSimulationHighlights();
    }
  };

  const isTargetRequired = scenario === 'service-failure' || scenario === 'scale-service';

  // Map bottleneck IDs to human-readable node labels
  const bottleneckNames = result?.bottleneckNodeIds
    .map((id) => {
      const node = nodes.find((n) => n.id === id);
      return node?.data.label || id;
    })
    .join(', ');

  return (
    <section
      id="simulation-panel"
      className={[styles.panel, isExpanded ? styles.panelExpanded : styles.panelCollapsed].join(
        ' ',
      )}
      aria-label="Architecture simulation panel"
    >
      {/* ── Header Bar / Collapsible Toggle ── */}
      <div
        className={styles.header}
        onClick={() => setIsExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        aria-expanded={isExpanded}
        aria-controls={`${panelId}-content`}
      >
        <div className={styles.headerLeft}>
          <span className={styles.headerTitle}>
            <Activity size={15} className={styles.headerIcon} />
            Architecture Simulation
          </span>
          {result && !isExpanded && (
            <span className={styles.headerSummary}>
              Last run: {result.estimatedLatencyMs} ms · {result.estimatedCpuPercent}% CPU ·{' '}
              {result.estimatedThroughputRpm.toLocaleString()} RPM
            </span>
          )}
        </div>

        <button
          type="button"
          className={styles.toggleBtn}
          aria-label={isExpanded ? 'Collapse simulation panel' : 'Expand simulation panel'}
        >
          {isExpanded ? (
            <>
              <ChevronDown size={14} /> Collapse
            </>
          ) : (
            <>
              <ChevronUp size={14} /> Expand
            </>
          )}
        </button>
      </div>

      {/* ── Expanded Body ── */}
      {isExpanded && (
        <div id={`${panelId}-content`} className={styles.body}>
          {/* Controls Form */}
          <form
            className={styles.controlsForm}
            onSubmit={(e) => {
              e.preventDefault();
              handleRunSimulation();
            }}
          >
            {/* Requests per minute input */}
            <div className={styles.inputGroup}>
              <label htmlFor={`${panelId}-rpm`} className={styles.label}>
                Requests / Minute
              </label>
              <input
                id={`${panelId}-rpm`}
                type="number"
                min={1}
                max={10000000}
                step={500}
                className={[styles.input, errors.requestsPerMinute ? styles.inputError : ''].join(
                  ' ',
                )}
                value={rpmInput}
                onChange={(e) => {
                  setRpmInput(e.target.value);
                  if (errors.requestsPerMinute) {
                    setErrors((prev) => ({ ...prev, requestsPerMinute: undefined }));
                  }
                }}
                aria-invalid={Boolean(errors.requestsPerMinute)}
                aria-describedby={
                  errors.requestsPerMinute ? `${panelId}-rpm-error` : undefined
                }
              />
              {errors.requestsPerMinute && (
                <span id={`${panelId}-rpm-error`} className={styles.fieldError} role="alert">
                  {errors.requestsPerMinute}
                </span>
              )}
            </div>

            {/* Scenario select */}
            <div className={styles.inputGroup}>
              <label htmlFor={`${panelId}-scenario`} className={styles.label}>
                Scenario
              </label>
              <select
                id={`${panelId}-scenario`}
                className={[styles.select, errors.scenario ? styles.inputError : ''].join(' ')}
                value={scenario}
                onChange={(e) => {
                  setScenario(e.target.value as SimulationInputs['scenario']);
                  if (errors.scenario) {
                    setErrors((prev) => ({ ...prev, scenario: undefined }));
                  }
                }}
              >
                <option value="normal">Normal baseline</option>
                <option value="remove-cache">Remove cache layer</option>
                <option value="service-failure">Service failure</option>
                <option value="scale-service">Scale service (2×)</option>
              </select>
              {errors.scenario && (
                <span className={styles.fieldError} role="alert">
                  {errors.scenario}
                </span>
              )}
            </div>

            {/* Target node select (shown only for service-failure & scale-service) */}
            {isTargetRequired && (
              <div className={styles.inputGroup}>
                <label htmlFor={`${panelId}-target-node`} className={styles.label}>
                  Target Node
                </label>
                <select
                  id={`${panelId}-target-node`}
                  className={[
                    styles.select,
                    errors.targetNodeId ? styles.inputError : '',
                  ].join(' ')}
                  value={effectiveTargetNodeId}
                  onChange={(e) => {
                    setSelectedTargetId(e.target.value);
                    if (errors.targetNodeId) {
                      setErrors((prev) => ({ ...prev, targetNodeId: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(errors.targetNodeId)}
                  aria-describedby={
                    errors.targetNodeId ? `${panelId}-target-error` : undefined
                  }
                  disabled={nodes.length === 0}
                >
                  {nodes.length === 0 ? (
                    <option value="">No nodes in graph</option>
                  ) : (
                    nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.data.label} ({node.data.kind})
                      </option>
                    ))
                  )}
                </select>
                {errors.targetNodeId && (
                  <span id={`${panelId}-target-error`} className={styles.fieldError} role="alert">
                    {errors.targetNodeId}
                  </span>
                )}
              </div>
            )}

            {errors.general && (
              <span className={styles.fieldError} role="alert">
                {errors.general}
              </span>
            )}

            {/* Run Button */}
            <button
              id="btn-run-simulation"
              type="submit"
              className={styles.runBtn}
              disabled={nodes.length === 0}
            >
              <Play size={13} fill="currentColor" />
              Run simulation
            </button>
          </form>

          {/* Results Area */}
          <div className={styles.resultsArea} aria-live="polite">
            <header className={styles.resultsHeader}>
              <span className={styles.resultsTitle}>Simulation Results</span>
              <span className={styles.mockBadge}>Mock estimate, not measured data</span>
            </header>

            {nodes.length === 0 ? (
              <p className={styles.placeholderMessage}>
                Architecture graph is empty. Add components from the palette to run simulations.
              </p>
            ) : result ? (
              <>
                {/* Metrics Cards */}
                <div className={styles.metricsGrid}>
                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>
                      <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                      Latency
                    </span>
                    <span className={styles.metricValue}>{result.estimatedLatencyMs} ms</span>
                  </div>

                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>
                      <Cpu size={11} style={{ display: 'inline', marginRight: 3 }} />
                      Avg CPU
                    </span>
                    <span className={styles.metricValue}>{result.estimatedCpuPercent}%</span>
                  </div>

                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>
                      <Gauge size={11} style={{ display: 'inline', marginRight: 3 }} />
                      Throughput
                    </span>
                    <span className={styles.metricValue}>
                      {result.estimatedThroughputRpm.toLocaleString()} RPM
                    </span>
                  </div>

                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>
                      <AlertTriangle size={11} style={{ display: 'inline', marginRight: 3 }} />
                      Bottlenecks
                    </span>
                    <span className={styles.bottleneckList} title={bottleneckNames || 'None'}>
                      {bottleneckNames || 'None detected'}
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <p className={styles.explanation}>{result.explanation}</p>

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <div className={styles.recommendations}>
                    <span className={styles.recommendationsTitle}>Actionable Recommendations:</span>
                    {result.recommendations.map((rec, idx) => (
                      <div key={idx} className={styles.recommendationItem}>
                        {rec}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className={styles.placeholderMessage}>
                Configure parameters and click &ldquo;Run simulation&rdquo; to estimate latency, CPU load, and bottlenecks.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
