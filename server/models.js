import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, trim: true, maxlength: 12000 },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const conversationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    messages: { type: [messageSchema], default: [] }
  },
  { timestamps: true }
);

export const Conversation =
  mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
