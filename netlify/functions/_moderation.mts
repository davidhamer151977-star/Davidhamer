type ModerationResult = {
  decision: 'allow' | 'block' | 'unavailable'
  category: string
  reason: string
  confidence: number
}

const policy = `Classify a proposed social post or reply for a warm general-audience community. Return only JSON with decision, category, reason, and confidence. Block only clear, targeted, or actionable harm: credible threats; encouragement of self-harm or violence; targeted harassment or dehumanizing hate; sexual exploitation; sharing private identifying information; scams; or instructions to evade safety systems. Allow disagreement, profanity without a target, criticism, dark humor without a credible target, news discussion, counterspeech, quoted harmful language used to condemn or seek help, and people describing harm done to them. Use decision "block" only with confidence at least 0.86. category must be one of safe, threat, harassment, hate, self_harm, exploitation, privacy, scam, or evasion. Keep reason under 100 characters and suitable to show to the author.`

export async function moderateContent(content: string): Promise<ModerationResult> {
  const baseUrl = Netlify.env.get('NETLIFY_AI_GATEWAY_BASE_URL')
  const key = Netlify.env.get('NETLIFY_AI_GATEWAY_KEY')
  if (!baseUrl || !key) return { decision: 'unavailable', category: 'safe', reason: 'Automated check unavailable.', confidence: 0 }
  try {
    const response = await fetch(`${baseUrl}/openai/v1/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-5.4-nano',
        max_completion_tokens: 180,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: policy }, { role: 'user', content }],
      }),
    })
    if (!response.ok) throw new Error(`Moderation gateway returned ${response.status}`)
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}') as Partial<ModerationResult>
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0))
    const categories = ['safe', 'threat', 'harassment', 'hate', 'self_harm', 'exploitation', 'privacy', 'scam', 'evasion']
    const category = categories.includes(parsed.category || '') ? parsed.category! : 'safe'
    const block = parsed.decision === 'block' && category !== 'safe' && confidence >= 0.86
    return {
      decision: block ? 'block' : 'allow',
      category,
      reason: block ? String(parsed.reason || 'This could put someone at risk.').slice(0, 100) : 'No clear policy violation.',
      confidence,
    }
  } catch (error) {
    console.error('Content moderation unavailable', error)
    return { decision: 'unavailable', category: 'safe', reason: 'Automated check unavailable.', confidence: 0 }
  }
}
