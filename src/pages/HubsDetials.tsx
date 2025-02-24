import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export default function HubsDetails() {
  const { hubId } = useParams<{ hubId: string }>();

  console.log("Hub ID:", hubId); // Debugging the hubId

  const { data: hub, isLoading: hubLoading, error: hubError } = useQuery({
    queryKey: ["hub", hubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hubs")
        .select("id, name, address, transport_type")
        .eq("id", hubId)
        .single();

      if (error) {
        console.error("Error fetching hub:", error);
        throw error;
      }

      return data;
    },
  });

  const { data: routes, isLoading: routesLoading, error: routesError } = useQuery({
    queryKey: ["routes", hubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("id, name, start_point, end_point, transport_type, cost")
        .eq("hub_id", hubId);

      if (error) {
        console.error("Error fetching routes:", error);
        throw error;
      }

      return data;
    },
  });

  // Filters state
  const [selectedTransportType, setSelectedTransportType] = useState<string | "">("");
  const [selectedStartPoint, setSelectedStartPoint] = useState<string | "">("");
  const [selectedEndPoint, setSelectedEndPoint] = useState<string | "">("");

  if (hubLoading) return <p>Loading hub details...</p>;
  if (hubError) {
    console.error("Error details:", hubError);
    return <p>Hub not found. Error: {hubError.message}</p>;
  }

  if (!hub) return <p>Hub not found.</p>;

  // Filter routes based on selected values
  const filteredRoutes = routes?.filter((route) => {
    const matchesTransportType =
      !selectedTransportType || route.transport_type === selectedTransportType;
    const matchesStartPoint = !selectedStartPoint || route.start_point === selectedStartPoint;
    const matchesEndPoint = !selectedEndPoint || route.end_point === selectedEndPoint;

    return matchesTransportType && matchesStartPoint && matchesEndPoint;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{hub.name}</h1>
        <Button asChild>
          <Link to="/hubs">Back to Hubs</Link>
        </Button>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Address</h3>
        <p className="text-sm text-muted-foreground mb-2">{hub.address || "Address not available"}</p>
        <h3 className="font-semibold mb-2">Transport Type</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{hub.transport_type || "Not specified"}</span>
      </Card>

      <h2 className="text-xl font-semibold">Linked Routes</h2>

      {/* Filters Section */}
      <div className="flex gap-4 mb-4">
        <select
          value={selectedTransportType}
          onChange={(e) => setSelectedTransportType(e.target.value)}
          className="select-input"
        >
          <option value="">All Transport Types</option>
          <option value="Bus">Bus</option>
          <option value="Train">Train</option>
          <option value="Taxi">Taxi</option>
          {/* Add more transport types as needed */}
        </select>

        <select
          value={selectedStartPoint}
          onChange={(e) => setSelectedStartPoint(e.target.value)}
          className="select-input"
        >
          <option value="">All Start Points</option>
          {routes &&
            [...new Set(routes.map((route) => route.start_point))].map((startPoint) => (
              <option key={startPoint} value={startPoint}>
                {startPoint}
              </option>
            ))}
        </select>

        <select
          value={selectedEndPoint}
          onChange={(e) => setSelectedEndPoint(e.target.value)}
          className="select-input"
        >
          <option value="">All End Points</option>
          {routes &&
            [...new Set(routes.map((route) => route.end_point))].map((endPoint) => (
              <option key={endPoint} value={endPoint}>
                {endPoint}
              </option>
            ))}
        </select>
      </div>

      {routesLoading ? (
        <p>Loading routes...</p>
      ) : filteredRoutes?.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRoutes.map((route) => (
            <Link key={route.id} to={`/routes/${route.id}`} className="block">
              <Card className="p-4 hover:shadow-lg transition-shadow duration-200">
                <h3 className="font-semibold mb-2">{route.name}</h3>
                <p className="text-sm text-muted-foreground">{route.start_point} → {route.end_point}</p>
                <p className="text-sm text-muted-foreground">Transport Type: {route.transport_type}</p>
                <p className="text-sm text-muted-foreground">Cost: R{route.cost.toFixed(2)}</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p>No routes available for this hub with the selected filters.</p>
      )}
    </div>
  );
}
