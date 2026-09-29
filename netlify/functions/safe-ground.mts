import type { Config } from '@netlify/functions'

const systemPrompt = `You are Security Ground, the calm community-care guide for David Hamer's Common Room. Help people handle difficult online interactions, support another person, set boundaries, and find appropriate real-world help. Be warm, plain-spoken, practical, and brief. Never claim to be David Hamer, a therapist, emergency service, or human moderator. Do not diagnose. If someone may be in immediate danger or could harm themselves or another person, tell them to contact local emergency services now and reach a trusted person nearby. Do not invent local phone numbers; encourage the user to use a verified local crisis directory. Offer 2-4 concrete next steps. Respect privacy: discourage sharing names, addresses, contact details, or other identifying information. For reports about this community, explain that the user can use the Report control on a note.`

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } })
  try {
    const { message } = await req.json() as { message?: string }
    const prompt = message?.trim()
    if (!prompt || prompt.length > 1200) return Response.json({ error: 'Ask a question between 1 and 1,200 characters.' }, { status: 400 })
    const baseUrl = Netlify.env.get('NETLIFY_AI_GATEWAY_BASE_URL')
    const key = Netlify.env.get('NETLIFY_AI_GATEWAY_KEY')
    if (!baseUrl || !key) return Response.json({ error: 'Security Ground is taking a quiet moment. Please try again shortly.' }, { status: 503 })
    const response = await fetch(`${baseUrl}/openai/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-5.4-mini', max_completion_tokens: 500, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }] }),
    })
    if (!response.ok) throw new Error(`Gateway returned ${response.status}`)
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const answer = data.choices?.[0]?.message?.content?.trim()
    if (!answer) throw new Error('Empty assistant response')
    return Response.json({ answer })
  } catch (error) {
    console.error('Security Ground error', error)
    return Response.json({ error: 'Security Ground could not answer just now. If anyone is in immediate danger, contact local emergency services.' }, { status: 500 })
  }
}

export const config: Config = { path: '/api/safe-ground' }
