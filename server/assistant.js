const SYSTEM_PROMPT = `You are Nexa, a concise software project assistant inside a MERN portfolio application. Give practical, helpful answers. Use short paragraphs and bullets only when useful.`;

function demoReply(message) {
  const lower = message.toLowerCase();

  if (lower.includes('mern')) {
    return 'MERN combines MongoDB for documents, Express for the API layer, React for the interface, and Node.js for the server runtime. In this project, a conversation is created in React, posted to the Express API, and persisted through Mongoose when MongoDB is configured.';
  }

  if (lower.includes('portfolio')) {
    return 'For a portfolio, the strongest proof is the working flow: create a conversation, send a message, reload saved history, inspect the REST endpoints, and review the deployment architecture in the README.';
  }

  if (lower.includes('deploy') || lower.includes('vercel')) {
    return 'This app is structured for one Vercel deployment: Vite builds the React frontend, while the Express app runs behind the /api route. MongoDB Atlas can be added with MONGODB_URI, and an OpenAI key can enable live model responses.';
  }

  return `I received: “${message.slice(0, 180)}${message.length > 180 ? '…' : ''}”\n\nThis deployment is currently using the built-in portfolio demo assistant. The full chat, Express API, conversation state, and MongoDB integration layer are live; adding OPENAI_API_KEY switches responses to the model provider.`;
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  const chunks = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === 'output_text' && content?.text) chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

export async function generateAssistantReply(message, history = []) {
  if (!process.env.OPENAI_API_KEY) {
    return { content: demoReply(message), provider: 'demo' };
  }

  const recentHistory = history.slice(-10).map((item) => ({
    role: item.role,
    content: item.content
  }));

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
        instructions: SYSTEM_PROMPT,
        input: [...recentHistory, { role: 'user', content: message }],
        max_output_tokens: 600
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with ${response.status}`);
    }

    const payload = await response.json();
    const content = extractResponseText(payload);
    if (!content) throw new Error('OpenAI response did not contain text');
    return { content, provider: 'openai' };
  } catch (error) {
    console.error('AI provider unavailable; using demo assistant:', error.message);
    return { content: demoReply(message), provider: 'demo-fallback' };
  }
}
