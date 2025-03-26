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
import { formatDistanceToNow, differenceInSeconds } from "date-fns";
import { toast } from "sonner";
import { CheckCircle, Loader2, Star, Clock, Info, ExternalLink } from "lucide-react";
import { isWithinRadius } from "@/utils/location";
import { Json } from "@/integrations/supabase/types";
import { Link, useNavigate } from "react-router-dom";
import { StopRouteSelector } from "@/components/stop/StopRouteSelector";

const TRANSPORT_TYPES = ["Bus 🚌", "Train 🚂", "Taxi 🚕"];
const WAITING_COLORS = {
  low: "bg-blue-500",
  moderate: "bg-orange-500",
  high: "bg-red-500",
};
const WAITING_TIMEOUT = 10 * 60; // 10 minutes in seconds

export default function Stops() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [selectedTransport, setSelectedTransport] = useState<string | null>(null);
  const [waitingTimeLeft, setWaitingTimeLeft] = useState<{ [key: string]: number }>({});
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
            user_id,
            expires_at,
            created_at
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

      let favorites: string[] = [];
      if (userProfile?.favorites) {
        try {
          if (typeof userProfile.favorites === 'string') {
            favorites = JSON.parse(userProfile.favorites);
          } else if (Array.isArray(userProfile.favorites)) {
            favorites = userProfile.favorites as string[];
          }
        } catch (e) {
          console.error("Error parsing favorites:", e);
        }
      }

      return data?.map(stop => ({
        ...stop,
        isFavorite: favorites.includes(stop.id),
      }));
    },
  });

  const getUserId = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id;
  };
  
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    getUserId().then(id => setUserId(id));
  }, []);

  const isUserWaiting = stops?.some((stop) =>
    stop.stop_waiting?.some((w: any) => w.user_id === userId)
  );

  useEffect(() => {
    if (!stops || !userId) return;

    const userWaitingEntries = stops.reduce((acc: { [key: string]: number }, stop) => {
      const userWaiting = stop.stop_waiting?.find((w: any) => w.user_id === userId);
      if (userWaiting) {
        const expiresAt = new Date(userWaiting.expires_at);
        const secondsLeft = Math.max(0, differenceInSeconds(expiresAt, new Date()));
        acc[stop.id] = secondsLeft;
      }
      return acc;
    }, {});

    setWaitingTimeLeft(userWaitingEntries);

    const intervalId = setInterval(() => {
      setWaitingTimeLeft(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(stopId => {
          if (updated[stopId] > 0) {
            updated[stopId] -= 1;
          }
          if (updated[stopId] === 0) {
            queryClient.invalidateQueries({ queryKey: ["stops"] });
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [stops, userId, queryClient]);

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

  useEffect(() => {
    if (!userLocation || !stops || !userId) return;

    const locationCheckInterval = setInterval(() => {
      stops.forEach(stop => {
        const isUserWaitingHere = stop.stop_waiting?.some(
          (w: any) => w.user_id === userId
        );

        if (isUserWaitingHere) {
          const isWithin = isWithinRadius(
            userLocation.lat,
            userLocation.lng,
            stop.latitude,
            stop.longitude
          );

          if (!isWithin) {
            removeWaitingMutation.mutate({ stopId: stop.id });
            toast.info("You've left the stop area. Waiting status removed.");
          }
        }
      });
    }, 30000);

    return () => clearInterval(locationCheckInterval);
  }, [userLocation, stops, userId]);

  const markAsWaitingMutation = useMutation({
    mutationFn: async ({ stopId, transportType }: { stopId: string, transportType: string }) => {
      if (!userLocation) throw new Error("Location required to mark as waiting");
      if (!userId) throw new Error("You must be logged in to mark as waiting");
      if (!selectedRoute) throw new Error("Please select a route you're waiting for");

      const stop = stops?.find(s => s.id === stopId);
      if (!stop) throw new Error("Stop not found");

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
          route_id: selectedRoute,
          // expires_at field has a default in the DB table (now() + 10 minutes)
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stops"] });
      toast.success("Marked as waiting! You'll be automatically removed after 10 minutes.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

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
          route_id: selectedRoute,
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

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (stopId: string) => {
      if (!userId) throw new Error("You must be logged in to add favorites");
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("favorites")
        .single();

      let favorites: string[] = [];
      if (profile?.favorites) {
        try {
          if (typeof profile.favorites === 'string') {
            favorites = JSON.parse(profile.favorites);
          } else if (Array.isArray(profile.favorites)) {
            favorites = profile.favorites as string[];
          }
        } catch (e) {
          console.error("Error parsing favorites:", e);
        }
      }

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

  const filteredStops = stops?.filter((stop) =>
    stop.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStop || !newMessage.trim()) return;
    createStopPostMutation.mutate({ stopId: selectedStop, content: newMessage });
  };

  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleViewDetails = (stopId: string) => {
    navigate(`/stops/${stopId}`);
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
            const timeLeft = waitingTimeLeft[stop.id] || 0;

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

                {isUserWaitingHere && (
                  <div className="flex items-center text-amber-600 gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Waiting time remaining: {formatTimeLeft(timeLeft)}</span>
                  </div>
                )}

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
                        disabled={(isUserWaiting && !isUserWaitingHere) || (isUserWaitingHere && type !== stop.stop_waiting?.find((w: any) => w.user_id === userId)?.transport_type)}
                        onClick={() =>
                          isUserWaitingHere
                            ? removeWaitingMutation.mutate({ stopId: stop.id })
                            : markAsWaitingMutation.mutate({
                                stopId: stop.id,
                                transportType: type,
                              })
                        }
                      >
                        {isUserWaitingHere && stop.stop_waiting?.find((w: any) => w.user_id === userId)?.transport_type === type ? (
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

                <div className="flex space-x-2">
                  <Button
                    variant="link"
                    onClick={() => setSelectedStop(stop.id)}
                    className="flex-1"
                  >
                    View Chat
                  </Button>
                  
                  <Button
                    variant="link"
                    onClick={() => handleViewDetails(stop.id)}
                    className="flex-1"
                  >
                    <Info className="mr-1 h-4 w-4" />
                    Details
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={!!selectedStop} onOpenChange={(open) => !open && setSelectedStop(null)}>
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
                  <h3 className="font-medium">Select Route and Mark as Waiting</h3>
                  <StopRouteSelector 
                    stopId={selectedStop}
                    selectedRoute={selectedRoute}
                    onSelectRoute={setSelectedRoute}
                    disabled={isUserWaiting && !isUserWaitingHere}
                  />
                  <div className="flex flex-wrap gap-2">
                    {TRANSPORT_TYPES.map((type) => {
                      const typeWaiting = stops?.find(s => s.id === selectedStop)?.stop_waiting?.filter(
                        (w: any) => w.transport_type === type
                      ).length || 0;

                      return (
                        <Button
                          key={type}
                          variant={selectedTransport === type ? "default" : "outline"}
                          onClick={() => setSelectedTransport(type)}
                        >
                          {type}
                        </Button>
                      );
                    })}
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

