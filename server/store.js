import crypto from 'node:crypto';
import { connectDb, hasMongoConfig } from './db.js';
import { Conversation } from './models.js';

const demoConversations = new Map();

function now() {
  return new Date().toISOString();
}

function normalize(doc) {
  if (!doc) return null;
  const raw = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: String(raw._id ?? raw.id),
    title: raw.title,
    messages: (raw.messages ?? []).map((message) => ({
      id: String(message._id ?? message.id ?? crypto.randomUUID()),
      role: message.role,
      content: message.content,
      createdAt: new Date(message.createdAt ?? Date.now()).toISOString()
    })),
    createdAt: new Date(raw.createdAt ?? Date.now()).toISOString(),
    updatedAt: new Date(raw.updatedAt ?? Date.now()).toISOString()
  };
}

async function inMongo(action, fallback) {
  if (!hasMongoConfig()) return fallback();
  try {
    await connectDb();
    return await action();
  } catch (error) {
    console.error('MongoDB unavailable; using demo store:', error.message);
    return fallback();
  }
}

export async function listConversations() {
  return inMongo(
    async () => (await Conversation.find().sort({ updatedAt: -1 }).limit(40)).map(normalize),
    () => [...demoConversations.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  );
}

export async function getConversation(id) {
  return inMongo(
    async () => normalize(await Conversation.findById(id)),
    () => demoConversations.get(id) ?? null
  );
}

export async function createConversation(title = 'New conversation') {
  const safeTitle = String(title || 'New conversation').slice(0, 120);
  return inMongo(
    async () => normalize(await Conversation.create({ title: safeTitle })),
    () => {
      const id = crypto.randomUUID();
      const stamp = now();
      const record = { id, title: safeTitle, messages: [], createdAt: stamp, updatedAt: stamp };
      demoConversations.set(id, record);
      return record;
    }
  );
}

export async function addMessage(id, role, content) {
  const clean = String(content ?? '').trim().slice(0, 12000);
  if (!clean) return null;

  return inMongo(
    async () => {
      const conversation = await Conversation.findById(id);
      if (!conversation) return null;
      conversation.messages.push({ role, content: clean });
      if (role === 'user' && conversation.messages.length === 1) {
        conversation.title = clean.replace(/\s+/g, ' ').slice(0, 56) || 'New conversation';
      }
      await conversation.save();
      return normalize(conversation);
    },
    () => {
      const conversation = demoConversations.get(id);
      if (!conversation) return null;
      conversation.messages.push({ id: crypto.randomUUID(), role, content: clean, createdAt: now() });
      if (role === 'user' && conversation.messages.length === 1) {
        conversation.title = clean.replace(/\s+/g, ' ').slice(0, 56) || 'New conversation';
      }
      conversation.updatedAt = now();
      return conversation;
    }
  );
}

export async function deleteConversation(id) {
  return inMongo(
    async () => Boolean(await Conversation.findByIdAndDelete(id)),
    () => demoConversations.delete(id)
  );
}
