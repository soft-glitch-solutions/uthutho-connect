
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreatePostForm } from "@/components/posts/CreatePostForm";
import { PostCard } from "@/components/posts/PostCard";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Feed() {
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hub_posts")
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            avatar_url,
            selected_title
          ),
          post_comments (
            id,
            content,
            created_at,
            user_id,
            profiles (
              first_name,
              last_name,
              avatar_url
            )
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

  const { data: selectedPostDetails } = useQuery({
    queryKey: ["post", selectedPost],
    enabled: !!selectedPost,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hub_posts")
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            avatar_url,
            selected_title
          ),
          post_comments (
            id,
            content,
            created_at,
            user_id,
            profiles (
              first_name,
              last_name,
              avatar_url
            )
          ),
          post_reactions (
            id,
            reaction_type,
            user_id
          )
        `)
        .eq("id", selectedPost)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: userSession } = await supabase.auth.getSession();
      if (!userSession?.session?.user.id) throw new Error("Not authenticated");
      
      // For now, we'll create posts without a hub_id
      // Later we can add hub selection functionality
      const { data, error } = await supabase
        .from("hub_posts")
        .insert({
          content,
          user_id: userSession.session.user.id,
          hub_id: null, // This will need to be updated when implementing hub-specific posts
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

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: userSession } = await supabase.auth.getSession();
      if (!userSession?.session?.user.id) throw new Error("Not authenticated");
      if (!selectedPost) throw new Error("No post selected");

      const { data, error } = await supabase
        .from("post_comments")
        .insert({
          content,
          user_id: userSession.session.user.id,
          post_id: selectedPost,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", selectedPost] });
      setNewComment("");
      toast.success("Comment added successfully!");
    },
    onError: (error) => {
      toast.error(`Error adding comment: ${error.message}`);
    },
  });

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    createPostMutation.mutate(newPostContent);
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    createCommentMutation.mutate(newComment);
  };

  if (isLoading) {
    return <div>Loading posts...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Community Feed</h1>

      <CreatePostForm
        content={newPostContent}
        onChange={setNewPostContent}
        onSubmit={handleCreatePost}
        isLoading={createPostMutation.isPending}
      />

      <div className="space-y-4">
        {posts?.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onViewDetails={(postId) => setSelectedPost(postId)}
          />
        ))}
      </div>

      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-4">
            {selectedPostDetails && (
              <>
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={selectedPostDetails.profiles?.avatar_url}
                      alt={selectedPostDetails.profiles?.first_name || 'User'}
                    />
                    <AvatarFallback>
                      {(selectedPostDetails.profiles?.first_name?.[0] || 'U').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {selectedPostDetails.profiles?.first_name} {selectedPostDetails.profiles?.last_name}
                      </span>
                      {selectedPostDetails.profiles?.selected_title && (
                        <span className="text-sm text-muted-foreground">
                          {selectedPostDetails.profiles.selected_title}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(selectedPostDetails.created_at), { addSuffix: true })}
                    </p>
                    <p className="mt-2">{selectedPostDetails.content}</p>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-4">Comments</h3>
                  <form onSubmit={handleCreateComment} className="space-y-4 mb-6">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                    />
                    <Button
                      type="submit"
                      disabled={createCommentMutation.isPending}
                    >
                      Add Comment
                    </Button>
                  </form>

                  <div className="space-y-4">
                    {selectedPostDetails.post_comments
                      ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((comment: any) => (
                        <div key={comment.id} className="flex items-start gap-4">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={comment.profiles?.avatar_url}
                              alt={comment.profiles?.first_name || 'User'}
                            />
                            <AvatarFallback>
                              {(comment.profiles?.first_name?.[0] || 'U').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {comment.profiles?.first_name} {comment.profiles?.last_name}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="mt-1">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
