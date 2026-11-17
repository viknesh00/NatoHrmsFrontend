import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Check,
  CircleHelp,
  Copy,
  ThumbsDown,
  ThumbsUp,
  Pencil,
  RefreshCcw,
  LoaderCircle,
  MessageCircleMore,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Bubble, BubbleContent } from "../../components/ui/bubble";
import {
  InputGroup,
  InputGroupButton,
  InputGroupTextarea,
} from "../../components/ui/input-group";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "../../components/ui/message";
import { Streamdown } from "streamdown";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "../../components/ui/message-scroller";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { getCookie } from "../../auth/Cookies";
import { getVisibleMenuItems } from "../../auth/navigation";

function MessageTime({ value }: Record<string, any>) {
  return (
    <time className="chat-message-time" dateTime={new Date(value).toISOString()}>
      {new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </time>
  );
}

export default function Chat({ embedded = false }: { embedded?: boolean }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [modelState, setModelState] = useState("idle");
  const [workerError, setWorkerError] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const workerRef = useRef(null);
  const requestIdRef = useRef(null);
  const inputRef = useRef(null);
  const userRole = getCookie("role") || "Employee";
  const userDepartment = getCookie("department") || "";
  const accessibleModules = useMemo(
    () => getVisibleMenuItems(userRole, userDepartment).map(({ to, label }: Record<string, any>) => ({ to, label })),
    [userRole, userDepartment]
  );
  const availableStarters = useMemo(() => {
    const labels = new Set(accessibleModules.map((module) => module.label));
    const prompts = [
      labels.has("Leave") && "How do I request leave?",
      labels.has("Attendance") && "Where can I check attendance?",
      labels.has("Employees") && "How can I find an employee record?",
      labels.has("Documents") && "Where can I find company documents?",
      labels.has("Onboarding") && "Where do I complete onboarding?",
      labels.has("Calendar") && "Where can I see upcoming events?",
    ].filter(Boolean);
    return prompts.length ? prompts.slice(0, 4) : ["What HRMS areas can I access?"];
  }, [accessibleModules]);

  useEffect(() => {
    let worker;
    try {
      worker = new Worker(new URL("./hrmsChat.worker.ts", import.meta.url), { type: "module" });
      workerRef.current = worker;
      worker.onmessage = ({ data }: Record<string, any>) => {
        if (data?.requestId && data.requestId !== requestIdRef.current) return;

        if (data?.type === "loading") {
          setModelState("loading");
          return;
        }
        if (data?.type === "progress") {
          setModelState("loading");
          return;
        }
        if (data?.type === "token") {
          const assistantId = requestIdRef.current;
          setMessages((current) => current.map((message) =>
            message.id === assistantId
              ? { ...message, content: message.content + data.token }
              : message
          ));
          return;
        }
        if (data?.type === "done") {
          const assistantId = requestIdRef.current;
          setMessages((current) => current.map((message) =>
            message.id === assistantId
              ? { ...message, content: data.response || message.content || "I couldn’t form a response. Please try asking another way.", streaming: false }
              : message
          ));
          setModelState("ready");
          setBusy(false);
          return;
        }
        if (data?.type === "error") {
          const assistantId = requestIdRef.current;
          setMessages((current) => current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  failed: true,
                  streaming: false,
                  content: "I couldn’t respond just now. Please try again.",
                }
              : message
          ));
          setModelState("error");
          setBusy(false);
        }
      };
      worker.onerror = () => {
        setWorkerError(true);
        setModelState("error");
        setBusy(false);
        const assistantId = requestIdRef.current;
        setMessages((current) => current.map((message) =>
          message.id === assistantId && message.streaming
            ? { ...message, streaming: false, failed: true, content: "I couldn’t respond just now. Please try again." }
            : message
        ));
      };
    } catch {
      setWorkerError(true);
      setModelState("error");
    }

    return () => {
      worker?.terminate();
      workerRef.current = null;
    };
  }, []);

  const sendMessage = useCallback((value = undefined) => {
    const question = (value ?? input).trim();
    if (!question || busy || workerError || !workerRef.current) return;

    const userId = `user-${Date.now()}`;
    const assistantId = `assistant-${Date.now()}`;
    const createdAt = Date.now();
    const conversationHistory = messages
      .filter((message) => !message.intro && !message.failed && message.content)
      .slice(-12)
      .map(({ role, content }: Record<string, any>) => ({ role, content }));

    requestIdRef.current = assistantId;
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", content: question, createdAt },
      { id: assistantId, role: "assistant", content: "", createdAt, streaming: true },
    ]);
    setInput("");
    setBusy(true);
    setModelState("loading");
    workerRef.current.postMessage({
      type: "generate",
      requestId: assistantId,
      input: question,
      history: conversationHistory,
      userContext: {
        role: userRole,
        department: userDepartment,
        allowedModules: accessibleModules,
      },
    });
  }, [accessibleModules, busy, input, messages, userDepartment, userRole, workerError]);

  const retryMessage = (assistantId) => {
    if (busy || workerError || !workerRef.current) return;
    const assistantIndex = messages.findIndex((message) => message.id === assistantId);
    const userMessage = messages.slice(0, assistantIndex).reverse().find((message) => message.role === "user");
    if (!userMessage) return;
    const history = messages.slice(0, messages.findIndex((message) => message.id === userMessage.id))
      .filter((message) => !message.failed && message.content)
      .slice(-12)
      .map(({ role, content }) => ({ role, content }));
    const nextId = `assistant-${Date.now()}`;
    requestIdRef.current = nextId;
    setMessages((current) => current.map((message) => message.id === assistantId
      ? { ...message, id: nextId, content: "", streaming: true, failed: false, createdAt: Date.now() }
      : message));
    setBusy(true);
    setModelState("loading");
    workerRef.current.postMessage({
      type: "generate", requestId: nextId, input: userMessage.content, history,
      userContext: { role: userRole, department: userDepartment, allowedModules: accessibleModules },
    });
  };

  const editMessage = (message) => {
    if (busy) return;
    setInput(message.content);
    setMessages((current) => current.slice(0, current.findIndex((item) => item.id === message.id)));
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const copyMessage = async (message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId((current) => current === message.id ? null : current), 2000);
    } catch { /* Clipboard access can be unavailable outside secure contexts. */ }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const clearConversation = () => {
    if (busy) return;
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  const statusText = modelState === "ready"
    ? "Ready"
    : modelState === "loading"
      ? "Thinking"
      : modelState === "error"
        ? "Unavailable"
        : "Here to help";

  return (
    <div className={`chat-page ${embedded ? "chat-embedded" : ""}`}>
      <div className="page-header chat-page-header">
        <div>
          <Breadcrumb icon={<MessageCircleMore size={13} />} items={[{ label: "HR Assistant" }]} />
          <h1 className="page-title">HR Assistant</h1>
          <p className="page-subtitle">Get help navigating common HRMS workflows.</p>
        </div>
        <Button variant="outline" className="chat-clear-button" onClick={clearConversation} disabled={busy || messages.length === 0}>
          <X size={14} /> Clear chat
        </Button>
      </div>

      <div className="chat-layout">
      <Card className="chat-panel">
        <div className="chat-panel-topbar">
          <div className="chat-model-label">
            <span className="chat-model-icon"><Bot size={17} /></span>
            <div>
              <strong>HR Assistant</strong>
              <span>Help with common HRMS tasks</span>
            </div>
          </div>
          <div className={`chat-model-status ${modelState}`} aria-live="polite">
            {modelState === "loading" ? <LoaderCircle size={13} className="chat-spin" /> : <span className="chat-status-dot" />}
            {statusText}
          </div>
        </div>

        <div className="chat-privacy-note">I can help you find pages and understand common workflows.</div>

        <MessageScrollerProvider autoScroll>
          <MessageScroller className="chat-scroller">
            <MessageScrollerViewport
              className="chat-thread"
              role="log"
              aria-label="Chat messages"
              aria-live="polite"
              aria-relevant="additions text"
            >
              <MessageScrollerContent className="chat-thread-content">
                {messages.length === 0 && (
                  <div className="chat-welcome">
                    <span className="chat-welcome-icon"><Sparkles size={19} /></span>
                    <h2>How can I help?</h2>
                    <p>Ask about finding a page or completing a common HRMS task.</p>
                    <div className="chat-suggestions" aria-label="Suggested questions">
                      {availableStarters.map((prompt) => (
                        <Button variant="ghost" key={prompt} type="button" onClick={() => sendMessage(prompt)} disabled={busy || workerError}>
                          <CircleHelp size={14} /> {prompt}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={isUser}
                      className="chat-message-item"
                    >
                      <article className="chat-message-article" data-message-id={message.id}>
                        <Message
                          align={isUser ? "end" : "start"}
                          className={`chat-message-row ${isUser ? "user" : "assistant"}`}
                        >
                          <MessageAvatar className={`chat-message-avatar ${message.role}`} aria-hidden="true">
                            {isUser ? <UserRound size={15} /> : <Bot size={15} />}
                          </MessageAvatar>
                          <MessageContent className="chat-message-body">
                            <MessageTime value={message.createdAt} />
                            {isUser ? (
                              <Bubble align="end" variant="muted" className="chat-bubble-group">
                                <BubbleContent className="chat-bubble user">{message.content}</BubbleContent>
                              </Bubble>
                            ) : (
                              <div className={`chat-assistant-response${message.failed ? " failed" : ""}`}>
                                {message.content
                                  ? <Streamdown className="chat-markdown" isAnimating={message.streaming}>{message.content}</Streamdown>
                                  : message.streaming && <span className="chat-thinking">Thinking<LoaderCircle size={13} className="chat-spin" /></span>}
                                {message.streaming && message.content && <span className="chat-stream-cursor" aria-hidden="true" />}
                              </div>
                            )}
                            {!message.streaming && !message.failed && (
                              <MessageFooter className="chat-message-actions">
                                {isUser ? (
                                  <Button variant="ghost" size="icon-xs" aria-label="Edit message" title="Edit message" onClick={() => editMessage(message)} disabled={busy}><Pencil /></Button>
                                ) : (
                                  <>
                                    <Button variant="ghost" size="icon-xs" aria-label={copiedId === message.id ? "Copied" : "Copy response"} title={copiedId === message.id ? "Copied" : "Copy"} onClick={() => copyMessage(message)}>{copiedId === message.id ? <Check /> : <Copy />}</Button>
                                    <Button variant="ghost" size="icon-xs" aria-label="Good response" aria-pressed={feedback[message.id] === "good"} title="Good response" onClick={() => setFeedback((current) => ({ ...current, [message.id]: current[message.id] === "good" ? null : "good" }))}><ThumbsUp /></Button>
                                    <Button variant="ghost" size="icon-xs" aria-label="Bad response" aria-pressed={feedback[message.id] === "bad"} title="Bad response" onClick={() => setFeedback((current) => ({ ...current, [message.id]: current[message.id] === "bad" ? null : "bad" }))}><ThumbsDown /></Button>
                                    <Button variant="ghost" size="icon-xs" aria-label="Retry response" title="Retry" onClick={() => retryMessage(message.id)} disabled={busy}><RefreshCcw /></Button>
                                  </>
                                )}
                              </MessageFooter>
                            )}
                          </MessageContent>
                        </Message>
                      </article>
                    </MessageScrollerItem>
                  );
                })}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton className="chat-scroll-button" aria-label="Scroll to latest message" />
          </MessageScroller>
        </MessageScrollerProvider>

        {modelState === "loading" && (
          <div className="chat-loading-note" role="status">
            <LoaderCircle size={14} className="chat-spin" />
            Preparing a response…
          </div>
        )}

        <form className="chat-composer" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="hrms-chat-input">Ask the HRMS assistant</label>
          <InputGroup className="chat-input-group">
            <InputGroupTextarea
              id="hrms-chat-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
              rows={2}
              maxLength={800}
              placeholder={workerError ? "The assistant is temporarily unavailable." : "Ask a question about HRMS…"}
              disabled={busy || workerError}
              className="chat-input-textarea"
              aria-label="Ask the HRMS assistant"
            />
            <InputGroupButton className="chat-send-button" type="submit" size="icon-sm" aria-label="Send message" disabled={busy || workerError || !input.trim()}>
              {busy ? <LoaderCircle size={16} className="chat-spin" /> : <Send size={16} />}
            </InputGroupButton>
          </InputGroup>
        </form>

        <div className="chat-footnote">
          <span>Check important HR decisions with your HR team.</span>
        </div>
      </Card>
      </div>
    </div>
  );
}
