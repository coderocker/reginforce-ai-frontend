import React, { useEffect, useRef, useState } from "react";

/**
 * ChatApp.jsx
 * - Save as: src/components/ChatApp.jsx
 * - Usage: import ChatApp from "./components/ChatApp"; <ChatApp />
 *
 * Features:
 * - captures user input
 * - Enter sends (Shift+Enter for newline)
 * - simple bot auto-reply ("You said: ...") after a short delay
 * - scrolls to bottom on new messages
 * - minimal inline styling
 */

export default function ChatApp() {
  const [messages, setMessages] = useState([]); // { id, text, ts, sender }
  const [input, setInput] = useState("");
  const [lastInput, setLastInput] = useState("");
  const scrollRef = useRef(null);
  const botTimerRef = useRef(null);

  // keep view scrolled to bottom when messages update
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // cleanup any pending bot timers on unmount
  useEffect(() => {
    return () => {
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current);
      }
    };
  }, []);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      text,
      ts: new Date().toISOString(),
      sender: "user",
    };

    // append user message
    setMessages((prev) => [...prev, userMsg]);
    setLastInput(text);
    setInput("");

    // schedule bot reply (clear previous timer if any)
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
    }

    botTimerRef.current = setTimeout(() => {
      const botMsg = {
        id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text: `You said: ${text}`,
        ts: new Date().toISOString(),
        sender: "bot",
      };
      setMessages((prev) => [...prev, botMsg]);
      botTimerRef.current = null;
    }, 600);
  };

  const handleKeyDown = (e) => {
    // Enter sends, Shift+Enter -> newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Basic Chat Interface</h2>

      <div style={styles.chatWindow} ref={scrollRef} aria-live="polite">
        {messages.length === 0 ? (
          <div style={styles.empty}>No messages yet. Say hello 👋</div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  ...styles.bubble,
                  ...(m.sender === "user" ? styles.userBubble : styles.botBubble),
                }}
              >
                <div style={styles.messageText}>{m.text}</div>
                <div style={styles.ts}>
                  {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={styles.controls}>
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message — Enter to send, Shift+Enter for newline"
          style={styles.textarea}
        />
        <button onClick={sendMessage} style={styles.button}>
          Send
        </button>
      </div>

      <div style={styles.footer}>
        <strong>Last submitted input:</strong>{" "}
        {lastInput ? <span>{lastInput}</span> : <em>— none yet —</em>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 720,
    margin: "28px auto",
    padding: 16,
    borderRadius: 12,
    background: "#fbfbfb",
    border: "1px solid #e9e9e9",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: { margin: 0, fontSize: 18 },
  chatWindow: {
    minHeight: 280,
    maxHeight: 420,
    overflowY: "auto",
    padding: 12,
    borderRadius: 10,
    background: "#fff",
    border: "1px solid #eee",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  empty: { color: "#777", textAlign: "center", marginTop: 60 },
  bubble: {
    padding: "8px 12px",
    borderRadius: 12,
    maxWidth: "78%",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
    wordBreak: "break-word",
  },
  userBubble: {
    background: "#e6f0ff",
    borderTopRightRadius: 4,
  },
  botBubble: {
    background: "#f1f1f4",
    borderTopLeftRadius: 4,
  },
  messageText: { whiteSpace: "pre-wrap", fontSize: 14 },
  ts: { fontSize: 11, color: "#666", marginTop: 6, textAlign: "right" },
  controls: { display: "flex", gap: 8 },
  textarea: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 14,
    resize: "vertical",
    fontFamily: "inherit",
  },
  button: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  footer: {
    borderTop: "1px dashed #eee",
    paddingTop: 8,
    fontSize: 13,
    color: "#333",
  },
};
