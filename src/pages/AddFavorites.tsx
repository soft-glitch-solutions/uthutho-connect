import { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AddFavorites() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  // Fetch nearby routes, stops, and hubs
  const { data: nearbyLocations, isLoading } = useQuery({
    queryKey: ['nearby-locations', userLocation],
    queryFn: async () => {
      if (!userLocation) return null;

      // Fetch stops, hubs, and routes
      const { data: stops } = await supabase.from('stops').select('*');
      const { data: hubs } = await supabase.from('hubs').select('*');
      const { data: routes } = await supabase.from('routes').select('*');

      // Calculate distances and sort by nearest
      const locationsWithDistance = [
        ...(stops || []).map((stop) => ({ ...stop, type: 'stop' })),
        ...(hubs || []).map((hub) => ({ ...hub, type: 'hub' })),
        ...(routes || []).map((route) => ({ ...route, type: 'route' })),
      ].map((location) => ({
        ...location,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          location.latitude,
          location.longitude
        ),
      }));

      // Sort by distance
      locationsWithDistance.sort((a, b) => a.distance - b.distance);

      return locationsWithDistance;
    },
    enabled: !!userLocation, // Only run the query if userLocation is available
  });

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
    const userId = (await supabase.auth.getSession()).data.session?.user.id;
    if (!userId) return;

    try {
      // Fetch the user's current favorites
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('favorites')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Add the new favorite to the list
      const updatedFavorites = [...(profile.favorites || []), favorite];

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

  // Filter locations based on search query
  const filteredLocations = nearbyLocations?.filter((location) =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">Add Favorites</h1>

      {/* Search Bar */}
      <Input
        placeholder="Search for routes, stops, or hubs..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Nearby Recommendations */}
      {locationError ? (
        <Card className="p-6 text-red-500">{locationError}</Card>
      ) : isLoading || !userLocation ? (
        <div className="flex items-center justify-center p-6">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recommended Nearby</h2>
          {filteredLocations?.length ? (
            filteredLocations.map((location) => (
              <Card key={location.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{location.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {location.type} - {location.distance.toFixed(2)} km away
                    </p>
                  </div>
                  <Button
                    onClick={() => handleAddFavorite(location.name)}
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground">No results found.</p>
          )}
        </div>
      )}
    </div>
  );
}