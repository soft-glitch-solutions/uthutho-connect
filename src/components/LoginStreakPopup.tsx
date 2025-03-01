
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LoginStreakPopupProps {
  open: boolean;
  onClose: () => void;
}

export function LoginStreakPopup({ open, onClose }: LoginStreakPopupProps) {
  const [streak, setStreak] = useState<{
    current_streak: number;
    max_streak: number;
    points_earned?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchLoginStreak();
    }
  }, [open]);

  const fetchLoginStreak = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) return;

      const userId = session.session.user.id;

      // Get the user's current streak
      const { data: streakData, error: streakError } = await supabase
        .from('login_streaks')
        .select('current_streak, max_streak')
        .eq('user_id', userId)
        .single();

      if (streakError && streakError.code !== 'PGRST116') {
        throw streakError;
      }

      if (streakData) {
        // Check if the streak has reached 7 days
        const pointsEarned = streakData.current_streak % 7 === 0 ? 1 : 0;
        setStreak({
          ...streakData,
          points_earned: pointsEarned
        });
      }
    } catch (error) {
      console.error('Error fetching login streak:', error);
      toast.error('Could not load login streak');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Login Streak</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="py-6 flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full border-4 border-t-primary animate-spin" />
            <p>Loading your streak...</p>
          </div>
        ) : streak ? (
          <div className="py-6 flex flex-col items-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-4xl font-bold">{streak.current_streak}</span>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">
                {streak.current_streak === 1 
                  ? "First day of your streak!" 
                  : `${streak.current_streak} day streak! Keep it up!`}
              </p>
              
              <p className="text-sm text-muted-foreground">
                Your best streak: {streak.max_streak} days
              </p>
              
              {streak.points_earned ? (
                <div className="mt-4 p-2 bg-green-100 dark:bg-green-900 rounded-md">
                  <p className="text-green-700 dark:text-green-300 font-medium">
                    +{streak.points_earned} point earned for completing 7 days!
                  </p>
                </div>
              ) : (
                <p className="text-sm">
                  {7 - (streak.current_streak % 7)} more days for a point reward
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p>Start your login streak today!</p>
          </div>
        )}
        
        <div className="flex justify-center">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
