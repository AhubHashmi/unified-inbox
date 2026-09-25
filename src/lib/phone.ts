/** Stored numbers are digits only (e.g. 923001234567); show and dial them with a leading "+". */
export function formatPhone(digits: string): string {
  return digits.startsWith("+") ? digits : `+${digits}`;
}

/** `tel:` links need the "+" or phones treat the number as local and the call fails. */
export function telHref(digits: string): string {
  return `tel:${formatPhone(digits)}`;
}

/** Opens the chat in the WhatsApp app (phone) or WhatsApp Web (desktop). */
export function whatsappHref(digits: string): string {
  return `https://wa.me/${digits.replace(/\D/g, "")}`;
}
