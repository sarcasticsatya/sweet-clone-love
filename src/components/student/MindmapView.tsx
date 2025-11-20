import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

interface MindmapViewProps {
  chapterId: string;
}

export const MindmapView = ({ chapterId }: MindmapViewProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNodes([]);
    setEdges([]);
  }, [chapterId, setNodes, setEdges]);

  const generateMindmap = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mindmap", {
        body: { chapterId },
      });

      if (error) throw error;

      const { nodes: rawNodes, edges: rawEdges } = data.mindmap;

      // Convert to ReactFlow format with layout
      const layoutedNodes: Node[] = rawNodes.map((node: any, index: number) => {
        const level = node.type === "root" ? 0 : node.type === "main" ? 1 : 2;
        const nodesAtLevel = rawNodes.filter((n: any) => {
          const nLevel = n.type === "root" ? 0 : n.type === "main" ? 1 : 2;
          return nLevel === level;
        });
        const indexAtLevel = nodesAtLevel.findIndex((n: any) => n.id === node.id);
        
        return {
          id: node.id,
          data: { label: node.label },
          position: {
            x: level * 300,
            y: indexAtLevel * 150 + (level === 0 ? 200 : 0),
          },
          style: {
            background: level === 0 ? "hsl(var(--primary))" : level === 1 ? "hsl(var(--secondary))" : "hsl(var(--accent))",
            color: level === 0 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            padding: "12px 20px",
            fontSize: level === 0 ? "16px" : "14px",
            fontWeight: level === 0 ? "600" : "500",
          },
        };
      });

      const layoutedEdges: Edge[] = rawEdges.map((edge: any) => ({
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: true,
        style: { stroke: "hsl(var(--border))", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "hsl(var(--border))",
        },
      }));

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      toast.success("Mind map generated successfully!");
    } catch (error) {
      console.error("Error generating mindmap:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate mind map"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Network className="w-4 h-4" />
            Mind Map
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Visual concept map of key topics
        </p>
        <Button 
          onClick={generateMindmap} 
          disabled={loading}
          className="w-full"
          size="sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Mind Map"
          )}
        </Button>
      </div>

      <div className="flex-1 bg-muted/20">
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-2">
              <Network className="w-12 h-12 text-muted-foreground/50 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Click "Generate Mind Map" to create a visual concept map
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
