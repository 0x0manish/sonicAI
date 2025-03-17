/**
 * Utility functions for environment variables
 */

/**
 * Check if environment variables are properly loaded
 */
export function checkEnvironmentVariables(): { isValid: boolean; missingVars: string[] } {
  const requiredVars = ['OPENAI_API_KEY', 'AI_MODEL'];
  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
}

/**
 * Get environment variables with fallbacks
 */
export function getEnvVars() {
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
    AI_MODEL: process.env.AI_MODEL || 'gpt-4o-mini',
    SONIC_RPC_URL: process.env.SONIC_RPC_URL || 'https://rpc.mainnet-alpha.sonic.game',
    SONIC_TESTNET_RPC_URL: process.env.SONIC_TESTNET_RPC_URL || 'https://api.testnet.sonic.game',
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}

/**
 * Log environment variables (masked for security)
 */
export function logEnvVars() {
  const vars = getEnvVars();
  console.log('Environment variables:');
  console.log('NODE_ENV:', vars.NODE_ENV);
  console.log('AI_PROVIDER:', vars.AI_PROVIDER);
  console.log('AI_MODEL:', vars.AI_MODEL);
  console.log('OPENAI_API_KEY exists:', !!vars.OPENAI_API_KEY);
  if (vars.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY (masked):', '****' + vars.OPENAI_API_KEY.slice(-4));
  }
  console.log('SONIC_RPC_URL:', vars.SONIC_RPC_URL);
  console.log('SONIC_TESTNET_RPC_URL:', vars.SONIC_TESTNET_RPC_URL);
} 