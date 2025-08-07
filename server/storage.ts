import { type User, type InsertUser, type Post, type InsertPost, type MonitoringConfig, type InsertMonitoringConfig, type KnowledgeBase, type InsertKnowledgeBase } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getPosts(limit?: number, offset?: number): Promise<{ posts: Post[], total: number }>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined>;
  deletePost(id: string): Promise<boolean>;
  
  getMonitoringConfig(): Promise<MonitoringConfig | undefined>;
  createOrUpdateMonitoringConfig(config: InsertMonitoringConfig): Promise<MonitoringConfig>;
  
  getKnowledgeBase(): Promise<KnowledgeBase[]>;
  createKnowledgeBase(knowledge: InsertKnowledgeBase): Promise<KnowledgeBase>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private posts: Map<string, Post>;
  private monitoringConfig: MonitoringConfig | undefined;
  private knowledgeBase: Map<string, KnowledgeBase>;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.knowledgeBase = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getPosts(limit = 20, offset = 0): Promise<{ posts: Post[], total: number }> {
    const allPosts = Array.from(this.posts.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
    const posts = allPosts.slice(offset, offset + limit);
    return { posts, total: allPosts.length };
  }

  async getPost(id: string): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = randomUUID();
    const post: Post = { 
      ...insertPost, 
      id, 
      createdAt: new Date() 
    };
    this.posts.set(id, post);
    return post;
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    
    const updatedPost = { ...post, ...updates };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async deletePost(id: string): Promise<boolean> {
    return this.posts.delete(id);
  }

  async getMonitoringConfig(): Promise<MonitoringConfig | undefined> {
    return this.monitoringConfig;
  }

  async createOrUpdateMonitoringConfig(config: InsertMonitoringConfig): Promise<MonitoringConfig> {
    const id = this.monitoringConfig?.id || randomUUID();
    this.monitoringConfig = {
      ...config,
      id,
      createdAt: this.monitoringConfig?.createdAt || new Date(),
    };
    return this.monitoringConfig;
  }

  async getKnowledgeBase(): Promise<KnowledgeBase[]> {
    return Array.from(this.knowledgeBase.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createKnowledgeBase(insertKnowledge: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const id = randomUUID();
    const knowledge: KnowledgeBase = {
      ...insertKnowledge,
      id,
      createdAt: new Date(),
    };
    this.knowledgeBase.set(id, knowledge);
    return knowledge;
  }
}

export const storage = new MemStorage();
