import admin from 'firebase-admin';

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!projectId || !clientEmail || !privateKey || !databaseURL) {
    throw new Error('Firebase server environment variables are missing.');
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    databaseURL,
  });
}

function isAuthorized(req) {
  const expected = process.env.BRINGO_ADMIN_API_KEY;
  if (!expected) return false;
  const header = req.headers.authorization || '';
  return header === `Bearer ${expected}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    getAdminApp();

    const { userId, title, body, data = {} } = req.body || {};
    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title and body are required' });
    }

    const userSnapshot = await admin.database().ref(`users/${userId}`).get();
    const user = userSnapshot.val() || {};
    const token = user.fcmToken;

    if (!token) {
      return res.status(404).json({ error: 'User has no FCM token' });
    }

    const notificationRef = admin.database().ref('notifications').push();
    const notificationId = notificationRef.key;

    await notificationRef.set({
      userId,
      title,
      body,
      isRead: false,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      data,
    });

    const stringData = Object.fromEntries(
      Object.entries({ ...data, notificationId }).map(([key, value]) => [
        key,
        String(value ?? ''),
      ]),
    );

    const messageId = await admin.messaging().send({
      token,
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: { channelId: 'bringo_notifications' },
      },
      apns: { payload: { aps: { sound: 'default' } } },
    });

    return res.status(200).json({ ok: true, notificationId, messageId });
  } catch (error) {
    console.error('send-notification error', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
