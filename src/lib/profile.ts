export type DisplayProfile = {
  rank?: string | null;
  war_name?: string | null;
  full_name?: string | null;
};

export function profileDisplayName(profile?: DisplayProfile | null) {
  if (!profile) return "Usuário do SISCOM";
  const rank = profile.rank?.trim();
  const warName = profile.war_name?.trim();
  const fallback = profile.full_name?.trim() || "Usuário";
  return [rank, warName || fallback].filter(Boolean).join(" ");
}

export function profileInitials(profile?: DisplayProfile | null) {
  const source = profile?.war_name?.trim() || profile?.full_name?.trim() || "Usuário";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
