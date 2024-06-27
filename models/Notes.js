import { Schema, model } from 'mongoose';

const NotesSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    notes: {
        type: String,
        required: true
    }
}, { timestamps: true });

NotesSchema.index({ email: 1 });
const Notes = model('Notes', NotesSchema);

export default Notes;
