
import { useState, useEffect } from 'react';
import { Profile } from "@/types/profile";
import { Title } from "@/types/title";
import { supabase } from "@/integrations/supabase/client";
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

export function useProfile() {
  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [titles, setTitles] = useState<Title[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (session?.user) {
      getProfile();
      fetchTitles();
    }
  }, [session]);

  const getProfile = async () => {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      let { data, error, status } = await supabase
        .from('profiles')
        .select(`id, first_name, last_name, avatar_url, preferred_transport, points, titles, selected_title, favorites, updated_at`)
        .eq('id', session?.user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setProfile(data);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTitles = async () => {
    try {
      const { data, error } = await supabase
        .from('titles')
        .select('*')
        .order('points_required', { ascending: true });

      if (error) throw error;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('points, titles')
        .eq('id', session?.user?.id)
        .single();

      if (profileData) {
        const newlyUnlockedTitles = data
          .filter(title => 
            title.points_required <= profileData.points && 
            !profileData.titles.includes(title.title)
          )
          .map(title => title.title);

        if (newlyUnlockedTitles.length > 0) {
          const updatedTitles = [...(profileData.titles || []), ...newlyUnlockedTitles];
          await supabase
            .from('profiles')
            .update({ titles: updatedTitles })
            .eq('id', session?.user?.id);
          
          toast.success(`You've unlocked ${newlyUnlockedTitles.length} new title(s)!`);
          getProfile();
        }
      }

      setTitles(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAvatarUpload = async (publicUrl: string) => {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user session found');

      const updates = {
        id: session.user.id,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(updates);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');
      if (!profile) throw new Error('Profile not found!');

      const updates = {
        id: session.user.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatar_url: profile.avatar_url,
        preferred_transport: profile.preferred_transport,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) throw error;
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTitle = async (title: string) => {
    try {
      setLoading(true);
      if (!profile?.titles?.includes(title)) {
        throw new Error('You have not unlocked this title yet.');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ selected_title: title })
        .eq('id', session?.user.id);

      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, selected_title: title } : null));
      toast.success('Title updated successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    profile,
    titles,
    setProfile,
    handleAvatarUpload,
    updateProfile,
    handleSelectTitle
  };
}
