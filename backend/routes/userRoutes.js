const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { encryptDiaryContent } = require("../../services/encryptionService");
const { hashPassword } = require("../utils/passwords");
const { sendOtpEmail } = require("../../services/emailService");

const PERSONAL_KEY_TEST_VALUE = "bloomnote-personal-key-ready";

function createUserRoutes({ db }) {
  const router = express.Router();

  async function createOtpRequest(collectionName, payload) {
    const requestId = uuidv4();
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await db.collection(collectionName).doc(requestId).set({
      id: requestId,
      otp,
      expiresAt,
      createdAt: new Date().toISOString(),
      ...payload,
    });

    return { requestId, otp, expiresAt };
  }

  function serializeUser(user) {
    return {
      uid: user.uid,
      username: user.username,
      email: user.email,
      displayName: user.displayName || user.username,
      birthDate: user.birthDate || "",
      gender: user.gender || "",
      personalKeyHint: user.personalKeyHint || "",
      hasPersonalKey: Boolean(user.personalKeyConfigured),
      personalKeyCheckCipher: user.personalKeyCheckCipher || "",
    };
  }

  router.get("/me", async (req, res) => {
    try {
      const doc = await db.collection("users").doc(req.user.uid).get();
      if (!doc.exists) {
        return res.status(404).json({ message: "User not found." });
      }

      return res.json(serializeUser(doc.data()));
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to load profile." });
    }
  });

  router.put("/me", async (req, res) => {
    try {
      const { displayName, birthDate, email, gender } = req.body;
      const updates = {
        updatedAt: new Date().toISOString(),
      };

      if (displayName !== undefined) updates.displayName = displayName;
      if (birthDate !== undefined) updates.birthDate = birthDate;
      if (email !== undefined) updates.email = email;
      if (gender !== undefined) updates.gender = gender;

      await db.collection("users").doc(req.user.uid).update(updates);
      const updatedDoc = await db.collection("users").doc(req.user.uid).get();

      return res.json({
        message: "Profile updated successfully.",
        user: serializeUser(updatedDoc.data()),
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to update profile." });
    }
  });

  router.post("/personal-key/request-otp", async (req, res) => {
    try {
      const { newPersonalKey } = req.body;
      if (!newPersonalKey) {
        return res.status(400).json({ message: "New personal key is required." });
      }

      const userRef = db.collection("users").doc(req.user.uid);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ message: "User not found." });
      }

      const user = userDoc.data();
      const requestId = uuidv4();
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await db.collection("personalKeyOtpRequests").doc(requestId).set({
        id: requestId,
        userId: req.user.uid,
        otp,
        expiresAt,
        newPersonalKeyHash: await hashPassword(newPersonalKey),
        newPersonalKeyHint: `Personal key ready (${newPersonalKey.length} chars)`,
        newPersonalKeyCheckCipher: encryptDiaryContent(PERSONAL_KEY_TEST_VALUE, newPersonalKey),
        createdAt: new Date().toISOString(),
      });

      await sendOtpEmail(user.email, otp, user.displayName || user.username, {
        subject: "BloomNote - OTP doi khoa ca nhan",
        heading: "BloomNote - Doi khoa ca nhan",
        message: "Ma OTP de xac nhan thay doi khoa ca nhan cua ban la:",
        footer: "Neu ban khong yeu cau doi khoa, hay bo qua email nay. Ma co hieu luc trong 10 phut.",
      });

      return res.json({
        message: "OTP sent to your email successfully.",
        requestId,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to start personal key update." });
    }
  });

  router.post("/personal-key/confirm", async (req, res) => {
    try {
      const { requestId, otp, reEncryptedNotes } = req.body;
      if (!requestId || !otp) {
        return res.status(400).json({ message: "Request ID and OTP are required." });
      }

      const otpRef = db.collection("personalKeyOtpRequests").doc(requestId);
      const otpDoc = await otpRef.get();
      if (!otpDoc.exists) {
        return res.status(404).json({ message: "Personal key update request not found." });
      }

      const pendingRequest = otpDoc.data();
      if (pendingRequest.userId !== req.user.uid) {
        return res.status(403).json({ message: "You do not have permission to confirm this request." });
      }
      if (pendingRequest.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP." });
      }
      if (new Date(pendingRequest.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ message: "OTP has expired." });
      }

      if (Array.isArray(reEncryptedNotes) && reEncryptedNotes.length) {
        const updatesById = new Map(
          reEncryptedNotes
            .filter((note) => note && note.id)
            .map((note) => [note.id, note])
        );
        const snapshot = await db.collection("notes").where("ownerId", "==", req.user.uid).get();
        const tasks = [];

        snapshot.forEach((noteDoc) => {
          const noteUpdate = updatesById.get(noteDoc.id);
          if (!noteUpdate) {
            return;
          }

          tasks.push(
            noteDoc.ref.update({
              title: "",
              encryptedTitle: noteUpdate.encryptedTitle || noteDoc.data().encryptedTitle || "",
              encryptedContent: noteUpdate.encryptedContent || noteDoc.data().encryptedContent || "",
              updatedAt: new Date().toISOString(),
            })
          );
        });

        await Promise.all(tasks);
      }

      const shareSnapshot = await db.collection("noteShares").where("ownerId", "==", req.user.uid).get();
      const shareCleanupTasks = [];
      shareSnapshot.forEach((shareDoc) => {
        shareCleanupTasks.push(shareDoc.ref.delete());
      });
      await Promise.all(shareCleanupTasks);

      await db.collection("users").doc(req.user.uid).update({
        personalKeyHash: pendingRequest.newPersonalKeyHash,
        personalKeyHint: pendingRequest.newPersonalKeyHint,
        personalKeyCheckCipher: pendingRequest.newPersonalKeyCheckCipher,
        personalKeyConfigured: true,
        updatedAt: new Date().toISOString(),
      });

      await otpRef.delete();

      const updatedDoc = await db.collection("users").doc(req.user.uid).get();

      return res.json({
        message: "Personal key updated successfully.",
        user: serializeUser(updatedDoc.data()),
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to confirm personal key update." });
    }
  });

  router.post("/profile-access/request-otp", async (req, res) => {
    try {
      const userDoc = await db.collection("users").doc(req.user.uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ message: "User not found." });
      }

      const user = userDoc.data();
      const { requestId, otp } = await createOtpRequest("profileAccessOtpRequests", { userId: req.user.uid });

      await sendOtpEmail(user.email, otp, user.displayName || user.username, {
        subject: "BloomNote - OTP mo ho so ca nhan",
        heading: "BloomNote - Mo ho so ca nhan",
        message: "Ma OTP de mo trang thong tin ca nhan cua ban la:",
        footer: "Ma co hieu luc trong 10 phut.",
      });

      return res.json({
        message: "OTP sent to your email successfully.",
        requestId,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to send profile access OTP." });
    }
  });

  router.post("/profile-access/confirm", async (req, res) => {
    try {
      const { requestId, otp } = req.body;
      const requestRef = db.collection("profileAccessOtpRequests").doc(requestId);
      const requestDoc = await requestRef.get();

      if (!requestDoc.exists) {
        return res.status(404).json({ message: "Profile access request not found." });
      }

      const pendingRequest = requestDoc.data();
      if (pendingRequest.userId !== req.user.uid) {
        return res.status(403).json({ message: "You do not have permission to confirm this request." });
      }
      if (pendingRequest.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP." });
      }
      if (new Date(pendingRequest.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ message: "OTP has expired." });
      }

      await requestRef.delete();
      return res.json({ message: "Profile access granted." });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to confirm profile access OTP." });
    }
  });

  router.post("/recovery/request-otp", async (req, res) => {
    try {
      const userDoc = await db.collection("users").doc(req.user.uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ message: "User not found." });
      }

      const user = userDoc.data();
      const { requestId, otp } = await createOtpRequest("accountRecoveryOtpRequests", { userId: req.user.uid });

      await sendOtpEmail(user.email, otp, user.displayName || user.username, {
        subject: "BloomNote - OTP cap lai khoa",
        heading: "BloomNote - Cap lai khoa ca nhan",
        message: "Ma OTP de cap lai khoa va doi mat khau cua ban la:",
        footer: "Ma co hieu luc trong 10 phut.",
      });

      return res.json({
        message: "OTP sent to your email successfully.",
        requestId,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to send recovery OTP." });
    }
  });

  router.post("/recovery/confirm", async (req, res) => {
    try {
      const { requestId, otp, newPassword } = req.body;
      if (!requestId || !otp || !newPassword) {
        return res.status(400).json({ message: "Request ID, OTP, and new password are required." });
      }

      const requestRef = db.collection("accountRecoveryOtpRequests").doc(requestId);
      const requestDoc = await requestRef.get();

      if (!requestDoc.exists) {
        return res.status(404).json({ message: "Recovery request not found." });
      }

      const pendingRequest = requestDoc.data();
      if (pendingRequest.userId !== req.user.uid) {
        return res.status(403).json({ message: "You do not have permission to confirm this request." });
      }
      if (pendingRequest.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP." });
      }
      if (new Date(pendingRequest.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ message: "OTP has expired." });
      }

      await db.collection("users").doc(req.user.uid).update({
        passwordHash: await hashPassword(newPassword),
        personalKeyHash: "",
        personalKeyHint: "",
        personalKeyCheckCipher: "",
        personalKeyConfigured: false,
        updatedAt: new Date().toISOString(),
      });

      await requestRef.delete();

      const updatedDoc = await db.collection("users").doc(req.user.uid).get();
      return res.json({
        message: "Recovery completed successfully.",
        user: serializeUser(updatedDoc.data()),
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to confirm recovery OTP." });
    }
  });

  router.post("/password/request-otp", async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword) {
        return res.status(400).json({ message: "New password is required." });
      }

      const userRef = db.collection("users").doc(req.user.uid);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ message: "User not found." });
      }

      const user = userDoc.data();
      const { requestId, otp } = await createOtpRequest("passwordOtpRequests", {
        userId: req.user.uid,
        newPasswordHash: await hashPassword(newPassword),
        newPersonalKeyHint: `Personal key ready (${newPassword.length} chars)`,
        newPersonalKeyCheckCipher: encryptDiaryContent(PERSONAL_KEY_TEST_VALUE, newPassword),
        personalKeyConfigured: Boolean(user.personalKeyConfigured),
      });

      await sendOtpEmail(user.email, otp, user.displayName || user.username, {
        subject: "BloomNote - OTP doi mat khau dang nhap",
        heading: "BloomNote - Doi mat khau dang nhap",
        message: "Ma OTP de xac nhan thay doi mat khau dang nhap cua ban la:",
        footer: "Ma co hieu luc trong 10 phut.",
      });

      return res.json({
        message: "OTP sent to your email successfully.",
        requestId,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to start password update." });
    }
  });

  router.post("/password/confirm", async (req, res) => {
    try {
      const { requestId, otp, reEncryptedNotes } = req.body;
      const requestRef = db.collection("passwordOtpRequests").doc(requestId);
      const requestDoc = await requestRef.get();

      if (!requestDoc.exists) {
        return res.status(404).json({ message: "Password update request not found." });
      }

      const pendingRequest = requestDoc.data();
      if (pendingRequest.userId !== req.user.uid) {
        return res.status(403).json({ message: "You do not have permission to confirm this request." });
      }
      if (pendingRequest.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP." });
      }
      if (new Date(pendingRequest.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ message: "OTP has expired." });
      }

      const userRef = db.collection("users").doc(req.user.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ message: "User not found." });
      }

      const user = userDoc.data();
      if (!user.personalKeyConfigured && Array.isArray(reEncryptedNotes) && reEncryptedNotes.length) {
        const updatesById = new Map(
          reEncryptedNotes
            .filter((note) => note && note.id)
            .map((note) => [note.id, note])
        );
        const snapshot = await db.collection("notes").where("ownerId", "==", req.user.uid).get();
        const tasks = [];

        snapshot.forEach((noteDoc) => {
          const noteUpdate = updatesById.get(noteDoc.id);
          if (!noteUpdate) {
            return;
          }

          tasks.push(
            noteDoc.ref.update({
              title: "",
              encryptedTitle: noteUpdate.encryptedTitle || noteDoc.data().encryptedTitle || "",
              encryptedContent: noteUpdate.encryptedContent || noteDoc.data().encryptedContent || "",
              updatedAt: new Date().toISOString(),
            })
          );
        });

        await Promise.all(tasks);
      }

      const updates = {
        passwordHash: pendingRequest.newPasswordHash,
        updatedAt: new Date().toISOString(),
      };

      if (!user.personalKeyConfigured) {
        updates.personalKeyHash = "";
        updates.personalKeyHint = "";
        updates.personalKeyCheckCipher = "";
        updates.personalKeyConfigured = false;
      }

      await userRef.update(updates);

      await requestRef.delete();
      const updatedDoc = await userRef.get();
      return res.json({
        message: "Password updated successfully.",
        user: serializeUser(updatedDoc.data()),
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to confirm password update." });
    }
  });

  return router;
}

module.exports = createUserRoutes;
