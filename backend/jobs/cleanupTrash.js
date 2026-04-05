const dotenv = require("dotenv");
const path = require("path");
const { initializeFirebase } = require("../config/firebase");
const { isExpired } = require("../../utils/date");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function cleanupTrash() {
  const { admin, db } = initializeFirebase();
  const snapshot = await db.collection("notes").where("isDeleted", "==", true).get();

  const tasks = [];
  snapshot.forEach((doc) => {
    const note = doc.data();
    if (isExpired(note.deletedAt, 30)) {
      tasks.push(doc.ref.delete());
    }
  });

  await Promise.all(tasks);
  console.log(`Removed ${tasks.length} expired note(s) from trash.`);

  const deletedUsersSnapshot = await db.collection("users").where("accountDeletionPending", "==", true).get();
  const deletedUserTasks = [];

  deletedUsersSnapshot.forEach((doc) => {
    const user = doc.data();
    if (!isExpired(user.accountDeletedAt, 30)) {
      return;
    }

    deletedUserTasks.push((async () => {
      const uid = user.uid || doc.id;

      const userNotes = await db.collection("notes").where("ownerId", "==", uid).get();
      await Promise.all(userNotes.docs.map((noteDoc) => noteDoc.ref.delete()));

      const ownedShares = await db.collection("noteShares").where("ownerId", "==", uid).get();
      await Promise.all(ownedShares.docs.map((shareDoc) => shareDoc.ref.delete()));

      const receivedShares = await db.collection("noteShares").where("recipientId", "==", uid).get();
      await Promise.all(receivedShares.docs.map((shareDoc) => shareDoc.ref.delete()));

      const otpCollections = [
        "personalKeyOtpRequests",
        "profileAccessOtpRequests",
        "accountRecoveryOtpRequests",
        "passwordOtpRequests",
        "accountDeletionOtpRequests",
      ];

      for (const collectionName of otpCollections) {
        const otpSnapshot = await db.collection(collectionName).where("userId", "==", uid).get();
        await Promise.all(otpSnapshot.docs.map((otpDoc) => otpDoc.ref.delete()));
      }

      const resetSnapshot = await db.collection("passwordResetRequests").where("uid", "==", uid).get();
      await Promise.all(resetSnapshot.docs.map((resetDoc) => resetDoc.ref.delete()));

      await doc.ref.delete();

      try {
        await admin.auth().deleteUser(uid);
      } catch (error) {
        if (error.code !== "auth/user-not-found") {
          throw error;
        }
      }
    })());
  });

  await Promise.all(deletedUserTasks);
  console.log(`Removed ${deletedUserTasks.length} expired deleted account(s).`);
}

cleanupTrash().catch((error) => {
  console.error("Cleanup failed:", error.message);
  process.exit(1);
});
