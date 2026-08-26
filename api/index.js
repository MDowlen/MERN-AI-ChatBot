import express from 'express';
import cors from 'cors';
import { connectDb, hasMongoConfig } from '../server/db.js';
import {
  addMessage,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations
} from '../server/store.js';
import { generateAssistantReply } from '../server/assistant.js';

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  let database = 'demo-memory';

  if (hasMongoConfig()) {
    try {
      await connectDb();
      database = 'mongodb-connected';
    } catch (error) {
      console.error('MongoDB health check failed:', error.message);
      database = 'mongodb-error';
    }
  }

  const healthy = database !== 'mongodb-error';

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    stack: ['MongoDB', 'Express', 'React', 'Node.js'],
    database,
    assistant: process.env.OPENAI_API_KEY ? 'openai' : 'demo'
  });
});

app.get('/api/conversations', async (_req, res, next) => {
  try {
    res.json(await listConversations());
  } catch (error) {
    next(error);
  }
});

app.post('/api/conversations', async (req, res, next) => {
  try {
    res.status(201).json(await createConversation(req.body?.title));
  } catch (error) {
    next(error);
  }
});

app.get('/api/conversations/:id', async (req, res, next) => {
  try {
    const conversation = await getConversation(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/conversations/:id', async (req, res, next) => {
  try {
    const deleted = await deleteConversation(req.params.id);
    res.status(deleted ? 204 : 404).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/conversations/:id/messages', async (req, res, next) => {
  try {
    const content = String(req.body?.content ?? '').trim();
    if (!content) return res.status(400).json({ error: 'Message is required' });

    const withUser = await addMessage(req.params.id, 'user', content);
    if (!withUser) return res.status(404).json({ error: 'Conversation not found' });

    const reply = await generateAssistantReply(content, withUser.messages);
    const updated = await addMessage(req.params.id, 'assistant', reply.content);

    res.json({ conversation: updated, provider: reply.provider });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Unexpected server error' });
});

export default app;
