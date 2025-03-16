import startBot from '../bot';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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

// Check if Telegram bot token is set
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not set in the environment variables.');
  console.error('Please set it in your .env.local file and try again.');
  process.exit(1);
}

// Check if OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in the environment variables.');
  console.error('Please set it in your .env.local file and try again.');
  process.exit(1);
}

// Start the bot
console.log('Starting Sonic AI Telegram bot...');
startBot(); 