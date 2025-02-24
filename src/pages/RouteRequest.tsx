
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function RouteRequest() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    start_point: "",
    end_point: "",
    transport_type: "",
    description: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('route_requests')
        .insert({
          start_point: formData.start_point,
          end_point: formData.end_point,
          transport_type: formData.transport_type,
          description: formData.description,
          user_id: user.id
        });

      if (error) throw error;

      toast.success("Route request submitted successfully!");
      navigate("/routes");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Request New Route</h1>
      
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Point</label>
            <Input
              required
              value={formData.start_point}
              onChange={e => setFormData(prev => ({ ...prev, start_point: e.target.value }))}
              placeholder="Enter starting point"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">End Point</label>
            <Input
              required
              value={formData.end_point}
              onChange={e => setFormData(prev => ({ ...prev, end_point: e.target.value }))}
              placeholder="Enter destination"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Transport Type</label>
            <Input
              required
              value={formData.transport_type}
              onChange={e => setFormData(prev => ({ ...prev, transport_type: e.target.value }))}
              placeholder="Enter transport type"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter additional details"
              rows={4}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
