import crypto from 'crypto'

const ALGORITHM = process.env.ENCRYPT_ALGORITHM_CRYPTO as string;
const SECRET_KEY = process.env.SECRET_KEY_CRYPTO as string

if (!ALGORITHM) throw new Error("ENCRYPT_ALGORITHM_CRYPTO is missing in environment variables")
if (!SECRET_KEY) throw new Error("SECRET_KEY_CRYPTO is missing in environment variables")


const key = crypto.createHash('sha256').update(SECRET_KEY).digest();


// FUNCION DE CIFRADO  
export function encrypt(data: string): string {
  if (typeof data !="string" || data.length === 0 ) {
    throw new Error("encrypt(): input data must be a non-empty string")
  } 

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(data, "utf-8"), cipher.final()]);

    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
     throw new Error(
      `Encryption failed: ${(error as Error).message || "unknown error"}`
    );
  }
}

// FUCION DE DESCIFRADO
export function decrypt(data: string): string {
  if (typeof data !== "string" || data.length === 0 ) {
    throw new Error("decrypt(): input data must be a non-empty string");
  }
  
  try {
    const parts = data.split(":")
    if (parts.length !==2) {
      throw new Error("Invalid encrypted format. Expected 'iv:ciphertext'");
    }
    const buffers = parts.map((p) => Buffer.from(p, "hex"));
    const iv: Buffer = buffers[0]!;
    const encryptedText: Buffer = buffers[1]!;

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

    return decrypted.toString("utf-8");

  } catch (error) {
    throw new Error(
      `Decryption failed: ${(error as Error).message || "unknown error"}`
    );
  } 
}




