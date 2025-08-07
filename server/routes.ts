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

  return httpServer;
}
