
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { CheckCircle, Loader2, Star } from "lucide-react";
import { isWithinRadius } from "@/utils/location";

const TRANSPORT_TYPES = ["Bus 🚌", "Train 🚂", "Taxi 🚕"];
const WAITING_COLORS = {
  low: "bg-blue-500",
  moderate: "bg-orange-500",
  high: "bg-red-500",
};

export default function Stops() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [selectedTransport, setSelectedTransport] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          setLocationError("Unable to retrieve your location.");
          console.error(error);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
    }
  }, []);

  // Fetch all stops and waiting status
  const { data: stops, isLoading } = useQuery({
    queryKey: ["stops"],
    queryFn: async () => {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("favorites")
        .single();

      const { data, error } = await supabase
        .from("stops")
        .select(`
          *,
          stop_waiting (
            id,
            transport_type,
            user_id
          ),
          stop_posts (
            id,
            content,
            transport_waiting_for,
            created_at,
            user_id,
            profiles (
              first_name,
              last_name,
              avatar_url
            )
          )
        `);

      if (error) throw error;

      return data?.map(stop => ({
        ...stop,
        isFavorite: Array.isArray(userProfile?.favorites) && 
          userProfile?.favorites.includes(stop.id),
      }));
    },
  });

  // Get the current user's waiting status
  const getUserId = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id;
  };
  
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    getUserId().then(id => setUserId(id));
  }, []);

  // Check if the user is already waiting at any stop
  const isUserWaiting = stops?.some((stop) =>
    stop.stop_waiting?.some((w: any) => w.user_id === userId)
  );

  // Real-time updates subscription
  useEffect(() => {
    const channel = supabase
      .channel('stop-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stop_waiting',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stops'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stop_posts',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stops'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Mark as waiting mutation
  const markAsWaitingMutation = useMutation({
    mutationFn: async ({ stopId, transportType }: { stopId: string, transportType: string }) => {
      if (!userLocation) throw new Error("Location required to mark as waiting");
      if (!userId) throw new Error("You must be logged in to mark as waiting");

      const stop = stops?.find(s => s.id === stopId);
      if (!stop) throw new Error("Stop not found");

      // Check if user is within 500m of the stop
      if (!isWithinRadius(
        userLocation.lat,
        userLocation.lng,
        stop.latitude,
        stop.longitude
      )) {
        throw new Error("You must be within 500m of the stop to mark as waiting");
      }

      const { error } = await supabase
        .from("stop_waiting")
        .insert({
          stop_id: stopId,
          user_id: userId,
          transport_type: transportType,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stops"] });
      toast.success("Marked as waiting!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Remove waiting status mutation
  const removeWaitingMutation = useMutation({
    mutationFn: async ({ stopId }: { stopId: string }) => {
      if (!userId) throw new Error("You must be logged in to update waiting status");
      
      const { error } = await supabase
        .from("stop_waiting")
        .delete()
        .eq("stop_id", stopId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stops"] });
      toast.success("Marked as picked up!");
    },
    onError: (error) => {
      toast.error(`Error marking as picked up: ${error.message}`);
    },
  });

  // Post message mutation
  const createStopPostMutation = useMutation({
    mutationFn: async ({ stopId, content }: { stopId: string, content: string }) => {
      if (!userId) throw new Error("You must be logged in to post messages");
      
      const { error } = await supabase
        .from("stop_posts")
        .insert({
          stop_id: stopId,
          user_id: userId,
          content,
          transport_waiting_for: selectedTransport,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stops"] });
      setNewMessage("");
      toast.success("Message posted successfully!");
    },
    onError: (error) => {
      toast.error(`Error posting message: ${error.message}`);
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (stopId: string) => {
      if (!userId) throw new Error("You must be logged in to add favorites");
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("favorites")
        .single();

      const favorites = Array.isArray(profile?.favorites) ? profile.favorites : [];
      const updatedFavorites = favorites.includes(stopId)
        ? favorites.filter((id: string) => id !== stopId)
        : [...favorites, stopId];

      const { error } = await supabase
        .from("profiles")
        .update({ favorites: updatedFavorites })
        .eq("id", userId);

      if (error) throw error;
      return { stopId, isFavorite: !favorites.includes(stopId) };
    },
    onSuccess: ({ stopId, isFavorite }) => {
      queryClient.invalidateQueries({ queryKey: ["stops"] });
      toast.success(isFavorite ? "Added to favorites" : "Removed from favorites");
    },
    onError: (error) => {
      toast.error(`Error updating favorites: ${error.message}`);
    },
  });

  // Filter stops based on search query
  const filteredStops = stops?.filter((stop) =>
    stop.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle creating post
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStop || !newMessage.trim()) return;
    createStopPostMutation.mutate({ stopId: selectedStop, content: newMessage });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Transport Stops</h1>
        <Input
          placeholder="Search stops..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {locationError && (
        <Card className="p-4 text-red-500">{locationError}</Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredStops?.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">
            No stops found
          </p>
        ) : (
          filteredStops?.map((stop) => {
            const waitingCount = stop.stop_waiting?.length || 0;
            const waitingColor = getWaitingColor(waitingCount);
            const isUserWaitingHere = stop.stop_waiting?.some(
              (w: any) => w.user_id === userId
            );

            return (
              <Card
                key={stop.id}
                className="p-4 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{stop.name}</h3>
                    <div className={`mt-1 px-3 py-1 rounded-full text-white inline-block ${waitingColor}`}>
                      {waitingCount} waiting
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleFavoriteMutation.mutate(stop.id)}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        stop.isFavorite ? "fill-yellow-400 text-yellow-400" : ""
                      }`}
                    />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {TRANSPORT_TYPES.map((type) => {
                    const typeWaiting = stop.stop_waiting?.filter(
                      (w: any) => w.transport_type === type
                    ).length || 0;

                    return (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        disabled={isUserWaiting && !isUserWaitingHere}
                        onClick={() =>
                          isUserWaitingHere
                            ? removeWaitingMutation.mutate({ stopId: stop.id })
                            : markAsWaitingMutation.mutate({
                                stopId: stop.id,
                                transportType: type,
                              })
                        }
                      >
                        {isUserWaitingHere ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Got Picked Up
                          </>
                        ) : (
                          `${type} (${typeWaiting})`
                        )}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="link"
                  onClick={() => setSelectedStop(stop.id)}
                  className="w-full"
                >
                  View Details & Chat
                </Button>
              </Card>
            );
          })
        )}
      </div>

      {/* Stop Details Dialog */}
      <Dialog open={!!selectedStop} onOpenChange={() => setSelectedStop(null)}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Stop Details</DialogTitle>
            <DialogDescription>
              View stop information and chat with other commuters
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-4">
            {selectedStop && (
              <>
                <div className="space-y-4">
                  <h3 className="font-medium">Mark as Waiting</h3>
                  <div className="flex flex-wrap gap-2">
                    {TRANSPORT_TYPES.map((type) => (
                      <Button
                        key={type}
                        variant={selectedTransport === type ? "default" : "outline"}
                        onClick={() => setSelectedTransport(type)}
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {stops
                    ?.find((s) => s.id === selectedStop)
                    ?.stop_posts?.sort(
                      (a: any, b: any) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    )
                    .map((post: any) => (
                      <div key={post.id} className="flex items-start gap-4">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={post.profiles?.avatar_url}
                            alt={post.profiles?.first_name || 'User'}
                          />
                          <AvatarFallback>
                            {(post.profiles?.first_name?.[0] || 'U').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {post.profiles?.first_name} {post.profiles?.last_name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(post.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          {post.transport_waiting_for && (
                            <p className="text-sm text-muted-foreground">
                              Waiting for: {post.transport_waiting_for}
                            </p>
                          )}
                          <p className="mt-1">{post.content}</p>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4">Stop Chat</h3>
                  <form onSubmit={handleCreatePost} className="space-y-4 mb-6">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Write a message..."
                    />
                    <Button
                      type="submit"
                      disabled={createStopPostMutation.isPending}
                    >
                      Post Message
                    </Button>
                  </form>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getWaitingColor(waitingCount: number) {
  if (waitingCount <= 3) return WAITING_COLORS.low;
  if (waitingCount <= 7) return WAITING_COLORS.moderate;
  return WAITING_COLORS.high;
}
