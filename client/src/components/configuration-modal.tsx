import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConfigStatus {
  openai: boolean;
  reddit: boolean;
  errors: string[];
}

export default function ConfigurationModal({ isOpen, onClose }: ConfigurationModalProps) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [redditClientId, setRedditClientId] = useState('');
  const [redditClientSecret, setRedditClientSecret] = useState('');
  const [redditRefreshToken, setRedditRefreshToken] = useState('');
  const [testResults, setTestResults] = useState<ConfigStatus | null>(null);

  const { toast } = useToast();
  
  // Load current configuration
  const { data: currentConfig } = useQuery({
    queryKey: ['/api/config'],
    queryFn: api.getConfig,
    enabled: isOpen,
  });
  
  // Update form when config loads
  useEffect(() => {
    if (currentConfig) {
      // Don't overwrite if user has already entered values
      if (!openaiKey && currentConfig.openaiKeyPartial) {
        // Show partial key as placeholder
      }
      if (!redditClientId && currentConfig.redditClientIdPartial) {
        // Show partial client ID as placeholder
      }
    }
  }, [currentConfig]);
  
  const testConfigMutation = useMutation({
    mutationFn: () => api.testConfig({ openaiKey, redditClientId, redditClientSecret }),
    onSuccess: (results) => {
      setTestResults(results);
      if (results.openai && results.reddit) {
        toast({
          title: "Configuration Test Successful",
          description: "All API connections are working correctly",
        });
      } else {
        toast({
          title: "Configuration Test Issues",
          description: `${results.errors.length} error(s) found`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const saveConfigMutation = useMutation({
    mutationFn: () => api.saveConfig({
      openaiKey,
      redditClientId,
      redditClientSecret,
      redditRefreshToken: redditRefreshToken || undefined
    }),
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Please restart the server for changes to take effect",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Save Configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTest = () => {
    if (!openaiKey || !redditClientId || !redditClientSecret) {
      toast({
        title: "Missing Configuration",
        description: "API keys are required for testing",
        variant: "destructive",
      });
      return;
    }
    testConfigMutation.mutate();
  };

  const handleSave = () => {
    if (!openaiKey || !redditClientId || !redditClientSecret) {
      toast({
        title: "Missing Configuration",
        description: "All required fields must be filled",
        variant: "destructive",
      });
      return;
    }
    saveConfigMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <i className="fas fa-cog text-[hsl(var(--primary-500))] mr-2"></i>
            Configuration
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Current Status */}
          {currentConfig && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Current Configuration</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>OpenAI API Key:</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant={currentConfig.openaiKey ? 'default' : 'destructive'}>
                      {currentConfig.openaiKey ? 'Configured' : 'Not Set'}
                    </Badge>
                    {currentConfig.openaiKeyPartial && (
                      <span className="text-gray-500">{currentConfig.openaiKeyPartial}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Reddit Client ID:</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant={currentConfig.redditClientId ? 'default' : 'destructive'}>
                      {currentConfig.redditClientId ? 'Configured' : 'Not Set'}
                    </Badge>
                    {currentConfig.redditClientIdPartial && (
                      <span className="text-gray-500">{currentConfig.redditClientIdPartial}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Reddit Client Secret:</span>
                  <Badge variant={currentConfig.redditClientSecret ? 'default' : 'destructive'}>
                    {currentConfig.redditClientSecret ? 'Configured' : 'Not Set'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Reddit Refresh Token:</span>
                  <Badge variant={currentConfig.redditRefreshToken ? 'default' : 'secondary'}>
                    {currentConfig.redditRefreshToken ? 'Configured' : 'Optional'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          
          {/* Form Fields */}
          <div>
            <Label htmlFor="openai-key">OpenAI API Key *</Label>
            <Input
              id="openai-key"
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder={currentConfig?.openaiKeyPartial || "sk-..."}
            />
            <p className="text-xs text-gray-500 mt-1">Required for AI response generation</p>
          </div>
          <div>
            <Label htmlFor="reddit-client-id">Reddit Client ID *</Label>
            <Input
              id="reddit-client-id"
              type="text"
              value={redditClientId}
              onChange={(e) => setRedditClientId(e.target.value)}
              placeholder={currentConfig?.redditClientIdPartial || "Enter Reddit Client ID"}
            />
          </div>
          <div>
            <Label htmlFor="reddit-client-secret">Reddit Client Secret *</Label>
            <Input
              id="reddit-client-secret"
              type="password"
              value={redditClientSecret}
              onChange={(e) => setRedditClientSecret(e.target.value)}
              placeholder="Enter Reddit Client Secret"
            />
          </div>
          <div>
            <Label htmlFor="reddit-refresh-token">Reddit Refresh Token</Label>
            <Input
              id="reddit-refresh-token"
              type="password"
              value={redditRefreshToken}
              onChange={(e) => setRedditRefreshToken(e.target.value)}
              placeholder="Optional - for posting replies"
            />
            <p className="text-xs text-gray-500 mt-1">Required only for posting replies to Reddit</p>
          </div>
          
          {/* Test Results */}
          {testResults && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Test Results</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">OpenAI API:</span>
                  <Badge variant={testResults.openai ? 'default' : 'destructive'}>
                    {testResults.openai ? 'Working' : 'Failed'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Reddit API:</span>
                  <Badge variant={testResults.reddit ? 'default' : 'destructive'}>
                    {testResults.reddit ? 'Working' : 'Failed'}
                  </Badge>
                </div>
                {testResults.errors.length > 0 && (
                  <div className="mt-2">
                    <h5 className="text-sm font-medium text-red-600 mb-1">Errors:</h5>
                    {testResults.errors.map((error, index) => (
                      <p key={index} className="text-xs text-red-600">{error}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex space-x-3 mt-6">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleTest}
            disabled={testConfigMutation.isPending || (!openaiKey && !redditClientId)}
            variant="outline"
            className="flex-1"
          >
            {testConfigMutation.isPending ? (
              <><i className="fas fa-spinner fa-spin mr-2"></i>Testing...</>
            ) : (
              <><i className="fas fa-flask mr-2"></i>Test Config</>
            )}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveConfigMutation.isPending}
            className="flex-1 bg-[hsl(var(--primary-500))] hover:bg-[hsl(var(--primary-600))]"
          >
            {saveConfigMutation.isPending ? (
              <><i className="fas fa-spinner fa-spin mr-2"></i>Saving...</>
            ) : (
              <><i className="fas fa-save mr-2"></i>Save</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
