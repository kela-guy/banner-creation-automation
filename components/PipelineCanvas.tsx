"use client";

import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PipelineNode, type PipelineNodeData, type PipelineNodeType } from "@/components/nodes/PipelineNode";
import {
  UploadIcon,
  TrendsIcon,
  ExtractIcon,
  CopyIcon,
  ConceptIcon,
  GenerateIcon,
  GalleryIcon,
} from "@/components/nodes/nodeIcons";
import { canvas as canvasConfig } from "@/lib/nodeDesignConfig";
import { useThemeAndLocale } from "@/components/ThemeAndLocaleProvider";
import { pipelineLabel, pipelineSummary, type PipelineNodeId } from "@/lib/translations";

const NODE_WIDTH = canvasConfig.nodeWidth;
const GAP = canvasConfig.gap;

const NODE_IDS: PipelineNodeId[] = ["upload", "trends", "extract", "copy", "concepts", "generate", "gallery"];

const baseNodeConfig: Record<
  PipelineNodeId,
  { icon: React.ReactNode; iconBg: string; iconColor: string; nodeType: "trigger" | "action" }
> = {
  upload: {
    icon: <UploadIcon />,
    iconBg: "bg-slate-700 dark:bg-slate-600",
    iconColor: "text-white",
    nodeType: "trigger",
  },
  trends: {
    icon: <TrendsIcon />,
    iconBg: "bg-teal-500",
    iconColor: "text-white",
    nodeType: "action",
  },
  extract: {
    icon: <ExtractIcon />,
    iconBg: "bg-[var(--color-accent)]",
    iconColor: "text-white",
    nodeType: "action",
  },
  copy: {
    icon: <CopyIcon />,
    iconBg: "bg-[var(--color-accent)]",
    iconColor: "text-white",
    nodeType: "action",
  },
  concepts: {
    icon: <ConceptIcon />,
    iconBg: "bg-amber-500",
    iconColor: "text-white",
    nodeType: "action",
  },
  generate: {
    icon: <GenerateIcon />,
    iconBg: "bg-[var(--color-accent)]",
    iconColor: "text-white",
    nodeType: "action",
  },
  gallery: {
    icon: <GalleryIcon />,
    iconBg: "bg-blue-500",
    iconColor: "text-white",
    nodeType: "action",
  },
};

function buildInitialNodes(locale: "en" | "he"): PipelineNodeType[] {
  return NODE_IDS.map((id, i) => ({
    id,
    type: "pipeline" as const,
    position: { x: (NODE_WIDTH + GAP) * i, y: 0 },
    data: {
      label: pipelineLabel(locale, id),
      status: "idle" as const,
      summary: pipelineSummary(locale, id),
      icon: baseNodeConfig[id].icon,
      iconBg: baseNodeConfig[id].iconBg,
      iconColor: baseNodeConfig[id].iconColor,
      nodeType: baseNodeConfig[id].nodeType,
    },
  }));
}

const initialEdges: Edge[] = [
  { id: "e-upload-trends", source: "upload", target: "trends", type: "smoothstep" },
  { id: "e-trends-extract", source: "trends", target: "extract", type: "smoothstep" },
  { id: "e-extract-copy", source: "extract", target: "copy", type: "smoothstep" },
  { id: "e-copy-concepts", source: "copy", target: "concepts", type: "smoothstep" },
  { id: "e-concepts-generate", source: "concepts", target: "generate", type: "smoothstep" },
  { id: "e-generate-gallery", source: "generate", target: "gallery", type: "smoothstep" },
];

const nodeTypes: NodeTypes = {
  pipeline: PipelineNode,
};

export interface PipelineCanvasProps {
  onNodeSelect?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  nodeData?: Partial<Record<string, Partial<PipelineNodeData>>>;
}

export function PipelineCanvas({
  onNodeSelect,
  selectedNodeId,
  nodeData = {},
}: PipelineCanvasProps) {
  const { locale } = useThemeAndLocale();
  const [nodes, setNodes, onNodesChange] = useNodesState(buildInitialNodes(locale));
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        const id = n.id as PipelineNodeId;
        const label = pipelineLabel(locale, id);
        const summary = pipelineSummary(locale, id);
        const u = nodeData[n.id];
        const dataMerge = {
          ...n.data,
          label,
          summary,
          ...u,
        };
        return {
          ...n,
          data: dataMerge,
          selected: selectedNodeId === n.id,
        };
      })
    );
  }, [locale, nodeData, selectedNodeId, setNodes]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect?.(node.id);
    },
    [onNodeSelect]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls aria-label="Canvas controls" />
      </ReactFlow>
    </div>
  );
}
