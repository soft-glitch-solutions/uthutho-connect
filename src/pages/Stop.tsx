import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export default function Stops() {
  const [startDestination, setStartDestination] = useState<string | null>(null);
  const [endDestination, setEndDestination] = useState<string | null>(null);

  // Fetch all stops
  const { data: stops, isLoading, error } = useQuery({
    queryKey: ["stops"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stops").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Get unique destinations for dropdowns
  const uniqueDestinations = Array.from(new Set(stops?.map((stop) => stop.name) || []));

  // Filter stops based on selected destinations
  const filteredStops = stops?.filter((stop) => {
    if (!startDestination || !endDestination) return true;
    return stop.start_point === startDestination && stop.end_point === endDestination;
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Transport Stops</h1>

      {/* Dropdown Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Start Destination Dropdown */}
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

        {/* End Destination Dropdown */}
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
        ) : filteredStops?.length === 0 ? (
          <p className="text-gray-500">No stops found for the selected route.</p>
        ) : (
          filteredStops?.map((stop) => (
            <Card key={stop.id} className="p-4">
              <h3 className="font-semibold">{stop.name}</h3>
              <p className="text-sm text-muted-foreground">From: {stop.start_point}</p>
              <p className="text-sm text-muted-foreground">To: {stop.end_point}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
