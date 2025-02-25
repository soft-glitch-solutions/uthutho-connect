
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ProfileAvatarProps {
  url?: string | null;
  firstName?: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function ProfileAvatar({ url, firstName, onUpload }: ProfileAvatarProps) {
  return (
    <div className="flex flex-col items-center">
      <Avatar className="w-24 h-24 mb-4">
        <AvatarImage src={url || undefined} alt="Profile Picture" />
        <AvatarFallback>{firstName?.charAt(0) || 'U'}</AvatarFallback>
      </Avatar>
      <input
        type="file"
        accept="image/*"
        onChange={onUpload}
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
  );
}
