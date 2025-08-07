import { Post } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PostConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  post: Post | null;
  replyText: string;
  isPosting: boolean;
}

export default function PostConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  post, 
  replyText,
  isPosting 
}: PostConfirmationDialogProps) {
  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <i className="fas fa-paper-plane text-[hsl(var(--primary-500))] mr-2"></i>
            Confirm Reddit Reply
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="bg-[hsl(var(--warning-50))] border border-[hsl(var(--warning-200))] rounded-lg p-4">
            <div className="flex items-start">
              <i className="fas fa-exclamation-triangle text-[hsl(var(--warning-500))] mr-3 mt-0.5"></i>
              <div>
                <h4 className="font-medium text-[hsl(var(--warning-800))] mb-1">
                  You are about to post to Reddit
                </h4>
                <p className="text-sm text-[hsl(var(--warning-700))]">
                  This action cannot be undone. Please review your reply carefully before posting.
                </p>
              </div>
            </div>
          </div>

          {/* Original Post */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center space-x-3 mb-3">
              <Badge variant="outline" className="bg-[hsl(var(--primary-100))] text-[hsl(var(--primary-700))]">
                {post.subreddit}
              </Badge>
              <span className="text-sm text-gray-600">{post.author}</span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-500">
                {post.upvotes} upvotes, {post.comments} comments
              </span>
            </div>
            <h4 className="font-medium text-gray-900 mb-2">{post.title}</h4>
            <p className="text-sm text-gray-600 line-clamp-3">{post.content}</p>
            <div className="mt-2 flex justify-between items-center">
              <div className="flex flex-wrap gap-1">
                {post.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
              <a
                href={post.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(var(--primary-500))] hover:text-[hsl(var(--primary-600))] text-sm"
              >
                <i className="fas fa-external-link-alt mr-1"></i>View Original
              </a>
            </div>
          </div>

          {/* Your Reply */}
          <div className="border rounded-lg p-4 bg-[hsl(var(--primary-50))]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <i className="fas fa-robot text-[hsl(var(--primary-500))] mr-2"></i>
                <span className="font-medium text-gray-900">Your Reply</span>
              </div>
              <Badge variant="outline">
                {Math.round(post.confidence * 100)}% confidence
              </Badge>
            </div>
            <div className="bg-white rounded-md p-3 border">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{replyText}</p>
            </div>
          </div>

          {/* Character count and guidelines */}
          <div className="text-sm text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Reply length: {replyText.length} characters</span>
              <span className={replyText.length > 500 ? 'text-[hsl(var(--warning-500))]' : ''}>
                {replyText.length > 500 ? 'Consider shortening your reply' : 'Good length'}
              </span>
            </div>
            <p>
              <i className="fas fa-info-circle mr-1"></i>
              Make sure your reply follows Reddit's community guidelines and is helpful to the original poster.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="flex-1"
              disabled={isPosting}
            >
              <i className="fas fa-times mr-2"></i>
              Cancel
            </Button>
            <Button 
              onClick={onConfirm}
              disabled={isPosting}
              className="flex-1 bg-[hsl(var(--primary-500))] hover:bg-[hsl(var(--primary-600))]"
            >
              {isPosting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Posting to Reddit...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Post Reply to Reddit
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}