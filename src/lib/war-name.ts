export const SISCOM_LOGIN_DOMAIN = "siscom.invalid";

export function normalizeWarName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 48);
}

export function internalEmailForWarName(value: string) {
  return `${normalizeWarName(value)}@${SISCOM_LOGIN_DOMAIN}`;
}

export function isInternalSiscomEmail(value: string) {
  return value.toLowerCase().endsWith(`@${SISCOM_LOGIN_DOMAIN}`);
}
