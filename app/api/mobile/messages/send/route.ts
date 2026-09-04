import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile) return jsonError("Unauthorized", 401)
  if (!profile.schoolId) return jsonError("School not found", 404)

  let body: { receiverId?: string; subject?: string; content?: string }
  try {
    body = await req.json()
  } catch {
    return jsonError("Invalid request body", 400)
  }

  if (!body.receiverId) return jsonError("receiverId is required", 400)
  if (!body.content) return jsonError("content is required", 400)

  const receiver = await prisma.profile.findUnique({
    where: { id: body.receiverId },
  })
  if (!receiver || receiver.schoolId !== profile.schoolId) {
    return jsonError("Receiver not found", 404)
  }

  const message = await prisma.message.create({
    data: {
      schoolId: profile.schoolId,
      senderId: profile.id,
      receiverId: body.receiverId,
      subject: body.subject,
      content: body.content,
    },
  })

  return Response.json({ message }, { status: 201 })
}
