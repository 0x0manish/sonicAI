import { openai, getAIConfig, SONIC_AI_SYSTEM_PROMPT } from './ai-config';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Function to generate AI response
export async function generateAIResponse(messages: Message[]): Promise<string> {
  const config = getAIConfig();
  
  // Ensure the system prompt is included
  const fullMessages = [
    { role: 'system', content: SONIC_AI_SYSTEM_PROMPT },
    ...messages.filter(msg => msg.role !== 'system')
  ];

  try {
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: fullMessages as any,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
    });

    return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'Sorry, there was an error processing your request. Please try again later.';
  }
}

// Function to stream AI response
export async function streamAIResponse(messages: Message[]) {
  const config = getAIConfig();
  
  // Ensure the system prompt is included
  const fullMessages = [
    { role: 'system', content: SONIC_AI_SYSTEM_PROMPT },
    ...messages.filter(msg => msg.role !== 'system')
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: config.model,
      messages: fullMessages as any,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      stream: true,
    });

    return stream;
  } catch (error) {
    console.error('Error streaming AI response:', error);
    throw error;
  }
} 