import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ConfigurationModalProps {
  onClose: () => void;
}

export default function ConfigurationModal({ onClose }: ConfigurationModalProps) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [redditClientId, setRedditClientId] = useState('');
  const [redditClientSecret, setRedditClientSecret] = useState('');

  const handleSave = () => {
    // TODO: Implement API call to save configuration
    console.log('Saving configuration:', {
      openaiKey,
      redditClientId,
      redditClientSecret
    });
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <i className="fas fa-cog text-[hsl(var(--primary-500))] mr-2"></i>
            Configuration
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="openai-key">OpenAI API Key</Label>
            <Input
              id="openai-key"
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <div>
            <Label htmlFor="reddit-client-id">Reddit Client ID</Label>
            <Input
              id="reddit-client-id"
              type="text"
              value={redditClientId}
              onChange={(e) => setRedditClientId(e.target.value)}
              placeholder="Enter Reddit Client ID"
            />
          </div>
          <div>
            <Label htmlFor="reddit-client-secret">Reddit Client Secret</Label>
            <Input
              id="reddit-client-secret"
              type="password"
              value={redditClientSecret}
              onChange={(e) => setRedditClientSecret(e.target.value)}
              placeholder="Enter Reddit Client Secret"
            />
          </div>
        </div>
        <div className="flex space-x-3 mt-6">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="flex-1 bg-[hsl(var(--primary-500))] hover:bg-[hsl(var(--primary-600))]"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
