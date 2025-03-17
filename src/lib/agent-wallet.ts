import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Interface for agent wallet configuration
 */
export interface AgentWalletConfig {
  privateKey: string;
  rpcUrl: string;
  testnetRpcUrl?: string; // Added testnet RPC URL
}

/**
 * Interface for transaction result
 */
export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

/**
 * Interface for wallet network information
 */
export interface WalletNetworkInfo {
  isTestnet: boolean;
  network: string;
}

/**
 * Class representing the Sonic AI agent's wallet
 */
export class AgentWallet {
  private keypair: Keypair;
  private connection: Connection;
  private testnetConnection: Connection | null = null;
  private isTestnet: boolean = false;
  
  /**
   * Creates an instance of AgentWallet
   * @param config The wallet configuration
   */
  constructor(config: AgentWalletConfig) {
    try {
      // Create keypair from private key
      console.log('Creating keypair from private key...');
      const privateKeyBytes = bs58.decode(config.privateKey);
      this.keypair = Keypair.fromSecretKey(privateKeyBytes);
      console.log('Keypair created successfully');
      
      // Create connection to Sonic chain
      console.log(`Creating connection to Sonic chain: ${config.rpcUrl}`);
      this.connection = new Connection(config.rpcUrl, 'confirmed');
      
      // Create testnet connection if URL is provided
      if (config.testnetRpcUrl) {
        console.log(`Creating testnet connection: ${config.testnetRpcUrl}`);
        this.testnetConnection = new Connection(config.testnetRpcUrl, 'confirmed');
      }
      
      // Determine if the main RPC URL is for testnet
      this.isTestnet = config.rpcUrl.includes('testnet') || config.rpcUrl.includes('devnet');
      console.log(`Network identified as: ${this.isTestnet ? 'Testnet' : 'Mainnet'}`);
    } catch (error) {
      console.error('Error in AgentWallet constructor:', error);
      throw new Error(`Failed to initialize wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Gets the wallet's public key
   * @returns The wallet's public key as a string
   */
  getPublicKey(): string {
    return this.keypair.publicKey.toString();
  }
  
  /**
   * Gets the wallet's network information
   * @returns Information about the wallet's network
   */
  getNetworkInfo(): WalletNetworkInfo {
    return {
      isTestnet: this.isTestnet,
      network: this.isTestnet ? 'Testnet' : 'Mainnet'
    };
  }
  
  /**
   * Gets the wallet's SOL balance on the main network
   * @returns A promise that resolves to the wallet's SOL balance
   */
  async getBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.keypair.publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      throw new Error('Failed to get wallet balance');
    }
  }
  
  /**
   * Gets the wallet's SOL balance on the testnet
   * @returns A promise that resolves to the wallet's testnet SOL balance, or null if testnet is not configured
   */
  async getTestnetBalance(): Promise<number | null> {
    if (!this.testnetConnection) {
      console.log('Testnet connection not configured');
      return null;
    }
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Testnet balance request timed out')), 5000);
      });
      
      // Try to get balance with timeout
      const balancePromise = this.testnetConnection.getBalance(this.keypair.publicKey)
        .then(balance => balance / 1e9); // Convert lamports to SOL
      
      // Race the promises
      const balance = await Promise.race([balancePromise, timeoutPromise]);
      return balance;
    } catch (error) {
      console.error('Error getting testnet wallet balance:', error);
      // Return a default value instead of null to indicate we tried but failed
      return 0;
    }
  }
  
  /**
   * Sends SOL to a recipient
   * @param recipient The recipient's public key
   * @param amount The amount of SOL to send
   * @param forceMainnet Whether to force sending on mainnet (default: false)
   * @returns A promise that resolves to the transaction result
   */
  async sendSol(recipient: string, amount: number, forceMainnet: boolean = false): Promise<TransactionResult> {
    try {
      // Prevent sending on mainnet unless explicitly forced
      if (!this.isTestnet && !forceMainnet) {
        return {
          success: false,
          error: 'Sending SOL on mainnet is disabled for security reasons'
        };
      }
      
      // Validate recipient address
      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(recipient);
      } catch (error) {
        return {
          success: false,
          error: 'Invalid recipient address'
        };
      }
      
      // Validate amount
      if (amount <= 0) {
        return {
          success: false,
          error: 'Amount must be greater than 0'
        };
      }
      
      // Check if wallet has enough balance
      const balance = await this.getBalance();
      if (balance < amount) {
        return {
          success: false,
          error: `Insufficient balance. Current balance: ${balance} SOL`
        };
      }
      
      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.keypair.publicKey,
          toPubkey: recipientPubkey,
          lamports: amount * 1e9 // Convert SOL to lamports
        })
      );
      
      // Send transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.keypair]
      );
      
      return {
        success: true,
        signature
      };
    } catch (error) {
      console.error('Error sending SOL:', error);
      return {
        success: false,
        error: `Failed to send SOL: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

// Singleton instance of the agent wallet
let agentWalletInstance: AgentWallet | null = null;

/**
 * Initializes the agent wallet
 * @param config The wallet configuration
 * @returns The agent wallet instance or null if initialization fails
 */
export function initializeAgentWallet(config: AgentWalletConfig): AgentWallet | null {
  try {
    // Validate the private key format
    if (!config.privateKey || config.privateKey.trim() === '') {
      console.error('Cannot initialize wallet: Private key is missing');
      return null;
    }
    
    // Check if the private key is in the correct format
    let privateKeyBytes: Uint8Array;
    try {
      // Try to decode the private key
      privateKeyBytes = bs58.decode(config.privateKey);
      console.log(`Private key decoded successfully: ${privateKeyBytes.length} bytes`);
      
      if (privateKeyBytes.length !== 64) {
        console.error(`Cannot initialize wallet: Invalid private key length (${privateKeyBytes.length} bytes, expected 64)`);
        return null;
      }
    } catch (error) {
      console.error('Cannot initialize wallet: Invalid private key format (not valid base58)', error);
      return null;
    }
    
    // Validate RPC URLs
    if (!config.rpcUrl || config.rpcUrl.trim() === '') {
      console.error('Cannot initialize wallet: RPC URL is missing');
      return null;
    }
    
    console.log('Initializing agent wallet with configuration:');
    console.log('- RPC URL:', config.rpcUrl);
    console.log('- Testnet RPC URL:', config.testnetRpcUrl || 'Not configured');
    console.log('- Private key is valid and set');
    
    try {
      // Create the wallet instance
      agentWalletInstance = new AgentWallet(config);
      console.log('Agent wallet initialized successfully');
      console.log('- Public key:', agentWalletInstance.getPublicKey());
      console.log('- Network:', agentWalletInstance.getNetworkInfo().network);
      
      return agentWalletInstance;
    } catch (error) {
      console.error('Error creating wallet instance:', error);
      return null;
    }
  } catch (error) {
    console.error('Failed to initialize agent wallet:', error);
    return null;
  }
}

/**
 * Gets the agent wallet instance
 * @returns The agent wallet instance or null if not initialized
 */
export function getAgentWallet(): AgentWallet | null {
  if (!agentWalletInstance) {
    console.warn('Attempted to access agent wallet before initialization');
  }
  return agentWalletInstance;
}

/**
 * Checks if the agent wallet is properly initialized
 * @returns True if the wallet is initialized, false otherwise
 */
export function isAgentWalletInitialized(): boolean {
  return agentWalletInstance !== null;
}

/**
 * Formats a transaction result into a readable string
 * @param result The transaction result
 * @param recipient The recipient's public key
 * @param amount The amount of SOL sent
 * @returns A formatted string representation of the transaction result
 */
export function formatTransactionResult(result: TransactionResult, recipient: string, amount: number): string {
  if (!result.success) {
    return `Transaction failed: ${result.error}`;
  }
  
  return `Transaction successful!\n\nSent ${amount} SOL to ${recipient.slice(0, 6)}...${recipient.slice(-4)}\nTransaction signature: ${result.signature}`;
} 