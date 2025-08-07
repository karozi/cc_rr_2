import OpenAI from "openai";
import { storage } from '../storage';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

if (!apiKey || apiKey === 'sk-default-key') {
  console.warn('OpenAI API key not configured. AI features will be disabled.');
}

const openai = apiKey ? new OpenAI({ apiKey }) : null;

export interface AIResponse {
  reply: string;
  confidence: number;
  reasoning: string;
}

export async function generateRedditReply(
  postTitle: string,
  postContent: string,
  subreddit: string,
  knowledgeBase: string[] = []
): Promise<AIResponse> {
  if (!openai) {
    throw new Error('OpenAI API not configured. Please set OPENAI_API_KEY environment variable.');
  }
  
  try {
    const knowledgeContext = knowledgeBase.length > 0 
      ? `\n\nRelevant knowledge base content:\n${knowledgeBase.join('\n\n')}`
      : '';

    // Get custom prompt template
    const promptTemplate = await storage.getPrompt();
    
    if (!promptTemplate) {
      throw new Error('No prompt template available');
    }
    
    // Replace variables in the prompt template
    const prompt = promptTemplate
      .replace('{subreddit}', subreddit)
      .replace('{title}', postTitle)
      .replace('{content}', postContent)
      .replace('{knowledgeContext}', knowledgeContext);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful Reddit expert who generates engaging, authentic responses."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      reply: result.reply || "I'd be happy to help with this question!",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      reasoning: result.reasoning || "Generated a helpful response based on the post content."
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate AI response: ' + (error as Error).message);
  }
}

export async function analyzePosts(posts: any[]): Promise<any[]> {
  if (!openai) {
    console.warn('OpenAI API not configured. Returning posts without analysis.');
    return posts;
  }
  
  try {
    const prompt = `Analyze these Reddit posts and score them for engagement potential.

Posts: ${JSON.stringify(posts)}

For each post, provide:
1. Priority level (high/medium/low)
2. Engagement score (0-1)
3. Match reasoning
4. Suggested tags

Respond with JSON array matching the input posts with added analysis.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing Reddit posts for engagement potential."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"posts": []}');
    return result.posts || posts;
  } catch (error) {
    console.error('Post analysis error:', error);
    return posts;
  }
}
