/**
 * Script to check if environment variables are properly loaded
 * Run with: npx ts-node --project tsconfig.bot.json src/scripts/check-env.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log(`Loading environment variables from ${envLocalPath}`);
  dotenv.config({ path: envLocalPath });
} else {
  console.log('No .env.local file found');
  dotenv.config();
}

// Check if environment variables are properly loaded
const requiredVars = ['OPENAI_API_KEY', 'AI_MODEL'];
const missingVars: string[] = [];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
}

console.log('Environment variables check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
if (process.env.OPENAI_API_KEY) {
  console.log('OPENAI_API_KEY (masked):', '****' + process.env.OPENAI_API_KEY.slice(-4));
}
console.log('AI_MODEL:', process.env.AI_MODEL);
console.log('AI_PROVIDER:', process.env.AI_PROVIDER);
console.log('SONIC_RPC_URL:', process.env.SONIC_RPC_URL);
console.log('SONIC_TESTNET_RPC_URL:', process.env.SONIC_TESTNET_RPC_URL);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
} else {
  console.log('All required environment variables are set');
  process.exit(0);
} 