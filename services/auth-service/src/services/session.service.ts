import { prisma } from "../db.js";

interface opts {
  userId: number
  refreshToken: string
  userAgent?: string | null
  ip?: string | null
}

export async function createSession(options: opts) {
  return prisma.session.create({
    data: {
      userId: options.userId,
      refreshToken: options.refreshToken,
      userAgent: options.userAgent ?? null,
      ip: options.ip ?? null
    }
  })
}

export async function findsessionByToken(refreshToken: string) {
  return prisma.session.findFirst({where: { refreshToken}})
}

export async function revokeSessionByToken(refreshToken: string) {
  return prisma.session.updateMany({
    where: { refreshToken },
    data: { revoked: true }
  }) 
}

export async function revokeSessionById(sessionId: number) {
  return prisma.session.update({
    where: { id: sessionId },
    data: { revoked:  true }
  })
}

