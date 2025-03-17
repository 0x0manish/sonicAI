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

// Store conversation history for each user
const userSessions: Record<number, { messages: any[] }> = {};

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
  
  // Validate token mint address
  if (!isValidTokenMint(mintAddress)) {
    return ctx.reply('Invalid token mint address format. Please provide a valid token mint address.');
  }
  
  // Show typing indicator
  await ctx.sendChatAction('typing');
  
  try {
    // Get token details
    const tokenResponse = await getTokenDetails(mintAddress);
    
    // Format and send the details
    const formattedDetails = formatTokenDetails(tokenResponse);
    await ctx.replyWithMarkdown(formattedDetails);
  } catch (error) {
    console.error('Error fetching token details:', error);
    await ctx.reply('Sorry, there was an error fetching the token details. Please try again later.');
  }
});

// Define the help message
const helpMessage = `
*Sonic Agent Bot Commands*

*Basic Commands:*
/start - Start the bot and see welcome message
/help - Show this help message
/wallet <address> - Check wallet balance
/token <mint> - Check token price
/token-details <mint> - Get detailed information about a token
/stats - Show Sonic chain statistics
/faucet <address> - Request test tokens from faucet
/send <amount> <address> - Send SOL to an address
/pool <pool_id> - Show information about a specific liquidity pool
/pools - List available liquidity pools
/solsonic - Show information about the SOL-SONIC liquidity pool

*You can also ask me about:*
- Wallet balances: "What's the balance of <address>?"
- Token prices: "What's the price of <mint>?"
- Token details: "Show me details for token <mint>"
- Chain statistics: "Show me the Sonic chain stats"
- Test tokens: "Send test tokens to <address>"
- Sending SOL: "Send 0.1 SOL to <address>"
- Liquidity pools: "Show me info about pool <pool_id>"
- SOL-SONIC pool: "What's the SOL-SONIC pool info?"
- List of pools: "Show me available liquidity pools"

*Note:* For security reasons, transactions are only enabled on testnet.
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
      // Check if the message is asking for token details
      const isDetailsQuery = /(?:details|info|information|data)/i.test(ctx.message.text);
      
      if (isDetailsQuery) {
        // Get token details
        const tokenResponse = await getTokenDetails(userMessage);
        
        // Format and send the details
        const formattedDetails = formatTokenDetails(tokenResponse);
        await ctx.replyWithMarkdown(formattedDetails);
      } else {
        // Get token price
        const priceResponse = await getTokenPrices([userMessage]);
        
        // Format and send the price
        const formattedPrice = formatTokenPrices(priceResponse, [userMessage]);
        await ctx.reply(formattedPrice);
      }
      return;
    } catch (error) {
      console.error('Error fetching token information:', error);
      await ctx.reply('Sorry, there was an error fetching the token information. Please try again later.');
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
  
  // Check if the message is asking for token details
  const tokenDetailsRegex = /(?:show|get|display|what(?:'|')?s|what is|tell me about).*?(?:token|mint).*?(?:details|info|information|data).*?([\w\d]{32,44})|(?:details|info|information|data).*?(?:for|about).*?(?:token|mint).*?([\w\d]{32,44})|(?:token|mint).*?([\w\d]{32,44}).*?(?:details|info|information|data)/i;
  const tokenDetailsMatch = userMessage.match(tokenDetailsRegex);
  
  if (tokenDetailsMatch) {
    // Get the mint address from any of the capture groups
    const mintAddress = (tokenDetailsMatch[1] || tokenDetailsMatch[2] || tokenDetailsMatch[3] || '').trim();
    
    // Validate mint address
    if (mintAddress && isValidTokenMint(mintAddress)) {
      // Show typing indicator
      await ctx.sendChatAction('typing');
      
      try {
        console.log('Fetching token details for:', mintAddress);
        // Get token details
        const tokenResponse = await getTokenDetails(mintAddress);
        
        // Format and send the details
        const formattedDetails = formatTokenDetails(tokenResponse);
        await ctx.replyWithMarkdown(formattedDetails);
        return;
      } catch (error) {
        console.error('Error fetching token details:', error);
        await ctx.reply('Sorry, there was an error fetching the token details. Please try again later.');
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
  
  // Check if the message is asking for Sonic chain stats
  const statsRegex = /(?:stats|statistics|tvl|volume|locked value|total value|chain stats)/i;
  if (statsRegex.test(userMessage)) {
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    try {
      // Get Sonic chain stats
      const stats = await getSonicStats();
      
      // Format and send the stats
      const formattedStats = formatSonicStats(stats);
      await ctx.reply(formattedStats);
      return;
    } catch (error) {
      console.error('Error fetching Sonic chain stats:', error);
      await ctx.reply('Sorry, there was an error fetching Sonic chain stats. Please try again later.');
      return;
    }
  }
  
  // Check if the message is asking for the agent's wallet info
  // Log the message and regex match for debugging
  console.log('Message:', userMessage);
  console.log('Matches wallet regex:', walletRegex.test(userMessage));
  console.log('Wallet status:', {
    initialized: agentWalletInitialized,
    available: isAgentWalletInitialized()
  });
  
  if (walletRegex.test(userMessage)) {
    console.log('Wallet-related query detected');
    
    // Check if agent wallet is initialized
    if (!agentWalletInitialized) {
      console.log('Wallet not initialized, sending error message');
      return ctx.reply('Sorry, my wallet is not properly configured. Please try again later.');
    }
    
    const wallet = getAgentWallet();
    if (!wallet) {
      console.error('Wallet is null despite being marked as initialized');
      agentWalletInitialized = false;
      return ctx.reply('Sorry, there was an error accessing my wallet. Please try again later.');
    }
    
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    try {
      const publicKey = wallet.getPublicKey();
      const networkInfo = wallet.getNetworkInfo();
      const mainnetBalance = await wallet.getBalance();
      const testnetBalance = await wallet.getTestnetBalance();
      
      // Check if asking specifically about testnet/devnet balance
      const isTestnetQuery = /(?:testnet|devnet).*(?:balance|wallet)/i.test(userMessage);
      const isMainnetQuery = /(?:mainnet).*(?:balance|wallet)/i.test(userMessage);
      const isAddressQuery = /(?:address|public key)/i.test(userMessage);
      
      if (isTestnetQuery) {
        // Just show testnet balance
        let message = `🔑 My Wallet Information\n\n`;
        message += `Public Key: ${publicKey}\n\n`;
        message += `Network: ${networkInfo.network}\n\n`;
        
        if (testnetBalance !== null) {
          message += `Testnet Balance: ${testnetBalance.toFixed(4)} SOL\n\n`;
        } else {
          message += `Testnet Balance: Unable to retrieve\n\n`;
        }
        
        message += `Note: For security reasons, I can only send SOL on testnet, not on mainnet.`;
        await ctx.reply(message);
      } else if (isMainnetQuery) {
        // Just show mainnet balance
        let message = `🔑 My Wallet Information\n\n`;
        message += `Public Key: ${publicKey}\n\n`;
        message += `Network: ${networkInfo.network}\n\n`;
        message += `Mainnet Balance: ${mainnetBalance.toFixed(4)} SOL\n\n`;
        message += `Note: For security reasons, I can only send SOL on testnet, not on mainnet.`;
        await ctx.reply(message);
      } else if (isAddressQuery) {
        // Just show wallet address
        let message = `🔑 My Wallet Information\n\n`;
        message += `Public Key: ${publicKey}\n\n`;
        message += `Network: ${networkInfo.network}\n\n`;
        message += `Note: For security reasons, I can only send SOL on testnet, not on mainnet.`;
        await ctx.reply(message);
      } else {
        // Format and send the full wallet information
        let message = `🔑 My Wallet Information\n\n`;
        message += `Public Key: ${publicKey}\n\n`;
        message += `Network: ${networkInfo.network}\n\n`;
        message += `Mainnet Balance: ${mainnetBalance.toFixed(4)} SOL\n\n`;
        
        if (testnetBalance !== null) {
          message += `Testnet Balance: ${testnetBalance.toFixed(4)} SOL\n\n`;
        }
        
        message += `Note: For security reasons, I can only send SOL on testnet, not on mainnet.`;
        
        await ctx.reply(message);
      }
      return;
    } catch (error) {
      console.error('Error getting wallet information:', error);
      return ctx.reply('Sorry, there was an error retrieving my wallet information. Please try again later.');
    }
  }
  
  // Check if the message is a transaction request
  const specificTransactionRegex = /send\s+(\d+(\.\d+)?)\s+sol\s+to\s+([a-zA-Z0-9]{32,44})/i;
  const specificMatch = userMessage.match(specificTransactionRegex);
  
  if (specificMatch && specificMatch[1] && specificMatch[3]) {
    const amount = parseFloat(specificMatch[1].trim());
    const recipient = specificMatch[3].trim();
    
    // Validate wallet address
    if (isValidSonicAddress(recipient)) {
      // Check if agent wallet is initialized
      if (!agentWalletInitialized) {
        await ctx.reply('Sorry, my wallet is not properly configured. Transactions are currently unavailable.');
        return;
      }
      
      const agentWallet = getAgentWallet();
      if (!agentWallet) {
        await ctx.reply('Sorry, the agent wallet is not properly configured. Transactions are currently unavailable.');
        return;
      }
      
      // Show typing indicator
      await ctx.sendChatAction('typing');
      
      try {
        // Get wallet information
        const balance = await agentWallet.getBalance();
        const networkInfo = agentWallet.getNetworkInfo();
        
        // Check if wallet has enough balance
        if (balance < amount) {
          await ctx.reply(`Insufficient balance. Current balance: ${balance.toFixed(4)} SOL`);
          return;
        }
        
        // Prevent sending on mainnet
        if (!networkInfo.isTestnet) {
          await ctx.reply(`For security reasons, I can only send SOL on testnet, not on mainnet. Current network: ${networkInfo.network}`);
          return;
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
        return;
      } catch (error) {
        console.error('Error sending transaction:', error);
        await ctx.reply('Sorry, there was an error processing the transaction. Please try again later.');
        return;
      }
    }
  } else if (transactionRegex.test(userMessage) && !specificMatch) {
    // Handle general transaction requests
    if (!agentWalletInitialized) {
      await ctx.reply('Sorry, my wallet is not properly configured. I cannot send transactions at this time.');
      return;
    }
    
    await ctx.reply('I can send SOL for you! Please use the format: "Send X SOL to ADDRESS"\n\n' +
      'For example: "Send 0.1 SOL to 8xiv9G1gYEXcWcwg9YVgbCUeEPB4XbRSr6WDwJGTXNDU"');
    return;
  }
  
  // Check if the message is a liquidity pool ID (direct ID)
  if (isValidPoolId(userMessage)) {
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    try {
      // Get liquidity pool information
      const poolData = await getLiquidityPoolById(userMessage);
      
      // Format and send the information
      const formattedInfo = formatLiquidityPoolInfo(poolData);
      await ctx.reply(formattedInfo);
      return;
    } catch (error) {
      console.error('Error fetching liquidity pool information:', error);
      await ctx.reply('Sorry, there was an error fetching the liquidity pool information. Please try again later.');
      return;
    }
  }
  
  // Check if the message is asking for liquidity pool information
  const poolRegex = /(?:liquidity pool|lp|pool).*?(?:info|data|details|stats).*?([\w\d]{32,44})/i;
  const poolMatch = userMessage.match(poolRegex);
  
  // Check for SOL-SONIC pool specifically
  const solSonicRegex = /(?:sol[\s-]sonic|wsol[\s-]sonic).*?(?:pool|lp|liquidity|pair)/i;
  
  // Check for liquidity pool listing request
  const poolListRegex = /(?:list|show|get|display|view|all).*?(?:liquidity pools|pools|lps|pairs|available pools)/i;
  
  if (poolMatch && poolMatch[1]) {
    const poolId = poolMatch[1].trim();
    
    // Validate pool ID
    if (isValidPoolId(poolId)) {
      // Show typing indicator
      await ctx.sendChatAction('typing');
      
      try {
        // Get liquidity pool information
        const poolData = await getLiquidityPoolById(poolId);
        
        // Format and send the information
        const formattedInfo = formatLiquidityPoolInfo(poolData);
        await ctx.reply(formattedInfo);
        return;
      } catch (error) {
        console.error('Error fetching liquidity pool information:', error);
        await ctx.reply('Sorry, there was an error fetching the liquidity pool information. Please try again later.');
        return;
      }
    }
  } else if (solSonicRegex.test(userMessage)) {
    // SOL-SONIC pool ID
    const poolId = 'DgMweMfMbmPFChTuAvTf4nriQDWpf9XX3g66kod9nsR4';
    
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    try {
      // Get liquidity pool information
      const poolData = await getLiquidityPoolById(poolId);
      
      // Format and send the information
      const formattedInfo = formatLiquidityPoolInfo(poolData);
      await ctx.reply(formattedInfo);
      return;
    } catch (error) {
      console.error('Error fetching SOL-SONIC pool information:', error);
      await ctx.reply('Sorry, there was an error fetching the SOL-SONIC pool information. Please try again later.');
      return;
    }
  } else if (poolListRegex.test(userMessage)) {
    // User is asking for a list of pools
    
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    try {
      // Use fixed values for page and pageSize as requested
      const page = 1;
      const pageSize = 10;
      
      // Get liquidity pools with fixed values
      console.log('Fetching liquidity pools from Sega API');
      const poolsData = await getLiquidityPools();
      
      // Format and send the information
      const formattedInfo = formatLiquidityPoolList(poolsData);
      await ctx.reply(formattedInfo, { parse_mode: 'Markdown' });
      return;
    } catch (error) {
      console.error('Error fetching liquidity pools:', error);
      await ctx.reply('Sorry, there was an error fetching the liquidity pools. Please try again later.');
      return;
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

    console.log('Using AI model:', process.env.AI_MODEL || 'gpt-4o-mini');

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

// Handle messages that might be asking about liquidity pools
bot.hears(/(?:liquidity pool|lp|pool).*?(?:info|data|details|stats).*?([\w\d]{32,44})/i, async (ctx) => {
  try {
    const match = ctx.message.text.match(/(?:liquidity pool|lp|pool).*?(?:info|data|details|stats).*?([\w\d]{32,44})/i);
    if (match && match[1]) {
      const poolId = match[1].trim();
      
      // Validate pool ID
      if (isValidPoolId(poolId)) {
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
      }
    }
  } catch (error) {
    console.error('Error handling liquidity pool message:', error);
    await ctx.reply('Sorry, there was an error fetching the liquidity pool data. The service might be temporarily unavailable. Please try again later.');
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