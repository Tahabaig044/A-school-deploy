interface WhatsAppConfig {
  apiUrl: string
  apiKey: string
  phoneNumberId: string
}

function getConfig(): WhatsAppConfig {
  return {
    apiUrl: process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v18.0",
    apiKey: process.env.WHATSAPP_API_KEY || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  }
}

export async function sendWhatsAppMessage(
  to: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  const config = getConfig()

  if (!config.apiKey || !config.phoneNumberId) {
    return { success: false, error: "WhatsApp API not configured" }
  }

  const cleaned = to.replace(/[^0-9]/g, "")
  const phone = cleaned.startsWith("+") ? cleaned : `+${cleaned}`

  try {
    const response = await fetch(
      `${config.apiUrl}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace("+", ""),
          type: "text",
          text: { body: message },
        }),
      },
    )

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error?.message || "Failed to send message" }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: "Network error while sending message" }
  }
}

export async function sendFeeReminder(
  phone: string,
  studentName: string,
  amount: number,
  dueDate: string,
): Promise<{ success: boolean; error?: string }> {
  const message = `Dear Parent/Guardian,

This is a reminder that the fee for ${studentName} is pending.

Amount Due: $${amount.toFixed(2)}
Due Date: ${dueDate}

Please make the payment at the earliest.

Thank you,
School Management`

  return sendWhatsAppMessage(phone, message)
}

export async function sendAttendanceAlert(
  phone: string,
  studentName: string,
  date: string,
  status: string,
): Promise<{ success: boolean; error?: string }> {
  const message = `Dear Parent/Guardian,

${studentName} was marked as ${status} on ${date}.

If this is an error, please contact the school office.

Thank you,
School Management`

  return sendWhatsAppMessage(phone, message)
}

export async function sendExamNotification(
  phone: string,
  studentName: string,
  examName: string,
  date: string,
  time: string,
): Promise<{ success: boolean; error?: string }> {
  const message = `Dear Parent/Guardian,

${studentName} has an upcoming exam:

Exam: ${examName}
Date: ${date}
Time: ${time}

Please ensure your child is well prepared.

Thank you,
School Management`

  return sendWhatsAppMessage(phone, message)
}

export async function sendBulkWhatsApp(
  recipients: Array<{ phone: string; message: string }>,
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    const result = await sendWhatsAppMessage(recipient.phone, recipient.message)
    if (result.success) sent++
    else failed++
  }

  return { sent, failed }
}
