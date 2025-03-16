"use client";

import React, { useState, FormEvent, KeyboardEvent, useEffect, RefObject } from 'react';
import { PaperAirplaneIcon, MicrophoneIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}

export default function ChatInput({ onSendMessage, isLoading, inputRef }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const localTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  // Use the provided ref or fall back to local ref
  const textareaRef = inputRef || localTextareaRef;

  // Check if speech recognition is supported
  useEffect(() => {
    setSpeechSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message, textareaRef]);

  const toggleSpeechRecognition = () => {
    if (!speechSupported) return;

    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);

    // @ts-ignore - TypeScript doesn't have types for the Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMessage((prev) => prev + ' ' + transcript);
      setIsListening(false);
    };
    
    recognition.onerror = () => {
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.start();
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          ref={textareaRef}
          className="w-full p-3 pr-24 border-0 resize-none focus:outline-none focus:ring-0 dark:bg-gray-800 dark:text-white"
          placeholder="Message Sonic AI..."
          rows={1}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          style={{ minHeight: '44px', maxHeight: '150px' }}
        />
        <div className="absolute right-2 bottom-1.5 flex space-x-1">
          {speechSupported && (
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-2 rounded-md ${
                isListening 
                  ? 'bg-red-500 text-white' 
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'
              }`}
              disabled={isLoading}
              aria-label="Use voice input"
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>
          )}
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="p-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
      <div className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
        Sonic AI may produce inaccurate information about people, places, or facts.
      </div>
    </div>
  );
} 