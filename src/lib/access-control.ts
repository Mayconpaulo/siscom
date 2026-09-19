import { isInternalSiscomEmail, normalizeWarName } from "@/lib/war-name";

export const OWNER_EMAIL = "mayconpaulo6000@gmail.com";

type OwnerProfile = {
  access_level?: string | null;
  active?: boolean | null;
  email?: string | null;
};

export function normalizeAccountEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("pt-BR");
}

/** Exige simultaneamente a identidade do Auth e o perfil protegido do banco. */
export function isDesignatedOwner(authEmail: string | null | undefined, profile: OwnerProfile | null | undefined) {
  return normalizeAccountEmail(authEmail) === OWNER_EMAIL
    && normalizeAccountEmail(profile?.email) === OWNER_EMAIL
    && profile?.access_level === "owner"
    && profile.active === true;
}

export function postLoginDestination(profile: { profile_completed?: boolean | null; must_change_password?: boolean | null } | null | undefined) {
  return !profile?.profile_completed || profile.must_change_password ? "/primeiro-acesso" : "/dashboard";
}

export type FirstAccessInput = { fullName: string; rank: string; email: string; password: string };

export function validateFirstAccess(input: FirstAccessInput) {
  if (input.fullName.trim().length < 5) return "Informe seu nome completo.";
  if (!input.rank.trim()) return "Informe sua graduação.";
  const email = normalizeAccountEmail(input.email);
  if (!/^\S+@\S+\.\S+$/.test(email) || isInternalSiscomEmail(email)) return "Informe um e-mail válido.";
  if (input.password.length < 8) return "A nova senha deve ter pelo menos 8 caracteres.";
  return null;
}

export function validateTemporaryAccess(warName: string, temporaryPassword: string) {
  if (warName.trim().length < 2 || normalizeWarName(warName).length < 2) return "Informe um nome de guerra válido.";
  if (temporaryPassword.length < 8) return "A senha temporária deve ter pelo menos 8 caracteres.";
  return null;
}
