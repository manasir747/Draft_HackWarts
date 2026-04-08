import { useState, useEffect, useRef } from "react";

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState("default");
  const [chatList, setChatList] = useState([]);
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/history?chat_id=${chatId}`)
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.flatMap((chat) => [
          { role: "user", text: chat.user },
          { role: "ai", text: chat.ai }
        ]);
        setMessages(formatted);
      });
  }, [chatId]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/chats")
      .then((res) => res.json())
      .then((data) => setChatList(data));
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const typeEffect = (fullText) => {
    let index = 0;
    let currentText = "";

    const interval = setInterval(() => {
      currentText += fullText[index];
      index++;

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].text = currentText;
        return updated;
      });

      if (index >= fullText.length) {
        clearInterval(interval);
        setLoading(false);
      }
    }, 15);
  };

  const sendMessage = async () => {
    if (!input) return;

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);

    setMessages((prev) => [...prev, { role: "ai", text: "" }]);
    setLoading(true);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/chat?user_input=${input}&chat_id=${chatId}`
      );

      const data = await res.json();

      const reply = data.reply ? data.reply : data.error;

      typeEffect(reply);
      setInput("");

    } catch (err) {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Server error 😢" }
      ]);
    }
  };

  return (
    <div style={styles.container}>

      <div style={styles.sidebar}>
        <h3>Chats</h3>

        <button
          style={styles.newChatBtn}
          onClick={() => setChatId(Date.now().toString())}
        >
          + New Chat
        </button>

        {chatList.map((chat) => (
          <div
            key={chat.chat_id}
            style={styles.chatItem}
            onClick={() => setChatId(chat.chat_id)}
          >
            {chat.title}
          </div>
        ))}
      </div>

      <div style={styles.main}>
        <h1 style={styles.title}>GauravAI</h1>

        <div style={styles.chatBox}>

          {messages.length === 0 && (
            <div style={styles.emptyState}>
              Start a conversation 💀
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={
                msg.role === "user"
                  ? styles.userBubble
                  : styles.aiBubble
              }
            >
              {msg.text}
            </div>
          ))}

          {loading && <div style={styles.thinking}>AI is thinking...</div>}

          <div ref={chatEndRef} />
        </div>

        <div style={styles.inputArea}>
          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type something..."
          />

          <button style={styles.button} onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    background: "#0f172a",
    color: "white",
  },
  sidebar: {
    width: "240px",
    background: "#1e293b",
    padding: "15px",
    borderRight: "1px solid #334155",
  },
  newChatBtn: {
    marginTop: "10px",
    padding: "10px",
    width: "100%",
    background: "#2563eb",
    color: "white",
    border: "none",
    cursor: "pointer",
  },
  chatItem: {
    padding: "8px",
    marginTop: "8px",
    background: "#334155",
    borderRadius: "5px",
    cursor: "pointer",
  },
  main: {
    flex: 1,
    textAlign: "center",
    padding: "20px",
  },
  title: {
    marginBottom: "20px",
  },
  chatBox: {
    height: "60vh",
    overflowY: "auto",
    marginBottom: "20px",
    padding: "10px",
  },
  emptyState: {
    opacity: 0.5,
    marginTop: "20px",
  },
  userBubble: {
    background: "#2563eb",
    padding: "10px",
    borderRadius: "10px",
    margin: "10px",
    textAlign: "right",
  },
  aiBubble: {
    background: "#1e293b",
    padding: "10px",
    borderRadius: "10px",
    margin: "10px",
    textAlign: "left",
  },
  thinking: {
    opacity: 0.6,
    fontStyle: "italic",
    marginTop: "10px",
  },
  inputArea: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
  },
  input: {
    padding: "10px",
    width: "300px",
  },
  button: {
    padding: "10px 20px",
    background: "#2563eb",
    color: "white",
    border: "none",
    cursor: "pointer",
  },
};

export default App;