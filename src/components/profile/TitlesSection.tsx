
import { Profile } from "@/types/profile";
import { Title } from "@/types/title";

interface TitlesSectionProps {
  profile: Profile;
  titles: Title[];
}

export function TitlesSection({ profile, titles }: TitlesSectionProps) {
  return (
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
  );
}
