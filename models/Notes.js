import { Schema, model } from 'mongoose';

const NotesSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        required: true
    },
    tags: {
        type: [String],
        default: []
    },
    shared: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

NotesSchema.index({ email: 1 });
const Notes = model('Notes', NotesSchema);

export default Notes;
