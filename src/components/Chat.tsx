"use client";

import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Message } from '@/lib/ai-utils';
import { isValidSonicAddress } from '@/lib/wallet-utils';
import { isValidTokenMint, formatTokenPrices } from '@/lib/token-utils';
import { formatSonicStats } from '@/lib/stats-utils';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm Sonic AI. I can help with Sonic technologies like HyperGrid, Sorada, and Rush, as well as ecosystem projects like Sega DEX. Ask me about wallet balances, token prices, chain stats, DeFi activities, or request test tokens by typing 'faucet [your wallet address]'! 🚀"
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

  // Add error handling for resource loading
  useEffect(() => {
    // Global error handler for resource loading errors
    const handleResourceError = (event: Event) => {
      // Prevent the error from bubbling up to the window object
      event.preventDefault();
      
      // Log the error for debugging
      console.log('Resource loading error:', event);
      
      // Don't show any error to the user as this is just a resource loading issue
      // that doesn't affect core functionality
    };

    // Add event listener for error events on window
    window.addEventListener('error', handleResourceError, true);

    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener('error', handleResourceError, true);
    };
  }, []);

  const handleSendMessage = async (content: string) => {
    // Add user message to chat
    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Check if the message is a wallet address (direct address)
      if (isValidSonicAddress(content)) {
        await checkWalletBalance(content);
        return;
      }

      // Check if the message is a token mint address (direct address)
      if (isValidTokenMint(content)) {
        await checkTokenPrice([content]);
        return;
      }

      // Check if the message is asking to check a wallet balance
      const walletCheckRegex = /(?:check|view|show|get|what(?:'|')?s|what is).*(?:wallet|balance|account).*?([\w\d]{32,44})/i;
      const walletMatch = content.match(walletCheckRegex);
      
      if (walletMatch && walletMatch[1]) {
        const address = walletMatch[1].trim();
        
        // Validate wallet address
        if (isValidSonicAddress(address)) {
          await checkWalletBalance(address);
          return;
        }
      }

      // Check if the message is asking for token price
      const tokenPriceRegex = /(?:price|cost|value|worth|how much).*(?:token|mint|coin).*?([\w\d]{32,44})/i;
      const tokenPriceMatch = content.match(tokenPriceRegex);
      
      if (tokenPriceMatch && tokenPriceMatch[1]) {
        const mint = tokenPriceMatch[1].trim();
        
        // Validate token mint address
        if (isValidTokenMint(mint)) {
          await checkTokenPrice([mint]);
          return;
        }
      }

      // Check if the message is asking for Sonic chain stats
      const statsRegex = /(?:stats|statistics|tvl|volume|locked value|total value|chain stats)/i;
      if (statsRegex.test(content)) {
        await checkSonicStats();
        return;
      }

      // Check if the message is asking for test tokens (faucet request)
      const faucetRegex = /(?:faucet|test tokens|send me tokens|airdrop|test sol).*?([\w\d]{32,44})/i;
      const faucetMatch = content.match(faucetRegex);
      
      if (faucetMatch && faucetMatch[1]) {
        const address = faucetMatch[1].trim();
        
        // Validate wallet address
        if (isValidSonicAddress(address)) {
          await requestFaucetTokens(address);
          return;
        }
      }

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

  // Helper function to check wallet balance
  const checkWalletBalance = async (address: string) => {
    try {
      // Call the wallet API
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      // Get the response data even if status is not OK
      const walletData = await response.json();
      
      // Format the response
      let responseContent = '';
      
      if (!response.ok) {
        // Handle HTTP error but still try to use the error message from the response
        responseContent = `Error: ${walletData.error || `Failed to get wallet balance: ${response.status} ${response.statusText}`}`;
      } else if (walletData.error) {
        // Handle application error
        responseContent = `Error: ${walletData.error}`;
      } else {
        // Format successful response
        responseContent = `**Wallet Balance for ${address.slice(0, 6)}...${address.slice(-4)}**\n\n`;
        responseContent += `SOL Balance: **${walletData.sol !== undefined ? walletData.sol.toFixed(4) : '0.0000'} SOL**\n\n`;
        
        if (walletData.tokens && Array.isArray(walletData.tokens) && walletData.tokens.length > 0) {
          responseContent += 'Token Balances:\n';
          walletData.tokens.forEach((token: any) => {
            const symbol = token.symbol || 'Unknown Token';
            responseContent += `- **${symbol}**: ${token.uiAmount.toFixed(4)} (${token.mint.slice(0, 4)}...${token.mint.slice(-4)})\n`;
          });
        } else {
          responseContent += 'No token balances found.';
        }
      }

      // Add the response to the chat
      setMessages((prev) => [...prev, { role: 'assistant', content: responseContent }]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking wallet balance:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, there was an error checking the wallet balance. The service might be temporarily unavailable. Please try again later.',
        },
      ]);
      setIsLoading(false);
    }
  };

  // Helper function to request faucet tokens
  const requestFaucetTokens = async (address: string) => {
    try {
      // Call the faucet API
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      const faucetData = await response.json();
      
      // Format the response
      let responseContent = '';
      if (!faucetData.success) {
        // Use the error message directly, without any prefix
        responseContent = faucetData.error || 'Failed to request tokens from the faucet';
      } else {
        responseContent = `**Success!** 🎉 Tokens have been sent to your wallet: ${address.slice(0, 6)}...${address.slice(-4)}`;
        if (faucetData.message) {
          responseContent += `\n\n${faucetData.message}`;
        }
      }

      // Add the response to the chat
      setMessages((prev) => [...prev, { role: 'assistant', content: responseContent }]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error requesting faucet tokens:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, there was an error connecting to the faucet service. Please try again later.',
        },
      ]);
      setIsLoading(false);
    }
  };

  // Helper function to check token prices
  const checkTokenPrice = async (mints: string[]) => {
    try {
      // Call the token price API
      const response = await fetch('/api/token-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mints }),
      });

      const priceData = await response.json();
      
      // Use the shared formatting function
      let responseContent = formatTokenPrices(priceData, mints);
      
      // Add markdown formatting for the web interface
      responseContent = responseContent.replace(/\$([\d,]+)/g, '**$$$1**');
      
      if (mints.length === 1) {
        responseContent = `**Token Price Information**\n\n${responseContent}`;
      } else {
        responseContent = `**Token Price Information**\n\n${responseContent}`;
      }

      // Add the response to the chat
      setMessages((prev) => [...prev, { role: 'assistant', content: responseContent }]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking token price:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, there was an error fetching token prices. The service might be temporarily unavailable. Please try again later.',
        },
      ]);
      setIsLoading(false);
    }
  };

  // Helper function to check Sonic chain stats
  const checkSonicStats = async () => {
    try {
      // Call the stats API
      const response = await fetch('/api/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const statsData = await response.json();
      
      // Format the response
      let responseContent = formatSonicStats(statsData);
      
      // No need to replace dollar signs as they're already in the correct format
      // The stats are already formatted with $$ in the formatSonicStats function
      
      // Add the response to the chat
      setMessages((prev) => [...prev, { role: 'assistant', content: responseContent }]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking Sonic chain stats:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, there was an error fetching Sonic chain stats. The service might be temporarily unavailable. Please try again later.',
        },
      ]);
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
              Ask me about HyperGrid, Sorada, Rush, Sega DEX, or how to deploy on Sonic! You can also check wallet balances, token prices, chain stats, or request test tokens.
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