import { useState, useEffect, useRef } from 'react'
import { useLogs } from '../contexts/LogContext'

function buildTrainingContext(logs, bodyweight) {
  if (!logs || logs.length === 0) return 'No training data available yet.'

  // Last 60 days of logs
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const recentLogs = logs.filter(l => new Date(l.date) >= sixtyDaysAgo)

  // Sessions count per category
  const categories = ['Push', 'Pull', 'Legs', 'Core', 'Skills']
  const categoryDays = categories.map(cat => {
    const days = new Set(recentLogs.filter(l => l.category === cat).map(l => l.date)).size
    return `${cat}: ${days} sessions`
  }).join(', ')

  // Most trained exercises
  const exerciseCounts = {}
  recentLogs.forEach(l => {
    exerciseCounts[l.exercise] = (exerciseCounts[l.exercise] || 0) + 1
  })
  const topExercises = Object.entries(exerciseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([ex, count]) => `${ex} (${count} sets)`)
    .join(', ')

  // PBs for skill exercises
  const skillExercises = ['Muscle-up', 'Front Lever', 'Handstand', 'L-sit']
  const pbs = skillExercises.map(name => {
    const exLogs = logs.filter(l => l.exercise.toLowerCase() === name.toLowerCase())
    if (!exLogs.length) return `${name}: not trained`
    const maxHold = Math.max(...exLogs.map(l => l.hold_seconds || 0))
    const maxReps = Math.max(...exLogs.map(l => l.reps || 0))
    if (maxHold > 0) return `${name}: ${maxHold}s hold PB`
    if (maxReps > 0) return `${name}: ${maxReps} reps PB`
    return `${name}: no PB recorded`
  }).join(', ')

  // Last 5 sessions
  const recentSessions = [...new Set(logs.map(l => l.date))]
    .sort()
    .slice(-5)
    .map(date => {
      const dayLogs = logs.filter(l => l.date === date)
      const cats = [...new Set(dayLogs.map(l => l.category))].join('+')
      const exercises = [...new Set(dayLogs.map(l => l.exercise))].join(', ')
      return `${date} (${cats}): ${exercises}`
    }).join('\n')

  return `
Bodyweight: ${bodyweight}kg
Last 60 days — sessions per category: ${categoryDays}
Most trained exercises: ${topExercises}
Skill PBs: ${pbs}
Last 5 sessions:
${recentSessions}
  `.trim()
}

export default function Chat() {
  const { logs, bodyweightKg } = useLogs()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! I'm your calisthenics coach. Ask me anything about your training — form, progressions, programming, or how something feels."
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const trainingContext = buildTrainingContext(logs, bodyweightKg ?? 72)

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          trainingContext
        })
      })

      const data = await response.json()

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        // Temporarily show full error for debugging
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.error} — ${data.details || 'no details'}`
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Could not reach the server. Check your connection.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>

      {/* Scrollable message area — padded at bottom to clear the input bar */}
      <div style={{
        overflowY: 'auto',
        padding: '16px 20px 100px 20px', // 100px bottom padding clears the fixed input
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%',
        boxSizing: 'border-box',
      }}>

        {/* Header inside scroll area */}
        <div style={{ marginBottom: '8px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Coach</h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
            Powered by Gemini · knows your training history
          </p>
        </div>

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? '#016c48' : '#f1f1f1',
              color: msg.role === 'user' ? '#ffffff' : 'var(--color-text-primary)',
              fontSize: '14px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px',
              borderRadius: '18px 18px 18px 4px',
              background: '#f1f1f1',
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
            }}>
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar — fixed to bottom of the chat container */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 16px',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        background: '#ffffff',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your coach..."
          rows={1}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '20px',
            border: '1px solid rgba(0,0,0,0.12)',
            fontSize: '14px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.4',
            maxHeight: '120px',
            overflowY: 'auto',
            background: '#f8f8f8',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          style={{
            background: input.trim() && !loading ? '#016c48' : '#E8E8E8',
            color: input.trim() && !loading ? '#ffffff' : '#999999',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          ↑
        </button>
      </div>

    </div>
  )
}
