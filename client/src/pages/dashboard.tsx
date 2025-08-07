import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, SystemStatus, Post } from "@/lib/api";
import { wsClient } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import MonitoringControls from "@/components/monitoring-controls";
import PostsFeed from "@/components/posts-feed";
import Sidebar from "@/components/sidebar";
import ConfigurationModal from "@/components/configuration-modal";
import RepliesHistory from "@/components/replies-history";
import PromptEditor from "@/components/prompt-editor";

export default function Dashboard() {
  const [showConfig, setShowConfig] = useState(false);
  const [showRepliesHistory, setShowRepliesHistory] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [websocketStatus, setWebsocketStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [postsOffset, setPostsOffset] = useState(0);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: systemStatus } = useQuery<SystemStatus>({
    queryKey: ['/api/status'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: postsData, isLoading: postsLoading } = useQuery<{posts: Post[], total: number, hasMore: boolean}>({
    queryKey: ['/api/posts', postsOffset],
    queryFn: () => fetch(`/api/posts?limit=20&offset=${postsOffset}`).then(res => res.json()),
    refetchInterval: postsOffset === 0 ? 10000 : false, // Only auto-refresh first page
  });
  
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Merge posts when loading more pages
  useEffect(() => {
    if (postsData?.posts) {
      if (postsOffset === 0) {
        setAllPosts(postsData.posts);
      } else {
        setAllPosts(prev => {
          const newPosts = postsData.posts.filter(
            newPost => !prev.some(existing => existing.id === newPost.id)
          );
          return [...prev, ...newPosts];
        });
      }
    }
  }, [postsData, postsOffset]);
  
  const handleLoadMore = async () => {
    setLoadingMore(true);
    setPostsOffset(prev => prev + 20);
    setTimeout(() => setLoadingMore(false), 1000);
  };
  
  const handleRefreshPosts = () => {
    setPostsOffset(0);
    setAllPosts([]);
    queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
  };

  // WebSocket connection
  useEffect(() => {
    let isMounted = true;

    const handleConnection = (data: { status: string }) => {
      if (!isMounted) return;
      try {
        setWebsocketStatus(data.status as 'connected' | 'disconnected' | 'connecting');
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
      } catch (error) {
        console.warn('Error handling WebSocket connection status:', error);
      }
    };

    const handleNewPost = (post: any) => {
      if (!isMounted) return;
      try {
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/status'] });
        toast({
          title: "New Post Found",
          description: `Found a new post in ${post.subreddit}`,
        });
      } catch (error) {
        console.warn('Error handling new post:', error);
      }
    };

    const handleScanComplete = (data: { totalPosts: number; newPosts: number }) => {
      if (!isMounted) return;
      try {
        queryClient.invalidateQueries({ queryKey: ['/api/status'] });
        if (data.newPosts > 0) {
          queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        }
      } catch (error) {
        console.warn('Error handling scan complete:', error);
      }
    };

    const handleMonitoringStarted = () => {
      if (!isMounted) return;
      try {
        queryClient.invalidateQueries({ queryKey: ['/api/status'] });
        toast({
          title: "Monitoring Started",
          description: "Reddit monitoring is now active",
        });
      } catch (error) {
        console.warn('Error handling monitoring started:', error);
      }
    };

    const handleMonitoringStopped = () => {
      if (!isMounted) return;
      try {
        queryClient.invalidateQueries({ queryKey: ['/api/status'] });
        toast({
          title: "Monitoring Stopped",
          description: "Reddit monitoring has been stopped",
        });
      } catch (error) {
        console.warn('Error handling monitoring stopped:', error);
      }
    };

    wsClient.on('connection', handleConnection);
    wsClient.on('newPost', handleNewPost);
    wsClient.on('scanComplete', handleScanComplete);
    wsClient.on('monitoringStarted', handleMonitoringStarted);
    wsClient.on('monitoringStopped', handleMonitoringStopped);

    // Set initial status safely
    try {
      setWebsocketStatus(wsClient.getConnectionStatus());
    } catch (error) {
      console.warn('Error setting initial WebSocket status:', error);
      setWebsocketStatus('disconnected');
    }

    return () => {
      isMounted = false;
      try {
        wsClient.off('connection', handleConnection);
        wsClient.off('newPost', handleNewPost);
        wsClient.off('scanComplete', handleScanComplete);
        wsClient.off('monitoringStarted', handleMonitoringStarted);
        wsClient.off('monitoringStopped', handleMonitoringStopped);
      } catch (error) {
        console.warn('Error cleaning up WebSocket listeners:', error);
      }
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
                onClick={() => setShowRepliesHistory(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Replies History"
              >
                <i className="fas fa-history text-lg"></i>
              </button>
              <button
                onClick={() => setShowPromptEditor(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit AI Prompt"
              >
                <i className="fas fa-magic text-lg"></i>
              </button>
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
              onRefreshPosts={handleRefreshPosts}
            />
            <PostsFeed 
              posts={allPosts}
              total={postsData?.total || 0}
              isLoading={postsLoading && postsOffset === 0}
              hasMore={postsData?.hasMore}
              onLoadMore={handleLoadMore}
              loadingMore={loadingMore}
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
      <ConfigurationModal 
        isOpen={showConfig}
        onClose={() => setShowConfig(false)} 
      />
      
      {/* Replies History Modal */}
      <RepliesHistory 
        isOpen={showRepliesHistory}
        onClose={() => setShowRepliesHistory(false)}
      />
      
      {/* Prompt Editor Modal */}
      <PromptEditor
        isOpen={showPromptEditor}
        onClose={() => setShowPromptEditor(false)}
      />
    </div>
  );
}
