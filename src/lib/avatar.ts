// Helper function to construct Discord CDN avatar URLs
// Discord CDN format: https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.{png|jpg|gif|webp}?size=128

export function getDiscordAvatarUrl(discordId: string | null, avatarHash: string | null): string | null {
  if (!discordId || !avatarHash) return null;
  
  // Determine file extension based on avatar hash prefix
  const isGif = avatarHash.startsWith('a_');
  const extension = isGif ? 'gif' : 'png';
  
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${extension}?size=128`;
}

// Get avatar URL from user metadata
export function getAvatarUrlFromMetadata(metadata: any): string | null {
  const avatarUrl = metadata?.avatar_url || metadata?.avatar || metadata?.picture;
  if (avatarUrl) return avatarUrl;
  
  // Try to construct from discord ID and avatar hash
  const discordId = metadata?.provider_id || metadata?.sub;
  const avatarHash = metadata?.avatar;
  return getDiscordAvatarUrl(discordId, avatarHash);
}

// Fallback to default avatar (Discord's default avatar based on discriminator)
export function getDefaultAvatarUrl(discordId: string | null): string {
  if (!discordId) return '';
  // Simple hash from discordId string to get index 0-5
  let hash = 0;
  for (let i = 0; i < discordId.length; i++) {
    const char = discordId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const defaultAvatarIndex = Math.abs(hash) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png?size=128`;
}

// Get avatar URL for a user object (combines all sources)
export function getAvatarUrl(user: any): string | null {
  // 1. Custom uploaded avatar (highest priority)
  if (user?.custom_avatar_url) return user.custom_avatar_url;
  
  // 2. Discord avatar from auth metadata or user fields
  const avatarUrl = user?.avatar_url || user?.user_metadata?.avatar_url;
  if (avatarUrl) return avatarUrl;
  
  // 3. Construct from Discord ID + avatar hash
  const discordId = user?.discord_id || user?.id;
  const avatarHash = user?.avatar_hash || user?.user_metadata?.avatar;
  const discordAvatar = getDiscordAvatarUrl(discordId, avatarHash);
  if (discordAvatar) return discordAvatar;
  
  // 4. Fallback to default Discord avatar
  if (discordId) return getDefaultAvatarUrl(discordId);
  
  return null;
}
