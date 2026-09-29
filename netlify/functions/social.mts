import type { Config } from '@netlify/functions'
import { getUser } from '@netlify/identity'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { comments, likes, moderationEvents, posts, profiles, reports } from '../../db/schema.js'
import { moderateContent } from './_moderation.mjs'

async function currentProfile(required = true) {
  const user = await getUser()
  if (!user) {
    if (required) throw new Error('AUTH')
    return null
  }
  const name = user.name || user.email?.split('@')[0] || 'New neighbor'
  const base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'neighbor'
  const existing = await db.select().from(profiles).where(eq(profiles.identityId, user.id)).limit(1)
  if (existing[0]) return existing[0]
  const [created] = await db.insert(profiles).values({ identityId: user.id, name: String(name), handle: `${base}${user.id.slice(0, 4)}` }).returning()
  return created
}

async function feed() {
  return db.select({
    id: posts.id, body: posts.body, topic: posts.topic, createdAt: posts.createdAt,
    author: profiles.name, handle: profiles.handle,
    likeCount: sql<number>`count(distinct ${likes.id})::int`,
    commentCount: sql<number>`count(distinct ${comments.id})::int`,
  }).from(posts).innerJoin(profiles, eq(posts.authorId, profiles.id))
    .leftJoin(likes, eq(likes.postId, posts.id)).leftJoin(comments, eq(comments.postId, posts.id))
    .groupBy(posts.id, profiles.id).orderBy(desc(posts.createdAt)).limit(50)
}

export default async (req: Request) => {
  try {
    if (req.method === 'GET') return Response.json({ posts: await feed() })
    const profile = await currentProfile()
    const payload = await req.json() as { action?: string; body?: string; topic?: string; postId?: number; reason?: string; details?: string }
    if (payload.action === 'post' || payload.action === 'comment') {
      const recentBlocks = await db.select({ id: moderationEvents.id }).from(moderationEvents).where(and(
        eq(moderationEvents.profileId, profile!.id),
        eq(moderationEvents.decision, 'block'),
        gte(moderationEvents.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
      )).limit(3)
      if (recentBlocks.length >= 3) return Response.json({ error: 'Posting is paused for 24 hours after repeated safety violations. You can still read the room and use Security Ground.' }, { status: 403 })
      const content = payload.body?.trim()
      const limit = payload.action === 'post' ? 600 : 300
      if (!content || content.length > limit) return Response.json({ error: `${payload.action === 'post' ? 'Post' : 'Reply'} must be between 1 and ${limit} characters.` }, { status: 400 })
      if (content) {
        const check = await moderateContent(content)
        if (check.decision === 'unavailable') return Response.json({ error: 'The safety check is temporarily unavailable, so this was not published. Your words are still here—please try again shortly.' }, { status: 503 })
        if (check.decision === 'block') {
          await db.insert(moderationEvents).values({ profileId: profile!.id, contentType: payload.action, decision: check.decision, category: check.category, reason: check.reason, confidence: Math.round(check.confidence * 100) })
          return Response.json({ error: `Security Ground stopped this before it was shared. ${check.reason} You can revise it and try again.` }, { status: 422 })
        }
      }
    }
    if (payload.action === 'post') {
      const body = payload.body?.trim()
      if (!body || body.length > 600) return Response.json({ error: 'Post must be between 1 and 600 characters.' }, { status: 400 })
      await db.insert(posts).values({ authorId: profile!.id, body, topic: payload.topic?.slice(0, 40) || 'Conversation' })
    } else if (payload.action === 'like' && payload.postId) {
      const found = await db.select().from(likes).where(and(eq(likes.postId, payload.postId), eq(likes.profileId, profile!.id))).limit(1)
      if (found[0]) await db.delete(likes).where(eq(likes.id, found[0].id))
      else await db.insert(likes).values({ postId: payload.postId, profileId: profile!.id })
    } else if (payload.action === 'comment' && payload.postId && payload.body?.trim()) {
      await db.insert(comments).values({ postId: payload.postId, profileId: profile!.id, body: payload.body.trim().slice(0, 300) })
    } else if (payload.action === 'report' && payload.postId && payload.reason) {
      const allowedReasons = ['Harassment or bullying', 'Hate or discrimination', 'Threat or immediate danger', 'Spam or deception', 'Something else']
      if (!allowedReasons.includes(payload.reason)) return Response.json({ error: 'Choose a valid reason.' }, { status: 400 })
      const existing = await db.select().from(reports).where(and(eq(reports.postId, payload.postId), eq(reports.reporterId, profile!.id))).limit(1)
      if (existing[0]) return Response.json({ error: 'You already reported this note. It is in the review queue.' }, { status: 409 })
      await db.insert(reports).values({ postId: payload.postId, reporterId: profile!.id, reason: payload.reason, details: payload.details?.trim().slice(0, 500) || '' })
    } else return Response.json({ error: 'Invalid request.' }, { status: 400 })
    return Response.json({ posts: await feed() })
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH') return Response.json({ error: 'Please sign in first.' }, { status: 401 })
    console.error('Social API error', error)
    return Response.json({ error: 'The community feed is temporarily unavailable.' }, { status: 500 })
  }
}

export const config: Config = { path: '/api/social' }
