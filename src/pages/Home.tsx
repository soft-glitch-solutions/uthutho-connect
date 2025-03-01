import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Loader2, Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { isWithinRadius } from "@/utils/location";
import { LoginStreakPopup } from "@/components/LoginStreakPopup";
import { updateLoginStreak } from "@/utils/loginStreak";

export default function Home() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLoginStreak, setShowLoginStreak] = useState(false);
  const navigate = useNavigate();

  // Check login streak when component mounts
  useEffect(() => {
    const checkLoginStreak = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user.id) {
        const result = await updateLoginStreak(session.session.user.id);
        if (result?.is_new_day) {
          setShowLoginStreak(true);
          if (result.points_added > 0) {
            toast.success(`You earned ${result.points_added} point for your 7-day streak!`);
          }
        }
      }
    };

    checkLoginStreak();
  }, []);

  // Fetch the user's profile (first name and favorites)
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      
      if (!userId) {
        throw new Error("User not authenticated");
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, selected_title, favorites')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return {
        ...data,
        favorites: parseJsonArray(data.favorites)
      };
    },
  });

  // Helper function to safely parse JSON data
  const parseJsonArray = (jsonData: any): string[] => {
    try {
      if (Array.isArray(jsonData)) {
        return jsonData;
      }
      if (typeof jsonData === 'string') {
        return JSON.parse(jsonData);
      }
      return [];
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return [];
    }
  };

  // Fetch the user's current location
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

  // Query to find the closest stop, hub, and route
  const { data: nearestLocations, isLoading: isNearestLoading } = useQuery({
    queryKey: ['nearest-locations', userLocation],
    queryFn: async () => {
      if (!userLocation) return null;

      // Fetch stops, hubs, and routes
      const { data: stops } = await supabase.from('stops').select('*');
      const { data: hubs } = await supabase.from('hubs').select('*');
      const { data: routes } = await supabase.from('routes').select('*');

      // Calculate the nearest stop, hub, and route
      const nearestStop = findNearestLocation(userLocation, stops || []);
      const nearestHub = findNearestLocation(userLocation, hubs || []);
      const nearestRoute = findNearestLocation(userLocation, routes || []);

      return { nearestStop, nearestHub, nearestRoute };
    },
    enabled: !!userLocation, // Only run the query if userLocation is available
  });

  // Helper function to calculate the nearest location
  const findNearestLocation = (userLocation: { lat: number; lng: number }, locations: any[]) => {
    let nearestLocation = null;
    let minDistance = Infinity;

    locations.forEach((location) => {
      // Skip locations without coordinates
      if (!location.latitude || !location.longitude) return;
      
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        location.latitude,
        location.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestLocation = location;
      }
    });

    return nearestLocation;
  };

  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Add a favorite
  const handleAddFavorite = async (favorite: string) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    
    if (!userId) {
      toast.error("You must be logged in to add favorites");
      return;
    }

    try {
      // Fetch the user's current favorites
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('favorites')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Parse existing favorites safely
      const currentFavorites = parseJsonArray(profile.favorites);
      
      // Add the new favorite to the list
      const updatedFavorites = [...currentFavorites, favorite];

      // Update the profile with the new favorites
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ favorites: updatedFavorites })
        .eq('id', userId);

      if (updateError) throw updateError;

      toast.success('Favorite added successfully!');
    } catch (error) {
      console.error('Error adding favorite:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  // Find stops that the user is close enough to mark as waiting
  const { data: closeStops } = useQuery({
    queryKey: ['close-stops', userLocation],
    queryFn: async () => {
      if (!userLocation) return [];

      const { data } = await supabase.from('stops').select('*');
      
      if (!data) return [];
      
      return data.filter(stop => 
        isWithinRadius(userLocation.lat, userLocation.lng, stop.latitude, stop.longitude)
      );
    },
    enabled: !!userLocation,
  });

  return (
    <div className="space-y-6">
      {/* Login Streak Popup */}
      <LoginStreakPopup 
        open={showLoginStreak} 
        onClose={() => setShowLoginStreak(false)} 
      />

      {/* Personalized Greeting with Add Favorite Button */}
      <div className="flex items-center">
        <h1 className="text-2xl font-bold">
          Hi, {userProfile?.first_name || "User"}!
        </h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-2">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Favorite</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Enter route, stop, or hub"
                id="favorite-input"
              />
              <Button
                onClick={() => {
                  const favorite = (document.getElementById('favorite-input') as HTMLInputElement).value;
                  if (favorite) {
                    handleAddFavorite(favorite);
                  }
                }}
              >
                Add
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <h3 className="font-semibold">The {userProfile?.selected_title || "User"}! </h3>
      
      {/* Favorites List */}
      <div className="space-y-2">
        <h3 className="font-semibold">Your Favorites</h3>
        {isProfileLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : userProfile?.favorites && userProfile.favorites.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userProfile.favorites.map((favorite: string, index: number) => (
              <Card
                key={index}
                className="p-4 cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => navigate(`/favorites/${favorite}`)}
              >
                <p className="text-lg font-medium">{favorite}</p>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No favorites added yet.</p>
        )}
      </div>

      {/* Nearby Stops You Can Wait At */}
      {closeStops && closeStops.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Nearby Stops You Can Wait At</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {closeStops.map((stop) => (
              <Card 
                key={stop.id} 
                className="p-4 cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => navigate('/stops')}
              >
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <p className="text-lg font-medium">{stop.name}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Within waiting distance ({calculateDistance(
                    userLocation!.lat,
                    userLocation!.lng,
                    stop.latitude,
                    stop.longitude
                  ).toFixed(2)} km)
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Nearby you</h1>
      </div>

      {/* Nearest Stop, Hub, and Route Cards */}
      {locationError ? (
        <Card className="p-6 text-red-500">{locationError}</Card>
      ) : isNearestLoading || !userLocation ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Nearest Stop */}
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Nearest Stop</h3>
            {nearestLocations?.nearestStop ? (
              <>
                <p className="text-lg font-medium">{nearestLocations.nearestStop.name}</p>
                <p className="text-sm text-muted-foreground">
                  Distance: {calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    nearestLocations.nearestStop.latitude,
                    nearestLocations.nearestStop.longitude
                  ).toFixed(2)} km
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No stops found.</p>
            )}
          </Card>

          {/* Nearest Hub */}
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Nearest Hub</h3>
            {nearestLocations?.nearestHub ? (
              <>
                <p className="text-lg font-medium">{nearestLocations.nearestHub.name}</p>
                <p className="text-sm text-muted-foreground">
                  Distance: {calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    nearestLocations.nearestHub.latitude,
                    nearestLocations.nearestHub.longitude
                  ).toFixed(2)} km
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No hubs found.</p>
            )}
          </Card>

        </div>
      )}
    </div>
  );
}
