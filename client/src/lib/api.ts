import { apiRequest } from "./queryClient";

export interface Post {
  id: string;
  redditId: string;
  subreddit: string;
  title: string;
  content: string;
  author: string;
  upvotes: number;
  comments: number;
  tags: string[];
  priority: string;
  score: number;
  highlighted: boolean;
  postUrl: string;
  matchReason: string;
  proposedReply?: string;
  posted: boolean;
  confidence: number;
  createdAt: string;
}

export interface MonitoringStatus {
  isActive: boolean;
  subreddits: string[];
  keywords: string[];
  scanInterval: number;
  lastScanTime?: string;
  totalPosts: number;
  newPosts: number;
}

export interface SystemStatus {
  monitoring: MonitoringStatus;
  reddit: {
    configured: boolean;
  };
  openai: {
    configured: boolean;
  };
}

export const api = {
  // System status
  getStatus: async (): Promise<SystemStatus> => {
    const res = await apiRequest('GET', '/api/status');
    return res.json();
  },

  // Posts
  getPosts: async (limit = 20, offset = 0) => {
    const res = await apiRequest('GET', `/api/posts?limit=${limit}&offset=${offset}`);
    return res.json();
  },

  getPost: async (id: string): Promise<Post> => {
    const res = await apiRequest('GET', `/api/posts/${id}`);
    return res.json();
  },

  updatePost: async (id: string, updates: Partial<Post>): Promise<Post> => {
    const res = await apiRequest('PATCH', `/api/posts/${id}`, updates);
    return res.json();
  },

  postReply: async (id: string, reply?: string) => {
    const res = await apiRequest('POST', `/api/posts/${id}/reply`, { reply });
    return res.json();
  },

  // Monitoring
  startMonitoring: async (subreddits: string[], keywords: string[], scanInterval = 5) => {
    const res = await apiRequest('POST', '/api/monitoring/start', {
      subreddits,
      keywords,
      scanInterval
    });
    return res.json();
  },

  stopMonitoring: async () => {
    const res = await apiRequest('POST', '/api/monitoring/stop');
    return res.json();
  },

  getMonitoringStatus: async (): Promise<MonitoringStatus> => {
    const res = await apiRequest('GET', '/api/monitoring/status');
    return res.json();
  },

  // Configuration
  getConfig: async () => {
    const res = await apiRequest('GET', '/api/config');
    return res.json();
  },

  saveConfig: async (config: { openaiKey: string; redditClientId: string; redditClientSecret: string; redditRefreshToken?: string }) => {
    const res = await apiRequest('POST', '/api/config', config);
    return res.json();
  },

  testConfig: async (config: { openaiKey: string; redditClientId: string; redditClientSecret: string }) => {
    const res = await apiRequest('POST', '/api/config/test', config);
    return res.json();
  },

  // Knowledge base
  getKnowledge: async () => {
    const res = await apiRequest('GET', '/api/knowledge');
    return res.json();
  },

  addKnowledge: async (content: string, tags: string[] = [], source?: string) => {
    const res = await apiRequest('POST', '/api/knowledge', {
      content,
      tags,
      source
    });
    return res.json();
  }
};
