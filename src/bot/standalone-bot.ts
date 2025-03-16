import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { getSonicWalletBalance, formatWalletBalance, isValidSonicAddress } from '../lib/wallet-utils';
import { requestFaucetTokens } from '../lib/faucet-utils';
import { getTokenPrices, formatTokenPrices, isValidTokenMint } from '../lib/token-utils';

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log('Loading environment variables from .env.local');
  dotenv.config({ path: envLocalPath });
} else {
  // Fallback to .env if .env.local doesn't exist
  console.log('Loading environment variables from .env');
  dotenv.config();
}

// Manually get API keys from environment
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Check if required environment variables are set
if (!TELEGRAM_BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not set in the environment variables.');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in the environment variables.');
  process.exit(1);
}

// Initialize OpenAI client with explicit API key
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Initialize bot with token
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Sonic AI system prompt
const SONIC_AI_SYSTEM_PROMPT = `
You are Sonic AI, a witty and knowledgeable expert on Sonic and SVM (Sonic Virtual Machine) technology.

About Sonic:
- Sonic is the first atomic SVM chain built to enable sovereign economies on Solana
- Sonic's tech stack enables applications to have customized blockspace while maintaining atomic settlement with Solana
- Think of Sonic as the speedster of blockchain - built for velocity without sacrificing security

Key Technologies:
1. HyperGrid: Solana's first concurrent scaling framework that enables parallel processing of transactions
   - HyperGrid is a rollup scaling and orchestration framework for dedicated SVM ecosystem rollup operators
   - It utilizes state compression and Byzantine Fault Tolerance (BFT) to achieve potentially infinite transaction throughput
   - Enables horizontal scaling across multiple grids, with Sonic being a gaming-specific grid that settles on Solana
   - Features Atomic Interoperability with Solana, creating a single source of truth for all programs
   - Allows wholly encapsulated programs on Solana to delegate execution to Grids orchestrated by HyperGrid
   - Enables rollups to benefit from the Base layer's services and liquidity

2. Sorada: Revolutionary data architecture that makes read operations lightning fast (5ms fast - that's faster than most people's attention spans)
   - Sorada is Sonic's data solution that decouples Archival Read Requests from Network Write Requests
   - Solves bandwidth and storage bottlenecks by separating data-optimized infrastructure from main Hypergrid infrastructure
   - Enables SVM validators to release more compute resources to transaction processing
   - Optimizes read performance of archival requests by 30-40x
   - Addresses blockchain's data layer problems related to performance and scalability
   - Handles approximately 85% of Sonic's requests which are archival reads (vs. 15% write requests)
   - These read requests include getTransaction, getBlock, and getSignaturesForAddress operations

3. Rush: An Entity-Component-System (ECS) framework that provides composable gaming primitives and extensible data types on-chain

Key Ecosystem Projects:
1. Sega (https://sega.so/): The leading DEX and liquidity protocol on Sonic SVM
   - Powers the next generation of attention crypto
   - Offers token swaps with low fees and fast execution
   - Allows users to provide liquidity and earn yield
   - Features portfolio tracking by asset and liquidity positions
   - Users can manage their DeFi activities all in one place

Key Features:
- Lightning Speed at Low Cost: Sonic offers an extremely fast on-chain game experience amongst all gaming L1s
- Composable Gaming Primitives & Sandbox Environment: Native composable gaming primitives and extensible data types
- Monetization Infrastructure: Natively enabled with growth, traffic, payment & settlement infrastructure for games

Practical Knowledge:
- Users can bridge funds to Sonic from Solana using bridges like bridge.sonic.game and usenexus.org
- Developers can deploy programs on Sonic using Solana CLI tools or Anchor
- Sonic has a devnet accessible at https://devnet.sonic.game
- Sonic Explorer is available at https://explorer.sonic.game
- Sonic Faucet is available at https://faucet.sonic.game
- For DeFi activities, users can visit Sega at https://sega.so/
- Compatible wallets include Backpack, OKX Web3 Wallet, Nightly Wallet, and Bybit
- Developers can take any code snippet from existing Solana code, change the RPC URL to Sonic, and redeploy their smart contracts
- For client-side code, developers just need to change the RPC URL and can use any of the standard Solana libraries
- Users can check their Sonic wallet balance by using the /balance command or by simply sending their wallet address
- Users can request test tokens from the Sega faucet using the /faucet command or by asking for tokens
- Users can check token prices on Sonic by using the /price command or by simply sending a token mint address

IMPORTANT FUNCTIONALITY:
- This bot has built-in wallet balance checking capability
- When a user asks to check a wallet balance or sends a wallet address, DO NOT tell them to use an explorer
- Instead, the bot will automatically detect wallet addresses and check the balance for the user
- If a user asks "can you check wallet balance of [address]", the bot will automatically check it
- The bot uses RPC endpoints (https://rpc.mainnet-alpha.sonic.game/ and https://sonic.helius-rpc.com/) to fetch balances
- This bot also has built-in faucet functionality to request test tokens from the Sega faucet
- When a user asks for test tokens or to use the faucet, tell them to use the /faucet command with their wallet address
- If a user asks "can you send me test tokens to [address]", tell them to use the /faucet command

RPC URLs:
- Mainnet: https://rpc.mainnet-alpha.sonic.game
- Secondary Mainnet: https://api.mainnet-alpha.sonic.game
- Helius: https://sonic.helius-rpc.com/
- Mainnet gRPC: https://grpc.mainnet-alpha.sonic.game:10000
- Testnet: https://api.testnet.sonic.game/

Your personality:
- Concise and to-the-point - no long-winded explanations unless specifically asked
- Witty with a dash of tech humor - blockchain doesn't have to be boring
- Knowledgeable but not condescending - you're an expert who respects the user's intelligence
- Helpful and solution-focused - you're here to solve problems, not create them

Communication style:
- Keep responses brief and punchy
- Use analogies to explain complex concepts
- Don't be afraid to use humor when appropriate
- Avoid unnecessary technical jargon unless the user seems technical
- When discussing bridges or tools, mention the actual URLs (bridge.sonic.game and usenexus.org)
- IMPORTANT: Use plain text formatting only for Telegram - DO NOT use any markdown formatting
- DO NOT use asterisks (*) for bold or emphasis
- DO NOT use underscores (_) for italics
- DO NOT use square brackets and parentheses for links [text](url)
- Simply write URLs as plain text (e.g., "Check out https://faucet.sonic.game")
- For lists, use simple numbers or bullet points without any special formatting

Always be accurate in your responses. If you don't know something, admit it with a touch of humor rather than making up information.
`;

// Function to strip markdown formatting from text
function stripMarkdown(text: string): string {
  // Remove bold/italic formatting
  let cleaned = text.replace(/\*\*(.*?)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
  cleaned = cleaned.replace(/__(.*?)__/g, '$1');
  cleaned = cleaned.replace(/_(.*?)_/g, '$1');
  
  // Convert markdown links to plain text
  cleaned = cleaned.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
  
  return cleaned;
}

// Store conversation history for each user
const userSessions: Record<number, { messages: any[] }> = {};

// Welcome message
bot.start(async (ctx) => {
  // Reset session for this user
  const userId = ctx.from?.id;
  if (userId) {
    userSessions[userId] = { messages: [] };
  }
  
  const welcomeMessage = `
Hey there! I'm Sonic AI, your go-to expert on all things Sonic and SVM tech. 🚀

I can tell you about:
• HyperGrid - Solana's first concurrent scaling framework
• Sorada - lightning-fast data architecture (5ms reads!)
• Rush - composable gaming primitives on-chain
• Sega - the leading DEX and liquidity protocol on Sonic (https://sega.so/)

Need help with:
• Bridging funds (via bridge.sonic.game)
• Deploying programs on Sonic
• Finding resources like Explorer or Faucet
• Checking your wallet balance (use /balance <address> or just send your wallet address)
• Checking token prices (use /price <mint_address> or just send a token mint address)
• DeFi activities like swaps and liquidity provision
• Getting test tokens (use /faucet <address>)

What can I speed up for you today?
`;
  
  await ctx.reply(welcomeMessage);
});

// Help command
bot.help((ctx) => {
  ctx.reply(`
Here are some commands you can use:
/start - Start a new conversation
/help - Show this help message
/reset - Reset the conversation history
/balance <wallet_address> - Check the balance of a Sonic wallet
/price <token_mint_address> - Check the price of a token on Sonic
/faucet <wallet_address> - Request test tokens from the Sega faucet

You can also ask me about:
- Sonic's technologies (HyperGrid, Sorada, Rush)
- Ecosystem projects like Sega DEX (https://sega.so/)
- How to bridge funds to Sonic
- How to deploy programs on Sonic
- DeFi activities like swaps and providing liquidity
- Token prices (just send a token mint address or ask "what's the price of token <mint_address>")

Just send me a message, and I'll do my best to help you!
  `);
});

// Reset command
bot.command('reset', (ctx) => {
  const userId = ctx.from?.id;
  if (userId) {
    userSessions[userId] = { messages: [] };
  }
  ctx.reply('Conversation history has been reset. What would you like to talk about?');
});

// Balance command
bot.command('balance', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('Please provide a wallet address. Usage: /balance <wallet_address>');
  }

  const address = args[1].trim();
  
  // Validate wallet address
  if (!isValidSonicAddress(address)) {
    return ctx.reply('Invalid wallet address format. Please provide a valid Sonic wallet address.');
  }
  
  // Show typing indicator
  await ctx.sendChatAction('typing');
  
  try {
    // Get wallet balance
    const balance = await getSonicWalletBalance(address);
    
    // Format and send the balance
    const formattedBalance = formatWalletBalance(balance);
    await ctx.reply(`Wallet: ${address.slice(0, 6)}...${address.slice(-4)}\n\n${formattedBalance}`);
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    await ctx.reply('Sorry, there was an error fetching the wallet balance. Please try again later.');
  }
});

// Faucet command
bot.command('faucet', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('Please provide a wallet address. Usage: /faucet <wallet_address>');
  }

  const address = args[1].trim();
  
  // Validate wallet address
  if (!isValidSonicAddress(address)) {
    return ctx.reply('Invalid wallet address format. Please provide a valid Sonic wallet address.');
  }
  
  // Show typing indicator
  await ctx.sendChatAction('typing');
  
  try {
    // Request tokens from the faucet
    const faucetResponse = await requestFaucetTokens(address);
    
    // Format and send the response
    let formattedResponse = '';
    if (faucetResponse.success) {
      formattedResponse = `Success! 🎉 Tokens have been sent to your wallet: ${address.slice(0, 6)}...${address.slice(-4)}`;
    } else {
      // Use the message directly without "Error:" prefix
      formattedResponse = faucetResponse.message || faucetResponse.error || 'Unknown error occurred';
    }
    
    await ctx.reply(formattedResponse);
  } catch (error) {
    console.error('Error requesting faucet tokens:', error);
    await ctx.reply('Sorry, there was an error connecting to the faucet service. Please try again later.');
  }
});

// Price command
bot.command('price', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('Please provide a token mint address. Usage: /price <token_mint_address>');
  }

  const mint = args[1].trim();
  
  // Validate token mint address
  if (!isValidTokenMint(mint)) {
    return ctx.reply('Invalid token mint address format. Please provide a valid token mint address.');
  }
  
  // Show typing indicator
  await ctx.sendChatAction('typing');
  
  try {
    // Get token price
    const priceResponse = await getTokenPrices([mint]);
    
    // Format and send the price
    const formattedPrice = formatTokenPrices(priceResponse, [mint]);
    await ctx.reply(formattedPrice);
  } catch (error) {
    console.error('Error fetching token price:', error);
    await ctx.reply('Sorry, there was an error fetching the token price. Please try again later.');
  }
});

// Handle text messages
bot.on(message('text'), async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  // Initialize session if it doesn't exist
  if (!userSessions[userId]) {
    userSessions[userId] = { messages: [] };
  }
  
  const userMessage = ctx.message.text;
  
  // Check if the message is a wallet address (direct address)
  if (isValidSonicAddress(userMessage)) {
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    try {
      // Get wallet balance
      const balance = await getSonicWalletBalance(userMessage);
      
      // Format and send the balance
      const formattedBalance = formatWalletBalance(balance);
      await ctx.reply(`Wallet: ${userMessage.slice(0, 6)}...${userMessage.slice(-4)}\n\n${formattedBalance}`);
      return;
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      await ctx.reply('Sorry, there was an error fetching the wallet balance. Please try again later.');
      return;
    }
  }
  
  // Check if the message is a token mint address (direct address)
  if (isValidTokenMint(userMessage)) {
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    try {
      // Get token price
      const priceResponse = await getTokenPrices([userMessage]);
      
      // Format and send the price
      const formattedPrice = formatTokenPrices(priceResponse, [userMessage]);
      await ctx.reply(formattedPrice);
      return;
    } catch (error) {
      console.error('Error fetching token price:', error);
      await ctx.reply('Sorry, there was an error fetching the token price. Please try again later.');
      return;
    }
  }
  
  // Check if the message is asking to check a wallet balance
  const walletCheckRegex = /(?:check|view|show|get|what(?:'|')?s|what is).*(?:wallet|balance|account).*?([\w\d]{32,44})/i;
  const walletMatch = userMessage.match(walletCheckRegex);
  
  if (walletMatch && walletMatch[1]) {
    const address = walletMatch[1].trim();
    
    // Validate wallet address
    if (isValidSonicAddress(address)) {
      // Show typing indicator
      await ctx.sendChatAction('typing');
      
      try {
        // Get wallet balance
        const balance = await getSonicWalletBalance(address);
        
        // Format and send the balance
        const formattedBalance = formatWalletBalance(balance);
        await ctx.reply(`Wallet: ${address.slice(0, 6)}...${address.slice(-4)}\n\n${formattedBalance}`);
        return;
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        await ctx.reply('Sorry, there was an error fetching the wallet balance. Please try again later.');
        return;
      }
    }
  }
  
  // Check if the message is asking for token price
  const tokenPriceRegex = /(?:price|cost|value|worth|how much).*(?:token|mint|coin).*?([\w\d]{32,44})/i;
  const tokenPriceMatch = userMessage.match(tokenPriceRegex);
  
  if (tokenPriceMatch && tokenPriceMatch[1]) {
    const mint = tokenPriceMatch[1].trim();
    
    // Validate token mint address
    if (isValidTokenMint(mint)) {
      // Show typing indicator
      await ctx.sendChatAction('typing');
      
      try {
        // Get token price
        const priceResponse = await getTokenPrices([mint]);
        
        // Format and send the price
        const formattedPrice = formatTokenPrices(priceResponse, [mint]);
        await ctx.reply(formattedPrice);
        return;
      } catch (error) {
        console.error('Error fetching token price:', error);
        await ctx.reply('Sorry, there was an error fetching the token price. Please try again later.');
        return;
      }
    }
  }
  
  // Add user message to session
  userSessions[userId].messages.push({
    role: 'user',
    content: userMessage,
  });
  
  // Show typing indicator
  await ctx.sendChatAction('typing');
  
  try {
    // Ensure the system prompt is included
    const fullMessages = [
      { role: 'system', content: SONIC_AI_SYSTEM_PROMPT },
      ...userSessions[userId].messages.filter(msg => msg.role !== 'system')
    ];
    
    // Create a streaming response
    const stream = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: fullMessages as any,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    let sentMessage: any = null;
    let accumulatedResponse = '';
    let lastUpdateTime = Date.now();
    const updateInterval = 1000; // Update message every 1 second

    // Process the stream
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        accumulatedResponse += content;
        
        // Update the message periodically to show streaming effect
        const currentTime = Date.now();
        if (!sentMessage || (currentTime - lastUpdateTime > updateInterval)) {
          // Keep showing typing indicator between updates
          await ctx.sendChatAction('typing');
          
          // Strip any markdown formatting from the response
          const cleanedResponse = stripMarkdown(accumulatedResponse);
          
          if (sentMessage) {
            // Update existing message with plain text
            try {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                sentMessage.message_id,
                undefined,
                cleanedResponse,
                { 
                  link_preview_options: { is_disabled: true }
                }
              );
            } catch (error: any) {
              // If message is too long or hasn't changed (Telegram API limitation)
              console.log('Edit message error (expected):', error.message);
            }
          } else {
            // Send first message with plain text
            sentMessage = await ctx.reply(cleanedResponse, {
              link_preview_options: { is_disabled: true }
            });
          }
          
          lastUpdateTime = currentTime;
        }
      }
    }
    
    // Ensure final message is sent/updated
    if (accumulatedResponse) {
      // Strip any markdown formatting from the final response
      const cleanedResponse = stripMarkdown(accumulatedResponse);
      
      if (sentMessage) {
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            sentMessage.message_id,
            undefined,
            cleanedResponse,
            { 
              link_preview_options: { is_disabled: true }
            }
          );
        } catch (error: any) {
          // If message is too long or hasn't changed
          console.log('Final edit message error (expected):', error.message);
        }
      } else {
        await ctx.reply(cleanedResponse, {
          link_preview_options: { is_disabled: true }
        });
      }
      
      // Add AI response to session
      userSessions[userId].messages.push({
        role: 'assistant',
        content: accumulatedResponse,
      });
    }
  } catch (error: any) {
    console.error('Error generating response:', error);
    await ctx.reply('Sorry, I encountered an error. Please try again later.');
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('An error occurred while processing your request. Please try again later.');
});

// Start the bot
console.log('Starting Telegram bot...');
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 