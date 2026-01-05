import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, AlertCircle, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
interface ChatPanelProps {
  selectedChapterId: string | null;
  selectedSubjectId: string | null;
  onVideoTimestampClick?: (videoId: string, timestamp: string) => void;
}
interface ChatMessage {
  id?: string;
  role: string;
  content: string;
  created_at?: string;
}
export const ChatPanel = ({
  selectedChapterId,
  selectedSubjectId,
  onVideoTimestampClick
}: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load chat history when chapter changes
  useEffect(() => {
    if (selectedChapterId) {
      loadChatHistory();
    } else {
      setMessages([]);
    }
  }, [selectedChapterId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 100);
  }, []);
  const loadChatHistory = async () => {
    if (!selectedChapterId) return;
    setLoadingHistory(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data,
        error
      } = await supabase.from("chat_messages").select("*").eq("chapter_id", selectedChapterId).eq("student_id", user.id).order("created_at", {
        ascending: true
      });
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };
  const saveChatMessage = async (role: string, content: string) => {
    if (!selectedChapterId) return;
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("chat_messages").insert({
        student_id: user.id,
        chapter_id: selectedChapterId,
        role,
        content
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };
  const handleSend = async () => {
    if (!input.trim() || !selectedChapterId) return;
    const userMessage = input.trim();
    setInput("");
    const newUserMessage: ChatMessage = {
      role: "user",
      content: userMessage
    };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);

    // Save user message to DB
    await saveChatMessage("user", userMessage);
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("chat-with-chapter", {
        body: {
          chapterId: selectedChapterId,
          message: userMessage,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });
      if (error) throw error;
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.response
      };
      setMessages([...newMessages, assistantMessage]);

      // Save assistant message to DB
      await saveChatMessage("assistant", data.response);
    } catch (error: any) {
      toast.error("Failed to get response: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Parse video timestamp references in messages
  const renderMessageContent = (content: string, role: string) => {
    if (role === "user") {
      return <div className="whitespace-pre-wrap">{content}</div>;
    }

    // Parse video timestamp links: 📹 Watch: [Title] at [timestamp]
    const videoRefRegex = /📹\s*Watch:\s*\[([^\]]+)\]\s*at\s*\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
    return <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-background prose-pre:text-foreground prose-li:text-foreground">
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
          children,
          ...props
        }) => {
          // Check if this paragraph contains video references
          const text = String(children);
          if (text.includes("📹")) {
            const parts = text.split(videoRefRegex);
            if (parts.length > 1) {
              return <p className="mb-3 last:mb-0 leading-relaxed" {...props}>
                      {parts.map((part, i) => {
                  // Every 3rd element starting from 1 is title, starting from 2 is timestamp
                  if (i % 3 === 1) {
                    const title = part;
                    const timestamp = parts[i + 1];
                    return <button key={i} onClick={() => onVideoTimestampClick?.(title, timestamp)} className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer">
                              <Video className="w-3 h-3" />
                              {title} at {timestamp}
                            </button>;
                  } else if (i % 3 === 2) {
                    return null; // Skip timestamp, already used above
                  }
                  return part;
                })}
                    </p>;
            }
          }
          return <p className="mb-3 last:mb-0 leading-relaxed" {...props}>{children}</p>;
        },
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
          {content}
        </ReactMarkdown>
      </div>;
  };
  return <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      <div className="px-6 py-3 border-b border-border bg-card/50 shrink-0">
        <h2 className="font-medium text-sm text-foreground">Chat & Q&A</h2>
        {selectedChapterId ? <p className="text-[11px] text-muted-foreground mt-0.5">Ask questions about the selected chapter</p> : <p className="text-[11px] text-muted-foreground mt-0.5">Select a chapter from sources to start</p>}
      </div>

      <div ref={scrollContainerRef} className="flex-1 px-6 py-4 overflow-y-auto overscroll-contain" style={{
      WebkitOverflowScrolling: 'touch',
      touchAction: 'pan-y',
      overflowX: 'hidden'
    }}>
        {!selectedChapterId ? <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-3 max-w-sm">
              <AlertCircle className="w-10 h-10 text-muted-foreground/60 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Select a chapter from the <strong>Sources</strong> panel to begin chatting
              </p>
            </div>
          </div> : loadingHistory ? <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-3">
              <div className="animate-pulse flex space-x-1 justify-center">
                <span>●</span><span>●</span><span>●</span>
              </div>
              <p className="text-xs text-muted-foreground">Loading chat history...</p>
            </div>
          </div> : messages.length === 0 ? <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-3 max-w-md">
              <div className="text-4xl mx-auto">💬</div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Ask anything about this chapter
                </p>
                <p className="text-xs text-muted-foreground">Powered by AI with context from your selected Chapter</p>
              </div>
            </div>
          </div> : <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((message, idx) => <div key={message.id || idx} className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
                {message.role === "assistant" && <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-semibold text-primary">AI</span>
                  </div>}
                <div className={cn("max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed", message.role === "user" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-foreground border border-border/50")}>
                  {renderMessageContent(message.content, message.role)}
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
            <div ref={messagesEndRef} />
          </div>}
      </div>

      <div className="px-6 py-4 border-t border-border bg-card/30 shrink-0">
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