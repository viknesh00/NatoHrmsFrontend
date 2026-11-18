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
import { accessQuestion, assistantGuides, getQuickReply } from "./quickReplies";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: number; streaming?: boolean; failed?: boolean; quickReply?: boolean };
type ModelState = "idle" | "loading" | "downloading" | "thinking" | "ready" | "error";

const MODEL_IDLE_TIMEOUT = 90_000;
const RESPONSE_IDLE_TIMEOUT = 45_000;
const DOWNLOAD_ERROR = "The AI model couldn’t load. Check your connection and retry.";
const RESPONSE_ERROR = "The assistant couldn’t finish that reply. Try again.";

let sharedWorker: Worker | null = null;

function releaseWorker(worker: Worker) {
  worker.terminate();
  if (sharedWorker === worker) sharedWorker = null;
}

function MessageTime({ value }: Record<string, any>) {
  return (
    <time className="chat-message-time" dateTime={new Date(value).toISOString()}>
      {new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </time>
  );
}

export default function Chat({ embedded = false }: { embedded?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const deadlineRef = useRef<number | undefined>(undefined);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const userRole = getCookie("role") || "Employee";
  const userDepartment = getCookie("department") || "";
  const accessibleModules = useMemo(
    () => getVisibleMenuItems(userRole, userDepartment).map(({ to, label }: Record<string, any>) => ({ to, label })),
    [userRole, userDepartment]
  );
  const availableStarters = useMemo(() => {
    const paths = new Set(accessibleModules.map(module => module.to));
    const prompts = assistantGuides.filter(guide => paths.has(guide.path)).map(guide => guide.question);
    return prompts.length ? prompts.slice(0, 4) : [accessQuestion];
  }, [accessibleModules]);

  const clearDeadline = useCallback(() => window.clearTimeout(deadlineRef.current), []);

  const finishRequest = useCallback((content: string, failed = false) => {
    const requestId = requestIdRef.current;
    requestIdRef.current = null;
    clearDeadline();
    setMessages(current => current.map(message => message.id === requestId
      ? { ...message, content: content || message.content || RESPONSE_ERROR, streaming: false, failed }
      : message));
    setBusy(false);
    setModelState(failed ? "error" : "ready");
  }, [clearDeadline]);

  const watchForResponse = useCallback((timeout: number, error: string) => {
    clearDeadline();
    deadlineRef.current = window.setTimeout(() => {
      if (workerRef.current) releaseWorker(workerRef.current);
      workerRef.current = null;
      finishRequest(error, true);
    }, timeout);
  }, [clearDeadline, finishRequest]);

  const connectWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    try {
      if (!sharedWorker) {
        const worker = new Worker(new URL("./hrmsChat.worker.ts", import.meta.url), { type: "module" });
        worker.addEventListener("error", () => releaseWorker(worker), { once: true });
        sharedWorker = worker;
      }
      const worker = sharedWorker;
      workerRef.current = worker;
      worker.onerror = () => {
        workerRef.current = null;
        finishRequest(DOWNLOAD_ERROR, true);
      };
      worker.onmessage = ({ data }) => {
        const requestId = requestIdRef.current;
        if (data.requestId && data.requestId !== requestId) return;

        switch (data.type) {
          case "loading":
          case "progress":
            setDownloadProgress(data.type === "progress" ? data.progress : null);
            setModelState(data.type === "progress" && data.progress < 100 ? "downloading" : "loading");
            if (requestId) watchForResponse(MODEL_IDLE_TIMEOUT, DOWNLOAD_ERROR);
            break;
          case "ready":
            setModelState(requestId ? "thinking" : "ready");
            break;
          case "prepare-error":
            if (!requestId) setModelState("error");
            break;
          case "generating":
            setModelState("thinking");
            watchForResponse(RESPONSE_IDLE_TIMEOUT, RESPONSE_ERROR);
            break;
          case "token":
            setMessages(current => current.map(message => message.id === requestId
              ? { ...message, content: message.content + data.token }
              : message));
            watchForResponse(RESPONSE_IDLE_TIMEOUT, RESPONSE_ERROR);
            break;
          case "done":
            finishRequest(data.response);
            break;
          case "error":
            finishRequest(data.loadingFailed ? DOWNLOAD_ERROR : RESPONSE_ERROR, true);
            break;
        }
      };
      return worker;
    } catch {
      finishRequest(DOWNLOAD_ERROR, true);
      return null;
    }
  }, [finishRequest, watchForResponse]);

  useEffect(() => {
    if (sharedWorker) connectWorker()?.postMessage({ type: "prepare" });
    return () => {
      clearDeadline();
      const worker = workerRef.current;
      if (!worker) return;
      worker.onmessage = null;
      worker.onerror = null;
      if (requestIdRef.current) worker.postMessage({ type: "cancel", requestId: requestIdRef.current });
      workerRef.current = null;
      requestIdRef.current = null;
    };
  }, [clearDeadline, connectWorker]);

  useEffect(() => {
    const draft = input.trim();
    if (draft.length < 8 || modelState !== "idle" || getQuickReply(draft, accessibleModules)) return;
    const timer = window.setTimeout(() => {
      if (!workerRef.current) connectWorker()?.postMessage({ type: "prepare" });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [accessibleModules, connectWorker, input, modelState]);

  const requestReply = useCallback((requestId: string, question: string, history: ChatMessage[]) => {
    requestIdRef.current = requestId;
    setBusy(true);
    setModelState(current => current === "ready" ? "thinking" : current === "downloading" ? current : "loading");
    const worker = connectWorker();
    if (!worker) return;

    watchForResponse(MODEL_IDLE_TIMEOUT, DOWNLOAD_ERROR);
    worker.postMessage({
      type: "generate",
      requestId,
      input: question,
      history: history.filter(message => !message.failed && message.content).slice(-6).map(({ role, content }) => ({ role, content })),
      userContext: { role: userRole, department: userDepartment, allowedModules: accessibleModules },
    });
  }, [accessibleModules, connectWorker, userDepartment, userRole, watchForResponse]);

  const sendMessage = useCallback((value = undefined) => {
    const question = (value ?? input).trim();
    if (!question || busy || requestIdRef.current) return;

    const createdAt = Date.now();
    const userId = `user-${createdAt}`;
    const assistantId = `assistant-${createdAt}`;
    const quickReply = getQuickReply(question, accessibleModules);
    setMessages(current => [
      ...current,
      { id: userId, role: "user", content: question, createdAt },
      { id: assistantId, role: "assistant", content: quickReply ?? "", createdAt, streaming: !quickReply, quickReply: !!quickReply },
    ]);
    setInput("");
    if (!quickReply) requestReply(assistantId, question, messages);
  }, [accessibleModules, busy, input, messages, requestReply]);

  const retryMessage = (assistantId: string) => {
    if (busy || requestIdRef.current) return;
    const assistantIndex = messages.findIndex(message => message.id === assistantId);
    const userMessage = messages.slice(0, assistantIndex).reverse().find(message => message.role === "user");
    if (!userMessage) return;
    const nextId = `assistant-${Date.now()}`;
    setMessages(current => current.map(message => message.id === assistantId
      ? { ...message, id: nextId, content: "", streaming: true, failed: false, createdAt: Date.now() }
      : message));
    requestReply(nextId, userMessage.content, messages.slice(0, messages.indexOf(userMessage)));
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

  const preparingModel = modelState === "loading" || modelState === "downloading";
  const statusText = {
    idle: "Here to help",
    loading: "Starting model",
    downloading: `Downloading model ${downloadProgress ?? 0}%`,
    thinking: "Thinking",
    ready: "Ready",
    error: "Try again",
  }[modelState];

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
            {preparingModel || modelState === "thinking" ? <LoaderCircle size={13} className="chat-spin" /> : <span className="chat-status-dot" />}
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
                        <Button variant="ghost" key={prompt} type="button" onClick={() => sendMessage(prompt)} disabled={busy}>
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
                                  : message.streaming && <span className="chat-thinking">{statusText}<LoaderCircle size={13} className="chat-spin" /></span>}
                                {message.streaming && message.content && <span className="chat-stream-cursor" aria-hidden="true" />}
                              </div>
                            )}
                            {!message.streaming && (
                              <MessageFooter className="chat-message-actions">
                                {isUser ? (
                                  <Button variant="ghost" size="icon-xs" aria-label="Edit message" title="Edit message" onClick={() => editMessage(message)} disabled={busy}><Pencil /></Button>
                                ) : (
                                  <>
                                    {!message.failed && <>
                                    <Button variant="ghost" size="icon-xs" aria-label={copiedId === message.id ? "Copied" : "Copy response"} title={copiedId === message.id ? "Copied" : "Copy"} onClick={() => copyMessage(message)}>{copiedId === message.id ? <Check /> : <Copy />}</Button>
                                    <Button variant="ghost" size="icon-xs" aria-label="Good response" aria-pressed={feedback[message.id] === "good"} title="Good response" onClick={() => setFeedback((current) => ({ ...current, [message.id]: current[message.id] === "good" ? null : "good" }))}><ThumbsUp /></Button>
                                    <Button variant="ghost" size="icon-xs" aria-label="Bad response" aria-pressed={feedback[message.id] === "bad"} title="Bad response" onClick={() => setFeedback((current) => ({ ...current, [message.id]: current[message.id] === "bad" ? null : "bad" }))}><ThumbsDown /></Button>
                                    </>}
                                    {!message.quickReply &&
                                      <Button variant="ghost" size="icon-xs" aria-label="Retry response" title="Retry" onClick={() => retryMessage(message.id)} disabled={busy}><RefreshCcw /></Button>}
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

        {modelState === "error" && !messages.some(message => message.failed) &&
          <div className="chat-loading-note" role="status">{DOWNLOAD_ERROR}</div>}

        <form className="chat-composer" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="hrms-chat-input">Ask the HRMS assistant</label>
          <InputGroup className="chat-input-group">
            <InputGroupTextarea
              id="hrms-chat-input"
              ref={inputRef}
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
              rows={2}
              maxLength={800}
              placeholder="Ask a question about HRMS…"
              disabled={busy}
              className="chat-input-textarea"
              aria-label="Ask the HRMS assistant"
            />
            <InputGroupButton className="chat-send-button" type="submit" size="icon-sm" aria-label="Send message" disabled={busy || !input.trim()}>
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
