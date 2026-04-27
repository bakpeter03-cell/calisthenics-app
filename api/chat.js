export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, trainingContext } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const systemPrompt = `You are a knowledgeable calisthenics coach and training advisor. You have access to the user's training history and give specific, direct, practical advice. You understand calisthenics progressions, body weight training, skill work, and how to balance push, pull, legs and core training.

You are not a generic fitness AI — you give real answers without excessive hedging. When the user asks about form, sensations during training, exercise progressions, or programming, you answer like an experienced coach who knows their athlete.

Here is the user's current training data:
${trainingContext}

Use this data to give personalized advice when relevant. If the user asks a general question, answer it generally. Keep responses concise and practical — no more than 3-4 paragraphs unless detail is specifically needed.`

  // Build Gemini conversation format
  let geminiMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))

  // The Gemini API requires the conversation history to start with a 'user' message.
  // We need to strip out the initial 'assistant' greeting.
  if (geminiMessages.length > 0 && geminiMessages[0].role === 'model') {
    geminiMessages.shift()
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      return res.status(500).json({ error: 'Gemini API error', details: error })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return res.status(500).json({ error: 'No response from Gemini' })
    }

    return res.status(200).json({ reply: text })

  } catch (err) {
    return res.status(500).json({ error: 'Request failed', details: err.message })
  }
}
