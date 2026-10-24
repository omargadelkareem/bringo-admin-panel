import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import admin from 'firebase-admin';

const app = express();
const port = Number(process.env.API_PORT || 3001);
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const databaseURL = process.env.FIREBASE_DATABASE_URL || 'https://nezamak-41fe2-default-rtdb.firebaseio.com';
const adminApiKey = process.env.BRINGO_ADMIN_API_KEY || 'bringo-local-admin';

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '256kb' }));

function firebaseAdmin() {
  if (admin.apps.length) return admin.app();
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Missing Firebase service account: ${serviceAccountPath}`);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });
}

function authorized(req) {
  return req.headers.authorization === `Bearer ${adminApiKey}`;
}

function extractTokens(user) {
  const tokens = new Set();
  if (typeof user?.fcmToken === 'string' && user.fcmToken.trim()) tokens.add(user.fcmToken.trim());
  if (user?.fcmTokens && typeof user.fcmTokens === 'object') {
    Object.values(user.fcmTokens).forEach((entry) => {
      const token = typeof entry === 'string' ? entry : entry?.token;
      if (typeof token === 'string' && token.trim()) tokens.add(token.trim());
    });
  }
  return [...tokens];
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'bringo-notifications' }));

app.post('/api/send-notification', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    firebaseAdmin();
    const { userId, title, body, data = {} } = req.body || {};
    if (!userId?.trim() || !title?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'userId, title and body are required' });
    }

    const cleanUserId = userId.trim();
    const userSnapshot = await admin.database().ref(`users/${cleanUserId}`).get();
    const user = userSnapshot.val() || {};
    const tokens = extractTokens(user);
    if (!tokens.length) return res.status(404).json({ error: 'User has no FCM token' });

    const notificationRef = admin.database().ref('notifications').push();
    const notificationId = notificationRef.key;
    await notificationRef.set({
      userId: cleanUserId,
      title: title.trim(),
      body: body.trim(),
      isRead: false,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      data,
    });

    const stringData = Object.fromEntries(
      Object.entries({ ...data, notificationId }).map(([key, value]) => [key, String(value ?? '')]),
    );

    const message = {
      tokens,
      notification: { title: title.trim(), body: body.trim() },
      data: stringData,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    };
    const result = await admin.messaging().sendEachForMulticast(message);

    return res.json({
      ok: result.successCount > 0,
      notificationId,
      successCount: result.successCount,
      failureCount: result.failureCount,
      errors: result.responses
        .map((item, index) => item.success ? null : ({ index, code: item.error?.code, message: item.error?.message }))
        .filter(Boolean),
    });
  } catch (error) {
    console.error('send-notification error', error);
    return res.status(500).json({ error: error?.message || 'Failed to send notification' });
  }
});

app.listen(port, () => {
  console.log(`Bringo notification API running on http://localhost:${port}`);
});
