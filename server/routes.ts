import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { monitoringService } from "./services/monitoring";
import { redditService } from "./services/reddit";
import { insertPostSchema, insertMonitoringConfigSchema, insertKnowledgeBaseSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    monitoringService.addWebSocketClient(ws);
    
    // Send initial status after a small delay to ensure client is ready
    setTimeout(async () => {
      try {
        const status = await monitoringService.getStatus();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'monitoringStatus',
            data: status
          }));
        }
      } catch (error) {
        console.error('Error sending initial status:', error);
      }
    }, 100);
  });

  // API Routes
  
  // Get system status
  app.get('/api/status', async (req, res) => {
    try {
      const monitoringStatus = await monitoringService.getStatus();
      res.json({
        monitoring: monitoringStatus,
        reddit: {
          configured: redditService.isConfigured()
        },
        openai: {
          configured: !!(process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY)
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get status' });
    }
  });

  // Posts endpoints
  app.get('/api/posts', async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
      const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
      
      const result = await storage.getPosts(limit, offset);
      res.json({
        posts: result.posts,
        total: result.total,
        hasMore: offset + limit < result.total,
        limit,
        offset
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  });

  app.get('/api/posts/:id', async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch post' });
    }
  });

  app.patch('/api/posts/:id', async (req, res) => {
    try {
      const updates = req.body;
      const updatedPost = await storage.updatePost(req.params.id, updates);
      if (!updatedPost) {
        return res.status(404).json({ message: 'Post not found' });
      }
      res.json(updatedPost);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update post' });
    }
  });

  // Post Reddit reply
  app.post('/api/posts/:id/reply', async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      if (!redditService.isConfigured()) {
        return res.status(400).json({ message: 'Reddit API not configured' });
      }

      const replyText = req.body.reply || post.proposedReply;
      if (!replyText) {
        return res.status(400).json({ message: 'No reply text provided' });
      }

      const result = await redditService.postReply(post.redditId, replyText);
      
      // Update post as posted
      await storage.updatePost(post.id, { posted: true });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Failed to post reply: ' + (error as Error).message });
    }
  });

  // Monitoring endpoints
  app.post('/api/monitoring/start', async (req, res) => {
    try {
      const { subreddits, keywords, scanInterval = 5 } = req.body;
      
      if (!subreddits || !keywords) {
        return res.status(400).json({ message: 'Subreddits and keywords are required' });
      }

      await monitoringService.startMonitoring(subreddits, keywords, scanInterval);
      
      res.json({
        success: true,
        message: 'Monitoring started',
        config: { subreddits, keywords, scanInterval }
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to start monitoring: ' + (error as Error).message });
    }
  });

  app.post('/api/monitoring/stop', async (req, res) => {
    try {
      await monitoringService.stopMonitoring();
      res.json({ success: true, message: 'Monitoring stopped' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to stop monitoring' });
    }
  });

  app.get('/api/monitoring/status', async (req, res) => {
    try {
      const status = await monitoringService.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get monitoring status' });
    }
  });

  // Configuration endpoints
  app.get('/api/config', async (req, res) => {
    try {
      const config = {
        openaiKey: !!(process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY),
        redditClientId: !!(process.env.REDDIT_CLIENT_ID || process.env.VITE_REDDIT_CLIENT_ID),
        redditClientSecret: !!(process.env.REDDIT_CLIENT_SECRET || process.env.VITE_REDDIT_CLIENT_SECRET),
        redditRefreshToken: !!(process.env.REDDIT_REFRESH_TOKEN || process.env.VITE_REDDIT_REFRESH_TOKEN),
        // Only show partial keys for security
        openaiKeyPartial: (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '')
          .replace(/^(sk-[a-zA-Z0-9]{8}).*/, '$1...'),
        redditClientIdPartial: (process.env.REDDIT_CLIENT_ID || process.env.VITE_REDDIT_CLIENT_ID || '')
          .replace(/^(.{8}).*/, '$1...'),
      };
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get configuration' });
    }
  });

  app.post('/api/config', async (req, res) => {
    try {
      const { openaiKey, redditClientId, redditClientSecret, redditRefreshToken } = req.body;
      
      // Validate required fields
      if (!openaiKey || !redditClientId || !redditClientSecret) {
        return res.status(400).json({ message: 'OpenAI API key, Reddit Client ID and Secret are required' });
      }
      
      // Validate OpenAI API key format
      if (!openaiKey.startsWith('sk-') || openaiKey.length < 20) {
        return res.status(400).json({ message: 'Invalid OpenAI API key format' });
      }
      
      // Note: In production, store these securely in environment variables or secure vault
      // For now, we just validate and return success
      res.json({ 
        success: true, 
        message: 'Configuration validated successfully. Please set these as environment variables and restart the server.' 
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to save configuration' });
    }
  });

  app.post('/api/config/test', async (req, res) => {
    try {
      const { openaiKey, redditClientId, redditClientSecret } = req.body;
      const results = {
        openai: false,
        reddit: false,
        errors: [] as string[]
      };

      // Test OpenAI API
      if (openaiKey) {
        try {
          const { OpenAI } = await import('openai');
          const testOpenAI = new OpenAI({ apiKey: openaiKey });
          await testOpenAI.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: 'Test' }],
            max_tokens: 1
          });
          results.openai = true;
        } catch (error) {
          results.errors.push(`OpenAI: ${(error as Error).message}`);
        }
      }

      // Test Reddit API
      if (redditClientId && redditClientSecret) {
        try {
          const response = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${Buffer.from(`${redditClientId}:${redditClientSecret}`).toString('base64')}`,
              'User-Agent': 'RedditOutreachAgent/1.0.0 by KaZi',
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
          });
          
          if (response.ok) {
            results.reddit = true;
          } else {
            results.errors.push(`Reddit: Invalid credentials (${response.status})`);
          }
        } catch (error) {
          results.errors.push(`Reddit: ${(error as Error).message}`);
        }
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ message: 'Failed to test configuration' });
    }
  });

  // Prompt endpoints
  app.get('/api/prompt', async (req, res) => {
    try {
      const prompt = await storage.getPrompt();
      res.json({ prompt: prompt || null });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get prompt' });
    }
  });

  app.post('/api/prompt', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ message: 'Valid prompt string required' });
      }
      
      const savedPrompt = await storage.savePrompt(prompt);
      res.json({ success: true, prompt: savedPrompt });
    } catch (error) {
      res.status(500).json({ message: 'Failed to save prompt' });
    }
  });

  app.post('/api/prompt/reset', async (req, res) => {
    try {
      const defaultPrompt = await storage.resetPromptToDefault();
      res.json({ success: true, prompt: defaultPrompt });
    } catch (error) {
      res.status(500).json({ message: 'Failed to reset prompt' });
    }
  });

  // Knowledge base endpoints
  app.get('/api/knowledge', async (req, res) => {
    try {
      const knowledge = await storage.getKnowledgeBase();
      res.json(knowledge);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch knowledge base' });
    }
  });

  app.post('/api/knowledge', async (req, res) => {
    try {
      const validatedData = insertKnowledgeBaseSchema.parse(req.body);
      const knowledge = await storage.createKnowledgeBase(validatedData);
      res.json(knowledge);
    } catch (error) {
      res.status(400).json({ message: 'Invalid knowledge base data' });
    }
  });

  app.patch('/api/knowledge/:id', async (req, res) => {
    try {
      const updatedKnowledge = await storage.updateKnowledgeBase(req.params.id, req.body);
      if (!updatedKnowledge) {
        return res.status(404).json({ message: 'Knowledge base entry not found' });
      }
      res.json(updatedKnowledge);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update knowledge base entry' });
    }
  });

  app.delete('/api/knowledge/:id', async (req, res) => {
    try {
      const deleted = await storage.deleteKnowledgeBase(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: 'Knowledge base entry not found' });
      }
      res.json({ success: true, message: 'Knowledge base entry deleted' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete knowledge base entry' });
    }
  });

  // Sample data endpoint for testing
  app.post('/api/sample-data', async (req, res) => {
    try {
      const samplePosts = [
        {
          redditId: 'sample_1',
          subreddit: 'r/javascript',
          title: 'URGENT: React useEffect infinite loop crashing my app!',
          content: 'Help! My useEffect is causing infinite re-renders and my app keeps crashing. I have a user authentication check that runs on every component mount. This is for a production app and users are complaining. How do I fix this ASAP?',
          author: 'u/desperate_dev',
          upvotes: 25,
          comments: 8,
          postUrl: 'https://reddit.com/r/javascript/sample_1',
          matchReason: 'Matches keywords: react, help, api | Urgency: 0.89',
          tags: ['react', 'help', 'useeffect', 'urgent'],
          priority: 'critical',
          score: 0.89,
          highlighted: true,
          posted: false,
          confidence: 0.87,
          proposedReply: 'This looks like a classic infinite loop caused by missing dependencies in your useEffect. The issue is likely that you\'re updating state inside useEffect without proper dependency management.\n\nHere\'s how to fix it:\n\n1. **Check your dependencies**: Make sure your useEffect dependency array includes all variables from component scope that are used inside the effect.\n\n2. **Use useCallback for functions**: If you\'re passing functions as dependencies, wrap them in useCallback.\n\n3. **Consider useRef for values that shouldn\'t trigger re-renders**\n\nCan you share your useEffect code? I\'d be happy to help identify the specific issue causing the infinite loop.',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          redditId: 'sample_2',
          subreddit: 'r/webdev',
          title: 'How to optimize API calls in React?',
          content: 'I\'m building a dashboard that makes multiple API calls. Currently using fetch in useEffect but it seems inefficient. What are the best practices for API optimization in React apps?',
          author: 'u/learning_dev',
          upvotes: 15,
          comments: 12,
          postUrl: 'https://reddit.com/r/webdev/sample_2',
          matchReason: 'Matches keywords: react, api | Urgency: 0.65',
          tags: ['react', 'api', 'optimization'],
          priority: 'high',
          score: 0.65,
          highlighted: true,
          posted: false,
          confidence: 0.78,
          proposedReply: 'Great question! Here are some proven strategies for optimizing API calls in React:\n\n**1. Use React Query or SWR** - These libraries provide caching, background updates, and request deduplication out of the box.\n\n**2. Implement request batching** - Group multiple API calls into a single request when possible.\n\n**3. Add proper loading states** - Use skeleton screens or loading indicators to improve perceived performance.\n\n**4. Consider pagination** - Don\'t load all data at once, implement infinite scroll or pagination.\n\n**5. Cache responses** - Store frequently accessed data in localStorage or a state management solution.\n\nWould you like me to show you a specific implementation example with React Query?',
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
        },
        {
          redditId: 'sample_3',
          subreddit: 'r/programming',
          title: 'Best practices for Node.js error handling?',
          content: 'What are some good patterns for handling errors in Node.js applications? I want to make sure I\'m not missing important error cases.',
          author: 'u/backend_learner',
          upvotes: 8,
          comments: 5,
          postUrl: 'https://reddit.com/r/programming/sample_3',
          matchReason: 'Matches keywords: nodejs | Urgency: 0.42',
          tags: ['nodejs', 'error-handling'],
          priority: 'medium',
          score: 0.42,
          highlighted: false,
          posted: false,
          confidence: 0.73,
          proposedReply: 'Good question! Here are the key error handling patterns for Node.js:\n\n**1. Always handle Promise rejections** - Use .catch() or try/catch with async/await\n\n**2. Use centralized error handling middleware** - In Express, create error middleware that catches all unhandled errors\n\n**3. Validate input early** - Check and sanitize user input before processing\n\n**4. Log errors properly** - Use structured logging with tools like Winston or Pino\n\n**5. Return meaningful error messages** - Don\'t expose internal errors to users, but log them for debugging\n\nHere\'s a simple Express error middleware example:\n```javascript\napp.use((err, req, res, next) => {\n  console.error(err.stack);\n  res.status(500).send(\'Something broke!\');\n});\n```',
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
        },
        {
          redditId: 'sample_4',
          subreddit: 'r/reactjs',
          title: 'Should I use Redux or Context API?',
          content: 'Working on a medium-sized app and wondering about state management. When should I choose Redux over Context API?',
          author: 'u/state_confused',
          upvotes: 45,
          comments: 23,
          postUrl: 'https://reddit.com/r/reactjs/sample_4',
          matchReason: 'Matches keywords: react | Urgency: 0.38',
          tags: ['react', 'redux', 'context'],
          priority: 'medium',
          score: 0.38,
          highlighted: false,
          posted: false,
          confidence: 0.82,
          proposedReply: 'Great question! Here\'s when to choose each:\n\n**Use Context API when:**\n- Simple state sharing between components\n- Theme, authentication, or user preferences\n- Small to medium apps\n- You want to avoid additional dependencies\n\n**Use Redux when:**\n- Complex state logic with multiple actions\n- Need predictable state updates\n- Time-travel debugging is valuable\n- Large team working on the same codebase\n- Need middleware for async operations\n\n**Consider Redux Toolkit** - It simplifies Redux significantly and is now the recommended way to use Redux.\n\nFor most medium-sized apps, Context API is sufficient. Start simple and migrate to Redux if you hit Context limitations.',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          redditId: 'sample_5',
          subreddit: 'r/webdev',
          title: 'CSS Grid vs Flexbox - when to use which?',
          content: 'Still confused about when to use CSS Grid vs Flexbox. Can someone explain the practical differences?',
          author: 'u/css_newbie',
          upvotes: 12,
          comments: 7,
          postUrl: 'https://reddit.com/r/webdev/sample_5',
          matchReason: 'Matches keywords: css | Urgency: 0.25',
          tags: ['css', 'grid', 'flexbox'],
          priority: 'low',
          score: 0.25,
          highlighted: false,
          posted: true,
          confidence: 0.75,
          proposedReply: 'Here\'s a simple rule of thumb:\n\n**Use Flexbox for:**\n- One-dimensional layouts (rows OR columns)\n- Component-level layout\n- Distributing space between items\n- Centering content\n- Navigation bars, card layouts\n\n**Use CSS Grid for:**\n- Two-dimensional layouts (rows AND columns)\n- Page-level layout\n- Complex, overlapping designs\n- When you need precise control over placement\n\n**Quick decision guide:**\n- If you\'re thinking "I need to arrange items in a line" → Flexbox\n- If you\'re thinking "I need to create a layout with specific areas" → Grid\n\nThey work great together too! Use Grid for the overall page structure and Flexbox for component internals.',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }
      ];
      
      // Add sample posts to storage
      for (const postData of samplePosts) {
        await storage.createPost(postData);
      }
      
      res.json({ 
        success: true, 
        message: `${samplePosts.length} sample posts created successfully`,
        posts: samplePosts
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to create sample posts' });
    }
  });

  return httpServer;
}
