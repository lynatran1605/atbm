const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { encryptDiaryContent } = require("../../services/encryptionService");
const { hashPassword, verifyPassword } = require("../utils/passwords");
const { isExpired } = require("../../utils/date");

function createNotesRoutes({ db }) {
  const router = express.Router();

  function getBaseUrl(req) {
    return req.app?.locals?.baseUrl || process.env.APP_BASE_URL || "http://localhost:3000";
  }

  function getDashboardUrl(req) {
    return `${getBaseUrl(req)}/dashboard.html`;
  }

  function serializeSharedNote(doc) {
    const share = doc.data();
    return {
      id: doc.id,
      noteId: share.noteId,
      ownerId: share.ownerId,
      ownerName: share.ownerName || "",
      recipientId: share.recipientId || "",
      recipientName: share.recipientName || "",
      accessMode: share.accessMode || "view",
      canView: share.canView !== false,
      canEdit: Boolean(share.canEdit),
      recipientRemoved: Boolean(share.recipientRemoved),
      encryptedTitle: share.encryptedTitle || "",
      encryptedContent: share.encryptedContent || "",
      shareLink: share.shareLink || "",
      createdAt: share.createdAt || "",
      updatedAt: share.updatedAt || "",
    };
  }

  async function cleanupExpiredTrash() {
    const snapshot = await db.collection("notes").where("isDeleted", "==", true).get();
    const tasks = [];

    snapshot.forEach((doc) => {
      if (isExpired(doc.data().deletedAt, 30)) {
        tasks.push(doc.ref.delete());
      }
    });

    await Promise.all(tasks);
  }

  router.get("/", async (req, res) => {
    try {
      await cleanupExpiredTrash();
      const includeTrash = String(req.query.includeTrash || "false") === "true";
      const snapshot = await db.collection("notes").where("ownerId", "==", req.user.uid).get();
      const notes = [];

      snapshot.forEach((doc) => {
        const note = doc.data();
        const visibilityMatch = includeTrash ? note.isDeleted : !note.isDeleted;

        if (visibilityMatch) {
          notes.push({ id: doc.id, ...note });
        }
      });

      notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      return res.json(notes);
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to load notes." });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const { title, content, encryptionKey } = req.body;
      if (!title || !content || !encryptionKey) {
        return res.status(400).json({ message: "Title, content, and encryption key are required." });
      }

      const id = uuidv4();
      const now = new Date().toISOString();
      const note = {
        id,
        ownerId: req.user.uid,
        title: "",
        encryptedTitle: encryptDiaryContent(title, encryptionKey),
        encryptedContent: encryptDiaryContent(content, encryptionKey),
        isDeleted: false,
        deletedAt: "",
        createdAt: now,
        updatedAt: now,
      };

      await db.collection("notes").doc(id).set(note);
      return res.status(201).json(note);
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to create note." });
    }
  });

  router.put("/:id", async (req, res) => {
    try {
      const { title, content, encryptionKey } = req.body;
      const noteRef = db.collection("notes").doc(req.params.id);
      const doc = await noteRef.get();

      if (!doc.exists) return res.status(404).json({ message: "Note not found." });
      const note = doc.data();
      if (note.ownerId !== req.user.uid) {
        return res.status(403).json({ message: "You do not have permission to edit this note." });
      }

      const updates = { updatedAt: new Date().toISOString() };
      if (title !== undefined && encryptionKey) {
        updates.title = "";
        updates.encryptedTitle = encryptDiaryContent(title, encryptionKey);
      }
      if (content !== undefined && encryptionKey) {
        updates.encryptedContent = encryptDiaryContent(content, encryptionKey);
      }

      await noteRef.update(updates);
      const updatedDoc = await noteRef.get();
      return res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to update note." });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const noteRef = db.collection("notes").doc(req.params.id);
      const doc = await noteRef.get();

      if (!doc.exists) return res.status(404).json({ message: "Note not found." });
      const note = doc.data();
      if (note.ownerId !== req.user.uid) {
        return res.status(403).json({ message: "You do not have permission to delete note." });
      }

      await noteRef.update({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return res.json({ message: "Note moved to trash successfully." });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to delete note." });
    }
  });

  router.post("/:id/restore", async (req, res) => {
    try {
      const noteRef = db.collection("notes").doc(req.params.id);
      const doc = await noteRef.get();

      if (!doc.exists) return res.status(404).json({ message: "Note not found." });
      const note = doc.data();
      if (note.ownerId !== req.user.uid) {
        return res.status(403).json({ message: "You do not have permission to restore note." });
      }

      await noteRef.update({
        isDeleted: false,
        deletedAt: "",
        updatedAt: new Date().toISOString(),
      });

      const restoredDoc = await noteRef.get();
      return res.json({ id: restoredDoc.id, ...restoredDoc.data() });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to restore note." });
    }
  });

  router.post("/:id/share", async (req, res) => {
    try {
      const { sharedTitle, sharedContent, sharedTestKey, accessMode = "view", recipientIdentifier = "" } = req.body;
      const noteRef = db.collection("notes").doc(req.params.id);
      const doc = await noteRef.get();

      if (!doc.exists) return res.status(404).json({ message: "Note not found." });
      const note = doc.data();
      if (note.ownerId !== req.user.uid) {
        return res.status(403).json({ message: "You do not have permission to share this note." });
      }
      if (!sharedTitle || !sharedContent || !sharedTestKey) {
        return res.status(400).json({ message: "Shared title, content, and test key are required." });
      }
      if (!["view", "edit"].includes(accessMode)) {
        return res.status(400).json({ message: "Access mode is invalid." });
      }

      const shareToken = uuidv4();
      const noteId = note.id || req.params.id;
      let recipientId = "";
      let recipientName = "";

      if (accessMode === "edit") {
        if (!recipientIdentifier.trim()) {
          return res.status(400).json({ message: "Recipient account is required for edit access." });
        }

        let recipientSnapshot = await db.collection("users").where("email", "==", recipientIdentifier.trim()).limit(1).get();
        if (recipientSnapshot.empty) {
          recipientSnapshot = await db.collection("users").where("username", "==", recipientIdentifier.trim()).limit(1).get();
        }
        if (recipientSnapshot.empty) {
          return res.status(404).json({ message: "Recipient account not found." });
        }

        const recipient = recipientSnapshot.docs[0].data();
        recipientId = recipient.uid;
        recipientName = recipient.displayName || recipient.username || recipient.email;
      }

      const ownerSnapshot = await db.collection("users").doc(req.user.uid).get();
      const owner = ownerSnapshot.exists ? ownerSnapshot.data() : null;
      const shareLink = `${getDashboardUrl(req)}#share/${shareToken}`;

      await db.collection("noteShares").doc(shareToken).set({
        id: shareToken,
        ownerId: req.user.uid,
        ownerName: owner?.displayName || owner?.username || req.user.username || "",
        noteId,
        shareToken,
        encryptedTitle: encryptDiaryContent(sharedTitle, sharedTestKey),
        encryptedContent: encryptDiaryContent(sharedContent, sharedTestKey),
        sharedKeyHash: await hashPassword(sharedTestKey),
        accessMode,
        recipientId,
        recipientName,
        canView: true,
        canEdit: accessMode === "edit",
        recipientRemoved: false,
        shareLink,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return res.json({
        shareId: shareToken,
        shareLink,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to share note." });
    }
  });

  router.get("/shared-by-me", async (req, res) => {
    try {
      const snapshot = await db.collection("noteShares").where("ownerId", "==", req.user.uid).get();
      const shares = snapshot.docs.map(serializeSharedNote).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      return res.json(shares);
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to load shared notes." });
    }
  });

  router.get("/shared-with-me", async (req, res) => {
    try {
      const snapshot = await db.collection("noteShares").where("recipientId", "==", req.user.uid).get();
      const shares = snapshot.docs
        .map(serializeSharedNote)
        .filter((share) => !share.recipientRemoved)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      return res.json(shares);
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to load notes shared with you." });
    }
  });

  router.get("/shares/:shareId", async (req, res) => {
    try {
      const shareDoc = await db.collection("noteShares").doc(req.params.shareId).get();
      if (!shareDoc.exists) {
        return res.status(404).json({ message: "Shared note not found." });
      }

      const share = serializeSharedNote(shareDoc);
      const isOwner = share.ownerId === req.user.uid;
      const isRecipient = share.recipientId === req.user.uid;

      if (!isOwner && !isRecipient) {
        return res.status(403).json({ message: "You do not have permission to access this shared note." });
      }

      return res.json({
        ...share,
        isOwner,
        isRecipient,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to load shared note details." });
    }
  });

  router.put("/shares/:shareId", async (req, res) => {
    try {
      const { title, content, sharedTestKey } = req.body;
      const shareRef = db.collection("noteShares").doc(req.params.shareId);
      const shareDoc = await shareRef.get();

      if (!shareDoc.exists) {
        return res.status(404).json({ message: "Shared note not found." });
      }

      const share = shareDoc.data();
      const isOwner = share.ownerId === req.user.uid;
      const isRecipient = share.recipientId === req.user.uid;
      if (!isOwner && !isRecipient) {
        return res.status(403).json({ message: "You do not have permission to edit this shared note." });
      }
      if (!share.canEdit) {
        return res.status(403).json({ message: "Edit access has been disabled by the owner." });
      }
      if (!title || !content || !sharedTestKey) {
        return res.status(400).json({ message: "Title, content, and shared key are required." });
      }

      const keyOk = await verifyPassword(sharedTestKey, share.sharedKeyHash);
      if (!keyOk) {
        return res.status(401).json({ message: "Shared key is incorrect." });
      }

      await shareRef.update({
        encryptedTitle: encryptDiaryContent(title, sharedTestKey),
        encryptedContent: encryptDiaryContent(content, sharedTestKey),
        updatedAt: new Date().toISOString(),
      });

      const updatedDoc = await shareRef.get();
      return res.json(serializeSharedNote(updatedDoc));
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to update shared note." });
    }
  });

  router.patch("/shares/:shareId/access", async (req, res) => {
    try {
      const { canView, canEdit } = req.body;
      const shareRef = db.collection("noteShares").doc(req.params.shareId);
      const shareDoc = await shareRef.get();
      if (!shareDoc.exists) {
        return res.status(404).json({ message: "Shared note not found." });
      }

      const share = shareDoc.data();
      if (share.ownerId !== req.user.uid) {
        return res.status(403).json({ message: "Only the owner can update access." });
      }

      const updates = {
        updatedAt: new Date().toISOString(),
      };
      if (canView !== undefined) updates.canView = Boolean(canView);
      if (canEdit !== undefined) updates.canEdit = Boolean(canEdit) && share.accessMode === "edit";

      await shareRef.update(updates);
      const updatedDoc = await shareRef.get();
      return res.json(serializeSharedNote(updatedDoc));
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to update share access." });
    }
  });

  router.delete("/shares/:shareId", async (req, res) => {
    try {
      const shareRef = db.collection("noteShares").doc(req.params.shareId);
      const shareDoc = await shareRef.get();
      if (!shareDoc.exists) {
        return res.status(404).json({ message: "Shared note not found." });
      }

      const share = shareDoc.data();
      if (share.ownerId !== req.user.uid) {
        return res.status(403).json({ message: "Only the owner can delete this share." });
      }

      await shareRef.delete();
      return res.json({ message: "Shared note removed." });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to delete shared note." });
    }
  });

  router.post("/shared-with-me/:shareId/remove", async (req, res) => {
    try {
      const shareRef = db.collection("noteShares").doc(req.params.shareId);
      const shareDoc = await shareRef.get();
      if (!shareDoc.exists) {
        return res.status(404).json({ message: "Shared note not found." });
      }

      const share = shareDoc.data();
      if (share.recipientId !== req.user.uid) {
        return res.status(403).json({ message: "You do not have permission to remove this shared note." });
      }

      await shareRef.update({
        recipientRemoved: true,
        updatedAt: new Date().toISOString(),
      });
      return res.json({ message: "Shared note removed from your dashboard." });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to remove shared note." });
    }
  });

  return router;
}

function createSharedNotesRoutes({ db }) {
  const router = express.Router();

  router.get("/:shareToken", async (req, res) => {
    try {
      const doc = await db.collection("noteShares").doc(req.params.shareToken).get();
      if (!doc.exists) {
        return res.status(404).json({ message: "Shared note not found." });
      }

      const note = doc.data();
      return res.json({
        id: doc.id,
        ownerId: note.ownerId || "",
        recipientId: note.recipientId || "",
        accessMode: note.accessMode || "view",
        canView: note.canView !== false,
        canEdit: Boolean(note.canEdit),
        encryptedTitle: note.encryptedTitle,
        encryptedContent: note.encryptedContent,
        shareLink: note.shareLink || "",
        createdAt: note.createdAt || "",
        updatedAt: note.updatedAt || note.createdAt || "",
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || "Unable to load shared note." });
    }
  });

  return router;
}

module.exports = {
  createNotesRoutes,
  createSharedNotesRoutes,
};
