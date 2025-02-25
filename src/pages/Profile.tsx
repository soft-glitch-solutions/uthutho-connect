import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { GamificationSection } from '@/components/profile/GamificationSection';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  preferred_transport: string | null;
  points: number;
  titles: string[];
  selected_title: string | null;
}

interface Title {
  id: number;
  title: string;
  points_required: number;
}

const Profile = () => {
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
        .select(`id, first_name, last_name, avatar_url, preferred_transport, points, titles, selected_title`)
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${session?.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const updates = {
        ...profile,
        avatar_url: publicUrl,
        updated_at: new Date(),
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(updates);

      if (updateError) throw updateError;

      setProfile(updates);
      toast.success('Avatar updated successfully!');
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

      const updates = {
        id: session.user.id,
        first_name: profile?.first_name,
        last_name: profile?.last_name,
        avatar_url: profile?.avatar_url,
        preferred_transport: profile?.preferred_transport,
        updated_at: new Date(),
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

      setProfile((prev) => ({ ...prev!, selected_title: title }));
      toast.success('Title updated successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6 bg-background/50 backdrop-blur-sm border border-primary/20">
        <h1 className="text-2xl font-bold text-center mb-6">Your Profile</h1>

        <Tabs defaultValue="gamification">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="gamification">Rank</TabsTrigger>
            <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
            <TabsTrigger value="achievements">Awards</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="space-y-4">
              <TabsContent value="gamification">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/2 mx-auto" />
                  <Skeleton className="h-6 w-3/4 mx-auto" />
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map((_, index) => (
                      <Skeleton key={index} className="h-10 w-24 rounded-full" />
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="basic-info">
                <div className="space-y-4">
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-6 w-32 mt-2" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </TabsContent>

              <TabsContent value="achievements">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/2" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((_, index) => (
                      <Skeleton key={index} className="h-6 w-full" />
                    ))}
                  </div>
                </div>
              </TabsContent>
            </div>
          ) : (
            <>
              <TabsContent value="gamification">
                <GamificationSection 
                  profile={profile}
                  titles={titles}
                  onSelectTitle={handleSelectTitle}
                />
              </TabsContent>

              <TabsContent value="basic-info">
                <ProfileAvatar 
                  url={profile.avatar_url}
                  firstName={profile.first_name}
                  onUpload={handleAvatarUpload}
                />
                <ProfileForm 
                  profile={profile}
                  isLoading={loading}
                  onSubmit={updateProfile}
                  onChange={setProfile}
                />
              </TabsContent>

              <TabsContent value="achievements">
                <div className="space-y-4">
                  <p className="text-lg font-medium">Available Titles:</p>
                  <div className="space-y-2">
                    {titles.map((title) => (
                      <div
                        key={title.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-background"
                      >
                        <div>
                          <p className="font-medium">{title.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Required: {title.points_required} points
                          </p>
                        </div>
                        {profile.titles?.includes(title.title) ? (
                          <span className="text-green-500">Unlocked</span>
                        ) : (
                          <span className="text-muted-foreground">
                            {title.points_required - (profile.points || 0)} points needed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </Card>
    </div>
  );
};

export default Profile;
