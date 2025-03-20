
import { Card } from "@/components/ui/card";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { useProfile } from "@/hooks/useProfile";

const Profile = () => {
  const {
    loading,
    profile,
    titles,
    setProfile,
    handleAvatarUpload,
    updateProfile,
    handleSelectTitle
  } = useProfile();

  if (!profile) return null;

  return (
    <div className="flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6 bg-background/50 backdrop-blur-sm border border-primary/20">
        <h1 className="text-2xl font-bold text-center mb-6">Your Profile</h1>

        <ProfileTabs
          profile={profile}
          titles={titles}
          loading={loading}
          onAvatarUpload={handleAvatarUpload}
          onProfileUpdate={updateProfile}
          onProfileChange={setProfile}
          onSelectTitle={handleSelectTitle}
        />
      </Card>
    </div>
  );
};

export default Profile;
