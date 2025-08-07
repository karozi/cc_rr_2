import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

interface PromptEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PROMPT = `You are an expert Reddit user who provides helpful, engaging responses. 

Post details:
- Subreddit: {subreddit}
- Title: {title}
- Content: {content}
- Knowledge Base: {knowledgeContext}

Generate a helpful reply that:
1. Directly addresses the question or concern
2. Provides actionable advice or insights
3. Is conversational and authentic to Reddit culture
4. Includes specific examples or recommendations when relevant
5. Is concise but comprehensive

Respond with JSON in this format:
{
  "reply": "Your helpful Reddit reply here",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this reply is appropriate"
}`;

export default function PromptEditor({ isOpen, onClose }: PromptEditorProps) {
  const [promptText, setPromptText] = useState('');
  const [isModified, setIsModified] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load current prompt
  const { data: currentPrompt, isLoading } = useQuery({
    queryKey: ['/api/prompt'],
    queryFn: () => fetch('/api/prompt').then(res => res.json()),
    enabled: isOpen,
  });

  // Update form when prompt loads
  useEffect(() => {
    if (currentPrompt?.prompt) {
      setPromptText(currentPrompt.prompt);
      setIsModified(false);
    } else if (!isLoading && !currentPrompt) {
      setPromptText(DEFAULT_PROMPT);
      setIsModified(false);
    }
  }, [currentPrompt, isLoading]);

  // Track modifications
  useEffect(() => {
    if (currentPrompt?.prompt && promptText !== currentPrompt.prompt) {
      setIsModified(true);
    } else if (!currentPrompt?.prompt && promptText !== DEFAULT_PROMPT) {
      setIsModified(true);
    } else {
      setIsModified(false);
    }
  }, [promptText, currentPrompt]);

  const savePromptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/prompt', { prompt: promptText });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompt'] });
      setIsModified(false);
      toast({
        title: "Prompt Saved",
        description: "AI response prompt has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Save Prompt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPromptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/prompt/reset');
      return res.json();
    },
    onSuccess: (data) => {
      setPromptText(data.prompt);
      queryClient.invalidateQueries({ queryKey: ['/api/prompt'] });
      setIsModified(false);
      toast({
        title: "Prompt Reset",
        description: "Prompt has been reset to default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Reset Prompt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!promptText.trim()) {
      toast({
        title: "Empty Prompt",
        description: "Prompt cannot be empty",
        variant: "destructive",
      });
      return;
    }
    savePromptMutation.mutate();
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the prompt to default? This will lose any custom changes.')) {
      resetPromptMutation.mutate();
    }
  };

  const getVariables = () => {
    const variables = ['{subreddit}', '{title}', '{content}', '{knowledgeContext}'];
    return variables.filter(variable => promptText.includes(variable));
  };

  const getMissingVariables = () => {
    const requiredVariables = ['{subreddit}', '{title}', '{content}'];
    return requiredVariables.filter(variable => !promptText.includes(variable));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <i className="fas fa-magic text-[hsl(var(--primary-500))] mr-2"></i>
            AI Response Prompt Editor
            {isModified && (
              <Badge variant="outline" className="ml-3 text-[hsl(var(--warning-600))]">
                <i className="fas fa-exclamation-circle mr-1"></i>
                Unsaved Changes
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-[hsl(var(--primary-50))] border border-[hsl(var(--primary-200))] rounded-lg p-4">
            <h4 className="font-medium text-[hsl(var(--primary-800))] mb-2">
              <i className="fas fa-info-circle mr-2"></i>
              How to Use
            </h4>
            <ul className="text-sm text-[hsl(var(--primary-700))] space-y-1">
              <li>• Use variables in curly braces: <code className="bg-white px-1 rounded">{'{title}'}</code>, <code className="bg-white px-1 rounded">{'{content}'}</code>, <code className="bg-white px-1 rounded">{'{subreddit}'}</code>, <code className="bg-white px-1 rounded">{'{knowledgeContext}'}</code></li>
              <li>• The prompt must request JSON output with "reply", "confidence", and "reasoning" fields</li>
              <li>• Keep it clear and specific to get better AI responses</li>
              <li>• Test changes with the configuration modal's API test feature</li>
            </ul>
          </div>

          {/* Variable Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Variables Found:</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {getVariables().length > 0 ? (
                  getVariables().map(variable => (
                    <Badge key={variable} variant="default" className="text-xs">
                      {variable}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">None</span>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Missing Required:</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {getMissingVariables().length > 0 ? (
                  getMissingVariables().map(variable => (
                    <Badge key={variable} variant="destructive" className="text-xs">
                      {variable}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-[hsl(var(--success-600))]">
                    <i className="fas fa-check mr-1"></i>All required variables present
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Prompt Editor */}
          <div>
            <Label htmlFor="prompt-text">Prompt Template</Label>
            <Textarea
              id="prompt-text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="h-64 font-mono text-sm resize-none mt-2"
              placeholder="Enter your custom prompt template..."
            />
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
              <span>{promptText.length} characters</span>
              <span className={promptText.length > 2000 ? 'text-[hsl(var(--warning-600))]' : ''}>
                {promptText.length > 2000 ? 'Very long prompt may affect performance' : 'Good length'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              <i className="fas fa-times mr-2"></i>
              Cancel
            </Button>
            <Button 
              onClick={handleReset}
              disabled={resetPromptMutation.isPending}
              variant="outline"
              className="flex-1"
            >
              {resetPromptMutation.isPending ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i>Resetting...</>
              ) : (
                <><i className="fas fa-undo mr-2"></i>Reset to Default</>
              )}
            </Button>
            <Button 
              onClick={handleSave}
              disabled={savePromptMutation.isPending || !isModified || getMissingVariables().length > 0}
              className="flex-1 bg-[hsl(var(--primary-500))] hover:bg-[hsl(var(--primary-600))]"
            >
              {savePromptMutation.isPending ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i>Saving...</>
              ) : (
                <><i className="fas fa-save mr-2"></i>Save Prompt</>
              )}
            </Button>
          </div>

          {/* Preview */}
          {isModified && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Preview with Sample Data:</h4>
              <div className="text-sm text-gray-700 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                {promptText
                  .replace('{subreddit}', 'r/javascript')
                  .replace('{title}', 'How do I handle async functions in React?')
                  .replace('{content}', 'I\'m struggling with useEffect and async operations...')
                  .replace('{knowledgeContext}', 'React hooks documentation: useEffect should not be async...')
                }
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}