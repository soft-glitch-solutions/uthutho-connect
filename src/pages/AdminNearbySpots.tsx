
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { MapPin, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const SPOT_CATEGORIES = [
  "Restaurant", 
  "Café", 
  "Shop", 
  "Grocery", 
  "ATM", 
  "Pharmacy", 
  "Attraction", 
  "Park", 
  "Library",
  "Other"
];

// Form schema
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().optional(),
  latitude: z.number().or(z.string().transform(val => parseFloat(val)))
    .refine(val => !isNaN(val), { message: "Must be a valid number" }),
  longitude: z.number().or(z.string().transform(val => parseFloat(val)))
    .refine(val => !isNaN(val), { message: "Must be a valid number" }),
  distance_meters: z.number().or(z.string().transform(val => parseFloat(val)))
    .refine(val => !isNaN(val), { message: "Must be a valid number" })
    .optional(),
  category: z.string().min(1, { message: "Please select a category" }),
  image_url: z.string().url({ message: "Must be a valid URL" }).optional(),
});

export default function AdminNearbySpots() {
  const { stopId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<any>(null);
  
  // Create form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      latitude: 0,
      longitude: 0,
      distance_meters: 0,
      category: "",
      image_url: "",
    },
  });

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data, error } = await supabase.rpc('is_admin', { user_id: (await supabase.auth.getUser()).data.user?.id });
        if (error) throw error;
        setIsAdmin(data);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };
    
    checkAdmin();
  }, []);

  // Fetch stop details
  const { data: stop, isLoading: isLoadingStop } = useQuery({
    queryKey: ["stop", stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stops")
        .select("*")
        .eq("id", stopId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!stopId,
  });

  // Fetch nearby spots
  const { data: nearbySpots, isLoading: isLoadingNearbySpots } = useQuery({
    queryKey: ["nearbySpots", stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nearby_spots")
        .select("*")
        .eq("stop_id", stopId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!stopId,
  });

  // Create spot mutation
  const createSpotMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { error } = await supabase
        .from("nearby_spots")
        .insert({
          stop_id: stopId,
          name: values.name,
          description: values.description || null,
          latitude: values.latitude,
          longitude: values.longitude,
          distance_meters: values.distance_meters || null,
          category: values.category,
          image_url: values.image_url || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nearbySpots", stopId] });
      toast.success("Nearby spot added successfully!");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Error adding spot: ${error.message}`);
    },
  });

  // Update spot mutation
  const updateSpotMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema> & { id: string }) => {
      const { id, ...spotData } = values;
      const { error } = await supabase
        .from("nearby_spots")
        .update({
          name: spotData.name,
          description: spotData.description || null,
          latitude: spotData.latitude,
          longitude: spotData.longitude,
          distance_meters: spotData.distance_meters || null,
          category: spotData.category,
          image_url: spotData.image_url || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nearbySpots", stopId] });
      toast.success("Nearby spot updated successfully!");
      resetForm();
      setIsDialogOpen(false);
      setEditingSpot(null);
    },
    onError: (error) => {
      toast.error(`Error updating spot: ${error.message}`);
    },
  });

  // Delete spot mutation
  const deleteSpotMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("nearby_spots")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nearbySpots", stopId] });
      toast.success("Nearby spot deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Error deleting spot: ${error.message}`);
    },
  });

  // Reset form
  const resetForm = () => {
    form.reset({
      name: "",
      description: "",
      latitude: stop?.latitude || 0,
      longitude: stop?.longitude || 0,
      distance_meters: 0,
      category: "",
      image_url: "",
    });
  };

  // Open dialog for adding new spot
  const handleAddNew = () => {
    setEditingSpot(null);
    resetForm();
    setIsDialogOpen(true);
  };

  // Open dialog for editing spot
  const handleEdit = (spot: any) => {
    setEditingSpot(spot);
    form.reset({
      name: spot.name,
      description: spot.description || "",
      latitude: spot.latitude,
      longitude: spot.longitude,
      distance_meters: spot.distance_meters || 0,
      category: spot.category,
      image_url: spot.image_url || "",
    });
    setIsDialogOpen(true);
  };

  // Handle form submission
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingSpot) {
      updateSpotMutation.mutate({ ...values, id: editingSpot.id });
    } else {
      createSpotMutation.mutate(values);
    }
  };

  // Handle spot deletion
  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this nearby spot?")) {
      deleteSpotMutation.mutate(id);
    }
  };

  // Set default coordinates when stop data is loaded
  useEffect(() => {
    if (stop && !editingSpot) {
      form.setValue("latitude", stop.latitude);
      form.setValue("longitude", stop.longitude);
    }
  }, [stop, form, editingSpot]);

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You need admin privileges to access this page.</p>
        <Button onClick={() => navigate("/stops")} className="mt-4">
          Back to Stops
        </Button>
      </div>
    );
  }

  if (isLoadingStop) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!stop) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Stop not found</h2>
        <Button onClick={() => navigate("/stops")}>Back to Stops</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Nearby Spots</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/stops/${stopId}`)}>
            View Stop Details
          </Button>
          <Button onClick={() => navigate("/stops")}>
            Back to Stops
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Stop Information</CardTitle>
          <CardDescription>
            {stop.name} - ID: {stopId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Location</h3>
              <p>Latitude: {stop.latitude}</p>
              <p>Longitude: {stop.longitude}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Nearby Spots</h2>
        <Button onClick={handleAddNew}>
          <Plus className="mr-1 h-4 w-4" />
          Add New Spot
        </Button>
      </div>
      
      {isLoadingNearbySpots ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : nearbySpots?.length === 0 ? (
        <Card className="p-8 text-center">
          <p>No nearby spots found for this stop.</p>
          <p className="text-muted-foreground mt-2">Click "Add New Spot" to create one.</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nearbySpots?.map((spot) => (
                <TableRow key={spot.id}>
                  <TableCell className="font-medium">{spot.name}</TableCell>
                  <TableCell>{spot.category}</TableCell>
                  <TableCell>
                    {spot.distance_meters ? `${(spot.distance_meters / 1000).toFixed(1)} km` : "N/A"}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div>Lat: {spot.latitude}</div>
                      <div>Lng: {spot.longitude}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(spot)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(spot.id)} className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      
      {/* Add/Edit Spot Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSpot ? "Edit Nearby Spot" : "Add New Nearby Spot"}</DialogTitle>
            <DialogDescription>
              {editingSpot 
                ? "Update information for this nearby spot" 
                : "Add a new point of interest near this stop"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Spot name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SPOT_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter a brief description"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="distance_meters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance (meters)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>Distance from the stop</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/image.jpg"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Leave empty if no image is available
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="reset" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSpot ? "Update Spot" : "Add Spot"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
