import { Schema, model } from 'mongoose';

const OTP_Schema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    otp: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // 5 minutes = 5 * 60 sec1
    }
}, { timestamps: true });

const otp = model('otps', OTP_Schema);

export default otp;
