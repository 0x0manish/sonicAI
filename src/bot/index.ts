import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { generateAIResponse } from '@/lib/ai-utils';
import { openai, getAIConfig, SONIC_AI_SYSTEM_PROMPT } from '@/lib/ai-config';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize bot with token from environment variables
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

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
Hello! I'm Sonic AI, your guide to the Sonic SVM ecosystem. 

I can help you understand:
• How Sonic enables sovereign game economies on Solana
• The HyperGrid framework for dedicated game grids
• Sorada's data architecture for improved performance
• Rush, our Entity-Component-System framework

What would you like to know about Sonic?
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

You can also just send me a message, and I'll do my best to help you!
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

// Handle text messages
bot.on(message('text'), async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  // Initialize session if it doesn't exist
  if (!userSessions[userId]) {
    userSessions[userId] = { messages: [] };
  }
  
  const userMessage = ctx.message.text;
  
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

    const config = getAIConfig();
    
    // Create a streaming response
    const stream = await openai.chat.completions.create({
      model: config.model,
      messages: fullMessages as any,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
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
          
          if (sentMessage) {
            // Update existing message
            try {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                sentMessage.message_id,
                undefined,
                accumulatedResponse
              );
            } catch (error: any) {
              // If message is too long or hasn't changed (Telegram API limitation)
              console.log('Edit message error (expected):', error.message);
            }
          } else {
            // Send first message
            sentMessage = await ctx.reply(accumulatedResponse);
          }
          
          lastUpdateTime = currentTime;
        }
      }
    }
    
    // Ensure final message is sent/updated
    if (accumulatedResponse) {
      if (sentMessage) {
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            sentMessage.message_id,
            undefined,
            accumulatedResponse
          );
        } catch (error: any) {
          // If message is too long or hasn't changed
          console.log('Final edit message error (expected):', error.message);
        }
      } else {
        await ctx.reply(accumulatedResponse);
      }
      
      // Add AI response to session
      userSessions[userId].messages.push({
        role: 'assistant',
        content: accumulatedResponse,
      });
    }
  } catch (error) {
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
const startBot = () => {
  console.log('Starting Telegram bot...');
  bot.launch();
  
  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
  
  console.log('Telegram bot is running!');
};

// Export the start function
export default startBot; 