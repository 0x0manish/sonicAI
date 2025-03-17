import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { getSonicWalletBalance, formatWalletBalance, isValidSonicAddress } from '../lib/wallet-utils';
import { requestFaucetTokens } from '../lib/faucet-utils';
import { getTokenPrices, formatTokenPrices, isValidTokenMint, getTokenDetails, formatTokenDetails } from '../lib/token-utils';
import { getSonicStats, formatSonicStats } from '../lib/stats-utils';
import { initializeAgentWallet, getAgentWallet, isAgentWalletInitialized } from '../lib/agent-wallet';
import { AGENT_WALLET_CONFIG, validateWalletConfig, updateWalletConfigFromEnv } from '../lib/wallet-config';
import { getLiquidityPoolById, formatLiquidityPoolInfo, isValidPoolId, getLiquidityPools, formatLiquidityPoolList } from '../lib/liquidity-pool-utils';
import { computeSwap, isValidMintAddress, SOL_MINT, solToLamports, lamportsToSol, formatSwapComputation, hasWalletSufficientBalance } from '../lib/swap-utils';

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

// Log environment variables for debugging (without showing full private key)
console.log('Environment variables loaded:');
console.log('- TELEGRAM_BOT_TOKEN:', TELEGRAM_BOT_TOKEN ? 'Set' : 'Not set');
console.log('- OPENAI_API_KEY:', OPENAI_API_KEY ? 'Set' : 'Not set');
console.log('- AGENT_WALLET_PRIVATE_KEY:', process.env.AGENT_WALLET_PRIVATE_KEY ? 
  `Set (starts with ${process.env.AGENT_WALLET_PRIVATE_KEY.substring(0, 4)}...)` : 'Not set');
console.log('- SONIC_RPC_URL:', process.env.SONIC_RPC_URL || 'Not set');
console.log('- SONIC_TESTNET_RPC_URL:', process.env.SONIC_TESTNET_RPC_URL || 'Not set');
console.log('- Current working directory:', process.cwd());

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

// Track wallet initialization status
let agentWalletInitialized = false;

// Initialize the bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

// Update wallet configuration from environment variables
// This must be done after environment variables are loaded
updateWalletConfigFromEnv();

// Initialize the agent wallet if configuration is valid
console.log('Checking wallet configuration...');
console.log('AGENT_WALLET_CONFIG:', {
  privateKeySet: !!AGENT_WALLET_CONFIG.privateKey,
  privateKeyLength: AGENT_WALLET_CONFIG.privateKey ? AGENT_WALLET_CONFIG.privateKey.length : 0,
  rpcUrl: AGENT_WALLET_CONFIG.rpcUrl,
  testnetRpcUrl: AGENT_WALLET_CONFIG.testnetRpcUrl
});

if (validateWalletConfig()) {
  console.log('Wallet configuration is valid, initializing agent wallet...');
  try {
    const wallet = initializeAgentWallet(AGENT_WALLET_CONFIG);
    agentWalletInitialized = wallet !== null;
    
    if (agentWalletInitialized && wallet !== null) {
      console.log('Agent wallet initialized successfully');
      console.log('Public key:', wallet.getPublicKey());
      
      // Check wallet balance
      wallet.getBalance()
        .then(balance => console.log('Mainnet balance:', balance, 'SOL'))
        .catch(err => console.error('Failed to get mainnet balance:', err));
      
      wallet.getTestnetBalance()
        .then(balance => console.log('Testnet balance:', balance, 'SOL'))
        .catch(err => console.error('Failed to get testnet balance:', err));
    } else {
      console.error('Failed to initialize agent wallet');
    }
  } catch (error) {
    console.error('Exception during wallet initialization:', error);
    agentWalletInitialized = false;
  }
} else {
  console.error('Wallet configuration is invalid, agent wallet will not be initialized');
}

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
- Users can check Sonic chain TVL and 24-hour volume stats by using the /stats command or by asking about stats
- Users can request me to send SOL from my wallet to any Sonic address using the /send command or by asking me to send SOL

IMPORTANT FUNCTIONALITY:
- This bot has built-in wallet balance checking capability
- When a user asks to check a wallet balance or sends a wallet address, DO NOT tell them to use an explorer
- Instead, the bot will automatically detect wallet addresses and check the balance for the user
- If a user asks "can you check wallet balance of [address]", the bot will automatically check it
- The bot uses RPC endpoints (https://rpc.mainnet-alpha.sonic.game/ and https://sonic.helius-rpc.com/) to fetch balances
- This bot also has built-in faucet functionality to request test tokens from the Sega faucet
- When a user asks for test tokens or to use the faucet, tell them to use the /faucet command with their wallet address
- If a user asks "can you send me test tokens to [address]", tell them to use the /faucet command
- This bot also has built-in transaction capability
- I have my own Sonic wallet and can send SOL to users
- When a user asks me to send SOL to an address (e.g., "send 0.1 SOL to [address]"), I can process the transaction
- The bot will automatically detect transaction requests and send SOL from my wallet to the specified address
- If a user asks "can you send 0.1 SOL to [address]", tell them you'll process the transaction for them
- Users can also use the /send command to send SOL (e.g., "/send 0.1 [address]")
- I will show my wallet address and current balance before sending a transaction
- I can only send SOL if my wallet has sufficient balance

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

// Update the user session interface
interface UserSession {
  messages: Array<{ role: string; content: string }>;
  lastSwapData?: any; // Add this property to fix the linter errors
}

// Initialize user sessions
const userSessions: Record<number, UserSession> = {};

// Improved regex for detecting wallet-related queries
const walletRegex = /(?:your|agent|bot|ai|do you have|what is your|what'?s your).*(?:wallet|address|balance|public key)|(?:testnet|mainnet|devnet).*(?:balance|wallet)|(?:wallet|balance)(?:\?|$)/i;

// Regex for detecting transaction requests
const transactionRegex = /(?:send|transfer|pay|tip).*?(?:sol|sonic)|(?:can you send sol)/i;

// Add a start command
bot.start(async (ctx) => {
  try {
    console.log('Start command received from user:', ctx.from?.id);
    
    // Reset session for this user
    const userId = ctx.from?.id;
    if (userId) {
      userSessions[userId] = { messages: [] };
      console.log('Reset session for user:', userId);
    }
    
    const welcomeMessage = `
*Welcome to the Sonic Agent Bot!* 🚀

I'm your assistant for interacting with the Sonic blockchain. Here's what I can do:

*Check Balances & Prices:*
- Check wallet balances with /wallet <address>
- Check token prices with /token <mint>
- View Sonic chain stats with /stats

*Liquidity Pools:*
- Get info about any pool with /pool <pool_id>
- List available pools with /pools
- Check the SOL-SONIC pool with /solsonic

*Transactions:*
- Request test tokens with /faucet <address>
- Send SOL with /send <amount> <address>

*Need Help?*
Type /help to see all available commands.

*Note:* For security reasons, transactions are only enabled on testnet.
`;

    console.log('Sending welcome message to user:', userId);
    await ctx.replyWithMarkdown(welcomeMessage);
    console.log('Welcome message sent successfully');
  } catch (error) {
    console.error('Error in start command handler:', error);
    // Send a plain text fallback message if Markdown fails
    try {
      await ctx.reply("Welcome to the Sonic Agent Bot! I'm having trouble displaying the full welcome message. Please type /help to see available commands.");
    } catch (fallbackError) {
      console.error('Error sending fallback message:', fallbackError);
    }
  }
});

// Add a token details command
bot.command('token-details', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('Please provide a token mint address. Usage: /token-details <token_mint_address>');
  }

  const mintAddress = args[1].trim();
  
  // Validate token mint address - but allow the specific SONIC token address
  const isSonicToken = mintAddress === 'mrujEYaN1oyQXDHeYNxBYpxWKVkQ2XsGxfznpifu4aL';
  if (!isValidTokenMint(mintAddress) && !isSonicToken) {
    return ctx.reply('Invalid token mint address format. Please provide a valid token mint address.');
  }
  
  // Show typing indicator
  await ctx.sendChatAction('typing');
  
  try {
    console.log(`Fetching token details for mint address: ${mintAddress}`);
    
    // Send an initial message to the user
    const initialMessage = await ctx.reply(`Fetching token details for ${mintAddress}...`);
    
    // Get token details
    const tokenResponse = await getTokenDetails(mintAddress);
    
    console.log(`Token details response for ${mintAddress}:`, 
      `success: ${tokenResponse.success}`, 
      `error: ${tokenResponse.error || 'none'}`,
      `data length: ${tokenResponse.data?.length || 0}`
    );
    
    // Format and send the details
    const formattedDetails = formatTokenDetails(tokenResponse);
    
    // Edit the initial message with the details
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      initialMessage.message_id,
      undefined,
      formattedDetails,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error fetching token details:', error);
    await ctx.reply(`Sorry, there was an error fetching the token details: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`);
  }
});

// Update the help message to include swap command
const helpMessage = `
*Sonic AI Bot Commands*

/start - Start a conversation with Sonic AI
/help - Show this help message
/reset - Reset the conversation history
/wallet <address> - Check a wallet's balance
/mywallet - Show the bot's wallet information
/token <mint> - Check a token's price
/token-details <mint> - Get detailed information about a token
/stats - Show Sonic DEX statistics
/faucet <address> - Request testnet tokens
/send <amount> <address> - Send testnet SOL to an address
/pool <pool_id> - Get information about a liquidity pool
/pools - List available liquidity pools
/solsonic - Show SOL-SONIC pool information
/swap <amount> <from_mint> <to_mint> - Compute a token swap

You can also ask me questions about Sonic, Solana, or crypto in general!
`;

// Add a help command handler for /help
bot.command('help', async (ctx) => {
  try {
    console.log('Help command received from user:', ctx.from?.id);
    await ctx.replyWithMarkdown(helpMessage);
    console.log('Help message sent successfully');
  } catch (error) {
    console.error('Error in help command handler:', error);
    // Send a plain text fallback message if Markdown fails
    try {
      await ctx.reply("Here are the available commands: /start, /help, /wallet, /token, /stats, /faucet, /send, /pool, /pools, /solsonic");
    } catch (fallbackError) {
      console.error('Error sending fallback help message:', fallbackError);
    }
  }
});

// Also handle the built-in help command
bot.help((ctx) => {
  try {
    console.log('Built-in help command received from user:', ctx.from?.id);
    ctx.replyWithMarkdown(helpMessage);
    console.log('Help message sent successfully');
  } catch (error) {
    console.error('Error in built-in help command handler:', error);
    // Send a plain text fallback message if Markdown fails
    try {
      ctx.reply("Here are the available commands: /start, /help, /wallet, /token, /stats, /faucet, /send, /pool, /pools, /solsonic");
    } catch (fallbackError) {
      console.error('Error sending fallback help message:', fallbackError);
    }
  }
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

// Stats command
bot.command('stats', async (ctx) => {
  // Show typing indicator
  await ctx.sendChatAction('typing');
  
  try {
    // Get Sonic chain stats
    const stats = await getSonicStats();
    
    // Format and send the stats
    const formattedStats = formatSonicStats(stats);
    await ctx.reply(formattedStats);
  } catch (error) {
    console.error('Error fetching Sonic chain stats:', error);
    await ctx.reply('Sorry, there was an error fetching Sonic chain stats. Please try again later.');
  }
});

// Transaction command
bot.command('send', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 3) {
    return ctx.reply('Please provide an amount and a recipient address. Usage: /send <amount> <recipient_address>');
  }

  const amount = parseFloat(args[1].trim());
  const recipient = args[2].trim();
  
  // Validate amount
  if (isNaN(amount) || amount <= 0) {
    return ctx.reply('Invalid amount. Please provide a positive number.');
  }
  
  // Validate recipient address
  if (!isValidSonicAddress(recipient)) {
    return ctx.reply('Invalid recipient address format. Please provide a valid Sonic wallet address.');
  }
  
  // Check if agent wallet is initialized
  const agentWallet = getAgentWallet();
  if (!agentWallet) {
    return ctx.reply('Sorry, the agent wallet is not properly configured. Transactions are currently unavailable.');
  }
  
  // Show typing indicator
  await ctx.sendChatAction('typing');
  
  try {
    // Get wallet information
    const balance = await agentWallet.getBalance();
    const networkInfo = agentWallet.getNetworkInfo();
    
    // Check if wallet has enough balance
    if (balance < amount) {
      return ctx.reply(`Insufficient balance. Current balance: ${balance.toFixed(4)} SOL`);
    }
    
    // Prevent sending on mainnet
    if (!networkInfo.isTestnet) {
      return ctx.reply(`For security reasons, I can only send SOL on testnet, not on mainnet. Current network: ${networkInfo.network}`);
    }
    
    // Show wallet info before sending transaction
    const walletInfoMessage = `🔑 My Wallet Information\n\n` +
      `Public Key: ${agentWallet.getPublicKey()}\n\n` +
      `Network: ${networkInfo.network}\n\n` +
      `Testnet Balance: ${balance.toFixed(4)} SOL\n\n` +
      `I'll send ${amount} SOL to ${recipient.slice(0, 6)}...${recipient.slice(-4)} from my wallet.`;
    await ctx.reply(walletInfoMessage);
    
    // Send transaction
    const result = await agentWallet.sendSol(recipient, amount);
    
    // Format and send the result
    if (!result.success) {
      await ctx.reply(`Sorry, the transaction failed. ${result.error}`);
    } else {
      const transactionMessage = `✅ Transaction Successful!\n\n` +
        `Amount: ${amount} SOL\n\n` +
        `Recipient: ${recipient}\n\n` +
        `Transaction ID: ${result.signature}\n\n` +
        `Network: ${networkInfo.network}`;
      await ctx.reply(transactionMessage);
    }
  } catch (error) {
    console.error('Error sending transaction:', error);
    await ctx.reply('Sorry, there was an error processing the transaction. Please try again later.');
  }
});

// Add a new command to show the agent's wallet information
bot.command('mywallet', async (ctx) => {
  // Log wallet status when command is called
  console.log('Wallet status when /mywallet called:', {
    initialized: agentWalletInitialized,
    available: isAgentWalletInitialized()
  });
  
  // Check if agent wallet is initialized
  if (!isAgentWalletInitialized()) {
    return ctx.reply('Sorry, my wallet is not properly configured. Please try again later.');
  }
  
  // Show typing indicator
  await ctx.sendChatAction('typing');
  
  try {
    // Get wallet instance
    const agentWallet = getAgentWallet();
    if (!agentWallet) {
      return ctx.reply('Sorry, my wallet is not properly configured. Please try again later.');
    }
    
    // Get wallet information
    const publicKey = agentWallet.getPublicKey();
    const balance = await agentWallet.getBalance();
    const testnetBalance = await agentWallet.getTestnetBalance();
    const networkInfo = agentWallet.getNetworkInfo();
    
    // Format and send the wallet information
    let walletInfo = `🔑 My Wallet Information\n\n`;
    walletInfo += `Public Key: ${publicKey}\n\n`;
    walletInfo += `Network: ${networkInfo.network}\n\n`;
    walletInfo += `Mainnet Balance: ${balance.toFixed(4)} SOL\n\n`;
    
    if (testnetBalance !== null) {
      walletInfo += `Testnet Balance: ${testnetBalance.toFixed(4)} SOL\n\n`;
    }
    
    walletInfo += `Note: For security reasons, I can only send SOL on testnet, not on mainnet.`;
    
    await ctx.reply(walletInfo);
  } catch (error) {
    console.error('Error getting agent wallet information:', error);
    await ctx.reply('Sorry, there was an error getting my wallet information. Please try again later.');
  }
});

// Command to show the agent's wallet information
bot.command('wallet', async (ctx) => {
  console.log('Wallet command received');
  console.log('Wallet initialized:', agentWalletInitialized);
  
  if (!agentWalletInitialized) {
    return ctx.reply('Sorry, my wallet is not properly configured. Please try again later.');
  }
  
  const wallet = getAgentWallet();
  if (!wallet) {
    console.error('Wallet is null despite being marked as initialized');
    agentWalletInitialized = false;
    return ctx.reply('Sorry, there was an error accessing my wallet. Please try again later.');
  }
  
  try {
    const publicKey = wallet.getPublicKey();
    const networkInfo = wallet.getNetworkInfo();
    const mainnetBalance = await wallet.getBalance();
    const testnetBalance = await wallet.getTestnetBalance();
    
    let message = `🔑 My Wallet Information\n\n`;
    message += `Public Key: ${publicKey}\n\n`;
    message += `Network: ${networkInfo.network}\n\n`;
    message += `Mainnet Balance: ${mainnetBalance.toFixed(4)} SOL\n\n`;
    
    if (testnetBalance !== null) {
      message += `Testnet Balance: ${testnetBalance.toFixed(4)} SOL\n\n`;
    }
    
    message += `Note: For security reasons, I can only send SOL on testnet, not on mainnet.`;
    
    return ctx.reply(message);
  } catch (error) {
    console.error('Error getting wallet information:', error);
    return ctx.reply('Sorry, there was an error retrieving my wallet information. Please try again later.');
  }
});

// Debug command to check wallet status
bot.command('walletstatus', async (ctx) => {
  console.log('Wallet status command received');
  
  // Check environment variables
  const privateKeySet = !!process.env.AGENT_WALLET_PRIVATE_KEY;
  const privateKeyLength = process.env.AGENT_WALLET_PRIVATE_KEY ? process.env.AGENT_WALLET_PRIVATE_KEY.length : 0;
  
  // Check wallet config
  const configPrivateKeySet = !!AGENT_WALLET_CONFIG.privateKey;
  const configPrivateKeyLength = AGENT_WALLET_CONFIG.privateKey ? AGENT_WALLET_CONFIG.privateKey.length : 0;
  
  // Check wallet initialization
  const walletInitialized = agentWalletInitialized;
  const walletAvailable = isAgentWalletInitialized();
  
  const statusMessage = `
Wallet Status Debug Info:

Environment Variables:
- AGENT_WALLET_PRIVATE_KEY: ${privateKeySet ? `Set (${privateKeyLength} chars)` : 'Not set'}
- SONIC_RPC_URL: ${process.env.SONIC_RPC_URL || 'Not set'}
- SONIC_TESTNET_RPC_URL: ${process.env.SONIC_TESTNET_RPC_URL || 'Not set'}

Wallet Configuration:
- privateKey: ${configPrivateKeySet ? `Set (${configPrivateKeyLength} chars)` : 'Not set'}
- rpcUrl: ${AGENT_WALLET_CONFIG.rpcUrl}
- testnetRpcUrl: ${AGENT_WALLET_CONFIG.testnetRpcUrl}

Wallet Status:
- agentWalletInitialized: ${walletInitialized}
- isAgentWalletInitialized(): ${walletAvailable}
`;
  
  return ctx.reply(statusMessage);
});

// Handle the /pool command
bot.command('pool', async (ctx) => {
  try {
    // Get the pool ID from the command arguments
    const poolId = ctx.message.text.split(' ')[1]?.trim();
    
    if (!poolId) {
      await ctx.reply('Please provide a valid pool ID. Usage: /pool <pool_id>');
      return;
    }
    
    if (!isValidPoolId(poolId)) {
      await ctx.reply('Invalid pool ID format. Please provide a valid Sega DEX pool ID.');
      return;
    }
    
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    // Fetch pool information
    console.log(`Fetching liquidity pool data for: ${poolId}`);
    const poolData = await getLiquidityPoolById(poolId);
    
    if (!poolData.success || !poolData.data) {
      console.error('Failed to fetch liquidity pool data:', poolData.error);
      await ctx.reply(`I couldn't find information for the liquidity pool with ID: ${poolId}. ${poolData.error || 'This pool may not exist or might not be available on Sega DEX.'}`);
      return;
    }
    
    // Format and send the pool information
    const formattedInfo = formatLiquidityPoolInfo(poolData);
    await ctx.reply(formattedInfo, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error handling /pool command:', error);
    await ctx.reply('Sorry, there was an error fetching the liquidity pool data. The service might be temporarily unavailable. Please try again later.');
  }
});

// Handle the /solsonic command
bot.command('solsonic', async (ctx) => {
  try {
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    // SOL-SONIC pool ID
    const poolId = 'DgMweMfMbmPFChTuAvTf4nriQDWpf9XX3g66kod9nsR4';
    
    // Fetch pool information
    console.log('Fetching SOL-SONIC liquidity pool data');
    const poolData = await getLiquidityPoolById(poolId);
    
    if (!poolData.success || !poolData.data) {
      console.error('Failed to fetch SOL-SONIC pool data:', poolData.error);
      await ctx.reply(`I couldn't find information for the SOL-SONIC liquidity pool. ${poolData.error || 'The service might be temporarily unavailable.'}`);
      return;
    }
    
    // Format and send the pool information
    const formattedInfo = formatLiquidityPoolInfo(poolData);
    await ctx.reply(formattedInfo, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error handling /solsonic command:', error);
    await ctx.reply('Sorry, there was an error fetching the SOL-SONIC liquidity pool data. The service might be temporarily unavailable. Please try again later.');
  }
});

// Handle the /pools command
bot.command('pools', async (ctx) => {
  try {
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    // Fetch liquidity pools
    console.log('Fetching liquidity pools from Sega API');
    const poolsData = await getLiquidityPools();
    
    if (!poolsData.success || !poolsData.data) {
      console.error('Failed to fetch liquidity pools:', poolsData.error);
      await ctx.reply(`I couldn't fetch the list of liquidity pools. ${poolsData.error || 'The service might be temporarily unavailable.'}`);
      return;
    }
    
    // Format and send the pools information
    const formattedInfo = formatLiquidityPoolList(poolsData);
    await ctx.reply(formattedInfo, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error handling /pools command:', error);
    await ctx.reply('Sorry, there was an error fetching the liquidity pools. The service might be temporarily unavailable. Please try again later.');
  }
});

// Handle messages asking for a list of pools
bot.hears(/(?:list|show|get|display).*?(?:liquidity pools|pools|lps)/i, async (ctx) => {
  try {
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    // Fetch liquidity pools with fixed values
    console.log('Fetching liquidity pools from Sega API');
    const poolsData = await getLiquidityPools();
    
    if (!poolsData.success || !poolsData.data) {
      console.error('Failed to fetch liquidity pools:', poolsData.error);
      await ctx.reply(`I couldn't fetch the list of liquidity pools. ${poolsData.error || 'The service might be temporarily unavailable.'}`);
      return;
    }
    
    // Format and send the pools information
    const formattedInfo = formatLiquidityPoolList(poolsData);
    await ctx.reply(formattedInfo, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error handling pools list message:', error);
    await ctx.reply('Sorry, there was an error fetching the liquidity pools. The service might be temporarily unavailable. Please try again later.');
  }
});

// Update the message handler to handle swap requests
bot.on(message('text'), async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  // Initialize session if it doesn't exist
  if (!userSessions[userId]) {
    userSessions[userId] = { messages: [] };
  }
  
  const userMessage = ctx.message.text;
  
  // Check if the message is confirming a swap
  const confirmSwapRegex = /^(?:yes|confirm|execute|proceed|do it|swap it|go ahead)$/i;
  if (confirmSwapRegex.test(userMessage.trim()) && userSessions[userId].lastSwapData) {
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    try {
      // Get the last swap data
      const lastSwapData = userSessions[userId].lastSwapData;
      
      // Send a message that we're checking the balance
      await ctx.reply('Checking your balance before executing the swap...');
      
      // Update wallet configuration from environment variables
      updateWalletConfigFromEnv();
      
      // Validate wallet configuration
      if (!validateWalletConfig()) {
        console.error('Agent wallet configuration is invalid');
        await ctx.reply('Sorry, my wallet is not properly configured. Please check with the administrator.');
        // Clear the swap data
        delete userSessions[userId].lastSwapData;
        return;
      }
      
      // Explicitly initialize the wallet if it's not already initialized
      let agentWallet = getAgentWallet();
      if (!agentWallet) {
        console.log('Agent wallet not initialized, initializing now...');
        agentWallet = initializeAgentWallet(AGENT_WALLET_CONFIG);
        
        if (!agentWallet) {
          console.error('Failed to initialize agent wallet, configuration may be invalid');
          await ctx.reply('Sorry, I could not initialize my wallet. Please check with the administrator.');
          // Clear the swap data
          delete userSessions[userId].lastSwapData;
          return;
        }
        
        console.log('Agent wallet initialized successfully');
      }
      
      try {
        const walletAddress = agentWallet.getPublicKey();
        console.log('Using agent wallet address:', walletAddress);
        
        // Check if wallet has sufficient balance
        const balanceCheck = await hasWalletSufficientBalance(
          walletAddress,
          lastSwapData.inputMint,
          Number(lastSwapData.inputAmount)
        );
        
        if (!balanceCheck.sufficient) {
          // Format the error message to be more user-friendly
          let errorMessage = `Insufficient balance: ${balanceCheck.error}`;
          
          if (balanceCheck.error && balanceCheck.error.includes('Insufficient SOL balance')) {
            // Extract the required and available amounts for a more readable message
            const match = balanceCheck.error.match(/Required: ([\d.]+) SOL, Available: ([\d.]+) SOL/);
            if (match) {
              const required = match[1];
              const available = match[2];
              errorMessage = `You don't have enough SOL for this swap. You need ${required} SOL but only have ${available} SOL available.`;
            }
          }
          
          await ctx.reply(errorMessage);
          // Clear the swap data
          delete userSessions[userId].lastSwapData;
          return;
        }
        
        // If balance check passes, show a message that swap execution is not implemented yet
        await ctx.reply('Balance check passed! You have sufficient funds for this swap.\n\nSwap execution is not implemented yet. In a production environment, this would execute the swap transaction on the blockchain.');
        
        // Clear the swap data
        delete userSessions[userId].lastSwapData;
        return;
      } catch (walletError) {
        console.error('Error getting agent wallet public key or checking balance:', walletError);
        await ctx.reply('Sorry, there was an error with my wallet. Please try again later.');
        // Clear the swap data
        delete userSessions[userId].lastSwapData;
        return;
      }
    } catch (error) {
      console.error('Error executing swap:', error);
      await ctx.reply(`Error: ${error instanceof Error ? error.message : 'An error occurred while executing the swap'}`);
      // Clear the swap data
      delete userSessions[userId].lastSwapData;
      return;
    }
  }
  
  // Check if the message is canceling a swap
  const cancelSwapRegex = /^(?:no|cancel|stop|abort|don't|do not)$/i;
  if (cancelSwapRegex.test(userMessage.trim()) && userSessions[userId].lastSwapData) {
    // Clear the swap data
    delete userSessions[userId].lastSwapData;
    await ctx.reply('Swap canceled.');
    return;
  }
  
  // Check if the message is a swap request
  const swapRegex = /(?:swap|exchange|trade|convert)\s+(\d+(?:\.\d+)?)\s+(?:sol|sonic|usdc|token)\s+(?:to|for)\s+([\w\d]{32,44})/i;
  const swapMatch = userMessage.match(swapRegex);
  
  if (swapMatch && swapMatch[1] && swapMatch[2]) {
    const amount = parseFloat(swapMatch[1]);
    const outputMint = swapMatch[2];
    
    // Validate output mint
    if (isValidMintAddress(outputMint)) {
      // Show typing indicator
      await ctx.sendChatAction('typing');
      
      try {
        // Convert amount to lamports if input is SOL
        let amountToUse = amount;
        if (amount < 1_000_000) {
          amountToUse = solToLamports(amount);
        }
        
        // Compute the swap
        const swapResult = await computeSwap({
          inputMint: SOL_MINT, // Assume input is SOL for now
          outputMint,
          amount: amountToUse,
          slippageBps: 50 // Default slippage of 0.5%
        });
        
        // Format and send the swap details
        const formattedSwap = formatSwapComputation(swapResult);
        
        // Store the swap data in the user's session
        if (swapResult.success && swapResult.data) {
          userSessions[userId].lastSwapData = swapResult.data;
          
          // Add a prompt to execute the swap
          const message = `${formattedSwap}\n\nWould you like to execute this swap? Reply with "yes" to proceed or "no" to cancel.`;
          await ctx.reply(message);
        } else {
          await ctx.reply(formattedSwap);
        }
        return;
      } catch (error) {
        console.error('Error computing swap:', error);
        await ctx.reply(`Error: ${error instanceof Error ? error.message : 'An error occurred while computing the swap'}`);
        return;
      }
    }
  }
  
  // Check if the message is a swap request with two token addresses
  const swapTokensRegex = /(?:swap|exchange|trade|convert)\s+(\d+(?:\.\d+)?)\s+([\w\d]{32,44})\s+(?:to|for)\s+([\w\d]{32,44})/i;
  const swapTokensMatch = userMessage.match(swapTokensRegex);
  
  if (swapTokensMatch && swapTokensMatch[1] && swapTokensMatch[2] && swapTokensMatch[3]) {
    const amount = parseFloat(swapTokensMatch[1]);
    const inputMint = swapTokensMatch[2];
    const outputMint = swapTokensMatch[3];
    
    // Validate mint addresses
    if (isValidMintAddress(inputMint) && isValidMintAddress(outputMint)) {
      // Show typing indicator
      await ctx.sendChatAction('typing');
      
      try {
        // Convert amount to lamports if input is SOL
        let amountToUse = amount;
        if (inputMint === SOL_MINT && amount < 1_000_000) {
          amountToUse = solToLamports(amount);
        }
        
        // Compute the swap
        const swapResult = await computeSwap({
          inputMint,
          outputMint,
          amount: amountToUse,
          slippageBps: 50 // Default slippage of 0.5%
        });
        
        // Format and send the swap details
        const formattedSwap = formatSwapComputation(swapResult);
        
        // Store the swap data in the user's session
        if (swapResult.success && swapResult.data) {
          userSessions[userId].lastSwapData = swapResult.data;
          
          // Add a prompt to execute the swap
          const message = `${formattedSwap}\n\nWould you like to execute this swap? Reply with "yes" to proceed or "no" to cancel.`;
          await ctx.reply(message);
        } else {
          await ctx.reply(formattedSwap);
        }
        return;
      } catch (error) {
        console.error('Error computing swap:', error);
        await ctx.reply(`Error: ${error instanceof Error ? error.message : 'An error occurred while computing the swap'}`);
        return;
      }
    }
  }
  
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
  if (isValidTokenMint(userMessage) || userMessage === 'mrujEYaN1oyQXDHeYNxBYpxWKVkQ2XsGxfznpifu4aL') {
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    try {
      // First, try to get token details
      console.log('Fetching token details for direct mint address:', userMessage);
      
      // Send an initial message
      const initialMessage = await ctx.reply(`I found a token mint address. Fetching information...`);
      
      // Get token details
      const tokenResponse = await getTokenDetails(userMessage);
      
      // If successful, show token details
      if (tokenResponse.success && tokenResponse.data && tokenResponse.data.length > 0) {
        const formattedDetails = formatTokenDetails(tokenResponse);
        
        // Now also fetch the price
        try {
          const priceResponse = await getTokenPrices([userMessage]);
          
          // If price is available, append it to the details
          if (priceResponse.success && Object.keys(priceResponse.prices).length > 0) {
            const price = priceResponse.prices[userMessage];
            const token = tokenResponse.data[0];
            
            // Format the combined response
            let combinedResponse = formattedDetails;
            combinedResponse += `\n\n**Current Price:** $${Number(price).toFixed(4)} USD`;
            
            // Edit the initial message with the combined response
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              initialMessage.message_id,
              undefined,
              combinedResponse,
              { parse_mode: 'Markdown' }
            );
          } else {
            // Just show the details if price is not available
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              initialMessage.message_id,
              undefined,
              formattedDetails + "\n\n*Price information is not available for this token.*",
              { parse_mode: 'Markdown' }
            );
          }
        } catch (priceError) {
          console.error('Error fetching token price:', priceError);
          
          // Just show the details if there's an error getting the price
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            initialMessage.message_id,
            undefined,
            formattedDetails + "\n\n*Price information is not available for this token.*",
            { parse_mode: 'Markdown' }
          );
        }
      } else {
        // If token details failed, try to get just the price
        try {
          const priceResponse = await getTokenPrices([userMessage]);
          
          if (priceResponse.success && Object.keys(priceResponse.prices).length > 0) {
            const formattedPrice = formatTokenPrices(priceResponse, [userMessage]);
            
            // Edit the initial message with the price
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              initialMessage.message_id,
              undefined,
              formattedPrice,
              { parse_mode: 'Markdown' }
            );
          } else {
            // Neither details nor price available
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              initialMessage.message_id,
              undefined,
              `I couldn't find any information for the token with mint address ${userMessage}.`,
              { parse_mode: 'Markdown' }
            );
          }
        } catch (priceError) {
          console.error('Error fetching token price:', priceError);
          
          // Neither details nor price available due to error
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            initialMessage.message_id,
            undefined,
            `I couldn't find any information for the token with mint address ${userMessage}. The service might be temporarily unavailable.`,
            { parse_mode: 'Markdown' }
          );
        }
      }
      
      return;
    } catch (error) {
      console.error('Error handling token mint address:', error);
      await ctx.reply(`Error: ${error instanceof Error ? error.message : 'An error occurred while fetching token information'}`);
      return;
    }
  }
});

// Handle messages asking about the SOL-SONIC pool
bot.hears(/(?:sol[\s-]sonic|wsol[\s-]sonic).*?(?:pool|lp|liquidity|pair)/i, async (ctx) => {
  try {
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    // SOL-SONIC pool ID
    const poolId = 'DgMweMfMbmPFChTuAvTf4nriQDWpf9XX3g66kod9nsR4';
    
    // Fetch pool information
    console.log('Fetching SOL-SONIC liquidity pool data');
    const poolData = await getLiquidityPoolById(poolId);
    
    if (!poolData.success || !poolData.data) {
      console.error('Failed to fetch SOL-SONIC pool data:', poolData.error);
      await ctx.reply(`I couldn't find information for the SOL-SONIC liquidity pool. ${poolData.error || 'The service might be temporarily unavailable.'}`);
      return;
    }
    
    // Format and send the pool information
    const formattedInfo = formatLiquidityPoolInfo(poolData);
    await ctx.reply(formattedInfo, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error handling SOL-SONIC pool message:', error);
    await ctx.reply('Sorry, there was an error fetching the SOL-SONIC liquidity pool data. The service might be temporarily unavailable. Please try again later.');
  }
});

// Add a swap command
bot.command('swap', async (ctx) => {
  const args = ctx.message.text.split(' ');
  
  // Check if we have enough arguments
  if (args.length < 4) {
    return ctx.reply('Please provide the amount, input mint, and output mint. Usage: /swap <amount> <from_mint> <to_mint>');
  }
  
  const amount = parseFloat(args[1]);
  const inputMint = args[2].trim();
  const outputMint = args[3].trim();
  
  // Validate amount
  if (isNaN(amount) || amount <= 0) {
    return ctx.reply('Please provide a valid amount greater than 0.');
  }
  
  // Validate mint addresses
  if (!isValidMintAddress(inputMint)) {
    return ctx.reply('Invalid input mint address. Please provide a valid Solana token mint address.');
  }
  
  if (!isValidMintAddress(outputMint)) {
    return ctx.reply('Invalid output mint address. Please provide a valid Solana token mint address.');
  }
  
  // Show typing indicator
  await ctx.sendChatAction('typing');
  
  try {
    // Convert amount to lamports if input is SOL
    let amountToUse = amount;
    if (inputMint === SOL_MINT && amount < 1_000_000) {
      amountToUse = solToLamports(amount);
    }
    
    // Compute the swap
    const swapResult = await computeSwap({
      inputMint,
      outputMint,
      amount: amountToUse,
      slippageBps: 50 // Default slippage of 0.5%
    });
    
    // Format and send the swap details
    const formattedSwap = formatSwapComputation(swapResult);
    
    // Store the swap data in the user's session
    if (swapResult.success && swapResult.data) {
      const userId = ctx.from?.id;
      if (userId) {
        if (!userSessions[userId]) {
          userSessions[userId] = { messages: [] };
        }
        userSessions[userId].lastSwapData = swapResult.data;
      }
      
      // Add a prompt to execute the swap
      const message = `${formattedSwap}\n\nWould you like to execute this swap? Reply with "yes" to proceed or "no" to cancel.`;
      await ctx.reply(message);
    } else {
      await ctx.reply(formattedSwap);
    }
  } catch (error) {
    console.error('Error computing swap:', error);
    await ctx.reply(`Error: ${error instanceof Error ? error.message : 'An error occurred while computing the swap'}`);
  }
}); 