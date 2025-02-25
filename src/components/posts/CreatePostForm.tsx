
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface CreatePostFormProps {
  content: string;
  onChange: (content: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function CreatePostForm({ content, onChange, onSubmit, isLoading }: CreatePostFormProps) {
  return (
    <Card className="p-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <Textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="What's on your mind?"
          className="min-h-[100px]"
        />
        <Button type="submit" disabled={isLoading}>
          Create Post
        </Button>
      </form>
    </Card>
  );
}
