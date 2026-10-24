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
const notificationChannelId = 'bringo_notifications_v2';

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '256kb' }));

function firebaseAdmin() {
  if (admin.apps.length) return admin.app();
  if (!fs.existsSync(serviceAccountPath)) throw new Error(`Missing Firebase service account: ${serviceAccountPath}`);
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  return admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL });
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

function chunks(items, size = 500) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function messageFor(tokens, title, body, data) {
  return {
    tokens,
    notification: { title: title.trim(), body: body.trim() },
    data: Object.fromEntries(
      Object.entries({ ...data, title: title.trim(), body: body.trim() })
        .map(([key, value]) => [key, String(value ?? '')]),
    ),
    android: {
      priority: 'high',
      notification: {
        channelId: notificationChannelId,
        sound: 'default',
        priority: 'max',
        visibility: 'public',
        defaultVibrateTimings: true,
      },
    },
    apns: { payload: { aps: { sound: 'default' } } },
  };
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'bringo-notifications' }));

app.post('/api/send-notification', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    firebaseAdmin();
    const { userId, title, body, data = {} } = req.body || {};
    if (!userId?.trim() || !title?.trim() || !body?.trim()) return res.status(400).json({ error: 'userId, title and body are required' });

    const cleanUserId = userId.trim();
    const user = (await admin.database().ref(`users/${cleanUserId}`).get()).val() || {};
    const tokens = extractTokens(user);
    if (!tokens.length) return res.status(404).json({ error: 'User has no FCM token' });

    const notificationRef = admin.database().ref('notifications').push();
    const notificationId = notificationRef.key;
    await notificationRef.set({ userId: cleanUserId, title: title.trim(), body: body.trim(), isRead: false, createdAt: admin.database.ServerValue.TIMESTAMP, data });

    const stringData = Object.fromEntries(Object.entries({ ...data, notificationId }).map(([key, value]) => [key, String(value ?? '')]));
    const result = await admin.messaging().sendEachForMulticast(messageFor(tokens, title, body, stringData));
    return res.json({
      ok: result.successCount > 0,
      notificationId,
      successCount: result.successCount,
      failureCount: result.failureCount,
      errors: result.responses.map((item, index) => item.success ? null : ({ index, code: item.error?.code, message: item.error?.message })).filter(Boolean),
    });
  } catch (error) {
    console.error('send-notification error', error);
    return res.status(500).json({ error: error?.message || 'Failed to send notification' });
  }
});

app.post('/api/send-notification-all', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    firebaseAdmin();
    const { title, body, data = {} } = req.body || {};
    if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: 'title and body are required' });

    const users = (await admin.database().ref('users').get()).val() || {};
    const tokenSet = new Set();
    const targetUserIds = [];
    Object.entries(users).forEach(([userId, user]) => {
      const userTokens = extractTokens(user);
      if (!userTokens.length) return;
      targetUserIds.push(userId);
      userTokens.forEach((token) => tokenSet.add(token));
    });

    const tokens = [...tokenSet];
    if (!tokens.length) return res.status(404).json({ error: 'No customers have FCM tokens yet' });

    const updates = {};
    const notificationIds = [];
    targetUserIds.forEach((userId) => {
      const ref = admin.database().ref('notifications').push();
      notificationIds.push(ref.key);
      updates[`notifications/${ref.key}`] = {
        userId,
        audience: 'all',
        title: title.trim(),
        body: body.trim(),
        isBroadcast: true,
        isRead: false,
        createdAt: admin.database.ServerValue.TIMESTAMP,
        data,
      };
    });
    await admin.database().ref().update(updates);

    const broadcastId = notificationIds[0] || '';
    const stringData = Object.fromEntries(Object.entries({ ...data, notificationId: broadcastId, audience: 'all' }).map(([key, value]) => [key, String(value ?? '')]));
    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    for (const tokenBatch of chunks(tokens, 500)) {
      const result = await admin.messaging().sendEachForMulticast(messageFor(tokenBatch, title, body, stringData));
      successCount += result.successCount;
      failureCount += result.failureCount;
      result.responses.forEach((item) => {
        if (!item.success) errors.push({ code: item.error?.code, message: item.error?.message });
      });
    }

    return res.json({
      ok: successCount > 0,
      notificationId: broadcastId,
      registeredCustomers: Object.keys(users).length,
      usersWithTokens: targetUserIds.length,
      deviceCount: tokens.length,
      successCount,
      failureCount,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error('send-notification-all error', error);
    return res.status(500).json({ error: error?.message || 'Failed to broadcast notification' });
  }
});

app.listen(port, () => console.log(`Bringo notification API running on http://localhost:${port}`));
