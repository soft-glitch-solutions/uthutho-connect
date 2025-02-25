
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Profile } from "@/types/profile";
import { Title } from "@/types/title";

interface GamificationSectionProps {
  profile: Profile;
  titles: Title[];
  onSelectTitle: (title: string) => Promise<void>;
}

export function GamificationSection({ profile, titles, onSelectTitle }: GamificationSectionProps) {
  const [isSelectingTitle, setIsSelectingTitle] = useState(false);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-lg font-medium">Points: {profile.points}</p>
        <p className="text-sm text-muted-foreground">
          Earn more points to unlock new titles!
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-medium">Current Title:</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSelectingTitle(!isSelectingTitle)}
          >
            {isSelectingTitle ? 'Cancel' : 'Change Title'}
          </Button>
        </div>

        <div className="p-4 rounded-lg bg-primary/5 text-center">
          <p className="text-xl font-semibold">{profile.selected_title || 'No title selected'}</p>
        </div>

        {isSelectingTitle && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Select from your unlocked titles:</p>
            <div className="flex flex-wrap gap-2">
              {titles
                .filter(title => profile.titles?.includes(title.title))
                .map((title) => (
                  <button
                    key={title.id}
                    onClick={() => {
                      onSelectTitle(title.title);
                      setIsSelectingTitle(false);
                    }}
                    className={`px-4 py-2 rounded-full border ${
                      profile.selected_title === title.title
                        ? 'bg-primary text-white'
                        : 'bg-primary/10 hover:bg-primary/20'
                    }`}
                  >
                    {title.title}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
