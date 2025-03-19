
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, AlertTriangle, Users, Shield, Trash2 } from "lucide-react";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

interface StopBusyTime {
  id: string;
  stop_id: string;
  day_of_week: number;
  hour_of_day: number;
  busyness_level: number;
  safety_level: number;
  created_at?: string;
  updated_at?: string;
}

export default function ManageStopBusyness() {
  const { stopId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Form state
  const [selectedDay, setSelectedDay] = useState<number>(1); // Monday default
  const [selectedHour, setSelectedHour] = useState<number>(8); // 8 AM default
  const [busynessLevel, setBusynessLevel] = useState<number>(3);
  const [safetyLevel, setSafetyLevel] = useState<number>(3);
  
  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data, error } = await supabase.rpc('is_admin', { user_id: (await supabase.auth.getUser()).data.user?.id });
        if (error) throw error;
        
        if (!data) {
          toast.error("Admin access required");
          navigate(`/stops/${stopId}`);
        }
        
        setIsAdmin(data);
      } catch (error) {
        console.error("Error checking admin status:", error);
        toast.error("Failed to verify admin status");
        navigate(`/stops/${stopId}`);
      }
    };
    
    checkAdmin();
  }, [navigate, stopId]);

  // Fetch stop details
  const { data: stop } = useQuery({
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
    enabled: !!stopId && isAdmin,
  });

  // Fetch busy times
  const { data: busyTimes, isLoading: isLoadingBusyTimes } = useQuery({
    queryKey: ["busyTimes", stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stop_busy_times")
        .select("*")
        .eq("stop_id", stopId)
        .order("day_of_week", { ascending: true })
        .order("hour_of_day", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!stopId && isAdmin,
  });

  // Add busy time mutation
  const addBusyTimeMutation = useMutation({
    mutationFn: async (newBusyTime: Omit<StopBusyTime, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("stop_busy_times")
        .upsert(newBusyTime, { 
          onConflict: 'stop_id,day_of_week,hour_of_day', 
          ignoreDuplicates: false 
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["busyTimes", stopId] });
      toast.success("Busyness time updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Error adding busyness time: ${error.message}`);
    },
  });

  // Delete busy time mutation
  const deleteBusyTimeMutation = useMutation({
    mutationFn: async (timeId: string) => {
      const { error } = await supabase
        .from("stop_busy_times")
        .delete()
        .eq("id", timeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["busyTimes", stopId] });
      toast.success("Entry deleted successfully");
    },
    onError: (error: any) => {
      toast.error(`Error deleting entry: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stopId) return;
    
    addBusyTimeMutation.mutate({
      stop_id: stopId,
      day_of_week: selectedDay,
      hour_of_day: selectedHour,
      busyness_level: busynessLevel,
      safety_level: safetyLevel
    });
  };

  const handleDelete = (timeId: string) => {
    if (confirm("Are you sure you want to delete this time entry?")) {
      deleteBusyTimeMutation.mutate(timeId);
    }
  };

  // Format hour for display
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  if (!isAdmin) {
    return <div className="flex justify-center p-8">Verifying admin access...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Busyness & Safety</h1>
        <Button onClick={() => navigate(`/stops/${stopId}`)} variant="outline">
          Back to Stop Details
        </Button>
      </div>
      
      {stop && (
        <p className="text-lg font-medium">
          Stop: {stop.name}
        </p>
      )}
      
      <Tabs defaultValue="add">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="add" className="flex-1">Add/Update Time</TabsTrigger>
          <TabsTrigger value="view" className="flex-1">View All Times</TabsTrigger>
        </TabsList>
        
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add or Update Busyness & Safety</CardTitle>
              <CardDescription>
                Configure how busy and safe this stop is at specific times
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="day">Day of Week</Label>
                      <Select 
                        value={selectedDay.toString()} 
                        onValueChange={(value) => setSelectedDay(parseInt(value))}
                      >
                        <SelectTrigger id="day">
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map((day, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="hour">Hour of Day</Label>
                      <Select 
                        value={selectedHour.toString()} 
                        onValueChange={(value) => setSelectedHour(parseInt(value))}
                      >
                        <SelectTrigger id="hour">
                          <SelectValue placeholder="Select hour" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {formatHour(i)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="busyness" className="flex items-center gap-1">
                          <Users className="h-4 w-4" /> Busyness Level: {busynessLevel}
                        </Label>
                        <span className="text-sm text-muted-foreground">{busynessLevel}/5</span>
                      </div>
                      <Slider 
                        id="busyness"
                        min={1} 
                        max={5} 
                        step={1} 
                        value={[busynessLevel]} 
                        onValueChange={(values) => setBusynessLevel(values[0])} 
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Empty</span>
                        <span>Very Busy</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="safety" className="flex items-center gap-1">
                          <Shield className="h-4 w-4" /> Safety Level: {safetyLevel}
                        </Label>
                        <span className="text-sm text-muted-foreground">{safetyLevel}/5</span>
                      </div>
                      <Slider 
                        id="safety"
                        min={1} 
                        max={5} 
                        step={1} 
                        value={[safetyLevel]} 
                        onValueChange={(values) => setSafetyLevel(values[0])} 
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Less Safe</span>
                        <span>Very Safe</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {busynessLevel >= 4 && safetyLevel <= 2 && (
                  <div className="flex items-center text-amber-600 bg-amber-50 p-3 rounded-md">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    <span>Warning: This combination indicates a high-risk time (high busyness, low safety)</span>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={addBusyTimeMutation.isPending}>
                  {addBusyTimeMutation.isPending ? "Saving..." : "Save Time Data"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="view">
          <Card>
            <CardHeader>
              <CardTitle>All Busyness & Safety Times</CardTitle>
              <CardDescription>
                View and manage all configured time data for this stop
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBusyTimes ? (
                <div>Loading times data...</div>
              ) : !busyTimes || busyTimes.length === 0 ? (
                <div>No times data configured yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Busyness</TableHead>
                      <TableHead>Safety</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {busyTimes.map((time) => (
                      <TableRow key={time.id}>
                        <TableCell>{DAYS_OF_WEEK[time.day_of_week]}</TableCell>
                        <TableCell>{formatHour(time.hour_of_day)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="mr-2">{time.busyness_level}/5</span>
                            <div className={`w-3 h-3 rounded-full ${
                              time.busyness_level === 5 ? "bg-red-500" :
                              time.busyness_level === 4 ? "bg-orange-500" :
                              time.busyness_level === 3 ? "bg-yellow-400" :
                              time.busyness_level === 2 ? "bg-green-300" :
                              "bg-green-500"
                            }`}></div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="mr-2">{time.safety_level}/5</span>
                            <div className={`w-3 h-3 rounded-full ${
                              time.safety_level === 5 ? "bg-green-500" :
                              time.safety_level === 4 ? "bg-green-300" :
                              time.safety_level === 3 ? "bg-yellow-400" :
                              time.safety_level === 2 ? "bg-orange-500" :
                              "bg-red-500"
                            }`}></div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(time.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
