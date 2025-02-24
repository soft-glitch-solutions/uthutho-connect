import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  preferred_transport: string;
}

const Profile: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

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
    }
  }, [session]);

  const getProfile = async () => {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      let { data, error, status } = await supabase
        .from('profiles')
        .select(`id, first_name, last_name, avatar_url, preferred_transport`)
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6 bg-background/50 backdrop-blur-sm border border-primary/20">
        <h1 className="text-2xl font-bold text-center mb-6">Your Profile</h1>

        {loading ? (
          <p className="text-center">Loading...</p>
        ) : (
          profile && (
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
          )
        )}
      </Card>
    </div>
  );
};

export default Profile;