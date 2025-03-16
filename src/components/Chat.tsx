"use client";

import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Message } from '@/lib/ai-utils';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey there! I'm Sonic AI, your go-to expert on Sonic and SVM tech. 🚀 I can help with HyperGrid, Sorada, Rush, or deploying on Sonic. What can I speed up for you today?"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when loading completes
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isLoading, messages.length]);

  const handleSendMessage = async (content: string) => {
    // Add user message to chat
    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Prepare messages for API
      const chatMessages = [...messages, userMessage];
      
      // Call API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: chatMessages }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get response: ${response.status} ${response.statusText}`);
      }

      // Add an empty assistant message that we'll update
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let responseText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          responseText += chunk;
          
          // Update the last message with the accumulated text
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: responseText,
            };
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, there was an error processing your request. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // If there are no messages, show a welcome screen
  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">Welcome to Sonic AI</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your guide to the first atomic SVM chain for sovereign economies
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ask me about HyperGrid, Sorada, Rush, or how to deploy on Sonic!
            </p>
          </div>
        </div>
        <div className="p-4">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} inputRef={inputRef} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
        {isLoading && (
          <div className="py-3 text-center">
            <div className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-600 mr-1"></div>
            <div className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-600 mr-1" style={{ animationDelay: '0.2s' }}></div>
            <div className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-600" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>
      <div className="p-4">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} inputRef={inputRef} />
      </div>
    </div>
  );
} 