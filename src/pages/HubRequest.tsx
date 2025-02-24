
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function HubRequest() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    transport_type: "",
    description: "",
    latitude: "",
    longitude: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('hub_requests')
        .insert({
          name: formData.name,
          address: formData.address,
          transport_type: formData.transport_type,
          description: formData.description,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          user_id: user.id
        });

      if (error) throw error;

      toast.success("Hub request submitted successfully!");
      navigate("/hubs");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Request New Hub</h1>
      
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Hub Name</label>
            <Input
              required
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter hub name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Address</label>
            <Input
              required
              value={formData.address}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Latitude</label>
              <Input
                required
                type="number"
                step="any"
                value={formData.latitude}
                onChange={e => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                placeholder="Enter latitude"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Longitude</label>
              <Input
                required
                type="number"
                step="any"
                value={formData.longitude}
                onChange={e => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                placeholder="Enter longitude"
              />
            </div>
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
