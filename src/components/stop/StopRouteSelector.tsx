
import { useQuery } from "@tanstack/react-query";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";

interface StopRouteSelectorProps {
  stopId: string;
  selectedRoute: string | null;
  onSelectRoute: (routeId: string) => void;
  disabled?: boolean;
}

export function StopRouteSelector({ stopId, selectedRoute, onSelectRoute, disabled = false }: StopRouteSelectorProps) {
  // Fetch all routes that include this stop
  const { data: routes, isLoading } = useQuery({
    queryKey: ["stop-routes", stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_stops")
        .select(`
          route_id,
          routes (
            id, 
            name,
            transport_type
          )
        `)
        .eq("stop_id", stopId);

      if (error) throw error;
      
      return data.map(item => ({
        id: item.routes.id,
        name: item.routes.name,
        transport_type: item.routes.transport_type
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-4 w-4 animate-spin" />
        <span>Loading routes...</span>
      </div>
    );
  }

  if (!routes || routes.length === 0) {
    return <div className="text-sm text-muted-foreground">No routes available for this stop</div>;
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Select Route:</label>
      <Select
        value={selectedRoute || ""}
        onValueChange={onSelectRoute}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a route" />
        </SelectTrigger>
        <SelectContent>
          {routes.map((route) => (
            <SelectItem key={route.id} value={route.id}>
              {route.name} ({route.transport_type})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
