import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Fetch the user's profile (first name)
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', (await supabase.auth.getSession()).data.session?.user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

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
  const { data: nearestLocations, isLoading } = useQuery({
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

  return (
    <div className="space-y-6">
      {/* Personalized Greeting */}
      <h1 className="text-2xl font-bold">
        Hi, {userProfile?.first_name || "User"}!
      </h1>

      {locationError ? (
        <Card className="p-6 text-red-500">{locationError}</Card>
      ) : isLoading || !userLocation ? (
        <div className="flex items-center justify-center p-6">
          <Loader2 className="w-8 h-8 animate-spin" />
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

          {/* Nearest Route */}
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Nearest Route</h3>
            {nearestLocations?.nearestRoute ? (
              <>
                <p className="text-lg font-medium">{nearestLocations.nearestRoute.name}</p>
                <p className="text-sm text-muted-foreground">
                  Distance: {calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    nearestLocations.nearestRoute.latitude,
                    nearestLocations.nearestRoute.longitude
                  ).toFixed(2)} km
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No routes found.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}