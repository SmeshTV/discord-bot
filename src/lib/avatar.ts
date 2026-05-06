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
  // Discord's default avatar: (discriminator % 5) or (user_id >> 22) % 6 for new usernames
  const defaultAvatarIndex = (BigInt(discordId) >> 22n) % 6n;
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png?size=128`;
}
