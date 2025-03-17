"use client";

import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Message } from '@/lib/ai-utils';
import { isValidSonicAddress } from '@/lib/wallet-utils';
import { isValidTokenMint, formatTokenPrices } from '@/lib/token-utils';
import { formatSonicStats } from '@/lib/stats-utils';
import { isValidPoolId, formatLiquidityPoolList } from '@/lib/liquidity-pool-utils';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm Sonic AI. I can help with Sonic technologies like HyperGrid, Sorada, and Rush, as well as ecosystem projects like Sega DEX. Ask me about wallet balances, token prices, chain stats, DeFi activities, request test tokens by typing 'faucet [your wallet address]', ask me to send SOL to any address, get information about liquidity pools like the SOL-SONIC pool (DgMweMfMbmPFChTuAvTf4nriQDWpf9XX3g66kod9nsR4) with $50,000 liquidity, $15,000 daily volume, 0.3% fees, 15% APR, and a price of 0.0025 SOL per SONIC, or list all available liquidity pools! 🚀"
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
    if (!content.trim()) return;

    // Add user message to chat
    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Check if the input is a wallet address
      if (isValidSonicAddress(content)) {
        const walletInfo = await checkWalletBalance(content);
        setMessages((prev) => [...prev, { role: 'assistant' as const, content: walletInfo }]);
        setIsLoading(false);
        return;
      }

      // Check if the input is a token mint address
      if (isValidTokenMint(content)) {
        const tokenInfo = await checkTokenPrice([content]);
        setMessages((prev) => [...prev, { role: 'assistant' as const, content: tokenInfo }]);
        setIsLoading(false);
        return;
      }

      // Check if the input is a liquidity pool ID
      if (isValidPoolId(content)) {
        const poolInfo = await checkLiquidityPool(content);
        setMessages((prev) => [...prev, { role: 'assistant' as const, content: poolInfo }]);
        setIsLoading(false);
        return;
      }

      // Check if the message is asking about a liquidity pool
      const poolRegex = /(?:liquidity pool|lp|pool).*?(?:info|data|details|stats).*?([\w\d]{32,44})/i;
      const poolMatch = content.match(poolRegex);
      
      if (poolMatch && poolMatch[1] && isValidPoolId(poolMatch[1])) {
        const poolId = poolMatch[1];
        const poolInfo = await checkLiquidityPool(poolId);
        setMessages((prev) => [...prev, { role: 'assistant' as const, content: poolInfo }]);
        setIsLoading(false);
        return;
      }

      // Check if the message is asking about the SOL-SONIC pool
      const solSonicRegex = /(?:sol[\s-]sonic|wsol[\s-]sonic).*?(?:pool|lp|liquidity|pair)/i;
      if (solSonicRegex.test(content)) {
        // SOL-SONIC pool ID
        const solSonicPoolId = 'DgMweMfMbmPFChTuAvTf4nriQDWpf9XX3g66kod9nsR4';
        const poolInfo = await checkLiquidityPool(solSonicPoolId);
        setMessages((prev) => [...prev, { role: 'assistant' as const, content: poolInfo }]);
        setIsLoading(false);
        return;
      }

      // Check if the message is asking about pools list
      const poolsListRegex = /(?:list|show|get|display).*?(?:liquidity pools|pools|lps)/i;
      if (poolsListRegex.test(content)) {
        const poolsInfo = await checkLiquidityPools();
        setMessages((prev) => [...prev, { role: 'assistant' as const, content: poolsInfo }]);
        setIsLoading(false);
        return;
      }

      // Process with AI if not a special command
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      // Read the response as text instead of trying to parse it as JSON
      const responseText = await response.text();
      setMessages((prev) => [...prev, { role: 'assistant' as const, content: responseText }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant' as const,
          content: 'Sorry, there was an error processing your message. Please try again later.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to check wallet balance
  const checkWalletBalance = async (address: string): Promise<string> => {
    try {
      console.log('Checking wallet balance for address:', address);
      
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const url = `/api/wallet?_t=${timestamp}`;
      console.log('Wallet API URL with timestamp:', url);
      
      // Call the wallet API
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ address }),
      });

      console.log('Wallet API response status:', response.status);
      
      // Get the response as text first
      const responseText = await response.text();
      console.log('Wallet response text preview:', responseText.substring(0, 200) + '...');
      
      // Check if the response is empty
      if (!responseText.trim()) {
        console.error('Empty response from wallet API');
        return 'Error: Received empty response from the server when fetching wallet balance';
      }
      
      // Check if the response is not JSON but has text content
      if (responseText.trim().startsWith('I ') || 
          responseText.trim().startsWith('Sorry') || 
          !responseText.trim().startsWith('{')) {
        console.log('Received text response instead of JSON from wallet API');
        return responseText;
      }
      
      // Try to parse the JSON
      let walletData;
      try {
        walletData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response from wallet API:', parseError);
        // If we can't parse it as JSON but it's a text response, return it directly
        if (typeof responseText === 'string' && responseText.length > 0) {
          return responseText;
        }
        return `Error parsing server response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`;
      }
      
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
      setMessages((prev) => [...prev, { role: 'assistant' as const, content: responseContent }]);
      setIsLoading(false);
      return responseContent;
    } catch (error) {
      console.error('Error checking wallet balance:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant' as const,
          content: 'Sorry, there was an error checking the wallet balance. The service might be temporarily unavailable. Please try again later.',
        },
      ]);
      setIsLoading(false);
      return 'Sorry, there was an error checking the wallet balance. The service might be temporarily unavailable. Please try again later.';
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
      setMessages((prev) => [...prev, { role: 'assistant' as const, content: responseContent }]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error requesting faucet tokens:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant' as const,
          content: 'Sorry, there was an error connecting to the faucet service. Please try again later.',
        },
      ]);
      setIsLoading(false);
    }
  };

  // Helper function to check token prices
  const checkTokenPrice = async (mints: string[]): Promise<string> => {
    try {
      console.log('Checking token prices for mints:', mints);
      
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const url = `/api/token-price?_t=${timestamp}`;
      console.log('Token price API URL with timestamp:', url);
      
      // Call the token price API
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ mints }),
      });

      console.log('Token price API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from token price API:', response.status, errorText);
        return `Error: Failed to get token prices: ${response.status} ${response.statusText}`;
      }
      
      // Get the response as text first
      const responseText = await response.text();
      console.log('Token price response text preview:', responseText.substring(0, 200) + '...');
      
      // Check if the response is empty
      if (!responseText.trim()) {
        console.error('Empty response from token price API');
        return 'Error: Received empty response from the server when fetching token prices';
      }
      
      // Check if the response is not JSON but has text content
      if (responseText.trim().startsWith('I ') || 
          responseText.trim().startsWith('Sorry') || 
          !responseText.trim().startsWith('{')) {
        console.log('Received text response instead of JSON from token price API');
        return responseText;
      }
      
      // Try to parse the JSON
      let priceData;
      try {
        priceData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response from token price API:', parseError);
        // If we can't parse it as JSON but it's a text response, return it directly
        if (typeof responseText === 'string' && responseText.length > 0) {
          return responseText;
        }
        return `Error parsing server response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`;
      }
      
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
      setMessages((prev) => [...prev, { role: 'assistant' as const, content: responseContent }]);
      setIsLoading(false);
      return responseContent;
    } catch (error) {
      console.error('Error checking token price:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant' as const,
          content: 'Sorry, there was an error fetching token prices. The service might be temporarily unavailable. Please try again later.',
        },
      ]);
      setIsLoading(false);
      return 'Sorry, there was an error fetching token prices. The service might be temporarily unavailable. Please try again later.';
    }
  };

  // Helper function to check Sonic chain stats
  const checkSonicStats = async () => {
    try {
      console.log('Fetching Sonic chain stats...');
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const url = `/api/stats?_t=${timestamp}&fallback=true`;
      console.log('Stats API URL with timestamp and fallback:', url);
      
      // Call the stats API
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
      });

      console.log('Stats API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from Stats API:', response.status, errorText);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant' as const,
            content: `Error: Failed to get Sonic chain stats: ${response.status} ${response.statusText}`,
          },
        ]);
        setIsLoading(false);
        return;
      }
      
      // Get the response as text first
      const responseText = await response.text();
      console.log('Stats response text preview:', responseText.substring(0, 200) + '...');
      
      // Check if the response is empty
      if (!responseText.trim()) {
        console.error('Empty response from Stats API');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant' as const,
            content: 'Error: Received empty response from the server when fetching Sonic chain stats',
          },
        ]);
        setIsLoading(false);
        return;
      }
      
      // Check if the response is not JSON but has text content
      if (responseText.trim().startsWith('I ') || 
          responseText.trim().startsWith('Sorry') || 
          !responseText.trim().startsWith('{')) {
        console.log('Received text response instead of JSON from Stats API');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant' as const,
            content: responseText,
          },
        ]);
        setIsLoading(false);
        return;
      }
      
      // Try to parse the JSON
      let statsData;
      try {
        statsData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response from Stats API:', parseError);
        // If we can't parse it as JSON but it's a text response, return it directly
        if (typeof responseText === 'string' && responseText.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant' as const,
              content: responseText,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant' as const,
              content: 'Sorry, there was an error parsing the Sonic chain stats response. Please try again later.',
            },
          ]);
        }
        setIsLoading(false);
        return;
      }
      
      // Format the response
      let responseContent = formatSonicStats(statsData);
      
      // Add the response to the chat
      setMessages((prev) => [...prev, { role: 'assistant' as const, content: responseContent }]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking Sonic chain stats:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant' as const,
          content: 'Sorry, there was an error fetching Sonic chain stats. The service might be temporarily unavailable. Please try again later.',
        },
      ]);
      setIsLoading(false);
    }
  };

  // Helper function to send a transaction
  const sendTransaction = async (recipient: string, amount: number) => {
    try {
      // First, get the agent wallet info to check if it's configured
      const infoResponse = await fetch('/api/transaction', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const infoData = await infoResponse.json();
      
      if (!infoResponse.ok || !infoData.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant' as const,
            content: `Sorry, I can't send transactions at the moment. ${infoData.error || 'The agent wallet is not properly configured.'}`,
          },
        ]);
        setIsLoading(false);
        return;
      }
      
      // Check if we're on mainnet and inform the user that we can only send on testnet
      if (!infoData.networkInfo.isTestnet) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant' as const,
            content: `Sorry, I can only send SOL on testnet, not on mainnet. My current network is ${infoData.networkInfo.network}. For security reasons, mainnet transactions are disabled.`,
          },
        ]);
        setIsLoading(false);
        return;
      }
      
      // Show wallet info before sending transaction
      const walletInfoMessage = `🔑 My Wallet Information\n\n` +
        `Public Key: ${infoData.publicKey}\n\n` +
        `Network: ${infoData.networkInfo.network}\n\n` +
        `Testnet Balance: ${infoData.testnetBalance.toFixed(4)} SOL\n\n` +
        `I'll send ${amount} SOL to ${recipient.slice(0, 6)}...${recipient.slice(-4)} from my wallet.`;
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant' as const,
          content: walletInfoMessage,
        },
      ]);
      
      // Now send the transaction
      const response = await fetch('/api/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipient, amount }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant' as const,
            content: `Sorry, the transaction failed. ${data.error || 'Please try again later.'}`,
          },
        ]);
        setIsLoading(false);
        return;
      }
      
      // Format the transaction response
      const transactionMessage = `✅ Transaction Successful!\n\n` +
        `Amount: ${amount} SOL\n\n` +
        `Recipient: ${recipient}\n\n` +
        `Transaction ID: ${data.signature}\n\n` +
        `Network: ${infoData.networkInfo.network}`;
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant' as const,
          content: transactionMessage,
        },
      ]);
    } catch (error) {
      console.error('Error sending transaction:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant' as const,
          content: 'Sorry, there was an error processing the transaction. The service might be temporarily unavailable. Please try again later.',
        },
      ]);
      setIsLoading(false);
    }
  };

  // Helper function to check the agent's wallet info
  const checkAgentWalletInfo = async () => {
    try {
      // Call the agent wallet API
      const response = await fetch('/api/agent-wallet', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Get the response data even if status is not OK
      const walletData = await response.json();
      
      // Format the response
      let responseContent = '';
      
      if (!response.ok) {
        // Handle HTTP error but still try to use the error message from the response
        responseContent = `Error: ${walletData.error || `Failed to get agent wallet info: ${response.status} ${response.statusText}`}`;
      } else if (walletData.error) {
        // Handle application error
        responseContent = `Error: ${walletData.error}`;
      } else {
        // Check if the last user message is asking specifically about testnet/devnet balance
        const lastUserMessage = messages.findLast(m => m.role === 'user')?.content || '';
        const isTestnetQuery = /(?:testnet|devnet).*(?:balance|wallet)/i.test(lastUserMessage);
        const isMainnetQuery = /(?:mainnet).*(?:balance|wallet)/i.test(lastUserMessage);
        const isAddressQuery = /(?:address|public key)/i.test(lastUserMessage);
        
        if (isTestnetQuery) {
          // Just show testnet balance
          responseContent = `🔑 My Wallet Information\n\n`;
          responseContent += `Public Key: ${walletData.publicKey}\n\n`;
          responseContent += `Network: ${walletData.networkInfo.network}\n\n`;
          
          if (walletData.testnetBalance !== null) {
            responseContent += `Testnet Balance: ${walletData.testnetBalance.toFixed(4)} SOL\n\n`;
          } else {
            responseContent += `Testnet Balance: Unable to retrieve\n\n`;
          }
          
          responseContent += `Note: For security reasons, I can only send SOL on testnet, not on mainnet.`;
        } else if (isMainnetQuery) {
          // Just show mainnet balance
          responseContent = `🔑 My Wallet Information\n\n`;
          responseContent += `Public Key: ${walletData.publicKey}\n\n`;
          responseContent += `Network: ${walletData.networkInfo.network}\n\n`;
          responseContent += `Mainnet Balance: ${walletData.balance.toFixed(4)} SOL\n\n`;
          responseContent += `Note: For security reasons, I can only send SOL on testnet, not on mainnet.`;
        } else if (isAddressQuery) {
          // Just show wallet address
          responseContent = `🔑 My Wallet Information\n\n`;
          responseContent += `Public Key: ${walletData.publicKey}\n\n`;
          responseContent += `Network: ${walletData.networkInfo.network}\n\n`;
          responseContent += `Note: For security reasons, I can only send SOL on testnet, not on mainnet.`;
        } else {
          // Format successful response with full information
          responseContent = `🔑 My Wallet Information\n\n`;
          responseContent += `Public Key: ${walletData.publicKey}\n\n`;
          responseContent += `Network: ${walletData.networkInfo.network}\n\n`;
          responseContent += `Mainnet Balance: ${walletData.balance !== undefined ? walletData.balance.toFixed(4) : '0.0000'} SOL\n\n`;
          
          // Testnet balance if available
          if (walletData.testnetBalance !== null) {
            responseContent += `Testnet Balance: ${walletData.testnetBalance.toFixed(4)} SOL\n\n`;
          } else {
            responseContent += `Testnet Balance: Unable to retrieve\n\n`;
          }
          
          // Add note about sending SOL
          responseContent += `Note: For security reasons, I can only send SOL on testnet, not on mainnet.`;
        }
      }

      // Add the response to the chat
      setMessages((prev) => [...prev, { role: 'assistant' as const, content: responseContent }]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking agent wallet info:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant' as const,
          content: 'Sorry, there was an error checking my wallet information. The service might be temporarily unavailable. Please try again later.',
        },
      ]);
      setIsLoading(false);
    }
  };

  // Helper function to check liquidity pool information
  const checkLiquidityPool = async (poolId: string): Promise<string> => {
    try {
      console.log('Checking liquidity pool:', poolId);
      
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const url = `/api/liquidity-pool?_t=${timestamp}`;
      console.log('API URL with timestamp:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ poolId }),
      });

      console.log('Liquidity pool API response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `Failed to fetch liquidity pool data: ${response.status} ${response.statusText}`;
        
        try {
          const responseText = await response.text();
          console.error('Error response text:', responseText);
          
          // Check if the response is JSON
          if (responseText.trim().startsWith('{')) {
            try {
              const errorData = JSON.parse(responseText);
              if (errorData && errorData.error) {
                errorMessage = errorData.error;
              }
            } catch (parseError) {
              console.error('Could not parse error response as JSON:', parseError);
            }
          } else if (responseText.trim().length > 0) {
            // If it's not JSON but has content, use it directly
            return responseText;
          }
        } catch (textError) {
          console.error('Could not get error response text:', textError);
        }
        
        if (response.status === 404) {
          return `I couldn't find information for the liquidity pool with ID: ${poolId}. This pool may not exist or might not be available on Sega DEX.`;
        }
        
        return `I'm sorry, but I encountered an issue while fetching information for this liquidity pool. ${errorMessage}`;
      }

      // Get the response as text first
      const responseText = await response.text();
      console.log('Response text preview:', responseText.substring(0, 200) + '...');
      
      // Check if the response is empty
      if (!responseText.trim()) {
        console.error('Empty response from API');
        return `I'm sorry, but I received an empty response when trying to fetch information for this liquidity pool.`;
      }
      
      // Check if the response is not JSON but has text content
      if (responseText.trim().startsWith('I ') || 
          responseText.trim().startsWith('Sorry') || 
          !responseText.trim().startsWith('{')) {
        console.log('Received text response instead of JSON');
        return responseText;
      }
      
      // Try to parse the JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        // If we can't parse it as JSON but it's a text response, return it directly
        if (typeof responseText === 'string' && responseText.length > 0) {
          return responseText;
        }
        return `I'm sorry, but I encountered an error parsing the response from the liquidity pool API. Please try again later.`;
      }
      
      console.log('Liquidity pool data:', data);
      
      if (!data.success || !data.data) {
        console.error('Failed to fetch liquidity pool data:', data.error);
        return `I couldn't retrieve information for this liquidity pool. ${data.error || 'The service might be temporarily unavailable.'}`;
      }

      const pool = data.data[0];
      if (!pool) {
        console.error('No pool data found in response');
        return `I couldn't find any data for the liquidity pool with ID: ${poolId}.`;
      }
      
      // Format the response
      let formattedResponse = `## ${pool.mintA?.symbol || pool.tokenPair?.baseSymbol || 'Unknown'}-${pool.mintB?.symbol || pool.tokenPair?.quoteSymbol || 'Unknown'} Liquidity Pool\n\n`;
      
      try {
        // Check if the response is in the new format (with tokenPair)
        if (pool.tokenPair) {
          // Add token information
          formattedResponse += `**Token Pair:** ${pool.tokenPair.baseSymbol}/${pool.tokenPair.quoteSymbol}\n`;
          formattedResponse += `**Base Token:** ${pool.tokenPair.baseSymbol} (${pool.tokenPair.baseMint})\n`;
          formattedResponse += `**Quote Token:** ${pool.tokenPair.quoteSymbol} (${pool.tokenPair.quoteMint})\n\n`;
          
          // Add liquidity information
          formattedResponse += `**Liquidity:**\n`;
          if (pool.liquidity) {
            formattedResponse += `- Total Value Locked: $${Number(pool.liquidity.tvl).toLocaleString()}\n`;
            formattedResponse += `- Base Reserve: ${Number(pool.liquidity.baseReserve).toLocaleString()} ${pool.tokenPair.baseSymbol}\n`;
            formattedResponse += `- Quote Reserve: ${Number(pool.liquidity.quoteReserve).toLocaleString()} ${pool.tokenPair.quoteSymbol}\n\n`;
          } else if (pool.tvl) {
            formattedResponse += `- Total Value Locked: $${Number(pool.tvl).toLocaleString()}\n\n`;
          }
          
          // Add volume and fees
          if (pool.volume) {
            formattedResponse += `**Volume (24h):** $${Number(pool.volume.h24).toLocaleString()}\n`;
          } else if (pool.day && pool.day.volume) {
            formattedResponse += `**Volume (24h):** $${Number(pool.day.volume).toLocaleString()}\n`;
          }
          
          if (pool.fees) {
            formattedResponse += `**Fees:**\n`;
            formattedResponse += `- LP Fee: ${Number(pool.fees.lpFeeRate) * 100}%\n`;
            formattedResponse += `- Platform Fee: ${Number(pool.fees.platformFeeRate) * 100}%\n`;
            formattedResponse += `- Total Fee: ${Number(pool.fees.totalFeeRate) * 100}%\n\n`;
          } else if (pool.feeRate) {
            formattedResponse += `**Fee Rate:** ${Number(pool.feeRate) * 100}%\n\n`;
          }
          
          // Add APR if available
          if (pool.apr) {
            formattedResponse += `**APR:** ${Number(pool.apr) * 100}%\n\n`;
          } else if (pool.day && pool.day.apr) {
            formattedResponse += `**APR (24h):** ${(Number(pool.day.apr) * 100).toFixed(2)}%\n\n`;
          }
          
          // Add current price
          if (pool.price) {
            formattedResponse += `**Current Price:** 1 ${pool.tokenPair.baseSymbol} = ${Number(pool.price).toLocaleString()} ${pool.tokenPair.quoteSymbol}\n\n`;
          }
        } else {
          // Old API format
          // Add token information
          formattedResponse += `**Token Pair:** ${pool.mintA?.symbol || 'Unknown'}/${pool.mintB?.symbol || 'Unknown'}\n`;
          formattedResponse += `**Token Addresses:**\n`;
          if (pool.mintA && pool.mintA.address) {
            formattedResponse += `- ${pool.mintA.symbol || 'Token A'}: \`${pool.mintA.address}\`\n`;
          }
          if (pool.mintB && pool.mintB.address) {
            formattedResponse += `- ${pool.mintB.symbol || 'Token B'}: \`${pool.mintB.address}\`\n`;
          }
          formattedResponse += `\n`;
          
          // Add pool metrics
          if (pool.tvl !== undefined) {
            formattedResponse += `**Liquidity:** $${Number(pool.tvl).toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`;
          }
          if (pool.day && pool.day.volume !== undefined) {
            formattedResponse += `**Volume (24h):** $${Number(pool.day.volume).toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`;
          }
          if (pool.day && pool.day.volumeFee !== undefined) {
            formattedResponse += `**Fees (24h):** $${Number(pool.day.volumeFee).toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`;
          }
          if (pool.day && pool.day.apr !== undefined) {
            formattedResponse += `**APR (24h):** ${(Number(pool.day.apr) * 100).toFixed(2)}%\n\n`;
          }
          
          // Add price information
          if (pool.price !== undefined) {
            formattedResponse += `**Current Price:** 1 ${pool.mintA?.symbol || 'Token A'} = ${Number(pool.price).toFixed(6)} ${pool.mintB?.symbol || 'Token B'}\n\n`;
          }
        }
      } catch (formatError) {
        console.error('Error formatting pool data:', formatError);
        // Continue with basic information if there's an error formatting
      }
      
      // Add pool ID
      formattedResponse += `**Pool ID:** \`${poolId}\`\n\n`;
      
      // Add link to Sega DEX
      formattedResponse += `You can view this pool on [Sega DEX](https://sega.so/pools/${poolId})`;
      
      return formattedResponse;
    } catch (error) {
      console.error('Error in checkLiquidityPool:', error);
      return `I'm sorry, but I encountered an unexpected error while fetching information for this liquidity pool. Please try again later.`;
    }
  };

  // Helper function to check liquidity pools
  const checkLiquidityPools = async (): Promise<string> => {
    try {
      console.log('Fetching liquidity pools from API...');
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const url = `/api/liquidity-pools?_t=${timestamp}`;
      console.log('API URL with timestamp:', url);
      
      // Call the liquidity pools API
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from API:', response.status, errorText);
        return `Error: Failed to get liquidity pools: ${response.status} ${response.statusText}`;
      }
      
      // Get the response as text first
      const responseText = await response.text();
      console.log('Response text preview:', responseText.substring(0, 200) + '...');
      
      // Check if the response is empty or not JSON
      if (!responseText.trim()) {
        console.error('Empty response from API');
        return 'Error: Received empty response from the server';
      }
      
      // Check if the response starts with text (not JSON)
      if (responseText.trim().startsWith('I ') || 
          responseText.trim().startsWith('Sorry') || 
          !responseText.trim().startsWith('{')) {
        console.log('Received text response instead of JSON');
        return responseText;
      }
      
      // Try to parse the JSON
      let poolsData;
      try {
        poolsData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError, 'Response text:', responseText);
        // If we can't parse it as JSON but it's a text response, return it directly
        if (typeof responseText === 'string' && responseText.length > 0) {
          return responseText;
        }
        return `Error parsing server response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`;
      }
      
      console.log('API response data structure:', 
        'success:', poolsData.success, 
        'data exists:', !!poolsData.data,
        'count:', poolsData.data?.count,
        'pools count:', poolsData.data?.data?.length
      );
      
      if (!poolsData.success || !poolsData.data) {
        console.error('Error in pools data:', poolsData.error);
        return `I couldn't fetch the list of liquidity pools. ${poolsData.error || 'The service might be temporarily unavailable.'}`;
      }
      
      // Use the formatLiquidityPoolList function to format the response
      return formatLiquidityPoolList(poolsData);
    } catch (error) {
      console.error('Error checking liquidity pools:', error);
      return 'Sorry, there was an error fetching the liquidity pools. The service might be temporarily unavailable. Please try again later.';
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
              Ask me about HyperGrid, Sorada, Rush, Sega DEX, or how to deploy on Sonic! You can also check wallet balances, token prices, chain stats, request test tokens, ask me to send SOL to any address, get information about liquidity pools like the SOL-SONIC pool (DgMweMfMbmPFChTuAvTf4nriQDWpf9XX3g66kod9nsR4) with $50,000 liquidity, $15,000 daily volume, 0.3% fees, 15% APR, and a price of 0.0025 SOL per SONIC, or list all available liquidity pools.
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