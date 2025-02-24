
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Session } from '@supabase/supabase-js';

interface Profile {
  username: string;
  full_name: string;
  avatar_url: string;
  website: string;
}

const Profile: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

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
        .select(`username, full_name, avatar_url, website`)
        .eq('id', session?.user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setProfile(data);
      }
    } catch (error: any) {
      alert(error.message);
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
        id: session?.user.id,
        username: profile?.username,
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
        website: profile?.website,
        updated_at: new Date(),
      };

      let { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-widget">
      {loading ? (
        'Loading ...'
      ) : (
        <>
        {profile && (
        <form onSubmit={updateProfile} className="form-widget">
            <div className="form-widget">
            <div>
            <label htmlFor="email">Email</label>
            <input id="email" type="text" value={session?.user.email} disabled />
          </div>
            <div>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={profile.username || ''}
                onChange={(e) =>
                  setProfile({ ...profile, username: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                type="text"
                value={profile.full_name || ''}
                onChange={(e) =>
                  setProfile({ ...profile, full_name: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="website"
                value={profile.website || ''}
                onChange={(e) =>
                  setProfile({ ...profile, website: e.target.value })
                }
              />
            </div>
            <button className="button primary block" disabled={loading}>
              Update profile
            </button>
            </div>
          </form>
        )}
        </>
      )}
    </div>
  );
};

export default Profile;
