// Load environment variables first
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

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

// Log the token for debugging (masked)
console.log('TELEGRAM_BOT_TOKEN exists:', !!process.env.TELEGRAM_BOT_TOKEN);
if (process.env.TELEGRAM_BOT_TOKEN) {
  console.log('TELEGRAM_BOT_TOKEN (masked):', '****' + process.env.TELEGRAM_BOT_TOKEN.slice(-4));
}

// Register module aliases before importing any modules
import moduleAlias from 'module-alias';

// Register the @ alias to point to the src directory
moduleAlias.addAliases({
  '@': path.join(__dirname, '..')
});

// Now import the bot
import startBot from '../bot';

// Start the bot
console.log('Starting Sonic AI Telegram bot...');
startBot(); 