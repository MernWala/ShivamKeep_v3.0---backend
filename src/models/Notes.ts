import { Schema, model, type Types } from 'mongoose';

export interface INotes {
    _id?: Types.ObjectId;
    user: Types.ObjectId | string;
    title: string;
    notes: string;
    tags: string[];
    shared: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const NotesSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, },
    title: { type: String, default: '' },
    notes: { type: String, required: true },
    tags: { type: [String], default: [] },
    shared: { type: Boolean, default: false }
}, { timestamps: true });

NotesSchema.index({ user: 1, createdAt: -1 });
const Notes = model<INotes>('Notes', NotesSchema);

export default Notes;
