import { AgentWalletConfig } from './agent-wallet';
import bs58 from 'bs58';

/**
 * Agent wallet configuration
 * NOTE: In a production environment, this should be stored securely and not in the codebase
 */
export const AGENT_WALLET_CONFIG: AgentWalletConfig = {
  privateKey: '',
  rpcUrl: 'https://rpc.mainnet-alpha.sonic.game',
  testnetRpcUrl: 'https://api.testnet.sonic.game',
};

/**
 * Updates the wallet configuration with values from environment variables
 * This should be called after environment variables are loaded
 */
export function updateWalletConfigFromEnv(): void {
  const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY || '';
  const rpcUrl = process.env.SONIC_RPC_URL || 'https://rpc.mainnet-alpha.sonic.game';
  const testnetRpcUrl = process.env.SONIC_TESTNET_RPC_URL || 'https://api.testnet.sonic.game';
  
  console.log('Updating wallet config from environment:');
  console.log('- AGENT_WALLET_PRIVATE_KEY:', privateKey ? `Set (${privateKey.length} chars, starts with ${privateKey.substring(0, 4)}...)` : 'Not set');
  console.log('- SONIC_RPC_URL:', rpcUrl);
  console.log('- SONIC_TESTNET_RPC_URL:', testnetRpcUrl);
  
  // Update the configuration object
  AGENT_WALLET_CONFIG.privateKey = privateKey;
  AGENT_WALLET_CONFIG.rpcUrl = rpcUrl;
  AGENT_WALLET_CONFIG.testnetRpcUrl = testnetRpcUrl;
  
  // Validate the configuration immediately after updating
  if (!validateWalletConfig()) {
    console.error('Warning: Wallet configuration is invalid after environment update');
  }
  
  console.log('Wallet configuration updated from environment variables');
}

/**
 * Validates the agent wallet configuration
 * @returns True if the configuration is valid, false otherwise
 */
export function validateWalletConfig(): boolean {
  let isValid = true;
  const errors = [];

  // Check if private key is set and valid
  if (!AGENT_WALLET_CONFIG.privateKey) {
    console.error('Agent wallet private key is not set. Set the AGENT_WALLET_PRIVATE_KEY environment variable.');
    errors.push('Private key is missing');
    isValid = false;
  } else {
    try {
      // Try to decode the private key to validate its format
      const privateKeyBytes = bs58.decode(AGENT_WALLET_CONFIG.privateKey);
      if (privateKeyBytes.length !== 64) {
        console.error('Agent wallet private key is invalid (incorrect length).');
        errors.push('Private key is invalid (incorrect length)');
        isValid = false;
      }
    } catch (error) {
      console.error('Agent wallet private key is invalid (not valid base58).');
      errors.push('Private key is invalid (not valid base58)');
      isValid = false;
    }
  }

  // Check if RPC URLs are set and valid
  if (!AGENT_WALLET_CONFIG.rpcUrl) {
    console.error('Mainnet RPC URL is not set. Set the SONIC_RPC_URL environment variable.');
    errors.push('Mainnet RPC URL is missing');
    isValid = false;
  } else if (!AGENT_WALLET_CONFIG.rpcUrl.startsWith('http')) {
    console.error('Mainnet RPC URL is invalid (must start with http/https).');
    errors.push('Mainnet RPC URL is invalid');
    isValid = false;
  }

  if (!AGENT_WALLET_CONFIG.testnetRpcUrl) {
    console.warn('Testnet RPC URL is not set. Set the SONIC_TESTNET_RPC_URL environment variable for testnet functionality.');
    errors.push('Testnet RPC URL is missing (optional)');
    // Not marking as invalid since testnet is optional
  } else if (!AGENT_WALLET_CONFIG.testnetRpcUrl.startsWith('http')) {
    console.error('Testnet RPC URL is invalid (must start with http/https).');
    errors.push('Testnet RPC URL is invalid');
    isValid = false;
  }

  // Log validation result
  if (isValid) {
    console.log('Wallet configuration is valid');
  } else {
    console.error('Wallet configuration validation failed:', errors);
  }
  
  return isValid;
} 