
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Home() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [routes, hubs] = await Promise.all([
        supabase.from('routes').select('*', { count: 'exact' }),
        supabase.from('hubs').select('*', { count: 'exact' })
      ]);
      
      return {
        routes: routes.count || 0,
        hubs: hubs.count || 0
      };
    }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Available Routes</h3>
          <p className="text-3xl font-bold text-primary">{stats?.routes || 0}</p>
        </Card>
        
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Transport Hubs</h3>
          <p className="text-3xl font-bold text-primary">{stats?.hubs || 0}</p>
        </Card>
      </div>
    </div>
  );
}
