
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Store() {
  const [loading, setLoading] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    type: string;
    name: string;
    points?: number;
    price: number;
    period?: string;
  } | null>(null);

  // Points packages
  const pointsPackages = [
    { type: "points", name: "Starter Pack", points: 100, price: 9.99 },
    { type: "points", name: "Popular Pack", points: 500, price: 39.99 },
    { type: "points", name: "Value Pack", points: 1000, price: 69.99 },
  ];

  // Subscription plans
  const subscriptionPlans = [
    { type: "subscription", name: "Monthly Support", price: 4.99, period: "month" },
    { type: "subscription", name: "Annual Support", price: 49.99, period: "year" },
  ];

  const handlePurchase = (plan: typeof selectedPlan) => {
    setSelectedPlan(plan);
    setShowConfirmDialog(true);
  };

  const confirmPurchase = async () => {
    if (!selectedPlan) return;
    
    setLoading(selectedPlan.name);
    
    try {
      // In a real app, this would integrate with a payment gateway
      // For now, we'll simulate a successful purchase
      
      // If it's a points package, add points to the user's account
      if (selectedPlan.type === "points" && selectedPlan.points) {
        const { data: session } = await supabase.auth.getSession();
        const userId = session.session?.user.id;
        
        if (userId) {
          // Get current points
          const { data: profile } = await supabase
            .from('profiles')
            .select('points')
            .eq('id', userId)
            .single();
            
          const currentPoints = profile?.points || 0;
          
          // Update points
          await supabase
            .from('profiles')
            .update({ points: currentPoints + selectedPlan.points })
            .eq('id', userId);
            
          toast.success(`Added ${selectedPlan.points} points to your account!`);
        }
      } else {
        // Handle subscription purchase
        toast.success(`Subscribed to "${selectedPlan.name}" successfully!`);
      }
      
      setShowConfirmDialog(false);
    } catch (error) {
      toast.error("Purchase failed. Please try again.");
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">Uthutho Store</h1>
        <p className="text-muted-foreground mb-6">
          Purchase points or subscribe to support your local kasi transport network and unlock additional features.
        </p>
      </div>

      {/* Points Packages */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Points Packages</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {pointsPackages.map((pkg) => (
            <Card key={pkg.name} className="p-6">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <h3 className="text-lg font-medium">{pkg.name}</h3>
                  <p className="text-3xl font-bold mt-2">{pkg.points} Points</p>
                  <p className="text-muted-foreground mt-1">R{pkg.price}</p>
                </div>
                <Button 
                  className="mt-4 w-full" 
                  onClick={() => handlePurchase(pkg)}
                  disabled={loading === pkg.name}
                >
                  {loading === pkg.name ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : "Purchase"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Subscriptions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Subscription Plans</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {subscriptionPlans.map((plan) => (
            <Card key={plan.name} className="p-6">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <h3 className="text-lg font-medium">{plan.name}</h3>
                  <div className="flex items-end mt-2">
                    <p className="text-3xl font-bold">R{plan.price}</p>
                    <p className="ml-1 text-muted-foreground">/{plan.period}</p>
                  </div>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-primary mr-2" />
                      <span>Ad-free experience</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-primary mr-2" />
                      <span>"Support My Kasi" badge</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-primary mr-2" />
                      <span>Priority mission rewards</span>
                    </li>
                  </ul>
                </div>
                <Button 
                  className="mt-6 w-full" 
                  onClick={() => handlePurchase(plan)}
                  disabled={loading === plan.name}
                >
                  {loading === plan.name ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : `Subscribe for R${plan.price}/${plan.period}`}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              {selectedPlan?.type === "points" 
                ? `You are about to purchase ${selectedPlan?.points} points for R${selectedPlan?.price}.`
                : `You are about to subscribe to ${selectedPlan?.name} for R${selectedPlan?.price}/${selectedPlan?.period}.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPurchase} disabled={loading !== null}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
