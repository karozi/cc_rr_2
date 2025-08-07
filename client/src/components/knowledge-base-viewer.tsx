import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface KnowledgeBaseItem {
  id: string;
  content: string;
  tags: string[];
  source?: string;
  createdAt: string;
}

interface KnowledgeBaseViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KnowledgeBaseViewer({ isOpen, onClose }: KnowledgeBaseViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<KnowledgeBaseItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editSource, setEditSource] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: knowledgeItems = [], isLoading } = useQuery<KnowledgeBaseItem[]>({
    queryKey: ['/api/knowledge'],
    enabled: isOpen,
  });

  const deleteKnowledgeMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/knowledge/${id}`, { method: 'DELETE' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge'] });
      toast({
        title: "Knowledge Deleted",
        description: "Knowledge base entry has been deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Delete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateKnowledgeMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<KnowledgeBaseItem> }) => 
      fetch(`/api/knowledge/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge'] });
      setEditingItem(null);
      toast({
        title: "Knowledge Updated",
        description: "Knowledge base entry has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (item: KnowledgeBaseItem) => {
    setEditingItem(item);
    setEditContent(item.content);
    setEditTags(item.tags.join(', '));
    setEditSource(item.source || '');
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    updateKnowledgeMutation.mutate({
      id: editingItem.id,
      updates: {
        content: editContent.trim(),
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        source: editSource.trim() || undefined,
      }
    });
  };

  const handleDelete = (item: KnowledgeBaseItem) => {
    if (window.confirm('Are you sure you want to delete this knowledge base entry?')) {
      deleteKnowledgeMutation.mutate(item.id);
    }
  };

  const filteredItems = knowledgeItems.filter(item =>
    item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.source && item.source.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <i className="fas fa-brain text-[hsl(var(--primary-500))] mr-2"></i>
            Knowledge Base ({knowledgeItems.length} entries)
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div>
            <Input
              placeholder="Search knowledge base..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Content */}
          <div className="max-h-[50vh] overflow-y-auto space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <i className="fas fa-spinner fa-spin text-2xl text-gray-400 mb-4"></i>
                <p className="text-gray-500">Loading knowledge base...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No matching entries found' : 'No knowledge base entries yet'}
              </div>
            ) : (
              filteredItems.map((item) => (
                <Card key={item.id} className="relative">
                  <CardContent className="p-4">
                    {editingItem?.id === item.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="h-24 resize-none"
                        />
                        <Input
                          placeholder="Tags (comma separated)"
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                        />
                        <Input
                          placeholder="Source (optional)"
                          value={editSource}
                          onChange={(e) => setEditSource(e.target.value)}
                        />
                        <div className="flex space-x-2">
                          <Button
                            onClick={handleSaveEdit}
                            disabled={updateKnowledgeMutation.isPending}
                            size="sm"
                            className="bg-[hsl(var(--primary-500))] hover:bg-[hsl(var(--primary-600))]"
                          >
                            <i className="fas fa-save mr-1"></i>Save
                          </Button>
                          <Button
                            onClick={() => setEditingItem(null)}
                            variant="outline"
                            size="sm"
                          >
                            <i className="fas fa-times mr-1"></i>Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm text-gray-500">
                            {new Date(item.createdAt).toLocaleDateString()}
                            {item.source && <span className="ml-2">• {item.source}</span>}
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              onClick={() => handleEdit(item)}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <i className="fas fa-edit text-xs"></i>
                            </Button>
                            <Button
                              onClick={() => handleDelete(item)}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              disabled={deleteKnowledgeMutation.isPending}
                            >
                              <i className="fas fa-trash text-xs"></i>
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-900 mb-2">{item.content}</p>
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </>
                    )}
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