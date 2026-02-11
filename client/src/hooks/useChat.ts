import { useState, useEffect, useCallback } from 'react';
import { socket } from '../socket';
import type { ChatMessage } from '@shared/types';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    socket.on('chat:message', (msg) => {
      setMessages(prev => [...prev.slice(-99), msg]);
    });

    return () => {
      socket.off('chat:message');
    };
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (text.trim()) {
      socket.emit('chat:send', { text });
    }
  }, []);

  return { messages, sendMessage };
}
