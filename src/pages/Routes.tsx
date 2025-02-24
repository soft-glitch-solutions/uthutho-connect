import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Heart } from "lucide-react"; // Removed HeartFilled
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Skeleton Component for Routes
function RouteSkeleton() {
  return (
    <Card className="p-4 cursor-pointer">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    </Card>
  );
}

export default function Routes() {
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const { data: routes, isLoading, refetch } = useQuery({
    queryKey: ["routes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("routes").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const fetchFavorites = async () => {
      const userId = (await supabase.auth.getSession()).data.session?.user.id;
      if (!userId) return;

      const { data: profile, error } = await supabase.from("profiles").select("favorites").eq("id", userId).single();
      if (error) throw error;
      setUserFavorites(profile.favorites || []);
    };

    fetchFavorites();
  }, []);

  const handleFavorite = async (routeName: string) => {
    const userId = (await supabase.auth.getSession()).data.session?.user.id;
    if (!userId) return;

    try {
      const { data: profile, error: fetchError } = await supabase.from("profiles").select("favorites").eq("id", userId).single();
      if (fetchError) throw fetchError;

      let updatedFavorites;
      if (profile.favorites.includes(routeName)) {
        updatedFavorites = profile.favorites.filter((favorite: string) => favorite !== routeName);
        toast.success("Route removed from favorites!");
      } else {
        updatedFavorites = [...profile.favorites, routeName];
        toast.success("Route added to favorites!");
      }

      const { error: updateError } = await supabase.from("profiles").update({ favorites: updatedFavorites }).eq("id", userId);
      if (updateError) throw updateError;

      setUserFavorites(updatedFavorites);
    } catch (error) {
      console.error("Error updating favorites:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

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
      await refetch();
      setPullDistance(0);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {pullDistance > 0 && (
        <div className="flex justify-center items-center">
          <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center" style={{ transform: `rotate(${pullDistance * 0.36}deg)` }}>
            <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Transport Routes</h1>
        <Button asChild>
          <Link to="/route-request" className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" />
            Request Route
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => <RouteSkeleton key={index} />)
        ) : (
          routes?.map((route) => (
            <div key={route.id} className="relative">
              <Link to={`/routes/${route.id}`} className="block">
                <Card className="p-4 hover:shadow-lg transition-shadow duration-200">
                  <h3 className="font-semibold mb-2">{route.name}</h3>
                  <div className="space-y-1 mb-3">
                    <p className="text-sm text-muted-foreground">From: {route.start_point}</p>
                    <p className="text-sm text-muted-foreground">To: {route.end_point}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{route.transport_type}</span>
                    <span className="text-sm font-medium">R{route.cost}</span>
                  </div>
                </Card>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleFavorite(route.name);
                }}
                className="absolute top-2 right-2 p-2 rounded-full bg-background/50 backdrop-blur-sm hover:bg-primary/10 transition-colors"
              >
                <Heart className={`w-4 h-4 ${userFavorites.includes(route.name) ? "fill-primary" : ""}`} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
