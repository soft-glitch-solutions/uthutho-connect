
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileAvatarProps {
  url?: string | null;
  firstName?: string | null;
  onUpload: (url: string) => Promise<void>;
}

export function ProfileAvatar({ url, firstName, onUpload }: ProfileAvatarProps) {
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No user session found');
      }

      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Call parent's onUpload with the public URL
      await onUpload(publicUrl);
      
      toast.success('Avatar updated successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <Avatar className="w-24 h-24 mb-4">
        {uploading ? (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <AvatarImage src={url || undefined} alt="Profile Picture" />
            <AvatarFallback>{firstName?.charAt(0) || 'U'}</AvatarFallback>
          </>
        )}
      </Avatar>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
        id="avatar-upload"
        disabled={uploading}
      />
      <label
        htmlFor="avatar-upload"
        className={`text-sm text-primary cursor-pointer hover:underline ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {uploading ? 'Uploading...' : 'Upload new avatar'}
      </label>
    </div>
  );
}
