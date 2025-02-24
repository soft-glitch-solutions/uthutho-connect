import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function RouteDetails() {
  const { routeId } = useParams<{ routeId: string }>();

  const { data: route, isLoading: routeLoading, error: routeError } = useQuery({
    queryKey: ["route", routeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("id, name, transport_type, cost, start_point, end_point")
        .eq("id", routeId)
        .single();

      if (error) throw error;

      return data;
    },
  });

  const { data: stops, isLoading: stopsLoading, error: stopsError } = useQuery({
    queryKey: ["stops", routeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stops")
        .select("id, name, latitude, longitude, order_number")
        .eq("route_id", routeId)
        .order("order_number");

      if (error) throw error;

      return data;
    },
  });

  if (routeLoading) return <p>Loading route details...</p>;
  if (routeError) return <p>Error loading route: {routeError.message}</p>;

  if (!route) return <p>Route not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{route.name}</h1>
        <Button asChild>
          <Link to="/routes">Back to Routes</Link>
        </Button>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Transport Type</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{route.transport_type}</span>

        <h3 className="font-semibold mb-2">Cost</h3>
        <p className="text-sm text-muted-foreground">R{route.cost.toFixed(2)}</p>

        <h3 className="font-semibold mb-2">Start Point</h3>
        <p className="text-sm text-muted-foreground">{route.start_point}</p>

        <h3 className="font-semibold mb-2">End Point</h3>
        <p className="text-sm text-muted-foreground">{route.end_point}</p>
      </Card>

      <h2 className="text-xl font-semibold">Stops</h2>
      {stopsLoading ? (
        <p>Loading stops...</p>
      ) : stops?.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stops.map((stop) => (
            <Card key={stop.id} className="p-4">
              <h3 className="font-semibold mb-2">{stop.name}</h3>
              <p className="text-sm text-muted-foreground">Latitude: {stop.latitude}</p>
              <p className="text-sm text-muted-foreground">Longitude: {stop.longitude}</p>
              <p className="text-sm text-muted-foreground">Order: {stop.order_number}</p>
            </Card>
          ))}
        </div>
      ) : (
        <p>No stops available for this route.</p>
      )}
    </div>
  );
}
