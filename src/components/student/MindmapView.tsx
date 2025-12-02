import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Network, Download, ChevronRight, ChevronDown, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MindmapViewProps {
  chapterId: string;
}

interface TreeNode {
  id: string;
  label: string;
  children: TreeNode[];
  type: "root" | "main" | "sub";
}

export const MindmapView = ({ chapterId }: MindmapViewProps) => {
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTreeData(null);
    setExpandedNodes(new Set());
    if (chapterId) {
      loadMindmap();
    }
  }, [chapterId]);

  const loadMindmap = async () => {
    if (!chapterId) return;
    
    setLoading(true);
    try {
      const { data: existingMindmap, error } = await supabase
        .from("mindmaps")
        .select("mindmap_data")
        .eq("chapter_id", chapterId)
        .single();

      if (existingMindmap && !error) {
        const mindmapData = existingMindmap.mindmap_data as any;
        setRawData(mindmapData);
        const tree = convertToTree(mindmapData.nodes, mindmapData.edges);
        setTreeData(tree);
        // Auto-expand root
        if (tree) {
          setExpandedNodes(new Set([tree.id]));
        }
      }
    } catch (error) {
      console.error("Error loading mindmap:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMindmap = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mindmap", {
        body: { chapterId },
      });

      if (error) throw error;

      setRawData(data.mindmap);
      const tree = convertToTree(data.mindmap.nodes, data.mindmap.edges);
      setTreeData(tree);
      if (tree) {
        setExpandedNodes(new Set([tree.id]));
      }
      toast.success("Mind map generated!");
    } catch (error) {
      console.error("Error generating mindmap:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const convertToTree = (nodes: any[], edges: any[]): TreeNode | null => {
    if (!nodes || nodes.length === 0) return null;

    const nodeMap = new Map<string, TreeNode>();
    nodes.forEach(node => {
      nodeMap.set(node.id, {
        id: node.id,
        label: node.label,
        type: node.type || "sub",
        children: []
      });
    });

    const rootNode = nodes.find(n => n.type === "root");
    if (!rootNode) return null;

    edges.forEach(edge => {
      const parent = nodeMap.get(edge.source);
      const child = nodeMap.get(edge.target);
      if (parent && child) {
        parent.children.push(child);
      }
    });

    return nodeMap.get(rootNode.id) || null;
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!rawData) return;
    const allIds = new Set<string>(rawData.nodes.map((n: any) => n.id as string));
    setExpandedNodes(allIds);
  };

  const exportAsImage = async () => {
    if (!containerRef.current || !treeData) {
      toast.error("Nothing to export");
      return;
    }

    try {
      // Create a simple text-based export
      const exportText = generateTextExport(treeData, "");
      const blob = new Blob([exportText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mindmap.txt";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Mind map exported!");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const generateTextExport = (node: TreeNode, indent: string): string => {
    let result = `${indent}${node.label}\n`;
    node.children.forEach(child => {
      result += generateTextExport(child, indent + "  ");
    });
    return result;
  };

  const TreeNodeComponent = ({ node, level = 0 }: { node: TreeNode; level?: number }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;

    const bgColor = level === 0 
      ? "bg-primary text-primary-foreground" 
      : level === 1 
        ? "bg-secondary text-secondary-foreground" 
        : "bg-muted";

    return (
      <div className="select-none">
        <button
          onClick={() => toggleNode(node.id)}
          className={cn(
            "flex items-center gap-2 w-full text-left p-2 rounded-lg transition-all",
            "hover:opacity-80 active:scale-[0.98]",
            bgColor,
            level === 0 && "font-semibold text-sm",
            level === 1 && "font-medium text-xs ml-4",
            level >= 2 && "text-xs ml-8"
          )}
        >
          {hasChildren && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </span>
          )}
          {!hasChildren && <span className="w-3" />}
          <span className="leading-tight">{node.label}</span>
        </button>
        
        {isExpanded && hasChildren && (
          <div className="mt-1 space-y-1 border-l-2 border-primary/20 ml-3 pl-2">
            {node.children.map(child => (
              <TreeNodeComponent key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-xs flex items-center gap-2">
            <Network className="w-3.5 h-3.5" />
            Mind Map
          </h3>
          {treeData && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={expandAll} className="h-6 w-6 p-0">
                <Maximize2 className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={exportAsImage} className="h-6 w-6 p-0">
                <Download className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Tap topics to expand/collapse
        </p>
      </div>

      <ScrollArea className="flex-1" ref={containerRef}>
        <div className="p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                {treeData ? "Loading..." : "Generating mind map..."}
              </p>
            </div>
          ) : treeData ? (
            <div className="space-y-1">
              <TreeNodeComponent node={treeData} />
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <Network className="w-10 h-10 text-muted-foreground/50 mx-auto" />
              <p className="text-xs text-muted-foreground">
                Generate a visual concept map
              </p>
              <Button size="sm" onClick={generateMindmap} disabled={loading} className="text-xs">
                {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                Generate Mind Map
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
