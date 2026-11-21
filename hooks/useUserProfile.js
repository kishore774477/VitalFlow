import { Buffer } from 'buffer'; // Ensure you have 'buffer' installed
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No profile row exists yet — create an empty one
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({ user_id: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .select()
          .single();
        if (!insertError) {
          setProfile(newProfile);
        }
        return;
      }

      if (error) throw error;

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      return { data, error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { data: null, error: error.message };
    }
  };

  const uploadAvatar = async (uri) => {
    try {
      const mimeTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };
      // Web pickers return data:/blob: URIs, native returns file:// paths
      const dataUriMime = /^data:(image\/[a-z+]+);/i.exec(uri)?.[1];
      const pathExt = uri.split('?')[0].split('.').pop().toLowerCase();
      const fileExt = dataUriMime
        ? dataUriMime.split('/')[1].replace('jpeg', 'jpg')
        : (mimeTypes[pathExt] ? pathExt : 'jpg');
      const mimeType = dataUriMime || mimeTypes[fileExt] || 'image/jpeg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        try {
          const urlParts = profile.avatar_url.split('/');
          const oldFileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params
          await supabase.storage.from('avatars').remove([oldFileName]);
        } catch (deleteErr) {
          console.log('Could not delete old avatar:', deleteErr);
        }
      }

      // Read the image bytes
      let byteArray;
      if (Platform.OS === 'web' || uri.startsWith('data:') || uri.startsWith('blob:')) {
        const response = await fetch(uri);
        byteArray = new Uint8Array(await response.arrayBuffer());
      } else {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        byteArray = Uint8Array.from(Buffer.from(base64, 'base64'));
      }

      // Upload to Supabase Storage bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, byteArray, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL from storage with cache-busting timestamp
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-busting query parameter
      const avatarUrlWithCacheBust = publicUrl.startsWith('data:')
        ? publicUrl
        : `${publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      const { data, error } = await updateProfile({ avatar_url: avatarUrlWithCacheBust });

      if (!error) {
        // Force refresh profile to ensure UI updates
        await fetchProfile();
      }

      return { data, error };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return { data: null, error: error.message };
    }
  };

  const deleteAvatar = async () => {
    try {
      if (!profile?.avatar_url) {
        return { error: 'No avatar to delete' };
      }
      // Extract file name from URL (remove query params if present)
      const urlParts = profile.avatar_url.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0];

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([fileName]);

      if (deleteError) throw deleteError;

      // Update profile to remove avatar URL
      const { data, error } = await updateProfile({ avatar_url: null });

      if (!error) {
        // Force refresh profile to ensure UI updates
        await fetchProfile();
      }

      return { data, error };
    } catch (error) {
      console.error('Error deleting avatar:', error);
      return { data: null, error: error.message };
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    refetch: fetchProfile,
  };
}