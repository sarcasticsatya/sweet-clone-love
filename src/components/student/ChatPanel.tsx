import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  selectedChapterId: string | null;
  selectedSubjectId: string | null;
}

export const ChatPanel = ({ selectedChapterId, selectedSubjectId }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clear messages when chapter changes
    setMessages([]);
  }, [selectedChapterId]);

  const handleSend = async () => {
    if (!input.trim() || !selectedChapterId) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    // TODO: Call AI chat endpoint
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "AI chat integration coming soon. Your question will be answered based on the selected chapter content.",
        },
      ]);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm">Chat</h2>
        {selectedChapterId ? (
          <p className="text-xs text-muted-foreground mt-1">Ask questions about the selected chapter</p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">Select a chapter from sources to start</p>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {!selectedChapterId ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-2">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Select a chapter from the Sources panel to begin
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Ask a question to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg p-3 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 text-sm">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={selectedChapterId ? "Ask a question..." : "Select a chapter first"}
            disabled={!selectedChapterId || loading}
            className="min-h-[60px] resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={!selectedChapterId || !input.trim() || loading}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
