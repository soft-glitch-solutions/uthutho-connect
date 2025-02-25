
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: any;
  onViewDetails: (postId: string) => void;
}

export function PostCard({ post, onViewDetails }: PostCardProps) {
  return (
    <Card className="p-4 space-y-4 hover:bg-accent/5 transition-colors cursor-pointer" onClick={() => onViewDetails(post.id)}>
      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.profiles?.avatar_url} alt={post.profiles?.first_name || 'User'} />
          <AvatarFallback>{(post.profiles?.first_name?.[0] || 'U').toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {post.profiles?.first_name} {post.profiles?.last_name}
            </span>
            {post.profiles?.selected_title && (
              <span className="text-sm text-muted-foreground">
                {post.profiles.selected_title}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
          <p className="mt-2">{post.content}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm">
          💬 {post.post_comments?.length || 0}
        </Button>
        <Button variant="ghost" size="sm">
          ❤️ {post.post_reactions?.length || 0}
        </Button>
      </div>
    </Card>
  );
}
