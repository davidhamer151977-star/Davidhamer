import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Bot, MessageCircle, Send, ShieldCheck, X } from 'lucide-react'

type Person = { id: number; name: string; handle: string }
type DirectMessage = { id: number; senderId: number; recipientId: number; body: string; createdAt: string }
type AiMessage = { role: 'user' | 'assistant'; body: string }

const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

export function ChatBoxes({ signedIn, requireAuth }: { signedIn: boolean; requireAuth: () => void }) {
  const [memberOpen, setMemberOpen] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  useEffect(() => {
    const openMemberChat = () => signedIn ? (setSecurityOpen(false), setMemberOpen(true)) : requireAuth()
    window.addEventListener('open-member-chat', openMemberChat)
    return () => window.removeEventListener('open-member-chat', openMemberChat)
  }, [signedIn, requireAuth])
  return <>
    <div className="chat-launchers" aria-label="Chat options">
      <button className="member-launcher" onClick={() => signedIn ? (setSecurityOpen(false), setMemberOpen(true)) : requireAuth()}><MessageCircle/><span>Member chat</span></button>
      <button className="security-launcher" onClick={() => (setMemberOpen(false), setSecurityOpen(true))}><ShieldCheck/><span>Security Ground</span></button>
    </div>
    {memberOpen && <MemberChat close={() => setMemberOpen(false)}/>} 
    {securityOpen && <SecurityChat close={() => setSecurityOpen(false)}/>} 
  </>
}

function MemberChat({ close }: { close: () => void }) {
  const [people, setPeople] = useState<Person[]>([]), [selected, setSelected] = useState<Person | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([]), [currentId, setCurrentId] = useState(0)
  const [draft, setDraft] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(true), [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  async function load(person?: Person) { setLoading(true); setError(''); try { const r = await fetch(`/api/messages${person ? `?with=${person.id}` : ''}`); const data = await r.json(); if (!r.ok) throw new Error(data.error); setPeople(data.people || []); setMessages(data.messages || []); if (data.currentProfileId) setCurrentId(data.currentProfileId) } catch (e) { setError(e instanceof Error ? e.message : 'Messages could not be loaded.') } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  async function choose(person: Person) { setSelected(person); await load(person) }
  async function send(e: FormEvent) { e.preventDefault(); if (!selected || !draft.trim()) return; setSending(true); setError(''); try { const r = await fetch('/api/messages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ recipientId: selected.id, body: draft }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error); setDraft(''); await load(selected) } catch (e) { setError(e instanceof Error ? e.message : 'The message could not be sent.') } finally { setSending(false) } }
  return <section className="chat-box member-chat" role="dialog" aria-modal="true" aria-label="Member chat">
    <header><div><p>Private conversations</p><h2>{selected ? selected.name : 'Messages'}</h2></div><button onClick={close} aria-label="Close member chat"><X/></button></header>
    <div className="member-chat-body"><nav aria-label="Choose a member">{loading && !people.length ? <div className="chat-loading">Opening the address book…</div> : people.length ? people.map(person => <button key={person.id} className={selected?.id === person.id ? 'active' : ''} onClick={() => choose(person)}><span>{initials(person.name)}</span><b>{person.name}<small>@{person.handle}</small></b></button>) : <div className="chat-empty"><MessageCircle/><b>No neighbours yet</b><span>Member conversations appear when other people join.</span></div>}</nav>
      <div className="thread">{selected ? <>{loading ? <div className="chat-loading">Gathering the conversation…</div> : messages.length ? <div className="message-list">{messages.map(message => <div key={message.id} className={message.senderId === currentId ? 'message mine' : 'message theirs'}><p>{message.body}</p><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div>)}<div ref={endRef}/></div> : <div className="chat-empty"><MessageCircle/><b>Start gently.</b><span>Say hello, ask a question, or share something useful.</span></div>}<form onSubmit={send}><label htmlFor="direct-message">Message {selected.name}</label><div><input id="direct-message" value={draft} maxLength={500} onChange={e => setDraft(e.target.value)} placeholder="Write a private message…"/><button disabled={sending || !draft.trim()} aria-label="Send message"><Send/></button></div><small>Security Ground checks messages before delivery.</small></form></> : <div className="chat-empty"><MessageCircle/><b>Choose someone to talk with.</b><span>Private messages are visible only to the people in the conversation.</span></div>}</div>
    </div>{error && <div className="chat-error">{error}</div>}
  </section>
}

function SecurityChat({ close }: { close: () => void }) {
  const [messages, setMessages] = useState<AiMessage[]>([{ role: 'assistant', body: 'I’m Security Ground. Tell me what is happening, and I’ll help you think through a safe next step.' }])
  const [draft, setDraft] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  async function send(e: FormEvent) { e.preventDefault(); const text = draft.trim(); if (!text) return; setMessages(all => [...all, { role: 'user', body: text }]); setDraft(''); setBusy(true); setError(''); try { const r = await fetch('/api/safe-ground', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: text }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error); setMessages(all => [...all, { role: 'assistant', body: data.answer }]) } catch (e) { setError(e instanceof Error ? e.message : 'Security Ground could not answer just now.') } finally { setBusy(false) } }
  return <section className="chat-box security-chat" role="dialog" aria-modal="true" aria-label="Security Ground chat"><header><div><p>Powered by OpenAI</p><h2><ShieldCheck/> Security Ground</h2></div><button onClick={close} aria-label="Close Security Ground chat"><X/></button></header><div className="security-messages">{messages.map((message, index) => <div key={index} className={`security-message ${message.role}`}><span>{message.role === 'assistant' ? <Bot/> : 'You'}</span><p>{message.body}</p></div>)}{busy && <div className="chat-loading">Thinking with care…</div>}</div>{error && <div className="chat-error">{error}</div>}<form onSubmit={send}><label htmlFor="security-message">Ask Security Ground</label><div><textarea id="security-message" maxLength={1200} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Leave out names and private details."/><button disabled={busy || !draft.trim()} aria-label="Send to Security Ground"><Send/></button></div><small>AI guidance, not emergency, medical, or legal advice.</small></form></section>
}
