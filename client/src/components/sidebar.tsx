import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, SystemStatus } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  systemStatus?: SystemStatus;
  websocketStatus: 'connected' | 'disconnected' | 'connecting';
}

export default function Sidebar({ systemStatus, websocketStatus }: SidebarProps) {
  const [knowledgeText, setKnowledgeText] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addKnowledgeMutation = useMutation({
    mutationFn: () => api.addKnowledge(knowledgeText.trim()),
    onSuccess: () => {
      setKnowledgeText('');
      toast({
        title: "Knowledge Added",
        description: "Content added to knowledge base successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Knowledge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddKnowledge = () => {
    if (knowledgeText.trim()) {
      addKnowledgeMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">WebSocket</span>
            <Badge
              variant={websocketStatus === 'connected' ? 'default' : 'destructive'}
              className={websocketStatus === 'connected' 
                ? 'bg-[hsl(var(--success-500))] text-white' 
                : 'bg-[hsl(var(--error-500))] text-white'
              }
            >
              {websocketStatus}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Reddit API</span>
            <Badge
              variant={systemStatus?.reddit?.configured ? 'default' : 'destructive'}
              className={systemStatus?.reddit?.configured 
                ? 'bg-[hsl(var(--success-500))] text-white' 
                : 'bg-[hsl(var(--error-500))] text-white'
              }
            >
              {systemStatus?.reddit?.configured ? 'Connected' : 'Not Configured'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">OpenAI API</span>
            <Badge
              variant={systemStatus?.openai?.configured ? 'default' : 'destructive'}
              className={systemStatus?.openai?.configured 
                ? 'bg-[hsl(var(--success-500))] text-white' 
                : 'bg-[hsl(var(--error-500))] text-white'
              }
            >
              {systemStatus?.openai?.configured ? 'Connected' : 'Not Configured'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <i className="fas fa-brain text-[hsl(var(--primary-500))] mr-2"></i>
            Knowledge Base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Add content to improve AI responses
          </p>
          <Textarea
            value={knowledgeText}
            onChange={(e) => setKnowledgeText(e.target.value)}
            placeholder="Enter knowledge base content..."
            className="h-24 text-sm resize-none"
          />
          <Button
            onClick={handleAddKnowledge}
            disabled={!knowledgeText.trim() || addKnowledgeMutation.isPending}
            className="w-full bg-[hsl(var(--primary-500))] hover:bg-[hsl(var(--primary-600))]"
            size="sm"
          >
            <i className="fas fa-plus mr-2"></i>
            Add to Knowledge Base
          </Button>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Posts Today</span>
            <span className="text-sm font-medium text-gray-900">{systemStatus?.monitoring?.totalPosts || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">New Posts</span>
            <span className="text-sm font-medium text-gray-900">{systemStatus?.monitoring?.newPosts || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Monitoring</span>
            <span className={`text-sm font-medium ${
              systemStatus?.monitoring?.isActive ? 'text-[hsl(var(--success-500))]' : 'text-gray-900'
            }`}>
              {systemStatus?.monitoring?.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Subreddits</span>
            <span className="text-sm font-medium text-gray-900">
              {systemStatus?.monitoring?.subreddits?.length || 0}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
