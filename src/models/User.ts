import { Schema, model, type Types } from 'mongoose';

export interface IUser {
    _id?: Types.ObjectId;
    name: string;
    email: string;
    password: string;
    picture: string;
    isVerified: boolean;
    recoveryToken?: string | null;
    githubId?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    sessionKey?: string;
}

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    picture: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    recoveryToken: { type: String, default: null },
    githubId: { type: String, default: null },
    sessionKey: { type: String, default: '' },
}, { timestamps: true });

UserSchema.index({ email: 1 });
const User = model<IUser>('User', UserSchema);

export default User;
