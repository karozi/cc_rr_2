import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import MonitoringControls from "@/components/monitoring-controls";
import PostsFeed from "@/components/posts-feed";
import Sidebar from "@/components/sidebar";
import ConfigurationModal from "@/components/configuration-modal";

export default function Dashboard() {
  const [showConfig, setShowConfig] = useState(false);
  const [websocketStatus, setWebsocketStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: systemStatus } = useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['/api/posts'],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // WebSocket connection
  useEffect(() => {
    const handleConnection = (data: { status: string }) => {
      setWebsocketStatus(data.status as any);
      if (data.status === 'connected') {
        toast({
          title: "Connected",
          description: "Real-time updates are now active",
        });
      } else if (data.status === 'disconnected') {
        toast({
          title: "Disconnected",
          description: "Real-time updates are unavailable",
          variant: "destructive",
        });
      }
    };

    const handleNewPost = (post: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      toast({
        title: "New Post Found",
        description: `Found a new post in ${post.subreddit}`,
      });
    };

    const handleScanComplete = (data: { totalPosts: number; newPosts: number }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      if (data.newPosts > 0) {
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      }
    };

    const handleMonitoringStarted = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      toast({
        title: "Monitoring Started",
        description: "Reddit monitoring is now active",
      });
    };

    const handleMonitoringStopped = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      toast({
        title: "Monitoring Stopped",
        description: "Reddit monitoring has been stopped",
      });
    };

    wsClient.on('connection', handleConnection);
    wsClient.on('newPost', handleNewPost);
    wsClient.on('scanComplete', handleScanComplete);
    wsClient.on('monitoringStarted', handleMonitoringStarted);
    wsClient.on('monitoringStopped', handleMonitoringStopped);

    // Set initial status
    setWebsocketStatus(wsClient.getConnectionStatus());

    return () => {
      wsClient.off('connection', handleConnection);
      wsClient.off('newPost', handleNewPost);
      wsClient.off('scanComplete', handleScanComplete);
      wsClient.off('monitoringStarted', handleMonitoringStarted);
      wsClient.off('monitoringStopped', handleMonitoringStopped);
    };
  }, [toast, queryClient]);

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[hsl(var(--primary-500))] rounded-lg flex items-center justify-center">
                  <i className="fab fa-reddit-alien text-white text-lg"></i>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Reddit Outreach Agent</h1>
              </div>
              <div className="hidden md:flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full status-indicator ${
                  websocketStatus === 'connected' ? 'bg-[hsl(var(--success-500))]' : 'bg-[hsl(var(--error-500))]'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {websocketStatus === 'connected' ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <i className="fas fa-cog text-lg"></i>
              </button>
              <div className="flex items-center space-x-2">
                <div className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                  systemStatus?.monitoring?.isActive ? 'monitoring-active' : 'monitoring-inactive'
                }`}>
                  {systemStatus?.monitoring?.isActive ? 'Monitoring Active' : 'Monitoring Inactive'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <MonitoringControls 
              monitoring={systemStatus?.monitoring}
              onRefreshPosts={() => queryClient.invalidateQueries({ queryKey: ['/api/posts'] })}
            />
            <PostsFeed 
              posts={postsData?.posts || []}
              total={postsData?.total || 0}
              isLoading={postsLoading}
            />
          </div>

          {/* Sidebar */}
          <Sidebar 
            systemStatus={systemStatus}
            websocketStatus={websocketStatus}
          />
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfig && (
        <ConfigurationModal onClose={() => setShowConfig(false)} />
      )}
    </div>
  );
}
