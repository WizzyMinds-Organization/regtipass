export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Lowercase + uppercase + digits, excluding visually-confusable characters
// (0/O, 1/I/l) so a staff member reading a misprint off a screen can type it
// correctly. Formatted as two groups separated by a hyphen for readability.
const ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

function randomChars(count: number): string {
  let out = "";
  const bytes = new Uint8Array(count);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < count; i++) {
    out += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  }
  return out;
}

export function generateTicketId(groupSize = 4): string {
  return `${randomChars(groupSize)}-${randomChars(groupSize)}`;
}

export const TICKET_ID_PATTERN = /^[2-9A-HJ-NP-Za-km-z]{4,6}-[2-9A-HJ-NP-Za-km-z]{4,6}$/;
