// RAASTA Journey Graph Component — PRD §19
import React from 'react';
import { JourneyNode, Dependency, Evidence, NodeStatus } from '@/types/domain';
import { JourneyNodeCard } from './JourneyNodeCard';

interface JourneyGraphProps {
  nodes: JourneyNode[];
  dependencies: Dependency[];
  evidence: Evidence[];
  onStatusChange?: (nodeId: string, newStatus: NodeStatus) => void;
}

export const JourneyGraph: React.FC<JourneyGraphProps> = ({
  nodes,
  dependencies,
  evidence,
  onStatusChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Journey Sequence & Dependencies
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ordered by priority and prerequisite sequence
          </p>
        </div>
        <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
          {nodes.length} {nodes.length === 1 ? 'Node' : 'Nodes'}
        </span>
      </div>

      <div className="relative pl-6 md:pl-8 space-y-6 before:absolute before:left-2.5 md:before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
        {nodes.map((node, index) => {
          const nodeEvidence = evidence.filter((e) => e.nodeId === node.id);

          // Find inbound dependencies (nodes that this node depends on)
          const prereqDeps = dependencies.filter((d) => d.toNodeId === node.id);
          const prereqNodes = prereqDeps
            .map((d) => nodes.find((n) => n.id === d.fromNodeId))
            .filter(Boolean) as JourneyNode[];

          return (
            <div key={node.id} className="relative group">
              {/* Timeline Connector Dot */}
              <div
                className={`absolute -left-6 md:-left-8 top-5 h-5 w-5 rounded-full border-2 bg-white dark:bg-zinc-950 flex items-center justify-center text-[10px] font-bold z-10 transition-colors ${
                  node.status === 'COMPLETED'
                    ? 'border-emerald-500 text-emerald-600'
                    : node.status === 'BLOCKED'
                    ? 'border-rose-500 text-rose-600 animate-pulse'
                    : node.status === 'IN_PROGRESS'
                    ? 'border-blue-500 text-blue-600'
                    : node.status === 'NEEDS_VERIFICATION'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-zinc-300 dark:border-zinc-700 text-zinc-400'
                }`}
              >
                {index + 1}
              </div>

              {/* Dependency Warning pill above card if blocked */}
              {prereqNodes.length > 0 && (
                <div className="mb-2 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>Prerequisites:</span>
                  <div className="flex flex-wrap gap-1">
                    {prereqNodes.map((p) => (
                      <span
                        key={p.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          p.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {p.title} ({p.status})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <JourneyNodeCard
                node={node}
                evidence={nodeEvidence}
                onStatusChange={onStatusChange}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
