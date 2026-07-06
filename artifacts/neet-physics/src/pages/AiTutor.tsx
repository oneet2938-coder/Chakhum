import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Send, Sparkles, RotateCcw, Copy, Check, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string; id: string };

const SUGGESTED = [
  "Explain Newton's laws with examples",
  "How do I solve projectile motion problems?",
  "What is the difference between electric field and potential?",
  "Explain Kirchhoff's laws step by step",
  "How does a transformer work?",
  "Derive the lens maker's equation",
  "What is the photoelectric effect?",
  "Explain Doppler effect with formula",
];

function formatMessage(text: string) {
  const lines = text.split("\n");
  const result: JSX.Element[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      result.push(<p key={key++} className="font-bold text-foreground mb-1">{line.slice(2, -2)}</p>);
    } else if (/^\d+\.\s/.test(line)) {
      result.push(
        <div key={key++} className="flex gap-2 mb-1">
          <span className="text-primary font-bold shrink-0 text-xs mt-0.5">{line.match(/^\d+/)?.[0]}.</span>
          <span className="text-sm leading-relaxed">{inlineFormat(line.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      result.push(
        <div key={key++} className="flex gap-2 mb-1">
          <span className="text-primary shrink-0 mt-1.5">•</span>
          <span className="text-sm leading-relaxed">{inlineFormat(line.slice(2))}</span>
        </div>
      );
    } else if (line === "") {
      result.push(<div key={key++} className="h-2" />);
    } else {
      result.push(<p key={key++} className="text-sm leading-relaxed mb-1">{inlineFormat(line)}</p>);
    }
  }
  return result;
}

function inlineFormat(text: string): JSX.Element {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  function copy() {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5",
        isUser ? "bg-primary/20" : "bg-gradient-to-br from-violet-500/30 to-primary/20"
      )}>
        {isUser ? <User className="w-3.5 h-3.5 text-primary" /> : <Bot className="w-3.5 h-3.5 text-violet-400" />}
      </div>

      {/* Bubble */}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 relative group",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-card border border-card-border text-foreground rounded-tl-sm"
      )}>
        {isUser ? (
          <p className="text-sm leading-relaxed">{msg.content}</p>
        ) : (
          <div className="text-muted-foreground space-y-0.5">{formatMessage(msg.content)}</div>
        )}

        {!isUser && (
          <button
            onClick={copy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted/60"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
          </button>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/30 to-primary/20 shrink-0 flex items-center justify-center">
        <Bot className="w-3.5 h-3.5 text-violet-400" />
      </div>
      <div className="bg-card border border-card-border rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function getStudentHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem("emc_session");
    if (!raw) return {};
    const u = JSON.parse(raw);
    if (u?.studentId) return { "X-Student-ID": String(u.studentId) };
  } catch {}
  return {};
}

export default function AiTutor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: "user", content, id: crypto.randomUUID() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getStudentHeader() },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      const aiMsg: Message = { role: "assistant", content: data.reply, id: crypto.randomUUID() };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card/50 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/30 to-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">TSM AI Tutor</h1>
            <p className="text-[11px] text-muted-foreground">Physics expert · Ask anything</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">FREE for all students</span>
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); setError(null); }}
                className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                title="Clear chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8 gap-6">
            {/* Welcome */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/25 to-primary/15 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-violet-400" />
              </div>
              <h2 className="text-xl font-black text-foreground mb-1">Your AI Physics Tutor</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ask any Physics question — concepts, derivations, numericals, shortcuts, or exam tips. I'm tuned for NEET.
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                <span>✓</span> Worth ₹1,00,000 — Free for all TSM students
              </div>
            </div>

            {/* Suggestions */}
            <div className="w-full max-w-lg">
              <p className="text-[11px] text-muted-foreground text-center mb-3 uppercase tracking-wider font-semibold">Try asking</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left text-xs text-foreground bg-card border border-card-border rounded-lg px-3 py-2.5 hover:border-primary/40 hover:bg-muted/40 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
            {loading && <TypingIndicator />}
            {error && (
              <div className="flex justify-center">
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-2">
                  {error} — <button onClick={() => sendMessage(messages[messages.length - 1]?.content)} className="underline hover:no-underline">Retry</button>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-card/50 backdrop-blur-sm px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2 focus-within:border-primary/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder="Ask any Physics question… (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none leading-relaxed py-1"
              style={{ minHeight: "24px", maxHeight: "160px" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className={cn(
                "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all mb-0.5",
                input.trim() && !loading
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground/40 cursor-not-allowed"
              )}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            TSM AI · Powered by OpenAI · Tuned for NEET Physics
          </p>
        </div>
      </div>
    </div>
  );
}
