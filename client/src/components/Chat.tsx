import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import type { ChatMessage } from '@shared/types';
import './Chat.css';

interface ChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export default function Chat({ messages, onSend }: ChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* Auto-scroll to bottom when new messages arrive */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const trimmed = input.trim();
    if (trimmed.length === 0) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      send();
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">Chat</div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div className="chat-message" key={`${msg.timestamp}-${msg.playerId}-${i}`}>
            <span className="chat-message-name" style={{ color: msg.playerColor }}>
              {msg.playerName}
            </span>
            <span className="chat-message-text">: {msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          className="chat-input"
          type="text"
          placeholder="Type a message…"
          value={input}
          maxLength={200}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="chat-send-btn" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}
