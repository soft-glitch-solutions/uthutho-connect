
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileForm } from "./ProfileForm";
import { GamificationSection } from "./GamificationSection";
import { TitlesSection } from "./TitlesSection";
import { Profile } from "@/types/profile";
import { Title } from "@/types/title";

interface ProfileTabsProps {
  profile: Profile;
  titles: Title[];
  loading: boolean;
  onAvatarUpload: (publicUrl: string) => Promise<void>;
  onProfileUpdate: (e: React.FormEvent) => Promise<void>;
  onProfileChange: (profile: Profile) => void;
  onSelectTitle: (title: string) => Promise<void>;
}

export function ProfileTabs({
  profile,
  titles,
  loading,
  onAvatarUpload,
  onProfileUpdate,
  onProfileChange,
  onSelectTitle,
}: ProfileTabsProps) {
  if (loading) {
    return <ProfileTabsSkeleton />;
  }

  return (
    <Tabs defaultValue="gamification">
      <TabsList className="grid grid-cols-3">
        <TabsTrigger value="gamification">Rank</TabsTrigger>
        <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
        <TabsTrigger value="achievements">Awards</TabsTrigger>
      </TabsList>

      <TabsContent value="gamification">
        <GamificationSection 
          profile={profile}
          titles={titles}
          onSelectTitle={onSelectTitle}
        />
      </TabsContent>

      <TabsContent value="basic-info">
        <ProfileAvatar 
          url={profile.avatar_url}
          firstName={profile.first_name}
          onUpload={onAvatarUpload}
        />
        <ProfileForm 
          profile={profile}
          isLoading={loading}
          onSubmit={onProfileUpdate}
          onChange={onProfileChange}
        />
      </TabsContent>

      <TabsContent value="achievements">
        <TitlesSection profile={profile} titles={titles} />
      </TabsContent>
    </Tabs>
  );
}

function ProfileTabsSkeleton() {
  return (
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
  );
}
