// ============================================================================
// Firebase Cloud Messaging — Push Notifications
// ============================================================================

// import admin from 'firebase-admin';

// TODO: Initialize Firebase when credentials are configured
// admin.initializeApp({
//   credential: admin.credential.cert({
//     projectId: process.env.FIREBASE_PROJECT_ID,
//     privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//     clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//   }),
// });

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Enviar push notification a un dispositivo via FCM.
 *
 * NOTA: Requiere configurar Firebase Admin SDK con credenciales reales.
 * En desarrollo, simplemente logueamos el intento.
 */
export async function sendPushNotification(
  fcmToken: string,
  payload: NotificationPayload,
): Promise<boolean> {
  try {
    // TODO: Descomentar cuando Firebase este configurado
    // await admin.messaging().send({
    //   token: fcmToken,
    //   notification: {
    //     title: payload.title,
    //     body: payload.body,
    //   },
    //   data: payload.data,
    // });

    console.log(`[FCM] Notification sent to ${fcmToken.substring(0, 10)}...`, payload.title);
    return true;
  } catch (error) {
    console.error('[FCM] Failed to send notification:', error);
    return false;
  }
}

/**
 * Enviar notificacion a multiples dispositivos.
 */
export async function sendMultiplePushNotifications(
  fcmTokens: string[],
  payload: NotificationPayload,
): Promise<void> {
  const validTokens = fcmTokens.filter(Boolean);

  await Promise.allSettled(validTokens.map((token) => sendPushNotification(token, payload)));
}
