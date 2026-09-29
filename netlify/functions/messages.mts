import type { Config } from '@netlify/functions'
import { getUser } from '@netlify/identity'
import { and, asc, eq, gte, ne, or } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { directMessages, moderationEvents, profiles } from '../../db/schema.js'
import { moderateContent } from './_moderation.mjs'

async function member() {
  const user = await getUser()
  if (!user) return null
  const [profile] = await db.select().from(profiles).where(eq(profiles.identityId, user.id)).limit(1)
  if (profile) return profile
  const name = user.name || user.email?.split('@')[0] || 'New neighbour'
  const base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'neighbour'
  const [created] = await db.insert(profiles).values({ identityId: user.id, name: String(name), handle: `${base}${user.id.slice(0, 4)}` }).returning()
  return created
}

export default async (req: Request) => {
  try {
    const profile = await member()
    if (!profile) return Response.json({ error: 'Please sign in first.' }, { status: 401 })
    if (req.method === 'GET') {
      const recipientId = Number(new URL(req.url).searchParams.get('with'))
      const people = await db.select({ id: profiles.id, name: profiles.name, handle: profiles.handle })
        .from(profiles).where(ne(profiles.id, profile.id)).orderBy(asc(profiles.name)).limit(40)
      if (!recipientId) return Response.json({ people, messages: [] })
      if (!people.some((person) => person.id === recipientId)) return Response.json({ error: 'That member is not available.' }, { status: 404 })
      const messages = await db.select({ id: directMessages.id, senderId: directMessages.senderId, recipientId: directMessages.recipientId, body: directMessages.body, createdAt: directMessages.createdAt })
        .from(directMessages).where(or(
          and(eq(directMessages.senderId, profile.id), eq(directMessages.recipientId, recipientId)),
          and(eq(directMessages.senderId, recipientId), eq(directMessages.recipientId, profile.id)),
        )).orderBy(asc(directMessages.createdAt)).limit(100)
      await db.update(directMessages).set({ readAt: new Date() }).where(and(eq(directMessages.senderId, recipientId), eq(directMessages.recipientId, profile.id)))
      return Response.json({ people, messages, currentProfileId: profile.id })
    }
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, POST' } })
    const { recipientId, body } = await req.json() as { recipientId?: number; body?: string }
    const text = body?.trim()
    if (!recipientId || recipientId === profile.id || !text || text.length > 500) return Response.json({ error: 'Choose a member and write a message up to 500 characters.' }, { status: 400 })
    const [recipient] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, recipientId)).limit(1)
    if (!recipient) return Response.json({ error: 'That member is not available.' }, { status: 404 })
    const recentBlocks = await db.select({ id: moderationEvents.id }).from(moderationEvents).where(and(eq(moderationEvents.profileId, profile.id), eq(moderationEvents.decision, 'block'), gte(moderationEvents.createdAt, new Date(Date.now() - 86400000)))).limit(3)
    if (recentBlocks.length >= 3) return Response.json({ error: 'Messaging is paused for 24 hours after repeated safety violations.' }, { status: 403 })
    const check = await moderateContent(text)
    if (check.decision === 'unavailable') return Response.json({ error: 'Security Ground is temporarily unavailable, so this message was not sent. Please try again shortly.' }, { status: 503 })
    if (check.decision === 'block') {
      await db.insert(moderationEvents).values({ profileId: profile.id, contentType: 'message', decision: 'block', category: check.category, reason: check.reason, confidence: Math.round(check.confidence * 100) })
      return Response.json({ error: `Security Ground stopped this message. ${check.reason}` }, { status: 422 })
    }
    await db.insert(directMessages).values({ senderId: profile.id, recipientId, body: text })
    return Response.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error('Messages API error', error)
    return Response.json({ error: 'Messages are temporarily unavailable.' }, { status: 500 })
  }
}

export const config: Config = { path: '/api/messages' }
