import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const TRANSPORT_TYPES = ["Bus 🚌", "Train 🚂", "Taxi 🚕"];
const WAITING_COLORS = {
  low: "bg-blue-500",
  moderate: "bg-orange-500",
  high: "bg-red-500",
};

export default function Stops() {
  const [startDestination, setStartDestination] = useState<string | null>(null);
  const [endDestination, setEndDestination] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [selectedTransport, setSelectedTransport] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch all stops
  const { data: stops, isLoading, error } = useQuery({
    queryKey: ["stops"],
    queryFn: async () => {
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
        `)
        .order("name");

      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }

      return data;
    },
  });

  // Get unique destinations for dropdowns
  const uniqueDestinations = Array.from(new Set(stops?.map((stop) => stop.name) || []));


  // Filter stops based on selected destinations
  const filteredStops = stops?.filter((stop) => {
    if (!startDestination || !endDestination) return true;
    return stop.start_point === startDestination && stop.end_point === endDestination;
  }) || [];

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
      const { data: userSession } = await supabase.auth.getSession();
      if (!userSession?.session?.user.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("stop_waiting")
        .insert({
          stop_id: stopId,
          user_id: userSession.session.user.id,
          transport_type: transportType,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stops"] });
      toast.success("Marked as waiting!");
    },
    onError: (error) => {
      toast.error(`Error marking as waiting: ${error.message}`);
    },
  });

  // Stop post mutation
  const createStopPostMutation = useMutation({
    mutationFn: async ({ stopId, content }: { stopId: string, content: string }) => {
      const { data: userSession } = await supabase.auth.getSession();
      if (!userSession?.session?.user.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("stop_posts")
        .insert({
          stop_id: stopId,
          user_id: userSession.session.user.id,
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

  const getWaitingColor = (waitingCount: number) => {
    if (waitingCount <= 3) return WAITING_COLORS.low;
    if (waitingCount <= 7) return WAITING_COLORS.moderate;
    return WAITING_COLORS.high;
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStop || !newMessage.trim()) return;
    createStopPostMutation.mutate({ stopId: selectedStop, content: newMessage });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Transport Stops</h1>

      {/* Dropdown Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select onValueChange={setStartDestination} value={startDestination || ""}>
          <SelectTrigger className="w-full sm:w-1/2">
            <SelectValue placeholder="Select Start Destination" />
          </SelectTrigger>
          <SelectContent>
            {uniqueDestinations.map((destination) => (
              <SelectItem key={destination} value={destination}>
                {destination}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={setEndDestination} value={endDestination || ""}>
          <SelectTrigger className="w-full sm:w-1/2">
            <SelectValue placeholder="Select End Destination" />
          </SelectTrigger>
          <SelectContent>
            {uniqueDestinations.map((destination) => (
              <SelectItem key={destination} value={destination}>
                {destination}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Display Stops */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <p>Loading stops...</p>
        ) : error ? (
          <p className="text-red-500">Error loading stops.</p>
        ) : filteredStops.length === 0 ? (
          <p className="text-gray-500">No stops found for the selected route.</p>
        ) : (
          filteredStops.map((stop) => {
            const waitingCount = stop.stop_waiting?.length || 0;
            const waitingColor = getWaitingColor(waitingCount);
            
            return (
              <Card
                key={stop.id}
                className="p-4 cursor-pointer hover:bg-accent/5 transition-colors"
                onClick={() => setSelectedStop(stop.id)}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{stop.name}</h3>
                    <div className={`px-3 py-1 rounded-full text-white ${waitingColor}`}>
                      {waitingCount} waiting
                    </div>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsWaitingMutation.mutate({
                              stopId: stop.id,
                              transportType: type,
                            });
                          }}
                        >
                          {type} ({typeWaiting})
                        </Button>
                      );
                    })}
                  </div>
                </div>
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