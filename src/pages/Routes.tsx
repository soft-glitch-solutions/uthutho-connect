
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Routes() {
  const { data: routes, isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transport Routes</h1>
        <Button asChild>
          <Link to="/route-request">
            <PlusCircle className="mr-2 h-4 w-4" />
            Request Route
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p>Loading routes...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {routes?.map((route) => (
            <Card key={route.id} className="p-4">
              <h3 className="font-semibold mb-2">{route.name}</h3>
              <div className="space-y-1 mb-3">
                <p className="text-sm text-muted-foreground">From: {route.start_point}</p>
                <p className="text-sm text-muted-foreground">To: {route.end_point}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {route.transport_type}
                </span>
                <span className="text-sm font-medium">
                  R{route.cost}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
