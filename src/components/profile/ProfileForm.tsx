
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Profile } from "@/types/profile";

interface ProfileFormProps {
  profile: Profile;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onChange: (profile: Profile) => void;
}

export function ProfileForm({ profile, isLoading, onSubmit, onChange }: ProfileFormProps) {
  const transportOptions = ['train', 'taxi', 'bus'];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="first_name" className="block text-sm font-medium">
          First Name
        </label>
        <Input
          id="first_name"
          type="text"
          value={profile.first_name || ''}
          onChange={(e) => onChange({ ...profile, first_name: e.target.value })}
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
          onChange={(e) => onChange({ ...profile, last_name: e.target.value })}
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
          onChange={(e) => onChange({ ...profile, preferred_transport: e.target.value })}
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
        disabled={isLoading}
      >
        {isLoading ? 'Updating...' : 'Update Profile'}
      </Button>
    </form>
  );
}
