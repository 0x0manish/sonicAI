"use client";

import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Message } from '@/lib/ai-utils';
import { isValidSonicAddress } from '@/lib/wallet-utils';
import { isValidTokenMint, formatTokenPrices, formatTokenDetails } from '@/lib/token-utils';
import { formatSonicStats } from '@/lib/stats-utils';
import { isValidPoolId, formatLiquidityPoolList } from '@/lib/liquidity-pool-utils';
import { validateAIConfig } from '@/lib/ai-config';
import { getEnvVars, logEnvVars } from '@/lib/env-utils';
import Image from 'next/image';
import { isValidMintAddress, SOL_MINT, solToLamports, lamportsToSol } from '@/lib/swap-utils';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm Sonic AI. Ask me about Sonic technologies, ecosystem projects, wallet balances, token prices, or how to interact with the Sonic blockchain. 🚀"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const env = getEnvVars();

  // Validate AI configuration on mount
  useEffect(() => {
    // Log environment variables for debugging
    logEnvVars();
    
    const isValid = validateAIConfig();
    if (!isValid) {
      if (env.NODE_ENV === 'development') {
        setConfigError('Warning: AI configuration is incomplete. The app will work with limited functionality in development mode.');
        console.warn('AI configuration validation failed in development mode');
      } else {
        setConfigError('Error: AI configuration is invalid. Please check your environment variables.');
        console.error('AI configuration validation failed');
      }
    }
  }, []);

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
      // Direct check for swap requests at the beginning
      if (content.toLowerCase().includes('swap') && content.toLowerCase().includes('sol')) {
        console.log('Potential swap request detected:', content);
        
        // Check for the exact format: swap X sol to ADDRESS
        const exactFormatRegex = /swap\s+(\d+(?:\.\d+)?)\s+sol\s+to\s+([\w\d]{32,44})/i;
        const exactMatch = content.match(exactFormatRegex);
        
        if (exactMatch && exactMatch[1] && exactMatch[2]) {
          const amount = parseFloat(exactMatch[1]);
          const outputMint = exactMatch[2];
          
          console.log('Exact format swap request detected:', { amount, outputMint });
          
          // Validate output mint
          if (isValidMintAddress(outputMint)) {
            // Assume input is SOL for now
            console.log('Calling checkSwap with:', { inputMint: SOL_MINT, outputMint, amount });
            const swapResult = await checkSwap(SOL_MINT, outputMint, amount);
            console.log('Swap result:', swapResult);
            setMessages((prev) => [...prev, { role: 'assistant', content: swapResult }]);
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Check if the message is confirming a swap
      const confirmSwapRegex = /^(?:yes|confirm|execute|proceed|do it|swap it|go ahead)$/i;
      if (confirmSwapRegex.test(content.trim())) {
        // Check if there's a pending swap
        const lastSwapDataStr = sessionStorage.getItem('lastSwapData');
        if (lastSwapDataStr) {
          // Show a loading message
          setMessages((prev) => [...prev, { 
            role: 'assistant', 
            content: 'Checking your balance before executing the swap...' 
          }]);
          
          // Check balance before executing the swap
          const balanceCheckResult = await checkSwapBalance();
          
          if (balanceCheckResult.startsWith('Insufficient balance') || balanceCheckResult.startsWith('Error') || balanceCheckResult.startsWith('Network error')) {
            // If balance check fails, show the error
            setMessages((prev) => {
              // Replace the loading message with the error
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { 
                role: 'assistant', 
                content: balanceCheckResult 
              };
              return newMessages;
            });
          } else {
            // If balance check passes, show a message that swap execution is not implemented yet
            setMessages((prev) => {
              // Replace the loading message with the success message
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { 
                role: 'assistant', 
                content: 'Balance check passed! You have sufficient funds for this swap.\n\nSwap execution is not implemented yet. In a production environment, this would execute the swap transaction on the blockchain.' 
              };
              return newMessages;
            });
          }
          
          // Clear the swap data
          sessionStorage.removeItem('lastSwapData');
          setIsLoading(false);
          return;
        }
      }
      
      // Check if the message is canceling a swap
      const cancelSwapRegex = /^(?:no|cancel|stop|abort|don't|do not)$/i;
      if (cancelSwapRegex.test(content.trim())) {
        // Check if there's a pending swap
        const lastSwapDataStr = sessionStorage.getItem('lastSwapData');
        if (lastSwapDataStr) {
          // Clear the swap data
          sessionStorage.removeItem('lastSwapData');
          setMessages((prev) => [...prev, { role: 'assistant', content: 'Swap canceled.' }]);
          setIsLoading(false);
          return;
        }
      }

      // Check if the message is a swap request
      const swapRegex = /(?:swap|exchange|trade|convert)\s+(\d+(?:\.\d+)?)\s+(?:sol|sonic|usdc|token)\s+(?:to|for)\s+([\w\d]{32,44})/i;
      const swapMatch = content.match(swapRegex);
      
      console.log('Swap regex match:', swapMatch);
      
      // If the standard regex doesn't match, try a more flexible one
      if (!swapMatch) {
        console.log('Standard swap regex did not match, trying flexible regex');
        const flexibleSwapRegex = /(?:swap|exchange|trade|convert)\s+(\d+(?:\.\d+)?)\s+(?:sol|sonic|usdc|token)(?:\s+(?:to|for))?\s+([\w\d]{32,44})/i;
        const flexibleMatch = content.match(flexibleSwapRegex);
        console.log('Flexible swap regex match:', flexibleMatch);
        
        if (flexibleMatch && flexibleMatch[1] && flexibleMatch[2]) {
          const amount = parseFloat(flexibleMatch[1]);
          const outputMint = flexibleMatch[2];
          
          console.log('Flexible swap request detected:', { amount, outputMint });
          console.log('Is valid mint address:', isValidMintAddress(outputMint));
          
          // Validate output mint
          if (isValidMintAddress(outputMint)) {
            // Assume input is SOL for now
            console.log('Calling checkSwap with:', { inputMint: SOL_MINT, outputMint, amount });
            const swapResult = await checkSwap(SOL_MINT, outputMint, amount);
            console.log('Swap result:', swapResult);
            setMessages((prev) => [...prev, { role: 'assistant', content: swapResult }]);
            setIsLoading(false);
            return;
          }
        }
      }
      
      if (swapMatch && swapMatch[1] && swapMatch[2]) {
        const amount = parseFloat(swapMatch[1]);
        const outputMint = swapMatch[2];
        
        console.log('Swap request detected:', { amount, outputMint });
        console.log('Is valid mint address:', isValidMintAddress(outputMint));
        
        // Validate output mint
        if (isValidMintAddress(outputMint)) {
          // Assume input is SOL for now
          console.log('Calling checkSwap with:', { inputMint: SOL_MINT, outputMint, amount });
          const swapResult = await checkSwap(SOL_MINT, outputMint, amount);
          console.log('Swap result:', swapResult);
          setMessages((prev) => [...prev, { role: 'assistant', content: swapResult }]);
          setIsLoading(false);
          return;
        }
      }
      
      // Check if the message is a swap request with two token addresses
      const swapTokensRegex = /(?:swap|exchange|trade|convert)\s+(\d+(?:\.\d+)?)\s+([\w\d]{32,44})\s+(?:to|for)\s+([\w\d]{32,44})/i;
      const swapTokensMatch = content.match(swapTokensRegex);
      
      if (swapTokensMatch && swapTokensMatch[1] && swapTokensMatch[2] && swapTokensMatch[3]) {
        const amount = parseFloat(swapTokensMatch[1]);
        const inputMint = swapTokensMatch[2];
        const outputMint = swapTokensMatch[3];
        
        // Validate mint addresses
        if (isValidMintAddress(inputMint) && isValidMintAddress(outputMint)) {
          const swapResult = await checkSwap(inputMint, outputMint, amount);
          setMessages((prev) => [...prev, { role: 'assistant', content: swapResult }]);
          setIsLoading(false);
          return;
        }
      }

      // Check if the message is a faucet request
      const faucetRegex = /(?:faucet|send\s+(?:test\s+)?tokens\s+(?:to)?)\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i;
      const faucetMatch = content.match(faucetRegex);
      
      if (faucetMatch && faucetMatch[1] && isValidSonicAddress(faucetMatch[1])) {
        const address = faucetMatch[1];
        await requestFaucetTokens(address);
        setIsLoading(false);
        return;
      }

      // Check if the message is asking about wallet balance
      const walletBalanceRegex = /(?:balance|wallet).*?([1-9A-HJ-NP-Za-km-z]{32,44})/i;
      const walletMatch = content.match(walletBalanceRegex);
      
      if (walletMatch && walletMatch[1] && isValidSonicAddress(walletMatch[1])) {
        const address = walletMatch[1];
        await checkWalletBalance(address);
        setIsLoading(false);
        return;
      }

      // Check if the input is a wallet address
      if (isValidSonicAddress(content)) {
        await checkWalletBalance(content);
        setIsLoading(false);
        return;
      }

      // Check if the message is asking for token details
      const tokenDetailsRegex = /(?:show|get|display|what(?:'|')?s|what is|tell me about).*?(?:token|mint).*?(?:details|info|information|data).*?([\w\d]{32,44})|(?:details|info|information|data).*?(?:for|about).*?(?:token|mint).*?([\w\d]{32,44})|(?:token|mint).*?([\w\d]{32,44}).*?(?:details|info|information|data)/i;
      const tokenDetailsMatch = content.match(tokenDetailsRegex);
      
      if (tokenDetailsMatch) {
        // Get the mint address from any of the capture groups
        const mintAddress = (tokenDetailsMatch[1] || tokenDetailsMatch[2] || tokenDetailsMatch[3] || '').trim();
        
        // Validate mint address
        if (mintAddress && isValidTokenMint(mintAddress)) {
          // Show a loading message
          setMessages((prev) => [...prev, { 
            role: 'assistant', 
            content: `I'll check the token details for the address ${mintAddress}. Just a moment!\n\nFetching details...` 
          }]);
          
          try {
            // Set a timeout for the token details request
            const timeoutPromise = new Promise<string>((_, reject) => {
              setTimeout(() => reject(new Error('Request timed out')), 15000);
            });
            
            // Fetch token details with timeout
            const tokenDetailsPromise = checkTokenDetails(mintAddress);
            const tokenDetailsResponse = await Promise.race([tokenDetailsPromise, timeoutPromise]);
            
            // Update the loading message with the actual response
            setMessages((prev) => {
              // Replace the loading message with the actual response
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { 
                role: 'assistant', 
                content: tokenDetailsResponse 
              };
              return newMessages;
            });
          } catch (error) {
            console.error('Error fetching token details:', error);
            // Update the loading message with the error
            setMessages((prev) => {
              // Replace the loading message with the error
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { 
                role: 'assistant', 
                content: `Sorry, I couldn't fetch the token details. ${error instanceof Error ? error.message : 'The service might be temporarily unavailable.'}` 
              };
              return newMessages;
            });
          }
          
          setIsLoading(false);
          return;
        }
      }

      // Check if the message is asking about token price
      const tokenPriceRegex = /(?:price|cost|value|worth|how much).*?(?:token|mint|coin).*?([\w\d]{32,44})/i;
      const tokenMatch = content.match(tokenPriceRegex);
      
      if (tokenMatch && tokenMatch[1] && isValidTokenMint(tokenMatch[1])) {
        const mint = tokenMatch[1];
        await checkTokenPrice([mint]);
        setIsLoading(false);
        return;
      }

      // Check if the input is a token mint address
      if (isValidTokenMint(content)) {
        await checkTokenPrice([content]);
        setIsLoading(false);
        return;
      }

      // Check if the message is asking about Sonic stats
      const statsRegex = /(?:stats|statistics|tvl|volume)/i;
      if (statsRegex.test(content)) {
        await checkSonicStats();
        setIsLoading(false);
        return;
      }

      // Check if the message is asking about the agent's wallet
      const agentWalletRegex = /(?:your|agent|bot).*?(?:wallet|balance)/i;
      if (agentWalletRegex.test(content)) {
        await checkAgentWalletInfo();
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

      // Check if the input is a liquidity pool ID
      if (isValidPoolId(content)) {
        const poolInfo = await checkLiquidityPool(content);
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
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from wallet API:', response.status, errorText);
        const errorMessage = `Error: Failed to get wallet balance: ${response.status} ${response.statusText}`;
        setMessages((prev) => [...prev, { role: 'assistant' as const, content: errorMessage }]);
        return errorMessage;
      }
      
      // Get the response as text first
      const responseText = await response.text();
      console.log('Wallet response text preview:', responseText.substring(0, 200) + '...');
      
      // Check if the response is empty
      if (!responseText.trim()) {
        console.error('Empty response from wallet API');
        const errorMessage = 'Error: Received empty response from the server when fetching wallet balance';
        setMessages((prev) => [...prev, { role: 'assistant' as const, content: errorMessage }]);
        return errorMessage;
      }
      
      // Try to parse the JSON
      let walletData;
      try {
        walletData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response from wallet API:', parseError);
        // If we can't parse it as JSON but it's a text response, return it directly
        if (typeof responseText === 'string' && responseText.length > 0) {
          setMessages((prev) => [...prev, { role: 'assistant' as const, content: responseText }]);
          return responseText;
        }
        const errorMessage = `Error parsing server response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`;
        setMessages((prev) => [...prev, { role: 'assistant' as const, content: errorMessage }]);
        return errorMessage;
      }
      
      // Format the response
      let responseContent = '';
      
      if (walletData.error) {
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
      return responseContent;
    } catch (error) {
      console.error('Error checking wallet balance:', error);
      const errorMessage = 'Sorry, there was an error checking the wallet balance. The service might be temporarily unavailable. Please try again later.';
      setMessages((prev) => [...prev, { role: 'assistant' as const, content: errorMessage }]);
      return errorMessage;
    }
  };

  // Helper function to request faucet tokens
  const requestFaucetTokens = async (address: string) => {
    try {
      console.log('Requesting faucet tokens for address:', address);
      
      // Call the faucet API
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      console.log('Faucet API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from faucet API:', response.status, errorText);
        const errorMessage = `Error: Failed to request tokens from the faucet: ${response.status} ${response.statusText}`;
        setMessages((prev) => [...prev, { role: 'assistant' as const, content: errorMessage }]);
        return;
      }

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
    } catch (error) {
      console.error('Error requesting faucet tokens:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant' as const,
          content: 'Sorry, there was an error connecting to the faucet service. Please try again later.',
        },
      ]);
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
        const errorMessage = `Error: Failed to get token prices: ${response.status} ${response.statusText}`;
        setMessages((prev) => [...prev, { role: 'assistant' as const, content: errorMessage }]);
        return errorMessage;
      }
      
      // Get the response as text first
      const responseText = await response.text();
      console.log('Token price response text preview:', responseText.substring(0, 200) + '...');
      
      // Check if the response is empty
      if (!responseText.trim()) {
        console.error('Empty response from token price API');
        const errorMessage = 'Error: Received empty response from the server when fetching token prices';
        setMessages((prev) => [...prev, { role: 'assistant' as const, content: errorMessage }]);
        return errorMessage;
      }
      
      // Try to parse the JSON
      let priceData;
      try {
        priceData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response from token price API:', parseError);
        // If we can't parse it as JSON but it's a text response, return it directly
        if (typeof responseText === 'string' && responseText.length > 0) {
          setMessages((prev) => [...prev, { role: 'assistant' as const, content: responseText }]);
          return responseText;
        }
        const errorMessage = `Error parsing server response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`;
        setMessages((prev) => [...prev, { role: 'assistant' as const, content: errorMessage }]);
        return errorMessage;
      }
      
      // Use the shared formatting function
      let responseContent = formatTokenPrices(priceData, mints);
      
      // Add markdown formatting for the web interface
      responseContent = responseContent.replace(/\$([\d,]+(?:\.\d+)?)/g, '**$$$1**');
      
      if (mints.length === 1) {
        responseContent = `**Token Price Information**\n\n${responseContent}`;
      } else {
        responseContent = `**Token Price Information**\n\n${responseContent}`;
      }

      // Add the response to the chat
      setMessages((prev) => [...prev, { role: 'assistant' as const, content: responseContent }]);
      return responseContent;
    } catch (error) {
      console.error('Error checking token price:', error);
      const errorMessage = 'Sorry, there was an error fetching token prices. The service might be temporarily unavailable. Please try again later.';
      setMessages((prev) => [...prev, { role: 'assistant' as const, content: errorMessage }]);
      return errorMessage;
    }
  };

  // Helper function to check Sonic chain stats
  const checkSonicStats = async () => {
    try {
      console.log('Fetching Sonic chain stats...');
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const url = `/api/stats?_t=${timestamp}`;
      console.log('Stats API URL with timestamp:', url);
      
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
      
      // Check if the response was successful
      if (!statsData.success) {
        console.error('Unsuccessful response from Stats API:', statsData.error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant' as const,
            content: `Error: ${statsData.error || 'Failed to fetch Sonic chain stats'}`,
          },
        ]);
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
            formattedResponse += `- Total Value Locked: $${Number(pool.liquidity.tvl).toFixed(2)}\n`;
            formattedResponse += `- Base Reserve: ${Number(pool.liquidity.baseReserve).toFixed(4)} ${pool.tokenPair.baseSymbol}\n`;
            formattedResponse += `- Quote Reserve: ${Number(pool.liquidity.quoteReserve).toFixed(4)} ${pool.tokenPair.quoteSymbol}\n\n`;
          } else if (pool.tvl) {
            formattedResponse += `- Total Value Locked: $${Number(pool.tvl).toFixed(2)}\n\n`;
          }
          
          // Add volume and fees
          if (pool.volume) {
            formattedResponse += `**Volume (24h):** $${Number(pool.volume.h24).toFixed(2)}\n`;
          } else if (pool.day && pool.day.volume) {
            formattedResponse += `**Volume (24h):** $${Number(pool.day.volume).toFixed(2)}\n`;
          }
          
          if (pool.fees) {
            formattedResponse += `**Fees:**\n`;
            formattedResponse += `- LP Fee: ${(Number(pool.fees.lpFeeRate) * 100).toFixed(2)}%\n`;
            formattedResponse += `- Platform Fee: ${(Number(pool.fees.platformFeeRate) * 100).toFixed(2)}%\n`;
            formattedResponse += `- Total Fee: ${(Number(pool.fees.totalFeeRate) * 100).toFixed(2)}%\n\n`;
          } else if (pool.feeRate) {
            formattedResponse += `**Fee Rate:** ${(Number(pool.feeRate) * 100).toFixed(2)}%\n\n`;
          }
          
          // Add APR if available
          if (pool.apr) {
            formattedResponse += `**APR:** ${(Number(pool.apr) * 100).toFixed(2)}%\n\n`;
          } else if (pool.day && pool.day.apr) {
            formattedResponse += `**APR (24h):** ${(Number(pool.day.apr) * 100).toFixed(2)}%\n\n`;
          }
          
          // Add current price
          if (pool.price) {
            formattedResponse += `**Current Price:** 1 ${pool.tokenPair.baseSymbol} = ${Number(pool.price).toFixed(6)} ${pool.tokenPair.quoteSymbol}\n\n`;
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
            formattedResponse += `**Liquidity:** $${Number(pool.tvl).toFixed(2)}\n`;
          }
          if (pool.day && pool.day.volume !== undefined) {
            formattedResponse += `**Volume (24h):** $${Number(pool.day.volume).toFixed(2)}\n`;
          }
          if (pool.day && pool.day.volumeFee !== undefined) {
            formattedResponse += `**Fees (24h):** $${Number(pool.day.volumeFee).toFixed(2)}\n`;
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
      
      // Add link to Sega DEX with target="_blank" to open in new tab
      formattedResponse += `You can view this pool on [Sega DEX](https://sega.so/liquidity-pools/ "Open in new tab")`;
      
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

  // Helper function to check token details
  const checkTokenDetails = async (mintAddress: string): Promise<string> => {
    try {
      console.log('Fetching token details for mint address:', mintAddress);
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const url = `/api/token-details?mintAddress=${mintAddress}&_t=${timestamp}`;
      console.log('API URL with timestamp:', url);
      
      // Create an AbortController for the timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Call the token details API with timeout
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);

      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from API:', response.status, errorText);
        return `Error: Failed to get token details: ${response.status} ${response.statusText}`;
      }
      
      // Get the response as text first
      const responseText = await response.text();
      console.log('Response text preview:', responseText.substring(0, 200) + '...');
      console.log('Full response text length:', responseText.length);
      
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
      let tokenData;
      try {
        tokenData = JSON.parse(responseText);
        console.log('Parsed token data:', tokenData);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError, 'Response text:', responseText);
        // If we can't parse it as JSON but it's a text response, return it directly
        if (typeof responseText === 'string' && responseText.length > 0) {
          return responseText;
        }
        return `Error parsing server response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`;
      }
      
      console.log('API response data structure:', 
        'success:', tokenData.success, 
        'data exists:', !!tokenData.data,
        'tokens count:', tokenData.data?.length
      );
      
      if (!tokenData.success || !tokenData.data) {
        console.error('Error in token data:', tokenData.error);
        return `I couldn't fetch the details for this token. ${tokenData.error || 'The service might be temporarily unavailable.'}`;
      }
      
      // Use the formatTokenDetails function to format the response
      const formattedResponse = formatTokenDetails(tokenData);
      console.log('Formatted token details response:', formattedResponse.substring(0, 200) + '...');
      return formattedResponse;
    } catch (error) {
      console.error('Error checking token details:', error);
      if ((error as Error).name === 'AbortError') {
        return 'Sorry, the request for token details timed out. Please try again later.';
      }
      return `Sorry, there was an error fetching the token details: ${error instanceof Error ? error.message : 'The service might be temporarily unavailable.'}`;
    }
  };

  // Add these helper functions for swap functionality
  const checkSwap = async (inputMint: string, outputMint: string, amount: number): Promise<string> => {
    try {
      console.log('Computing swap:', { inputMint, outputMint, amount });
      
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      
      // Convert amount to lamports if input is SOL and amount is in SOL
      let amountToUse = amount;
      if (inputMint === SOL_MINT && amount < 1_000_000) {
        amountToUse = solToLamports(amount);
        console.log('Converted amount to lamports:', amountToUse);
      }
      
      const apiUrl = `/api/swap/compute?_t=${timestamp}`;
      const requestBody = {
        inputMint,
        outputMint,
        amount: amountToUse,
        slippageBps: 50 // Default slippage of 0.5%
      };
      
      console.log('Swap API request:', { url: apiUrl, body: requestBody });
      
      // Call the swap compute API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('Swap API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from swap compute API:', response.status, errorText);
        return `Error: Failed to compute swap: ${response.status} ${response.statusText}`;
      }
      
      const swapData = await response.json();
      
      if (!swapData.success) {
        return `Error computing swap: ${swapData.error || 'Unknown error'}`;
      }
      
      // Format the swap details
      const data = swapData.data;
      
      // Format input amount
      let inputAmount: string;
      if (data.inputMint === SOL_MINT) {
        const solAmount = lamportsToSol(Number(data.inputAmount));
        inputAmount = `${solAmount.toFixed(4)} SOL`;
      } else {
        // For non-SOL tokens, we'd ideally fetch the token metadata to get decimals
        // For now, just show the raw amount
        inputAmount = data.inputAmount;
      }
      
      // Format output amount
      let outputAmount: string;
      if (data.outputMint === SOL_MINT) {
        const solAmount = lamportsToSol(Number(data.outputAmount));
        outputAmount = `${solAmount.toFixed(4)} SOL`;
      } else {
        // For non-SOL tokens, we'd ideally fetch the token metadata to get decimals
        // For now, just show the raw amount
        outputAmount = data.outputAmount;
      }
      
      // Format the swap details
      let result = `🔄 **Swap Details**\n\n`;
      result += `From: ${inputAmount} (${data.inputMint.slice(0, 4)}...${data.inputMint.slice(-4)})\n\n`;
      result += `To: ${outputAmount} (${data.outputMint.slice(0, 4)}...${data.outputMint.slice(-4)})\n\n`;
      result += `Price Impact: ${data.priceImpactPct.toFixed(2)}%\n\n`;
      result += `Slippage Tolerance: ${data.slippageBps / 100}%\n\n`;
      
      if (data.routePlan.length > 0) {
        const route = data.routePlan[0];
        result += `Fee: ${route.feeAmount} (${route.feeRate / 100}%)\n\n`;
        result += `Pool: ${route.poolId.slice(0, 4)}...${route.poolId.slice(-4)}\n\n`;
      }
      
      // Store the swap data in session storage for later use
      sessionStorage.setItem('lastSwapData', JSON.stringify(swapData.data));
      
      // Add a prompt to execute the swap
      result += `Would you like to execute this swap? Reply with "yes" to proceed or "no" to cancel.`;
      
      return result;
    } catch (error) {
      console.error('Error computing swap:', error);
      return `Error: ${error instanceof Error ? error.message : 'An error occurred while computing the swap'}`;
    }
  };

  const checkSwapBalance = async (): Promise<string> => {
    try {
      // Get the last swap data from session storage
      const lastSwapDataStr = sessionStorage.getItem('lastSwapData');
      if (!lastSwapDataStr) {
        return 'Error: No swap data found. Please compute a swap first.';
      }
      
      let lastSwapData;
      try {
        lastSwapData = JSON.parse(lastSwapDataStr);
      } catch (parseError) {
        console.error('Error parsing swap data from session storage:', parseError);
        return 'Error: Invalid swap data. Please try computing the swap again.';
      }
      
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      
      console.log('Checking balance for swap:', {
        inputMint: lastSwapData.inputMint,
        amount: lastSwapData.inputAmount
      });
      
      // Call the swap check balance API
      try {
        const response = await fetch(`/api/swap/check-balance?_t=${timestamp}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify({
            inputMint: lastSwapData.inputMint,
            amount: lastSwapData.inputAmount
          }),
        });
        
        // Get the response text for better error handling
        const responseText = await response.text();
        
        if (!response.ok) {
          console.error('Error response from swap check balance API:', response.status, responseText);
          
          // Try to parse the error response as JSON
          try {
            const errorData = JSON.parse(responseText);
            if (errorData && errorData.error) {
              // Check for specific error messages
              if (errorData.error.includes('wallet is not properly configured') || 
                  errorData.error.includes('Failed to initialize agent wallet') ||
                  errorData.error.includes('wallet configuration')) {
                return 'The agent wallet is not properly configured. This is a server-side issue that needs to be fixed by the administrator. Please try again later or contact support.';
              }
              return `Error checking balance: ${errorData.error}`;
            }
          } catch (parseError) {
            // If parsing fails, just use the status text
            console.error('Error parsing error response:', parseError);
          }
          
          // If we couldn't extract a specific error message, use a generic one
          if (response.status === 500) {
            return 'The wallet balance check failed. This could be due to the agent wallet not being properly configured or a network issue. Please try again later.';
          }
          
          return `Error: Failed to check balance: ${response.status} ${response.statusText}`;
        }
        
        // Try to parse the JSON response
        let balanceData;
        try {
          balanceData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error parsing JSON response from swap check balance API:', parseError);
          return 'Error: Failed to parse the balance check response. Please try again.';
        }
        
        if (!balanceData.success) {
          return `Error checking balance: ${balanceData.error || 'Unknown error'}`;
        }
        
        if (!balanceData.sufficient) {
          // Format the error message to be more user-friendly
          if (balanceData.error && balanceData.error.includes('Insufficient SOL balance')) {
            // Extract the required and available amounts for a more readable message
            const match = balanceData.error.match(/Required: ([\d.]+) SOL, Available: ([\d.]+) SOL/);
            if (match) {
              const required = match[1];
              const available = match[2];
              return `You don't have enough SOL for this swap. You need ${required} SOL but only have ${available} SOL available.`;
            }
          }
          
          return `Insufficient balance: ${balanceData.error}`;
        }
        
        // If balance is sufficient, return a success message
        return 'Balance check passed. You have sufficient funds for this swap.';
      } catch (fetchError) {
        console.error('Network error checking balance:', fetchError);
        return `Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to connect to the server'}. Please check your connection and try again.`;
      }
    } catch (error) {
      console.error('Error checking swap balance:', error);
      return `Error: ${error instanceof Error ? error.message : 'An unexpected error occurred while checking balance'}`;
    }
  };

  // If there are no messages, show a welcome screen
  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-full overflow-hidden shadow-md">
                <Image 
                  src="/logo.jpeg" 
                  alt="Sonic AI" 
                  width={96} 
                  height={96} 
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <h2 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">Welcome to Sonic AI</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your guide to the first atomic SVM chain for sovereign economies
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ask me about Sonic technologies, ecosystem projects, wallet balances, token prices, or how to interact with the Sonic blockchain.
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
      {configError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{configError}</span>
        </div>
      )}
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