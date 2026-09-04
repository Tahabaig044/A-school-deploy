import webPush from "web-push"

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ""
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ""

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    "mailto:support@school.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  )
}

export interface PushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function sendPushNotification(
  subscription: PushSubscription,
  title: string,
  body: string,
  url?: string,
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("VAPID keys not configured, skipping push notification")
    return false
  }

  try {
    await webPush.sendNotification(
      subscription,
      JSON.stringify({
        title,
        body,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        data: { url: url || "/dashboard" },
      }),
    )
    return true
  } catch (error) {
    console.error("Push notification failed:", error)
    return false
  }
}

export async function sendBulkPushNotifications(
  subscriptions: PushSubscription[],
  title: string,
  body: string,
  url?: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    const success = await sendPushNotification(sub, title, body, url)
    if (success) sent++
    else failed++
  }

  return { sent, failed }
}
