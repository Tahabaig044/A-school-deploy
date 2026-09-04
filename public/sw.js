self.addEventListener("push", (event) => {
  const data = event.data?.json() || {
    title: "School Management",
    body: "You have a new notification",
  }

  const options = {
    body: data.body,
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    data: { url: data.url || "/dashboard" },
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const url = event.notification.data?.url || "/dashboard"

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus()
        }
      }
      return clients.openWindow(url)
    }),
  )
})
