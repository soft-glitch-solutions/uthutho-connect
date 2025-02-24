import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Skeleton Component
function HubSkeleton() {
  return (
    <Card className="p-4 cursor-pointer">
      <div className="animate-pulse">
        {/* Placeholder for the title */}
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        {/* Placeholder for the address */}
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        {/* Placeholder for the transport type */}
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    </Card>
  );
}

export default function Hubs() {
  const { data: hubs, isLoading } = useQuery({
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

  return (
    <div className="space-y-6 p-4 sm:p-6">
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
          // Show skeleton placeholders while loading
          Array.from({ length: 6 }).map((_, index) => (
            <HubSkeleton key={index} />
          ))
        ) : (
          // Show actual hub cards when data is loaded
          hubs?.map((hub) => (
            <Link key={hub.id} to={`/hubs/${hub.id}`} className="block">
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
          ))
        )}
      </div>
    </div>
  );
}