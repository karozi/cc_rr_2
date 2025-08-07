import { storage } from '../storage';
import { redditService } from './reddit';
import { generateRedditReply } from './openai';
import { WebSocket } from 'ws';

export class MonitoringService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private webSocketClients: Set<WebSocket> = new Set();

  addWebSocketClient(ws: WebSocket) {
    this.webSocketClients.add(ws);
    
    ws.on('close', () => {
      this.webSocketClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.webSocketClients.delete(ws);
    });
  }

  private broadcast(message: any) {
    this.webSocketClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  async startMonitoring(subreddits: string[], keywords: string[], scanInterval: number) {
    // Save monitoring config
    await storage.createOrUpdateMonitoringConfig({
      subreddits,
      keywords,
      scanInterval,
      isActive: true,
      lastScanTime: new Date(),
      totalPosts: 0,
      newPosts: 0
    });

    // Stop existing monitoring and wait for cleanup
    await this.stopMonitoring();

    // Start new monitoring interval
    this.monitoringInterval = setInterval(async () => {
      await this.scanReddit(subreddits, keywords);
    }, scanInterval * 60 * 1000); // Convert minutes to milliseconds

    // Initial scan
    await this.scanReddit(subreddits, keywords);

    this.broadcast({
      type: 'monitoringStarted',
      data: { subreddits, keywords, scanInterval }
    });
  }

  async stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    const config = await storage.getMonitoringConfig();
    if (config) {
      await storage.createOrUpdateMonitoringConfig({
        ...config,
        isActive: false
      });
    }

    this.broadcast({
      type: 'monitoringStopped',
      data: {}
    });
  }

  private async scanReddit(subreddits: string[], keywords: string[]) {
    try {
      if (!redditService.isConfigured()) {
        console.log('Reddit API not configured, skipping scan');
        return;
      }

      console.log(`Scanning Reddit for posts in ${subreddits.join(', ')} with keywords: ${keywords.join(', ')}`);

      const posts = await redditService.searchPosts(subreddits, keywords);
      const knowledgeBase = await storage.getKnowledgeBase();
      const knowledgeContent = knowledgeBase.map(kb => kb.content);

      let newPostsCount = 0;

      for (const postData of posts) {
        // Check if post already exists by redditId
        const exists = await storage.postExistsByRedditId(postData.redditId);
        
        if (!exists) {
          // Generate AI reply
          try {
            const aiResponse = await generateRedditReply(
              postData.title,
              postData.content,
              postData.subreddit,
              knowledgeContent
            );

            const newPost = await storage.createPost({
              ...postData,
              proposedReply: aiResponse.reply,
              confidence: aiResponse.confidence
            });

            newPostsCount++;

            this.broadcast({
              type: 'newPost',
              data: newPost
            });
          } catch (error) {
            console.error('Error generating AI reply:', error);
            // Create post without AI reply
            await storage.createPost(postData);
            newPostsCount++;
          }
        }
      }

      // Update monitoring stats
      const config = await storage.getMonitoringConfig();
      if (config) {
        await storage.createOrUpdateMonitoringConfig({
          ...config,
          lastScanTime: new Date(),
          totalPosts: config.totalPosts + posts.length,
          newPosts: newPostsCount
        });
      }

      this.broadcast({
        type: 'scanComplete',
        data: {
          totalPosts: posts.length,
          newPosts: newPostsCount,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error during Reddit scan:', error);
      this.broadcast({
        type: 'scanError',
        data: { error: (error as Error).message }
      });
    }
  }

  async getStatus() {
    const config = await storage.getMonitoringConfig();
    return {
      isActive: config?.isActive || false,
      subreddits: config?.subreddits || [],
      keywords: config?.keywords || [],
      scanInterval: config?.scanInterval || 5,
      lastScanTime: config?.lastScanTime,
      totalPosts: config?.totalPosts || 0,
      newPosts: config?.newPosts || 0
    };
  }
}

export const monitoringService = new MonitoringService();
