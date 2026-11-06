import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  select,
} from "d3";
import {
  Bot,
  CircleHelp,
  GitBranch,
  LoaderCircle,
  MessageCircleMore,
  Send,
  ShieldCheck,
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
} from "../../components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "../../components/ui/message-scroller";
import Breadcrumb from "../../services/Breadcrumb";
import { getCookie } from "../../services/Cookies";
import { getVisibleMenuItems } from "../Layout/Sidebar";

function AccessGraph({ role, department, modules }) {
  const svgRef = useRef(null);
  const moduleKey = modules.map((module) => `${module.to}:${module.label}`).join("|");

  useEffect(() => {
    if (!svgRef.current) return undefined;

    const width = 400;
    const height = 280;
    const features = modules.map((module, index) => ({
      id: `module-${index}`,
      label: module.label,
      kind: "module",
    }));
    const nodes = [
      { id: "role", label: role, kind: "role" },
      ...(department ? [{ id: "department", label: department, kind: "department" }] : []),
      ...features,
    ];
    const links = features.map((feature) => ({ source: "role", target: feature.id }));
    if (department) links.push({ source: "role", target: "department" });

    const svg = select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const linkSelection = svg.append("g")
      .attr("class", "access-graph-links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#d8dee8")
      .attr("stroke-width", 1.25);

    const nodeSelection = svg.append("g")
      .attr("class", "access-graph-nodes")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", (node) => `access-graph-node ${node.kind}`);

    nodeSelection.append("circle")
      .attr("r", (node) => node.kind === "role" ? 22 : node.kind === "department" ? 13 : 8)
      .attr("fill", (node) => node.kind === "role" ? "var(--primary)" : node.kind === "department" ? "#71a78b" : "#fff")
      .attr("stroke", (node) => node.kind === "module" ? "var(--primary)" : "none")
      .attr("stroke-width", 2);

    nodeSelection.filter((node) => node.kind !== "module")
      .append("text")
      .attr("class", "access-graph-core-label")
      .attr("text-anchor", "middle")
      .attr("dy", (node) => node.kind === "role" ? 39 : 28)
      .text((node) => node.label);

    nodeSelection.filter((node) => node.kind === "module")
      .append("text")
      .attr("class", "access-graph-module-label")
      .attr("text-anchor", "middle")
      .attr("dy", 23)
      .text((node) => node.label);

    const simulation = forceSimulation(nodes)
      .force("link", forceLink(links).id((node) => node.id).distance((link) => link.target.id === "department" ? 82 : 96))
      .force("charge", forceManyBody().strength(-155))
      .force("center", forceCenter(width / 2, height / 2 - 4))
      .force("x", forceX(width / 2).strength(0.035))
      .force("y", forceY(height / 2 - 4).strength(0.035))
      .force("collide", forceCollide().radius((node) => node.kind === "role" ? 36 : node.kind === "department" ? 28 : 31));

    simulation.on("tick", () => {
      linkSelection
        .attr("x1", (link) => link.source.x)
        .attr("y1", (link) => link.source.y)
        .attr("x2", (link) => link.target.x)
        .attr("y2", (link) => link.target.y);
      nodeSelection.attr("transform", (node) => `translate(${node.x},${node.y})`);
    });

    return () => {
      simulation.stop();
      simulation.on("tick", null);
      svg.selectAll("*").remove();
    };
  }, [role, department, modules, moduleKey]);

  return (
    <div className="chat-access-graph-wrap">
      <svg ref={svgRef} className="chat-access-graph" role="img" aria-label={`${role} access graph with ${modules.length} visible HRMS areas`} />
      <ul className="chat-access-list" aria-label="Areas visible to your role">
        {modules.map((module) => <li key={module.to}>{module.label}</li>)}
      </ul>
    </div>
  );
}

function MessageTime({ value }) {
  return (
    <time className="chat-message-time" dateTime={new Date(value).toISOString()}>
      {new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </time>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [modelState, setModelState] = useState("idle");
  const [modelMode, setModelMode] = useState("");
  const [modelProgress, setModelProgress] = useState(null);
  const [workerError, setWorkerError] = useState(false);
  const workerRef = useRef(null);
  const requestIdRef = useRef(null);
  const inputRef = useRef(null);
  const userRole = getCookie("role") || "Employee";
  const userDepartment = getCookie("department") || "";
  const accessibleModules = useMemo(
    () => getVisibleMenuItems(userRole, userDepartment).map(({ to, label }) => ({ to, label })),
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
      worker = new Worker(new URL("./hrmsChat.worker.js", import.meta.url), { type: "module" });
      workerRef.current = worker;
      worker.onmessage = ({ data }) => {
        if (data?.requestId && data.requestId !== requestIdRef.current) return;

        if (data?.type === "loading") {
          setModelState("loading");
          setModelMode(data.mode || "");
          setModelProgress(null);
          return;
        }
        if (data?.type === "progress") {
          setModelState("loading");
          setModelProgress(data.progress);
          return;
        }
        if (data?.type === "fallback") {
          setModelMode("wasm");
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
          setModelProgress(null);
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
                  content: "The local model couldn’t start. Check your connection and try again; the model files download from Hugging Face the first time you use chat.",
                }
              : message
          ));
          setModelState("error");
          setModelProgress(null);
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
            ? { ...message, streaming: false, failed: true, content: "The local model worker couldn’t start. Reload the page and try again." }
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

  const sendMessage = useCallback((value) => {
    const question = (value ?? input).trim();
    if (!question || busy || workerError || !workerRef.current) return;

    const userId = `user-${Date.now()}`;
    const assistantId = `assistant-${Date.now()}`;
    const createdAt = Date.now();
    const conversationHistory = messages
      .filter((message) => !message.intro && !message.failed && message.content)
      .slice(-12)
      .map(({ role, content }) => ({ role, content }));

    requestIdRef.current = assistantId;
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", content: question, createdAt },
      { id: assistantId, role: "assistant", content: "", createdAt, streaming: true },
    ]);
    setInput("");
    setBusy(true);
    setModelState("loading");
    setModelProgress(null);
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
    ? "Local model ready"
    : modelState === "loading"
      ? "Loading local model"
      : modelState === "error"
        ? "Model unavailable"
        : "Runs in your browser";

  return (
    <div className="chat-page">
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
              <strong>People Assistant</strong>
              <span>Hugging Face · Qwen2.5 0.5B</span>
            </div>
          </div>
          <div className={`chat-model-status ${modelState}`} aria-live="polite">
            {modelState === "loading" ? <LoaderCircle size={13} className="chat-spin" /> : <span className="chat-status-dot" />}
            {statusText}
          </div>
        </div>

        <div className="chat-privacy-note">
          <ShieldCheck size={14} /> Local browser replies · {userRole}{userDepartment ? ` · ${userDepartment}` : ""} access guidance
        </div>

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
                        <button key={prompt} type="button" onClick={() => sendMessage(prompt)} disabled={busy || workerError}>
                          <CircleHelp size={14} /> {prompt}
                        </button>
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
                            <Bubble
                              align={isUser ? "end" : "start"}
                              variant={isUser ? "default" : "muted"}
                              className="chat-bubble-group"
                            >
                              <BubbleContent className={`chat-bubble ${message.role} ${message.failed ? "failed" : ""}`}>
                                {message.content || (message.streaming ? <span className="chat-thinking">Thinking<LoaderCircle size={13} className="chat-spin" /></span> : null)}
                                {message.streaming && message.content && <span className="chat-stream-cursor" aria-hidden="true" />}
                              </BubbleContent>
                            </Bubble>
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
            {modelProgress !== null
              ? `Preparing model · ${Math.round(modelProgress)}%`
              : modelMode === "wasm"
                ? "Starting the browser model…"
                : "First use downloads and caches the model from Hugging Face…"}
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
              placeholder={workerError ? "The local model worker is unavailable." : "Ask a question about HRMS…"}
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
          <span>Answers are generated by a compact on-device model and can be inaccurate.</span>
          <span>Don’t include sensitive personal information.</span>
        </div>
      </Card>
      <Card className="chat-access-panel">
        <div className="chat-access-heading">
          <span className="chat-access-icon"><GitBranch size={17} /></span>
          <div>
            <h2>Your access graph</h2>
            <p>{accessibleModules.length} areas visible to {userRole}</p>
          </div>
        </div>
        <AccessGraph role={userRole} department={userDepartment} modules={accessibleModules} />
        <div className="chat-access-note">This view mirrors the current sidebar. Your role and department guide answers; the assistant cannot access HR records or change permissions.</div>
      </Card>
      </div>
    </div>
  );
}
