import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

  // Fetch posts
  const { data: posts, isLoading: isPostsLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      console.log("Fetching posts...");
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

      if (error) {
        console.error("Error fetching posts:", error);
        throw error;
      }
      console.log("Posts fetched successfully:", data);
      return data;
    },
  });

  // Fetch selected post details
  const { data: selectedPostDetails, isLoading: isPostDetailsLoading } = useQuery({
    queryKey: ["post", selectedPost],
    enabled: !!selectedPost,
    queryFn: async () => {
      console.log(`Fetching details for post ${selectedPost}...`);
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

      if (error) {
        console.error(`Error fetching post ${selectedPost} details:`, error);
        throw error;
      }
      console.log(`Post ${selectedPost} details fetched successfully:`, data);
      return data;
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      console.log("Creating post...");
      const { data: userSession } = await supabase.auth.getSession();
      if (!userSession?.session?.user.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("hub_posts")
        .insert({
          content,
          user_id: userSession.session.user.id,
          hub_id: null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating post:", error);
        throw error;
      }
      console.log("Post created successfully:", data);
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

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      console.log("Creating comment...");
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

      if (error) {
        console.error("Error creating comment:", error);
        throw error;
      }
      console.log("Comment created successfully:", data);
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

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Create Post Form */}
      <div className="rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="/default-avatar.png" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <Textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="What's on your mind?"
            className="flex-1"
          />
        </div>
        <div className="flex justify-end mt-3">
          <Button
            onClick={handleCreatePost}
            disabled={createPostMutation.isPending}
          >
            Post
          </Button>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {isPostsLoading ? (
          // Skeleton loading for posts
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-lg border p-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/2 bg-gray-200 animate-pulse"></div>
                  <div className="h-3 w-1/3 bg-gray-200 animate-pulse"></div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-4 bg-gray-200 animate-pulse"></div>
                <div className="h-4 w-2/3 bg-gray-200 animate-pulse"></div>
              </div>
              <div className="flex justify-around mt-4">
                <div className="h-4 w-1/4 bg-gray-200 animate-pulse"></div>
                <div className="h-4 w-1/4 bg-gray-200 animate-pulse"></div>
                <div className="h-4 w-1/4 bg-gray-200 animate-pulse"></div>
              </div>
            </div>
          ))
        ) : (
          // Actual posts
          posts?.map((post) => (
            <div key={post.id} className="rounded-lg border p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.profiles?.avatar_url} alt={post.profiles?.first_name} />
                  <AvatarFallback>
                    {post.profiles?.first_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {post.profiles?.first_name} {post.profiles?.last_name}
                  </p>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <p>{post.content}</p>
              </div>
              <div className="flex justify-around mt-4">
                <button>Like</button>
                <button onClick={() => setSelectedPost(post.id)}>Comment</button>
                <button>Share</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post Details Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-4">
            {isPostDetailsLoading ? (
              // Skeleton loading for post details
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/2 bg-gray-200 animate-pulse"></div>
                    <div className="h-3 w-1/3 bg-gray-200 animate-pulse"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 animate-pulse"></div>
                  <div className="h-4 w-2/3 bg-gray-200 animate-pulse"></div>
                </div>
                <div className="border-t pt-4 mt-4">
                  <div className="h-4 w-1/4 bg-gray-200 animate-pulse"></div>
                  <div className="mt-4 space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-1/2 bg-gray-200 animate-pulse"></div>
                          <div className="h-3 w-1/3 bg-gray-200 animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Actual post details
              selectedPostDetails && (
                <>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={selectedPostDetails.profiles?.avatar_url}
                        alt={selectedPostDetails.profiles?.first_name || "User"}
                      />
                      <AvatarFallback>
                        {(selectedPostDetails.profiles?.first_name?.[0] || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {selectedPostDetails.profiles?.first_name}{" "}
                          {selectedPostDetails.profiles?.last_name}
                        </span>
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(selectedPostDetails.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-2">{selectedPostDetails.content}</p>
                    </div>
                  </div>

                  {/* Comments Section */}
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

                    {/* Comments List */}
                    <div className="space-y-4">
                      {selectedPostDetails.post_comments
                        ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((comment: any) => (
                          <div key={comment.id} className="flex items-start gap-4">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={comment.profiles?.avatar_url}
                                alt={comment.profiles?.first_name || "User"}
                              />
                              <AvatarFallback>
                                {(comment.profiles?.first_name?.[0] || "U").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {comment.profiles?.first_name} {comment.profiles?.last_name}
                                </span>
                                <span className="text-sm">
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
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}