const encoder = new TextEncoder();

async function hmac(passcode: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(passcode), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode("csr-radar-admin"));
  return Buffer.from(sig).toString("hex");
}

export const adminToken = (passcode: string) => hmac(passcode);

export async function verifyAdminToken(token: string | undefined, passcode: string | undefined) {
  if (!token || !passcode) return false;
  const expected = await hmac(passcode);
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
