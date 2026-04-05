const express = require("express");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { sendOtpEmail } = require("../../services/emailService");
const { encryptDiaryContent } = require("../../services/encryptionService");
const { hashPassword, verifyPassword } = require("../utils/passwords");

const PERSONAL_KEY_TEST_VALUE = "bloomnote-personal-key-ready";

function createAuthRoutes({ admin, db }) {
  const router = express.Router();

  async function buildPersonalKeyFields(personalKey) {
    return {
      personalKeyHash: await hashPassword(personalKey),
      personalKeyHint: `Personal key ready (${personalKey.length} chars)`,
      personalKeyCheckCipher: encryptDiaryContent(PERSONAL_KEY_TEST_VALUE, personalKey),
      personalKeyConfigured: true,
      personalKeyMatchesPassword: true,
    };
  }

  function getBaseUrl(req) {
    return req.app?.locals?.baseUrl || process.env.APP_BASE_URL || "http://localhost:3000";
  }

  function getLoginUrl(req) {
    return `${getBaseUrl(req)}/login.html`;
  }

  router.post("/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required." });
      }

      const existingUsername = await db.collection("users").where("username", "==", username).limit(1).get();
      const existingEmail = await db.collection("users").where("email", "==", email).limit(1).get();

      if (!existingUsername.empty || !existingEmail.empty) {
        return res.status(409).json({ message: "Username or email already exists." });
      }

      const passwordHash = await hashPassword(password);
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const pendingId = uuidv4();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await db.collection("pendingUsers").doc(pendingId).set({
        username,
        email,
        passwordHash,
        ...(await buildPersonalKeyFields(password)),
        otp,
        expiresAt,
        createdAt: new Date().toISOString(),
      });

      await sendOtpEmail(email, otp, username);

      return res.json({
        message: "OTP sent to email successfully.",
        pendingId,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to register." });
    }
  });

  router.post("/verify-otp", async (req, res) => {
    try {
      const { pendingId, otp } = req.body;
      const doc = await db.collection("pendingUsers").doc(pendingId).get();

      if (!doc.exists) {
        return res.status(404).json({ message: "Pending registration not found." });
      }

      const pendingUser = doc.data();
      if (pendingUser.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP." });
      }

      if (new Date(pendingUser.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ message: "OTP has expired." });
      }

      const authUser = await admin.auth().createUser({
        email: pendingUser.email,
        password: `${uuidv4()}!Temp`,
        displayName: pendingUser.username,
      });

      await db.collection("users").doc(authUser.uid).set({
        uid: authUser.uid,
        username: pendingUser.username,
        email: pendingUser.email,
        passwordHash: pendingUser.passwordHash,
        displayName: pendingUser.username,
        birthDate: "",
        gender: "",
        personalKeyHash: pendingUser.personalKeyHash || "",
        personalKeyHint: pendingUser.personalKeyHint || "",
        personalKeyCheckCipher: pendingUser.personalKeyCheckCipher || "",
        personalKeyConfigured: Boolean(pendingUser.personalKeyConfigured),
        personalKeyMatchesPassword: Boolean(pendingUser.personalKeyMatchesPassword),
        createdAt: new Date().toISOString(),
      });

      await db.collection("pendingUsers").doc(pendingId).delete();

      return res.json({ message: "Account verified successfully. Please log in." });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to verify OTP." });
    }
  });

  router.post("/resend-otp", async (req, res) => {
    try {
      const { pendingId } = req.body;
      if (!pendingId) {
        return res.status(400).json({ message: "Pending ID is required." });
      }

      const pendingRef = db.collection("pendingUsers").doc(pendingId);
      const pendingDoc = await pendingRef.get();

      if (!pendingDoc.exists) {
        return res.status(404).json({ message: "Pending registration not found." });
      }

      const pendingUser = pendingDoc.data();
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await pendingRef.update({
        otp,
        expiresAt,
        updatedAt: new Date().toISOString(),
      });

      await sendOtpEmail(pendingUser.email, otp, pendingUser.username);

      return res.json({
        message: "OTP resent successfully.",
        pendingId,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to resend OTP." });
    }
  });

  router.post("/login", async (req, res) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ message: "Email/username and password are required." });
      }

      let snapshot = await db.collection("users").where("email", "==", identifier).limit(1).get();
      if (snapshot.empty) {
        snapshot = await db.collection("users").where("username", "==", identifier).limit(1).get();
      }

      if (snapshot.empty) {
        return res.status(401).json({ message: "Account not found." });
      }

      const userDoc = snapshot.docs[0];
      const user = userDoc.data();
      const isMatch = await verifyPassword(password, user.passwordHash);

      if (!isMatch) {
        return res.status(401).json({ message: "Incorrect password." });
      }

      const updates = {
        updatedAt: new Date().toISOString(),
      };
      let needsUserUpdate = false;

      if (typeof user.passwordHash === "string" && user.passwordHash.startsWith("$2")) {
        updates.passwordHash = await hashPassword(password);
        needsUserUpdate = true;
      }

      if (!user.personalKeyConfigured) {
        Object.assign(updates, await buildPersonalKeyFields(password));
        needsUserUpdate = true;
      } else if (user.personalKeyMatchesPassword === undefined) {
        updates.personalKeyMatchesPassword = false;
        needsUserUpdate = true;
      }

      let resolvedUser = user;
      if (needsUserUpdate) {
        await userDoc.ref.update(updates);
        resolvedUser = { ...user, ...updates };
      }

      const deletionExpiry = resolvedUser.accountDeletionExpiresAt ? new Date(resolvedUser.accountDeletionExpiresAt).getTime() : 0;
      if (resolvedUser.accountDeletionPending && deletionExpiry && deletionExpiry > Date.now()) {
        await userDoc.ref.update({
          accountDeletionPending: false,
          accountDeletedAt: "",
          accountDeletionExpiresAt: "",
          updatedAt: new Date().toISOString(),
        });
        resolvedUser = {
          ...resolvedUser,
          accountDeletionPending: false,
          accountDeletedAt: "",
          accountDeletionExpiresAt: "",
        };
      }

      const token = jwt.sign(
        {
          uid: resolvedUser.uid,
          username: resolvedUser.username,
          email: resolvedUser.email,
          displayName: resolvedUser.displayName || resolvedUser.username,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        message: "Login successful.",
        token,
        user: {
          uid: resolvedUser.uid,
          username: resolvedUser.username,
          email: resolvedUser.email,
          displayName: resolvedUser.displayName || resolvedUser.username,
          birthDate: resolvedUser.birthDate || "",
          gender: resolvedUser.gender || "",
          personalKeyHint: resolvedUser.personalKeyHint || "",
          hasPersonalKey: Boolean(resolvedUser.personalKeyConfigured),
          personalKeyMatchesPassword: Boolean(resolvedUser.personalKeyMatchesPassword),
          personalKeyCheckCipher: resolvedUser.personalKeyCheckCipher || "",
        },
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to login." });
    }
  });

  router.post("/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required." });
      }

      const snapshot = await db.collection("users").where("email", "==", email).limit(1).get();
      if (snapshot.empty) {
        return res.status(404).json({ message: "Email does not exist." });
      }

      const userDoc = snapshot.docs[0];
      const user = userDoc.data();
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const requestId = uuidv4();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await db.collection("passwordResetRequests").doc(requestId).set({
        requestId,
        uid: user.uid,
        email: user.email,
        otp,
        expiresAt,
        createdAt: new Date().toISOString(),
      });

      await sendOtpEmail(user.email, otp, user.username, {
        subject: "BloomNote - OTP reset password",
        heading: "BloomNote Password Reset",
        intro: `Xin chao ${user.displayName || user.username || "ban"},`,
        message: "Nhap ma OTP ben duoi de dat lai mat khau dang nhap cua ban:",
        footer: "OTP co hieu luc trong 10 phut. Neu ban khong yeu cau doi mat khau, hay bo qua email nay.",
      });

      return res.json({
        message: "OTP sent to your email successfully.",
        requestId,
        email: user.email,
        loginUrl: getLoginUrl(req),
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to start password reset." });
    }
  });

  router.post("/forgot-password/verify", async (req, res) => {
    try {
      const { requestId, otp, newPassword } = req.body;
      if (!requestId || !otp || !newPassword) {
        return res.status(400).json({ message: "Request ID, OTP, and new password are required." });
      }

      const requestRef = db.collection("passwordResetRequests").doc(requestId);
      const requestDoc = await requestRef.get();

      if (!requestDoc.exists) {
        return res.status(404).json({ message: "Password reset request not found." });
      }

      const resetRequest = requestDoc.data();
      if (resetRequest.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP." });
      }

      if (new Date(resetRequest.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ message: "OTP has expired." });
      }

      const passwordHash = await hashPassword(newPassword);
      const userRef = db.collection("users").doc(resetRequest.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ message: "User not found." });
      }

      const user = userDoc.data();
      const updates = {
        passwordHash,
        updatedAt: new Date().toISOString(),
      };

      if (user.personalKeyMatchesPassword || !user.personalKeyConfigured) {
        Object.assign(updates, await buildPersonalKeyFields(newPassword));
      }

      await userRef.update(updates);

      await requestRef.delete();

      return res.json({
        message: "Password reset successfully. Please log in with your new password.",
        loginUrl: getLoginUrl(req),
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to verify password reset OTP." });
    }
  });

  return router;
}

module.exports = createAuthRoutes;
