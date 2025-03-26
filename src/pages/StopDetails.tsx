import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { 
  MapPin, 
  Clock, 
  Info, 
  Navigation, 
  ShoppingBag, 
  Coffee, 
  Landmark, 
  Settings, 
  AlertTriangle,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calculateDistance } from "@/utils/location";
import { toast } from "sonner";
import { StopBusynessTimeline } from "@/components/stop/StopBusynessTimeline";
import { StopRouteSelector } from "@/components/stop/StopRouteSelector";

export default function StopDetails() {
  const { stopId } = useParams();
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
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
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data, error } = await supabase.rpc('is_admin', { user_id: (await supabase.auth.getUser()).data.user?.id });
        if (error) throw error;
        setIsAdmin(data);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };
    
    checkAdmin();
  }, []);

  // Fetch stop details
  const { data: stop, isLoading: isLoadingStop } = useQuery({
    queryKey: ["stop", stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stops")
        .select(`
          *,
          stop_waiting (
            id,
            transport_type,
            user_id,
            expires_at,
						route_id,
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
        `)
        .eq("id", stopId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!stopId,
  });

  // Fetch nearby spots
  const { data: nearbySpots, isLoading: isLoadingNearbySpots } = useQuery({
    queryKey: ["nearbySpots", stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nearby_spots")
        .select("*")
        .eq("stop_id", stopId)
        .order("distance_meters", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!stopId,
  });

  // Fetch stop busy times
  const { data: busyTimes, isLoading: isLoadingBusyTimes } = useQuery({
    queryKey: ["busyTimes", stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stop_busy_times")
        .select("*")
        .eq("stop_id", stopId)
        .order("day_of_week", { ascending: true })
        .order("hour_of_day", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!stopId,
  });

  // Format category icons
  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'restaurant':
      case 'café':
      case 'food':
        return <Coffee className="h-4 w-4" />;
      case 'shop':
      case 'store':
      case 'grocery':
        return <ShoppingBag className="h-4 w-4" />;
      case 'attraction':
      case 'landmark':
      case 'park':
      case 'library':
        return <Landmark className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Calculate distance from user
  const getDistanceFromUser = (lat: number, lng: number) => {
    if (!userLocation) return null;
    
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      lat,
      lng
    );
    
    // Convert to appropriate unit (km or m)
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  };

  // Open directions in Google Maps
  const openDirections = (lat: number, lng: number) => {
    if (!userLocation) {
      toast.error("Your location is not available");
      return;
    }
    
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${lat},${lng}`;
    window.open(url, "_blank");
  };

  // Navigate to admin page
  const goToAdminPage = () => {
    navigate(`/stops/${stopId}/manage-nearby`);
  };

  // Navigate to admin busyness page
  const goToManageBusyness = () => {
    navigate(`/stops/${stopId}/manage-busyness`);
  };

  // Mark as waiting mutation
  const markAsWaitingMutation = useMutation({
    mutationFn: async ({ stopId, transportType }: { stopId: string, transportType: string }) => {
      if (!userLocation) throw new Error("Location required to mark as waiting");
      if (!userId) throw new Error("You must be logged in to mark as waiting");
      if (!selectedRoute) throw new Error("Please select a route you're waiting for");

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

  if (isLoadingStop) {
    return <div className="flex justify-center p-8">Loading stop details...</div>;
  }

  if (!stop) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Stop not found</h2>
        <Button onClick={() => navigate("/stops")}>Back to Stops</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{stop.name}</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <div className="flex gap-2">
              <Button onClick={goToManageBusyness} variant="outline">
                <Clock className="mr-2 h-4 w-4" />
                Manage Busyness
              </Button>
              <Button onClick={goToAdminPage} variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Manage Nearby Spots
              </Button>
            </div>
          )}
          <Button onClick={() => navigate("/stops")} variant="outline">
            Back to Stops
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            Stop Information
          </CardTitle>
          <CardDescription>
            Details about this transport stop
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Location</h3>
              <p>Latitude: {stop.latitude}</p>
              <p>Longitude: {stop.longitude}</p>
              {userLocation && (
                <p className="mt-2">
                  Distance from you: {getDistanceFromUser(stop.latitude, stop.longitude)}
                </p>
              )}
              <Button 
                className="mt-4" 
                onClick={() => openDirections(stop.latitude, stop.longitude)}
                size="sm"
              >
                <Navigation className="mr-2 h-4 w-4" />
                Get Directions
              </Button>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Current Status</h3>
              <p>People waiting: {stop.stop_waiting?.length || 0}</p>
              <p>Recent posts: {stop.stop_posts?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="busyness">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="busyness" className="flex-1">Busyness Timeline</TabsTrigger>
          <TabsTrigger value="nearby" className="flex-1">Nearby Spots</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="busyness">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Busyness & Safety Timeline
              </CardTitle>
              <CardDescription>
                View how busy and safe this stop is at different times
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBusyTimes ? (
                <div>Loading busyness data...</div>
              ) : !busyTimes || busyTimes.length === 0 ? (
                <div>No busyness data available for this stop.</div>
              ) : (
                <StopBusynessTimeline busyTimes={busyTimes} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="nearby">
          <Card>
            <CardHeader>
              <CardTitle>Nearby Spots</CardTitle>
              <CardDescription>Places of interest close to this stop</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingNearbySpots ? (
                <div>Loading nearby spots...</div>
              ) : !nearbySpots || nearbySpots.length === 0 ? (
                <div>No nearby spots found for this stop.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nearbySpots.map((spot) => (
                    <Card key={spot.id} className="overflow-hidden">
                      {spot.image_url && (
                        <div className="h-40 overflow-hidden">
                          <img 
                            src={spot.image_url} 
                            alt={spot.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-lg">{spot.name}</h3>
                          {spot.category && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              {getCategoryIcon(spot.category)}
                              <span className="ml-1">{spot.category}</span>
                            </div>
                          )}
                        </div>
                        
                        {spot.description && (
                          <p className="text-sm text-muted-foreground mb-3">{spot.description}</p>
                        )}
                        
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-sm">
                            {spot.distance_meters ? (
                              <span>{(spot.distance_meters / 1000).toFixed(1)}km away</span>
                            ) : (
                              userLocation && (
                                <span>{getDistanceFromUser(spot.latitude, spot.longitude)} away</span>
                              )
                            )}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openDirections(spot.latitude, spot.longitude)}
                          >
                            <Navigation className="mr-1 h-3 w-3" /> Directions
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest posts and waiting information</CardDescription>
            </CardHeader>
            <CardContent>
              <StopRouteSelector 
                stopId={stopId} 
                selectedRoute={selectedRoute}
                onSelectRoute={setSelectedRoute}
                disabled={false}
              />
              {stop.stop_posts && stop.stop_posts.length > 0 ? (
                <div className="space-y-4">
                  {stop.stop_posts.sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  ).map((post) => (
                    <div key={post.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {post.profiles?.first_name} {post.profiles?.last_name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(post.created_at).toLocaleString()}
                        </span>
                      </div>
                      {post.transport_waiting_for && (
                        <div className="text-sm text-muted-foreground mb-1">
                          Waiting for: {post.transport_waiting_for}
                        </div>
                      )}
                      <p>{post.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No recent activity at this stop.</p>
              )}
              
              {stop.stop_waiting && stop.stop_waiting.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium mb-2">Currently Waiting</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transport Type</TableHead>
												<TableHead>Route</TableHead>
                        <TableHead>Started Waiting</TableHead>
                        <TableHead>Expires At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stop.stop_waiting.map((waiting) => (
                        <TableRow key={waiting.id}>
                          <TableCell>{waiting.transport_type}</TableCell>
													<TableCell>{waiting.route_id}</TableCell>
                          <TableCell>{new Date(waiting.created_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Clock className="mr-1 h-4 w-4" />
                              {new Date(waiting.expires_at).toLocaleString()}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
