"use client"

export async function requestNotificationPermission(): Promise<string | null> {
  if (!("Notification" in window)) {
    console.warn("Notifications not supported")
    return null
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    return null
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  })

  return JSON.stringify(subscription)
}

export async function unregisterServiceWorker(): Promise<void> {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await subscription.unsubscribe()
  }
}
