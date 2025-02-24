import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function FavoriteDetails() {
  const { favoriteId } = useParams<{ favoriteId: string }>();
  const navigate = useNavigate();

  // Fetch details of the selected favorite
  const { data: favoriteDetails, isLoading } = useQuery({
    queryKey: ['favorite-details', favoriteId],
    queryFn: async () => {
      // Fetch details from Supabase (e.g., stops, hubs, or routes)
      const { data: stop } = await supabase
        .from('stops')
        .select('*')
        .eq('name', favoriteId)
        .single();

      const { data: hub } = await supabase
        .from('hubs')
        .select('*')
        .eq('name', favoriteId)
        .single();

      const { data: route } = await supabase
        .from('routes')
        .select('*')
        .eq('name', favoriteId)
        .single();

      return stop || hub || route || null;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!favoriteDetails) {
    return <div>Favorite not found.</div>;
  }

  return (
    <div className="p-6">
      <Button onClick={() => navigate(-1)} className="mb-4">
        Back
      </Button>
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">{favoriteDetails.name}</h1>
        <p className="text-muted-foreground">
          Type: {favoriteDetails.type || 'Unknown'}
        </p>
        <p className="text-muted-foreground">
          Location: {favoriteDetails.latitude}, {favoriteDetails.longitude}
        </p>
        {/* Add more details as needed */}
      </Card>
    </div>
  );
}