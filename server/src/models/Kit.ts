import mongoose, { Schema, Document } from 'mongoose';
import { Kit } from '../../../shared/types';

export interface IKitDocument extends Document, Kit {
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RequirementSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  kind: { type: String, enum: ['technical', 'behavioural', 'domain'], required: true },
  priority: { type: String, enum: ['must', 'nice'], required: true }
}, { _id: false });

const QuestionSchema = new Schema({
  id: { type: String, required: true },
  requirement_ids: [{ type: String, required: true }],
  category: { type: String, enum: ['technical', 'behavioural', 'system-design', 'company-fit'], required: true },
  prompt: { type: String, required: true },
  answer_outline: { type: String, required: true },
  difficulty: { type: Number, enum: [1, 2, 3], required: true },
  // UI Builder metadata for preserving edits and pinned questions
  is_custom: { type: Boolean, default: false },
  is_pinned: { type: Boolean, default: false },
  user_edited: { type: Boolean, default: false }
}, { _id: false });

const FlashcardSchema = new Schema({
  id: { type: String, required: true },
  front: { type: String, required: true },
  back: { type: String, required: true },
  requirement_ids: [{ type: String, required: true }],
  is_custom: { type: Boolean, default: false },
  user_edited: { type: Boolean, default: false },
  confidence: { type: Number, enum: [1, 2, 3], default: 1 },
  last_practiced: { type: String }
}, { _id: false });

const ScheduleDaySchema = new Schema({
  day: { type: Number, required: true },
  focus: { type: String, required: true },
  question_ids: [{ type: String, required: true }],
  minutes: { type: Number, required: true }
}, { _id: false });

const KitSchema = new Schema<IKitDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  source: {
    company: { type: String, required: true },
    company_url: { type: String, required: true },
    role: { type: String, required: true },
    location: { type: String, default: 'Remote / Unspecified' },
    jd_chars: { type: Number, default: 0 },
    researched_at: { type: String, required: true },
    pages_used: [{ type: String }]
  },
  company_brief: {
    summary: { type: String, required: true },
    what_they_do: { type: String, required: true },
    sources: [{ type: String }]
  },
  role: {
    title: { type: String, required: true },
    seniority: { type: String, default: 'Mid-Senior' },
    responsibilities: [{ type: String }],
    requirements: [RequirementSchema]
  },
  questions: [QuestionSchema],
  flashcards: [FlashcardSchema],
  schedule: {
    days_available: { type: Number, required: true },
    days: [ScheduleDaySchema]
  },
  coverage: {
    uncovered_requirement_ids: [{ type: String }],
    passes: { type: Number, default: 1 }
  }
}, {
  timestamps: true
});

export const KitModel = mongoose.model<IKitDocument>('Kit', KitSchema);
