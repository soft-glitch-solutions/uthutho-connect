
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Post } from "@/types/post";
import { toast } from "sonner";

export default function Feed() {
  const [newPostContent, setNewPostContent] = useState("");
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hub_posts")
        .select(`
          *,
          hubs (name),
          post_comments (
            id,
            content,
            created_at,
            user_id
          ),
          post_reactions (
            id,
            reaction_type,
            user_id
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: userSession } = await supabase.auth.getSession();
      if (!userSession?.session?.user.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("hub_posts")
        .insert({
          content,
          user_id: userSession.session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setNewPostContent("");
      toast.success("Post created successfully!");
    },
    onError: (error) => {
      toast.error(`Error creating post: ${error.message}`);
    },
  });

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    createPostMutation.mutate(newPostContent);
  };

  if (isLoading) {
    return <div>Loading posts...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Community Feed</h1>

      <form onSubmit={handleCreatePost} className="space-y-4">
        <Textarea
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          placeholder="What's on your mind?"
          className="min-h-[100px]"
        />
        <Button type="submit" disabled={createPostMutation.isPending}>
          Create Post
        </Button>
      </form>

      <div className="space-y-4">
        {posts?.map((post: any) => (
          <Card key={post.id} className="p-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Posted in {post.hubs?.name || "Unknown Hub"}
              </p>
              <p className="mt-2">{post.content}</p>
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
        ))}
      </div>
    </div>
  );
}
