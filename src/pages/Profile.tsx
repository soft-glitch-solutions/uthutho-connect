import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton"; // Add this import

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  preferred_transport: string;
  points: number;
  titles: string[];
  selected_title: string;
}

interface Title {
  id: number;
  title: string;
  points_required: number;
}

const Profile: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [titles, setTitles] = useState<Title[]>([]); // All available titles
  const [activeTab, setActiveTab] = useState<string>('gamification'); // Active tab state

  // Transport options for the dropdown
  const transportOptions = ['train', 'taxi', 'bus'];

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

  // Fetch the user's profile
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

  // Fetch all titles from Supabase
  const fetchTitles = async () => {
    try {
      const { data, error } = await supabase
        .from('titles')
        .select('*')
        .order('points_required', { ascending: true });

      if (error) throw error;
      setTitles(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);

    try {
      setLoading(true);

      // Upload the file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${session?.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL of the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update the profile with the new avatar URL
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

  // Update profile
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

  // Handle title selection
  const handleSelectTitle = async (title: string) => {
    try {
      setLoading(true);

      // Fetch the required points for the selected title
      const { data: titleData, error: titleError } = await supabase
        .from('titles')
        .select('points_required')
        .eq('title', title)
        .single();

      if (titleError) throw titleError;

      // Check if the user has the required points and has earned the title
      if (
        profile?.points >= titleData.points_required &&
        profile?.titles.includes(title)
      ) {
        // Update the user's selected title
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ selected_title: title })
          .eq('id', session?.user.id);

        if (updateError) throw updateError;

        setProfile((prev) => ({ ...prev!, selected_title: title }));
        toast.success('Title updated successfully!');
      } else {
        toast.error('You do not meet the requirements for this title.');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6 bg-background/50 backdrop-blur-sm border border-primary/20">
        <h1 className="text-2xl font-bold text-center mb-6">Your Profile</h1>

        <Tabs defaultValue="gamification" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="gamification">Rank</TabsTrigger>
            <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
            <TabsTrigger value="achievements">Awards</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="space-y-4">
              {/* Skeleton for Gamification Tab */}
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

              {/* Skeleton for Basic Info Tab */}
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

              {/* Skeleton for Achievements Tab */}
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
            profile && (
              <>
                {/* Gamification Tab */}
                <TabsContent value="gamification">
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-lg font-medium">Points: {profile.points}</p>
                      <p className="text-sm text-muted-foreground">
                        Earn more points to unlock new titles!
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-medium">Select Your Title:</p>
                      <div className="flex flex-wrap gap-2">
                        {titles.map((title) => (
                          <button
                            key={title.id}
                            onClick={() => handleSelectTitle(title.title)}
                            disabled={
                              !profile.titles.includes(title.title) ||
                              profile.points < title.points_required
                            }
                            className={`px-4 py-2 rounded-full border ${
                              profile.titles.includes(title.title) &&
                              profile.points >= title.points_required
                                ? 'bg-primary text-white hover:bg-primary/90'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {title.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Basic Info Tab */}
                <TabsContent value="basic-info">
                  <form onSubmit={updateProfile} className="space-y-4">
                    <div className="flex flex-col items-center">
                      <Avatar className="w-24 h-24 mb-4">
                        <AvatarImage src={profile.avatar_url} alt="Profile Picture" />
                        <AvatarFallback>
                          {profile.first_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        id="avatar-upload"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="text-sm text-primary cursor-pointer hover:underline"
                      >
                        Upload new avatar
                      </label>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium">
                        Email
                      </label>
                      <Input
                        id="email"
                        type="text"
                        value={session?.user.email || ''}
                        disabled
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium">
                        First Name
                      </label>
                      <Input
                        id="first_name"
                        type="text"
                        value={profile.first_name || ''}
                        onChange={(e) =>
                          setProfile({ ...profile, first_name: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium">
                        Last Name
                      </label>
                      <Input
                        id="last_name"
                        type="text"
                        value={profile.last_name || ''}
                        onChange={(e) =>
                          setProfile({ ...profile, last_name: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label htmlFor="preferred_transport" className="block text-sm font-medium">
                        Preferred Transport
                      </label>
                      <select
                        id="preferred_transport"
                        value={profile.preferred_transport || ''}
                        onChange={(e) =>
                          setProfile({ ...profile, preferred_transport: e.target.value })
                        }
                        className="mt-1 block w-full p-2 border border-primary/20 rounded-md bg-background"
                      >
                        <option value="" disabled>Select an option</option>
                        {transportOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={loading}
                    >
                      {loading ? 'Updating...' : 'Update Profile'}
                    </Button>
                  </form>
                </TabsContent>

                {/* Achievements Tab */}
                <TabsContent value="achievements">
                  <div className="space-y-4">
                    <p className="text-lg font-medium">All Titles:</p>
                    <ul className="list-disc pl-6">
                      {titles.map((title) => (
                        <li key={title.id}>
                          {title.title} - {title.points_required} points
                          {profile.titles.includes(title.title) && (
                            <span className="ml-2 text-green-500">✓ Unlocked</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </TabsContent>
              </>
            )
          )}
        </Tabs>
      </Card>
    </div>
  );
};

export default Profile;