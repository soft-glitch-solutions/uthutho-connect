import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transport Hubs</h1>
        <Button asChild>
          <Link to="/hub-request">
            <PlusCircle className="mr-2 h-4 w-4" />
            Request Hub
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p>Loading hubs...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hubs?.map((hub) => (
            <Link key={hub.id} to={`/hubs/${hub.id}`} className="block">
              <Card className="p-4 cursor-pointer">
                <h3 className="font-semibold mb-2">{hub.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{hub.address}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {hub.transport_type}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
