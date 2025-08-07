import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, MonitoringStatus } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MonitoringControlsProps {
  monitoring?: MonitoringStatus;
  onRefreshPosts: () => void;
}

export default function MonitoringControls({ monitoring, onRefreshPosts }: MonitoringControlsProps) {
  const [subreddits, setSubreddits] = useState('javascript,webdev,reactjs,programming');
  const [keywords, setKeywords] = useState('react,nodejs,api,help,question');
  const [scanInterval, setScanInterval] = useState(5);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startMonitoringMutation = useMutation({
    mutationFn: () => api.startMonitoring(
      subreddits.split(',').map(s => s.trim()),
      keywords.split(',').map(k => k.trim()),
      scanInterval
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      toast({
        title: "Monitoring Started",
        description: "Reddit monitoring is now active",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Start Monitoring",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopMonitoringMutation = useMutation({
    mutationFn: api.stopMonitoring,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      toast({
        title: "Monitoring Stopped",
        description: "Reddit monitoring has been stopped",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Stop Monitoring",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center">
          <i className="fas fa-radar text-[hsl(var(--primary-500))] mr-2"></i>
          Monitoring Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="subreddits">Subreddits</Label>
            <Input
              id="subreddits"
              type="text"
              value={subreddits}
              onChange={(e) => setSubreddits(e.target.value)}
              placeholder="javascript,webdev,reactjs"
              disabled={monitoring?.isActive}
            />
          </div>
          <div>
            <Label htmlFor="keywords">Keywords</Label>
            <Input
              id="keywords"
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="react,nodejs,api,help"
              disabled={monitoring?.isActive}
            />
          </div>
          <div>
            <Label htmlFor="scanInterval">Scan Interval</Label>
            <Select 
              value={scanInterval.toString()} 
              onValueChange={(value) => setScanInterval(Number(value))}
              disabled={monitoring?.isActive}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 minute</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-4">
          {monitoring?.isActive ? (
            <Button
              onClick={() => stopMonitoringMutation.mutate()}
              disabled={stopMonitoringMutation.isPending}
              variant="destructive"
            >
              <i className="fas fa-stop mr-2"></i>
              Stop
            </Button>
          ) : (
            <Button
              onClick={() => startMonitoringMutation.mutate()}
              disabled={startMonitoringMutation.isPending}
              className="bg-[hsl(var(--primary-500))] hover:bg-[hsl(var(--primary-600))]"
            >
              <i className="fas fa-play mr-2"></i>
              Start Monitoring
            </Button>
          )}
          <Button onClick={onRefreshPosts} variant="outline">
            <i className="fas fa-sync-alt mr-2"></i>
            Refresh Posts
          </Button>
          <Button 
            onClick={() => {
              fetch('/api/sample-data', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                  toast({
                    title: "Sample Data Created",
                    description: data.message || 'Sample posts added successfully',
                  });
                  onRefreshPosts();
                })
                .catch(error => {
                  toast({
                    title: "Failed to Create Sample Data",
                    description: error.message,
                    variant: "destructive",
                  });
                });
            }}
            variant="outline"
            className="bg-blue-50 hover:bg-blue-100 border-blue-200"
          >
            <i className="fas fa-vial mr-2"></i>
            Add Sample Posts
          </Button>
        </div>

        {monitoring?.isActive && (
          <div className="bg-[hsl(var(--primary-50))] rounded-lg p-4 slide-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-[hsl(var(--primary-600))]">{monitoring.totalPosts}</div>
                <div className="text-sm text-gray-600">Total Posts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[hsl(var(--success-500))]">{monitoring.newPosts}</div>
                <div className="text-sm text-gray-600">New Posts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[hsl(var(--warning-500))]">{monitoring.subreddits.length}</div>
                <div className="text-sm text-gray-600">Subreddits</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Last Scan</div>
                <div className="text-sm text-gray-600">
                  {monitoring.lastScanTime 
                    ? new Date(monitoring.lastScanTime).toLocaleTimeString()
                    : 'Never'
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
