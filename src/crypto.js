//src/crypto.js
import {
    scryptSync,
    randomBytes,
    createCipheriv,
    createDecipheriv,
} from "node:crypto";

// Derive a 32-byte key from a passphrase (scrypt with per-process salt)
// Keeping it deterministic per run; for long-lived keys, pass your own salt.

const SALT = Buffer.from("peermsg-v1");

export function deriveKey(passphrase) {
    if (!passphrase) return null;
    const buf = scryptSync(String(passphrase), SALT, 32);
    return buf; // 32 bytes for AES-256
}

// Encrypt a UTF-8 string with AES-256-GCM.
// Returns { n: base64(iv), ct: base64(ciphertext), tag: base64(authTag) }
export function encryptStr(plaintext, key) {
    const iv = randomBytes(12); //92-bit nonce for GCM
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ct = Buffer.concat([
        cipher.update(Buffer.from(plaintext, "utf8")),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return {
        n: iv.toString("base64"),
        ct: ct.toString("base64"),
        tag: tag.toString("base64"),
    };
}

//Decrypt, return UTF-8 string or null if fails/invalid
export function decryptStr({ n, ct, tag }, key) {
    try {
        const iv = Buffer.from(n, "base64");
        const buf = Buffer.from(ct, "base64");
        const at = Buffer.from(tag, "base64");
        const decipher = createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(at);
        const pt = Buffer.concat([decipher.update(buf), decipher.final()]);
        return pt.toString("utf8");
    } catch {
        return null;
    }
}
