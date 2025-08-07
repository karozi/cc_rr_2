import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Post } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PostsFeedProps {
  posts: Post[];
  total: number;
  isLoading: boolean;
}

export default function PostsFeed({ posts, total, isLoading }: PostsFeedProps) {
  const [filter, setFilter] = useState('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const postReplyMutation = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply?: string }) => api.postReply(id, reply),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: "Reply Posted",
        description: "Your reply has been posted to Reddit successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Post Reply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Post> }) => api.updatePost(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
  });

  const handlePostAction = (post: Post, action: 'post' | 'edit' | 'skip') => {
    if (action === 'post') {
      postReplyMutation.mutate({ id: post.id });
    } else if (action === 'skip') {
      // Just mark as skipped locally for now
      console.log(`Skipped post ${post.id}`);
    } else if (action === 'edit') {
      // TODO: Implement edit modal
      console.log(`Edit post ${post.id}`);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'high') return post.priority === 'high';
    if (filter === 'unresponded') return !post.posted;
    return true;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <i className="fas fa-spinner fa-spin text-2xl text-gray-400 mb-4"></i>
            <p className="text-gray-500">Loading posts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <i className="fas fa-comments text-[hsl(var(--primary-500))] mr-2"></i>
            Monitored Posts ({filteredPosts.length})
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Posts</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="unresponded">Unresponded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-8 px-6 text-gray-500">
            <i className="fas fa-comments text-4xl text-gray-300 mb-4"></i>
            <p>No posts found. Start monitoring to see results!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  post.highlighted ? 'bg-[hsl(var(--primary-50))] border-l-4 border-l-[hsl(var(--primary-500))]' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-[hsl(var(--primary-600))]">{post.subreddit}</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">{post.author}</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        post.priority === 'high' ? 'destructive' :
                        post.priority === 'medium' ? 'default' : 'secondary'
                      }
                    >
                      {post.priority} priority
                    </Badge>
                    <div className="text-sm text-gray-500">
                      Score: {post.score.toFixed(2)}
                    </div>
                  </div>
                </div>

                <h3 className="text-base font-medium text-gray-900 mb-2">{post.title}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">{post.content}</p>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span><i className="fas fa-arrow-up mr-1"></i>{post.upvotes}</span>
                    <span><i className="fas fa-comment mr-1"></i>{post.comments}</span>
                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[hsl(var(--primary-500))] hover:text-[hsl(var(--primary-600))]"
                    >
                      <i className="fas fa-external-link-alt mr-1"></i>View Post
                    </a>
                  </div>
                  <div className="text-xs text-gray-500">
                    {post.matchReason}
                  </div>
                </div>

                {post.proposedReply && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 flex items-center">
                        <i className="fas fa-robot text-[hsl(var(--primary-500))] mr-2"></i>
                        AI-Generated Reply (Confidence: {(post.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{post.proposedReply}</p>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handlePostAction(post, 'post')}
                        disabled={post.posted || postReplyMutation.isPending}
                        size="sm"
                        className={post.posted ? 'bg-[hsl(var(--success-500))] cursor-not-allowed' : 'bg-[hsl(var(--primary-500))] hover:bg-[hsl(var(--primary-600))]'}
                      >
                        {post.posted ? (
                          <><i className="fas fa-check mr-1"></i>Posted</>
                        ) : (
                          <><i className="fas fa-paper-plane mr-1"></i>Post Reply</>
                        )}
                      </Button>
                      <Button
                        onClick={() => handlePostAction(post, 'edit')}
                        variant="outline"
                        size="sm"
                      >
                        <i className="fas fa-edit mr-1"></i>Edit
                      </Button>
                      <Button
                        onClick={() => handlePostAction(post, 'skip')}
                        variant="outline"
                        size="sm"
                      >
                        <i className="fas fa-times mr-1"></i>Skip
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="bg-[hsl(var(--primary-100))] text-[hsl(var(--primary-700))]">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
