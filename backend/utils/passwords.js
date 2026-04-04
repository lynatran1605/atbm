const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const SCRYPT_PREFIX = "scrypt";

async function hashPassword(value) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(value, salt, KEY_LENGTH);

  return `${SCRYPT_PREFIX}$${salt}$${Buffer.from(derivedKey).toString("hex")}`;
}

async function verifyPassword(value, storedHash) {
  if (!storedHash || typeof storedHash !== "string") {
    return false;
  }

  if (storedHash.startsWith(`${SCRYPT_PREFIX}$`)) {
    const [, salt, expectedHash] = storedHash.split("$");
    if (!salt || !expectedHash) {
      return false;
    }

    const derivedKey = await scrypt(value, salt, KEY_LENGTH);
    const expectedBuffer = Buffer.from(expectedHash, "hex");
    const actualBuffer = Buffer.from(derivedKey);

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  }

  if (storedHash.startsWith("$2")) {
    // Legacy support for existing bcrypt hashes without loading bcrypt at startup.
    const bcrypt = require("bcrypt");
    return bcrypt.compare(value, storedHash);
  }

  return false;
}

module.exports = {
  hashPassword,
  verifyPassword,
};
