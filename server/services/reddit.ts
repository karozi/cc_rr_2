import Snoowrap from 'snoowrap';

interface RedditConfig {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  userAgent: string;
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
              matchReason: `Matches keywords: ${matchedKeywords.join(', ')}`,
              tags: matchedKeywords,
              priority: matchedKeywords.length > 2 ? 'high' : 'medium',
              score: Math.min(1, matchedKeywords.length / keywords.length),
              highlighted: matchedKeywords.length > 2,
              posted: false,
              confidence: 0.7 + (matchedKeywords.length * 0.1)
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

    return posts.sort((a, b) => b.score - a.score);
  }

  async postReply(postId: string, replyText: string) {
    if (!this.reddit) {
      throw new Error('Reddit API not initialized. Please check your credentials.');
    }

    try {
      const post = await this.reddit.getSubmission(postId);
      const comment = await post.reply(replyText);
      return {
        success: true,
        commentId: comment.id,
        commentUrl: `https://reddit.com${comment.permalink}`
      };
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
