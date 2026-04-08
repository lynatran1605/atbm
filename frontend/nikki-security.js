(function initNikkiSecurity(global) {
  const RSA_ALGORITHM = {
    name: "RSA-OAEP",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  };

  const AES_ALGORITHM = {
    name: "AES-GCM",
    length: 256,
  };

  function ensureCrypto() {
    if (!global.crypto?.subtle) {
      throw new Error("Web Crypto API is not available in this browser.");
    }
  }

  function privateKeyStorageKey(uid) {
    return `nikki_rsa_private_${uid}`;
  }

  function pendingKeyStorageKey(email) {
    return `nikki_pending_rsa_${String(email || "").trim().toLowerCase()}`;
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return global.btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binary = global.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes.buffer;
  }

  function formatPem(base64, header, footer) {
    const lines = base64.match(/.{1,64}/g) || [];
    return [header, ...lines, footer].join("\n");
  }

  function arrayBufferToPem(buffer, kind) {
    const base64 = arrayBufferToBase64(buffer);
    if (kind === "public") {
      return formatPem(base64, "-----BEGIN PUBLIC KEY-----", "-----END PUBLIC KEY-----");
    }
    return formatPem(base64, "-----BEGIN PRIVATE KEY-----", "-----END PRIVATE KEY-----");
  }

  function pemToArrayBuffer(pem) {
    const base64 = String(pem || "")
      .replace(/-----BEGIN [^-]+-----/g, "")
      .replace(/-----END [^-]+-----/g, "")
      .replace(/\s+/g, "");
    return base64ToArrayBuffer(base64);
  }

  async function exportKeyPair(keyPair) {
    const [publicKeyBuffer, privateKeyBuffer] = await Promise.all([
      global.crypto.subtle.exportKey("spki", keyPair.publicKey),
      global.crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
    ]);

    return {
      publicKey: arrayBufferToPem(publicKeyBuffer, "public"),
      privateKey: arrayBufferToPem(privateKeyBuffer, "private"),
    };
  }

  async function importPublicKey(publicKeyPem) {
    ensureCrypto();
    return global.crypto.subtle.importKey(
      "spki",
      pemToArrayBuffer(publicKeyPem),
      RSA_ALGORITHM,
      true,
      ["encrypt"]
    );
  }

  async function importPrivateKey(privateKeyPem) {
    ensureCrypto();
    return global.crypto.subtle.importKey(
      "pkcs8",
      pemToArrayBuffer(privateKeyPem),
      RSA_ALGORITHM,
      true,
      ["decrypt"]
    );
  }

  async function generateKeyPair() {
    ensureCrypto();
    const keyPair = await global.crypto.subtle.generateKey(RSA_ALGORITHM, true, ["encrypt", "decrypt"]);
    return exportKeyPair(keyPair);
  }

  async function createPendingRegistrationKeyPair(email) {
    const keyPair = await generateKeyPair();
    global.localStorage.setItem(pendingKeyStorageKey(email), JSON.stringify(keyPair));
    return keyPair;
  }

  function consumePendingRegistrationKeyPair(email) {
    const storageKey = pendingKeyStorageKey(email);
    const raw = global.localStorage.getItem(storageKey);
    if (!raw) return null;
    global.localStorage.removeItem(storageKey);
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function savePrivateKey(uid, privateKeyPem) {
    global.localStorage.setItem(privateKeyStorageKey(uid), privateKeyPem);
  }

  function getPrivateKey(uid) {
    return global.localStorage.getItem(privateKeyStorageKey(uid)) || "";
  }

  function removePrivateKey(uid) {
    global.localStorage.removeItem(privateKeyStorageKey(uid));
  }

  async function ensureKeyPairForUser(user, uploadPublicKey, forceRegenerate = false) {
    if (!user?.uid) {
      throw new Error("A valid user is required before generating keys.");
    }

    let keyPair = null;

    if (!forceRegenerate) {
      const existingPrivateKey = getPrivateKey(user.uid);
      if (existingPrivateKey && user.publicKey) {
        return {
          publicKey: user.publicKey,
          privateKey: existingPrivateKey,
          created: false,
        };
      }

      keyPair = consumePendingRegistrationKeyPair(user.email);
      if (!keyPair && existingPrivateKey) {
        keyPair = {
          publicKey: user.publicKey || "",
          privateKey: existingPrivateKey,
        };
      }
    }

    if (!keyPair?.publicKey || !keyPair?.privateKey) {
      keyPair = await generateKeyPair();
    }

    savePrivateKey(user.uid, keyPair.privateKey);
    await uploadPublicKey(keyPair.publicKey);

    return {
      ...keyPair,
      created: true,
    };
  }

  async function encryptContentWithPublicKey(content, publicKeyPem) {
    ensureCrypto();
    const aesKey = await global.crypto.subtle.generateKey(AES_ALGORITHM, true, ["encrypt", "decrypt"]);
    const iv = global.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(String(content || ""));
    const cipherBuffer = await global.crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded);
    const rawAesKey = await global.crypto.subtle.exportKey("raw", aesKey);
    const publicKey = await importPublicKey(publicKeyPem);
    const wrappedKey = await global.crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawAesKey);

    return JSON.stringify({
      version: 1,
      encryptionType: "public-key",
      algorithm: "RSA-OAEP-2048/AES-GCM-256",
      wrappedKey: arrayBufferToBase64(wrappedKey),
      iv: arrayBufferToBase64(iv.buffer),
      ciphertext: arrayBufferToBase64(cipherBuffer),
    });
  }

  async function derivePasswordKey(password, saltBuffer) {
    const passwordKey = await global.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(String(password || "")),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return global.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: new Uint8Array(saltBuffer),
        iterations: 250000,
        hash: "SHA-256",
      },
      passwordKey,
      AES_ALGORITHM,
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptContentWithPassword(content, password) {
    ensureCrypto();
    const salt = global.crypto.getRandomValues(new Uint8Array(16));
    const iv = global.crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await derivePasswordKey(password, salt.buffer);
    const encoded = new TextEncoder().encode(String(content || ""));
    const cipherBuffer = await global.crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded);

    return JSON.stringify({
      version: 1,
      encryptionType: "symmetric",
      algorithm: "AES-GCM-256/PBKDF2-SHA-256",
      salt: arrayBufferToBase64(salt.buffer),
      iv: arrayBufferToBase64(iv.buffer),
      ciphertext: arrayBufferToBase64(cipherBuffer),
    });
  }

  async function decryptContentWithPassword(payload, password) {
    ensureCrypto();
    console.log("decryptContentWithPassword called, payload type:", typeof payload, "password provided:", !!password);
    if (!payload) return "";

    const parsedPayload = typeof payload === "string" ? JSON.parse(payload) : payload;
    console.log("Parsed payload keys:", Object.keys(parsedPayload));
    const aesKey = await derivePasswordKey(password, base64ToArrayBuffer(parsedPayload.salt));
    const plainBuffer = await global.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(base64ToArrayBuffer(parsedPayload.iv)),
      },
      aesKey,
      base64ToArrayBuffer(parsedPayload.ciphertext)
    );

    const result = new TextDecoder().decode(plainBuffer);
    console.log("Symmetric decryption successful, result length:", result.length);
    return result;
  }

  function detectEncryptionType(payload) {
    if (!payload) return "";
    try {
      const parsedPayload = typeof payload === "string" ? JSON.parse(payload) : payload;
      if (parsedPayload.encryptionType) return parsedPayload.encryptionType;
      if (parsedPayload.wrappedKey) return "public-key";
      if (parsedPayload.salt) return "symmetric";
      return "";
    } catch {
      return "";
    }
  }

  async function decryptContentWithPrivateKey(payload, privateKeyPem) {
    ensureCrypto();
    if (!payload) return "";

    const parsedPayload = typeof payload === "string" ? JSON.parse(payload) : payload;
    const privateKey = await importPrivateKey(privateKeyPem);
    const aesKeyBuffer = await global.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      base64ToArrayBuffer(parsedPayload.wrappedKey)
    );
    const aesKey = await global.crypto.subtle.importKey(
      "raw",
      aesKeyBuffer,
      AES_ALGORITHM,
      false,
      ["decrypt"]
    );
    const plainBuffer = await global.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(base64ToArrayBuffer(parsedPayload.iv)),
      },
      aesKey,
      base64ToArrayBuffer(parsedPayload.ciphertext)
    );

    return new TextDecoder().decode(plainBuffer);
  }

  async function copyText(value) {
    await navigator.clipboard.writeText(value);
  }

  function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  global.NikkiSecurity = {
    privateKeyStorageKey,
    pendingKeyStorageKey,
    generateKeyPair,
    createPendingRegistrationKeyPair,
    consumePendingRegistrationKeyPair,
    ensureKeyPairForUser,
    savePrivateKey,
    getPrivateKey,
    removePrivateKey,
    detectEncryptionType,
    encryptContentWithPublicKey,
    decryptContentWithPrivateKey,
    encryptContentWithPassword,
    decryptContentWithPassword,
    copyText,
    downloadTextFile,
  };
}(window));
