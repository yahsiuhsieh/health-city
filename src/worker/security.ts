export function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function randomToken(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hash(value: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

export function encryptionKeyBytes(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new Error("Invalid token encryption key.");
  const bytes = Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/") + "="), (c) => c.charCodeAt(0));
  if (bytes.length !== 32) throw new Error("Invalid token encryption key.");
  return bytes;
}

export async function encryptRefreshToken(token: string, secret: string, subject: string, clientId: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encryptionKeyBytes(secret), "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({
    name: "AES-GCM", iv,
    additionalData: new TextEncoder().encode(`${clientId}:${subject}`),
  }, key, new TextEncoder().encode(token));
  return `v1.${base64url(iv)}.${base64url(new Uint8Array(ciphertext))}`;
}

export async function decryptRefreshToken(value: string, secret: string, subject: string, clientId: string): Promise<string> {
  const [version, iv, ciphertext, extra] = value.split(".");
  if (version !== "v1" || !iv || !ciphertext || extra !== undefined) throw new Error("Invalid encrypted token.");
  const decode = (part: string) => Uint8Array.from(atob(part.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", encryptionKeyBytes(secret), "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(iv),
    additionalData: new TextEncoder().encode(`${clientId}:${subject}`) }, key, decode(ciphertext));
  return new TextDecoder().decode(plaintext);
}

export function readCookie(request: Request, name: string): string | null {
  const matches = (request.headers.get("Cookie") ?? "").split(";")
    .map((item) => item.trim()).filter((item) => item.startsWith(`${name}=`));
  const value = matches.length === 1 ? matches[0]!.slice(name.length + 1) : "";
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

export function secureCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}
