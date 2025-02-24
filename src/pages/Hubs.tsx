import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Heart } from "lucide-react"; // Removed HeartFilled
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// Skeleton Component
function HubSkeleton() {
  return (
    <Card className="p-4 cursor-pointer">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    </Card>
  );
}

export default function Hubs() {
  const { data: hubs, isLoading, refetch } = useQuery({
    queryKey: ['hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hubs')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  // Fetch the user's favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      const userId = (await supabase.auth.getSession()).data.session?.user.id;
      if (!userId) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('favorites')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserFavorites(profile.favorites || []);
    };

    fetchFavorites();
  }, []);

  // Add or remove a hub from favorites
  const handleFavorite = async (hubName: string) => {
    const userId = (await supabase.auth.getSession()).data.session?.user.id;
    if (!userId) return;

    try {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('favorites')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      let updatedFavorites;
      if (profile.favorites.includes(hubName)) {
        updatedFavorites = profile.favorites.filter((favorite: string) => favorite !== hubName);
        toast.success('Hub removed from favorites!');
      } else {
        updatedFavorites = [...profile.favorites, hubName];
        toast.success('Hub added to favorites!');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ favorites: updatedFavorites })
        .eq('id', userId);

      if (updateError) throw updateError;

      setUserFavorites(updatedFavorites);
    } catch (error) {
      console.error('Error updating favorites:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  // Pull-to-refresh logic
  const handleTouchStart = (e: React.TouchEvent) => {
    setPullStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartY;
      if (distance > 0) {
        setPullDistance(distance);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 100) {
      await refetch(); // Refresh the data
      setPullDistance(0);
    }
  };

  return (
    <div
      className="space-y-6 p-4 sm:p-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div className="flex justify-center items-center">
          <div
            className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center"
            style={{
              transform: `rotate(${pullDistance * 0.36}deg)`,
            }}
          >
            <Heart className="w-4 h-4 text-gray-500 animate-spin" />
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Transport Hubs</h1>
        <Button asChild>
          <Link to="/hub-request" className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" />
            Request Hub
          </Link>
        </Button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => <HubSkeleton key={index} />)
        ) : (
          hubs?.map((hub) => (
            <div key={hub.id} className="relative">
              <Link to={`/hubs/${hub.id}`} className="block">
                <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
                  <h3 className="font-semibold mb-2">{hub.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{hub.address}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {hub.transport_type}
                    </span>
                  </div>
                </Card>
              </Link>
              {/* Heart Icon */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleFavorite(hub.name);
                }}
                className="absolute top-2 right-2 p-2 rounded-full bg-background/50 backdrop-blur-sm hover:bg-primary/10 transition-colors"
              >
                <Heart
                  className={`w-4 h-4 ${userFavorites.includes(hub.name) ? "fill-primary" : ""}`}
                />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
