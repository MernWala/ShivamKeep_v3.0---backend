import { Schema, model } from 'mongoose';

const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    picture: {
        type: String,
        default: ''
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    recoveryToken: {
        type: String,
        default: null
    },
    githubId: {
        type: String,
        default: null        
    }
}, { timestamps: true });

UserSchema.index({ email: 1 });
const User = model('User', UserSchema);

export default User;
