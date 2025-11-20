import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
interface ChatPanelProps {
  selectedChapterId: string | null;
  selectedSubjectId: string | null;
}
export const ChatPanel = ({
  selectedChapterId,
  selectedSubjectId
}: ChatPanelProps) => {
  const [messages, setMessages] = useState<Array<{
    role: string;
    content: string;
  }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Clear messages when chapter changes
    setMessages([]);
  }, [selectedChapterId]);
  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  const handleSend = async () => {
    if (!input.trim() || !selectedChapterId) return;
    const userMessage = input.trim();
    setInput("");
    const newMessages = [...messages, {
      role: "user",
      content: userMessage
    }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("chat-with-chapter", {
        body: {
          chapterId: selectedChapterId,
          message: userMessage,
          conversationHistory: messages
        }
      });
      if (error) throw error;
      setMessages([...newMessages, {
        role: "assistant",
        content: data.response
      }]);
    } catch (error: any) {
      toast.error("Failed to get response: " + error.message);
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  };
  return <div className="flex-1 flex flex-col bg-background">
      <div className="px-6 py-3 border-b border-border bg-card/50">
        <h2 className="font-medium text-sm text-foreground">Chat & Q&A</h2>
        {selectedChapterId ? <p className="text-[11px] text-muted-foreground mt-0.5">Ask questions about the selected chapter</p> : <p className="text-[11px] text-muted-foreground mt-0.5">Select a chapter from sources to start</p>}
      </div>

      <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
        {!selectedChapterId ? <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-3 max-w-sm">
              <AlertCircle className="w-10 h-10 text-muted-foreground/60 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Select a chapter from the <strong>Sources</strong> panel to begin chatting
              </p>
            </div>
          </div> : messages.length === 0 ? <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-3 max-w-md">
              <div className="text-4xl mx-auto">💬</div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Ask anything about this chapter
                </p>
                <p className="text-xs text-muted-foreground">
                  Powered by AI with context from your selected PDF
                </p>
              </div>
            </div>
          </div> : <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((message, idx) => <div key={idx} className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
                {message.role === "assistant" && <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-semibold text-primary">AI</span>
                  </div>}
                <div className={cn("max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed", message.role === "user" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-foreground border border-border/50")}>
                  {message.role === "assistant" ? <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-background prose-pre:text-foreground prose-li:text-foreground">
                      <ReactMarkdown components={{
                h2: ({
                  node,
                  ...props
                }) => <h2 className="text-base font-semibold mt-4 mb-2 first:mt-0" {...props} />,
                h3: ({
                  node,
                  ...props
                }) => <h3 className="text-sm font-semibold mt-3 mb-1.5 first:mt-0" {...props} />,
                p: ({
                  node,
                  ...props
                }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                ul: ({
                  node,
                  ...props
                }) => <ul className="mb-3 ml-4 space-y-1.5 list-disc" {...props} />,
                ol: ({
                  node,
                  ...props
                }) => <ol className="mb-3 ml-4 space-y-1.5 list-decimal" {...props} />,
                li: ({
                  node,
                  ...props
                }) => <li className="leading-relaxed" {...props} />,
                strong: ({
                  node,
                  ...props
                }) => <strong className="font-semibold" {...props} />,
                em: ({
                  node,
                  ...props
                }) => <em className="italic" {...props} />,
                code: ({
                  node,
                  className,
                  children,
                  ...props
                }) => {
                  const isInline = !className?.includes('language-');
                  return isInline ? <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code> : <code className="block bg-background p-2 rounded text-xs my-2 font-mono" {...props}>{children}</code>;
                }
              }}>
                        {message.content}
                      </ReactMarkdown>
                    </div> : <div className="whitespace-pre-wrap">{message.content}</div>}
                </div>
              </div>)}
            {loading && <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-primary">AI</span>
                </div>
                <div className="bg-muted/50 border border-border/50 rounded-2xl px-4 py-2.5 text-[13px]">
                  <span className="flex items-center gap-1">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse animation-delay-200">●</span>
                    <span className="animate-pulse animation-delay-400">●</span>
                  </span>
                </div>
              </div>}
          </div>}
      </ScrollArea>

      <div className="px-6 py-4 border-t border-border bg-card/30 sticky bottom-0">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }} placeholder={selectedChapterId ? "Ask a question about this chapter..." : "Select a chapter first"} disabled={!selectedChapterId || loading} className="min-h-[52px] resize-none rounded-xl text-sm" />
          <Button onClick={handleSend} disabled={!selectedChapterId || !input.trim() || loading} size="icon" className="h-[52px] w-[52px] rounded-xl">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>;
};