import Snoowrap from 'snoowrap';

interface RedditConfig {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  userAgent: string;
}

interface PostReplyResult {
  success: boolean;
  commentId: string;
  commentUrl: string;
}

export class RedditService {
  private reddit: Snoowrap | null = null;

  constructor() {
    this.initializeReddit();
  }

  private initializeReddit() {
    const config: RedditConfig = {
      clientId: process.env.REDDIT_CLIENT_ID || process.env.VITE_REDDIT_CLIENT_ID || '',
      clientSecret: process.env.REDDIT_CLIENT_SECRET || process.env.VITE_REDDIT_CLIENT_SECRET || '',
      refreshToken: process.env.REDDIT_REFRESH_TOKEN || process.env.VITE_REDDIT_REFRESH_TOKEN || '',
      userAgent: 'RedditOutreachAgent/1.0.0 by KaZi'
    };

    if (config.clientId && config.clientSecret) {
      try {
        this.reddit = new Snoowrap(config);
      } catch (error) {
        console.error('Failed to initialize Reddit API:', error);
      }
    }
  }

  async searchPosts(subreddits: string[], keywords: string[], limit = 25) {
    if (!this.reddit) {
      throw new Error('Reddit API not initialized. Please check your credentials.');
    }

    const posts = [];
    
    for (const subreddit of subreddits) {
      try {
        const subredditPosts = await this.reddit
          .getSubreddit(subreddit)
          .getNew({ limit: Math.ceil(limit / subreddits.length) });

        for (const post of subredditPosts) {
          const postText = `${post.title} ${post.selftext}`.toLowerCase();
          const matchedKeywords = keywords.filter(keyword => 
            postText.includes(keyword.toLowerCase())
          );

          if (matchedKeywords.length > 0) {
            // Calculate urgency score based on multiple factors
            const urgencyScore = this.calculateUrgencyScore(post, matchedKeywords, keywords);
            const priority = this.determinePriority(urgencyScore);
            
            posts.push({
              redditId: post.id,
              subreddit: `r/${subreddit}`,
              title: post.title,
              content: post.selftext || 'No content',
              author: post.author && typeof post.author === 'object' && 'name' in post.author 
                ? `u/${post.author.name}` 
                : `u/${post.author || 'unknown'}`,
              upvotes: post.ups,
              comments: post.num_comments,
              postUrl: `https://reddit.com${post.permalink}`,
              matchReason: `Matches keywords: ${matchedKeywords.join(', ')} | Urgency: ${urgencyScore.toFixed(2)}`,
              tags: matchedKeywords,
              priority: priority,
              score: urgencyScore,
              highlighted: priority === 'high' || priority === 'critical',
              posted: false,
              confidence: Math.min(0.95, 0.6 + (urgencyScore * 0.3))
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching from r/${subreddit}:`, error);
        // Return partial results but notify about the error
        if (posts.length === 0) {
          throw new Error(`Failed to fetch posts from r/${subreddit}: ${(error as Error).message}`);
        }
      }
    }

    return posts.sort((a, b) => {
      // Sort by priority first, then by score
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      return b.score - a.score;
    });
  }
  
  private calculateUrgencyScore(post: any, matchedKeywords: string[], allKeywords: string[]): number {
    let score = 0;
    
    // 1. Keyword match ratio (0-0.3)
    const keywordRatio = matchedKeywords.length / allKeywords.length;
    score += keywordRatio * 0.3;
    
    // 2. Post engagement (0-0.25)
    const engagementScore = Math.min(0.25, (post.ups + post.num_comments) / 100);
    score += engagementScore;
    
    // 3. Post freshness (0-0.2)
    const postAge = Date.now() - (post.created_utc * 1000);
    const hoursOld = postAge / (1000 * 60 * 60);
    const freshnessScore = Math.max(0, 0.2 - (hoursOld / 24) * 0.2); // Decrease over 24 hours
    score += freshnessScore;
    
    // 4. Urgent keywords bonus (0-0.15)
    const urgentKeywords = ['help', 'urgent', 'asap', 'problem', 'error', 'broken', 'issue', 'bug'];
    const postText = `${post.title} ${post.selftext}`.toLowerCase();
    const urgentMatches = urgentKeywords.filter(word => postText.includes(word));
    score += Math.min(0.15, urgentMatches.length * 0.05);
    
    // 5. Question indicators bonus (0-0.1)
    const questionIndicators = ['?', 'how', 'what', 'why', 'where', 'when', 'which', 'can someone'];
    const questionMatches = questionIndicators.filter(indicator => postText.includes(indicator));
    score += Math.min(0.1, questionMatches.length * 0.02);
    
    return Math.min(1, score);
  }
  
  private determinePriority(urgencyScore: number): string {
    if (urgencyScore >= 0.8) return 'critical';
    if (urgencyScore >= 0.6) return 'high';
    if (urgencyScore >= 0.4) return 'medium';
    return 'low';
  }

  async postReply(postId: string, replyText: string): Promise<PostReplyResult> {
    if (!this.reddit) {
      throw new Error('Reddit API not initialized. Please check your credentials.');
    }

    try {
      const post = await (this.reddit as any).getSubmission(postId);
      const comment = await (post as any).reply(replyText);
      const result: PostReplyResult = {
        success: true,
        commentId: comment.id,
        commentUrl: `https://reddit.com${comment.permalink}`
      };
      return result;
    } catch (error) {
      console.error('Error posting reply:', error);
      throw new Error('Failed to post reply: ' + (error as Error).message);
    }
  }

  isConfigured(): boolean {
    return this.reddit !== null;
  }
}

export const redditService = new RedditService();
