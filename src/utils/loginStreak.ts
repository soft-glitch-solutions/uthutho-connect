
import { supabase } from "@/integrations/supabase/client";

export const updateLoginStreak = async (userId: string): Promise<{
  current_streak: number;
  max_streak: number;
  is_new_day: boolean;
  points_added: number;
} | null> => {
  try {
    // Get the user's current streak info
    const { data: existingStreak, error: fetchError } = await supabase
      .from('login_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching streak:', fetchError);
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If the user has no streak record, create one
    if (!existingStreak) {
      const { data: newStreak, error: insertError } = await supabase
        .from('login_streaks')
        .insert([{
          user_id: userId,
          last_login: today.toISOString(),
          current_streak: 1,
          max_streak: 1
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating streak:', insertError);
        return null;
      }

      return {
        current_streak: 1,
        max_streak: 1,
        is_new_day: true,
        points_added: 0
      };
    }

    // Convert the last login date to a Date object
    const lastLogin = new Date(existingStreak.last_login);
    lastLogin.setHours(0, 0, 0, 0);
    
    // Calculate the difference in days
    const diffTime = today.getTime() - lastLogin.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // If the user has already logged in today, do nothing
    if (diffDays === 0) {
      return {
        current_streak: existingStreak.current_streak,
        max_streak: existingStreak.max_streak,
        is_new_day: false,
        points_added: 0
      };
    }
    
    // If the user logged in yesterday, increment the streak
    let newStreak, pointsToAdd = 0;
    if (diffDays === 1) {
      newStreak = existingStreak.current_streak + 1;
      
      // If the streak is divisible by 7, add a point to the user's profile
      if (newStreak % 7 === 0) {
        pointsToAdd = 1;
        
        // Update the user's points
        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ 
            points: supabase.rpc('increment', { x: 1 }) 
          })
          .eq('id', userId);
          
        if (pointsError) {
          console.error('Error updating points:', pointsError);
        }
      }
    } else if (diffDays > 1) {
      // If the user missed a day, reset the streak
      newStreak = 1;
    } else {
      // Somehow the last login is in the future, reset the streak
      newStreak = 1;
    }
    
    // Calculate the new max streak
    const newMaxStreak = Math.max(existingStreak.max_streak, newStreak);
    
    // Update the streak in the database
    const { error: updateError } = await supabase
      .from('login_streaks')
      .update({
        last_login: today.toISOString(),
        current_streak: newStreak,
        max_streak: newMaxStreak
      })
      .eq('id', existingStreak.id);
      
    if (updateError) {
      console.error('Error updating streak:', updateError);
      return null;
    }
    
    return {
      current_streak: newStreak,
      max_streak: newMaxStreak,
      is_new_day: true,
      points_added: pointsToAdd
    };
  } catch (error) {
    console.error('Unexpected error updating login streak:', error);
    return null;
  }
};

// Add a fallback function for incrementing values since supabase.rpc might not work in all cases
if (!supabase.rpc) {
  supabase.rpc = async (functionName: string, params: any) => {
    if (functionName === 'increment') {
      // Fetch the current points first
      const { data: profileData } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', params.userId)
        .single();
        
      return (profileData?.points || 0) + params.x;
    }
    return params;
  };
}
