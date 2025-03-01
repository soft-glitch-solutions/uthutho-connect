
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, PencilLine } from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function RouteDetails() {
  const { routeId } = useParams<{ routeId: string }>();
  const [showPriceChangeDialog, setShowPriceChangeDialog] = useState(false);
  const [newPrice, setNewPrice] = useState("");

  // Fetch route details
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

  // Fetch stops with the number of people waiting
  const { data: stops, isLoading: stopsLoading, error: stopsError } = useQuery({
    queryKey: ["stops", routeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stops")
        .select(`
          id, 
          name, 
          order_number,
          stop_waiting (
            id
          )
        `)
        .eq("route_id", routeId)
        .order("order_number");

      if (error) throw error;

      // Map through the stops and add a waitingCount property
      return data.map(stop => ({
        ...stop,
        waitingCount: stop.stop_waiting.length
      }));
    },
  });

  const handlePriceChangeSubmit = async () => {
    if (!newPrice || isNaN(Number(newPrice)) || Number(newPrice) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      const { error } = await supabase.from("price_change_requests").insert({
        route_id: routeId,
        current_price: route?.cost,
        new_price: Number(newPrice),
        status: "pending"
      });

      if (error) throw error;

      toast.success("Price change request submitted successfully. If correct, you'll receive 10 points!");
      setShowPriceChangeDialog(false);
      setNewPrice("");
    } catch (error: any) {
      toast.error(`Error submitting price change: ${error.message}`);
    }
  };

  // Loading and error states
  if (routeLoading) return <p>Loading route details...</p>;
  if (routeError) return <p>Error loading route: {routeError.message}</p>;

  if (!route) return <p>Route not found.</p>;

  return (
    <div className="space-y-6">
      {/* Route Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{route.name}</h1>
        <Button asChild>
          <Link to="/routes">Back to Routes</Link>
        </Button>
      </div>

      {/* Route Details Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Cost</h3>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setShowPriceChangeDialog(true)}
          >
            <PencilLine className="h-4 w-4" />
            Report Price Change
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">R{route.cost.toFixed(2)}</p>

        <h3 className="font-semibold mb-2">Transport Type</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{route.transport_type}</span>

        <h3 className="font-semibold mb-2 mt-4">Start Point</h3>
        <p className="text-sm text-muted-foreground">{route.start_point}</p>

        <h3 className="font-semibold mb-2 mt-4">End Point</h3>
        <p className="text-sm text-muted-foreground">{route.end_point}</p>
      </Card>

      {/* Price Change Dialog */}
      <Dialog open={showPriceChangeDialog} onOpenChange={setShowPriceChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Price Change</DialogTitle>
            <DialogDescription>
              <div className="flex items-start gap-2 my-4 p-3 bg-yellow-50 text-yellow-800 rounded-md">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  Please only submit a price change that is factual. If any data is submitted maliciously, your account will be banned. 
                  If your price is correct with current data, you will be awarded 10 points on your profile.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="current-price" className="text-right">
                Current Price:
              </label>
              <div className="col-span-3">
                <Input id="current-price" value={`R${route.cost.toFixed(2)}`} disabled />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="new-price" className="text-right">
                New Price:
              </label>
              <div className="col-span-3">
                <Input 
                  id="new-price" 
                  type="number" 
                  placeholder="Enter new price" 
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowPriceChangeDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handlePriceChangeSubmit}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stops Section */}
      <h2 className="text-xl font-semibold">Stops</h2>
      {stopsLoading ? (
        <p>Loading stops...</p>
      ) : stops?.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stops.map((stop) => (
            <Card key={stop.id} className="p-4">
              <h3 className="font-semibold mb-2">{stop.name}</h3>
              <p className="text-sm text-muted-foreground">People Waiting: {stop.waitingCount}</p>
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
