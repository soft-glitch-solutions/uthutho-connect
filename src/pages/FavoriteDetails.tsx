import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// Skeleton Loader for Cards
const SkeletonCard = () => (
  <Card className="p-6 animate-pulse">
    <div className="h-8 bg-gray-200 rounded mb-4"></div>
    <div className="h-4 bg-gray-200 rounded mb-2"></div>
    <div className="h-4 bg-gray-200 rounded mb-2"></div>
  </Card>
);

export default function FavoriteDetails() {
  const { favoriteId } = useParams<{ favoriteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');

  // Fetch details of the selected favorite
  const { data: favoriteDetails, isLoading: isFavoriteLoading } = useQuery({
    queryKey: ['favorite-details', favoriteId],
    queryFn: async () => {
      const { data: hub } = await supabase
        .from('hubs')
        .select('*')
        .eq('name', favoriteId)
        .single();

      return hub;
    },
  });

  // Fetch hub posts
  const { data: posts, isLoading: isPostsLoading } = useQuery({
    queryKey: ['hub-posts', favoriteDetails?.id],
    enabled: !!favoriteDetails?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hub_posts')
        .select(`
          *,
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
        .eq('hub_id', favoriteDetails.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!favoriteDetails?.id) return;

    const channel = supabase
      .channel('hub-posts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hub_posts',
          filter: `hub_id=eq.${favoriteDetails.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['hub-posts', favoriteDetails.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [favoriteDetails?.id, queryClient]);

  // Create new post mutation
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: userSession } = await supabase.auth.getSession();
      if (!userSession?.session?.user.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('hub_posts')
        .insert({
          content,
          hub_id: favoriteDetails?.id,
          user_id: userSession.session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setNewMessage('');
      toast.success('Message sent successfully!');
    },
    onError: (error) => {
      toast.error(`Error sending message: ${error.message}`);
    },
  });

  if (isFavoriteLoading) {
    return <SkeletonCard />;
  }

  if (!favoriteDetails) {
    return <div>Favorite not found.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Button onClick={() => navigate(-1)} className="mb-4">
        Back
      </Button>

      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">{favoriteDetails.name}</h1>
        <p className="text-muted-foreground">
          Type: {favoriteDetails.type || 'Unknown'}
        </p>
        <p className="text-muted-foreground">
          Location: {favoriteDetails.latitude}, {favoriteDetails.longitude}
        </p>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Hub Chat</h2>

        {/* Message Input */}
        <div className="space-y-4">
          <Card className="p-4">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="mb-4"
            />
            <Button 
              onClick={() => createPostMutation.mutate(newMessage)}
              disabled={createPostMutation.isPending || !newMessage.trim()}
            >
              Send Message
            </Button>
          </Card>

          {/* Posts List */}
          {isPostsLoading ? (
            // Display Skeleton for Posts
            Array.from({ length: 3 }).map((_, index) => <SkeletonCard key={index} />)
          ) : (
            posts?.map((post) => (
              <Card key={post.id} className="p-4">
                <p>{post.content}</p>
                <div className="flex items-center gap-4 mt-2">
                  <Button variant="ghost" size="sm">
                    💬 {post.post_comments?.length || 0}
                  </Button>
                  <Button variant="ghost" size="sm">
                    ❤️ {post.post_reactions?.length || 0}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
