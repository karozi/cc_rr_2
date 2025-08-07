import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Post } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RepliesHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RepliesHistory({ isOpen, onClose }: RepliesHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const { data: allPosts = [], isLoading } = useQuery<Post[]>({
    queryKey: ['/api/posts/all'],
    queryFn: () => fetch('/api/posts?limit=1000&posted=true').then(res => res.json()).then(data => data.posts),
    enabled: isOpen,
  });

  // Filter only posted replies
  const postedReplies = allPosts.filter(post => post.posted && post.proposedReply);

  // Apply search and sort
  const filteredReplies = postedReplies
    .filter(post =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.subreddit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.proposedReply?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'subreddit':
          return a.subreddit.localeCompare(b.subreddit);
        case 'confidence':
          return b.confidence - a.confidence;
        default:
          return 0;
      }
    });

  const getSuccessRate = () => {
    if (postedReplies.length === 0) return 0;
    return Math.round((postedReplies.length / allPosts.length) * 100);
  };

  const getAverageConfidence = () => {
    if (postedReplies.length === 0) return 0;
    const total = postedReplies.reduce((sum, post) => sum + post.confidence, 0);
    return Math.round((total / postedReplies.length) * 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <i className="fas fa-history text-[hsl(var(--primary-500))] mr-2"></i>
            Posted Replies History ({postedReplies.length} replies)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-[hsl(var(--primary-600))]">
                  {postedReplies.length}
                </div>
                <div className="text-sm text-gray-600">Total Replies</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-[hsl(var(--success-500))]">
                  {getSuccessRate()}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-[hsl(var(--warning-500))]">
                  {getAverageConfidence()}%
                </div>
                <div className="text-sm text-gray-600">Avg Confidence</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Sort Controls */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search replies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="subreddit">By Subreddit</SelectItem>
                <SelectItem value="confidence">By Confidence</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Replies List */}
          <div className="max-h-[50vh] overflow-y-auto space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <i className="fas fa-spinner fa-spin text-2xl text-gray-400 mb-4"></i>
                <p className="text-gray-500">Loading reply history...</p>
              </div>
            ) : filteredReplies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No matching replies found' : 'No posted replies yet'}
              </div>
            ) : (
              filteredReplies.map((post) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="bg-[hsl(var(--primary-100))] text-[hsl(var(--primary-700))]">
                          {post.subreddit}
                        </Badge>
                        <span className="text-sm text-gray-500">{post.author}</span>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-500">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="default"
                          className="bg-[hsl(var(--success-500))] text-white"
                        >
                          <i className="fas fa-check mr-1"></i>
                          Posted
                        </Badge>
                        <Badge variant="outline">
                          {Math.round(post.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </div>

                    {/* Original Post */}
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 mb-1">{post.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                    </div>

                    {/* Posted Reply */}
                    <div className="bg-[hsl(var(--primary-50))] rounded-lg p-3 mb-3">
                      <div className="flex items-center mb-2">
                        <i className="fas fa-reply text-[hsl(var(--primary-500))] mr-2"></i>
                        <span className="text-sm font-medium text-gray-700">Your Reply</span>
                      </div>
                      <p className="text-sm text-gray-800">{post.proposedReply}</p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span><i className="fas fa-arrow-up mr-1"></i>{post.upvotes}</span>
                        <span><i className="fas fa-comment mr-1"></i>{post.comments}</span>
                        <div className="flex flex-wrap gap-1">
                          {post.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                          {post.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{post.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      <a
                        href={post.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[hsl(var(--primary-500))] hover:text-[hsl(var(--primary-600))] text-sm"
                      >
                        <i className="fas fa-external-link-alt mr-1"></i>View on Reddit
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}