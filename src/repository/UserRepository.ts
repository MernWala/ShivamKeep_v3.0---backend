import { AppLogger } from "../util/AppLogger";
import User, { IUser } from "../models/User";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../../config";
import { sendMail } from "../util/NodemailerClient";
import mongoose from "mongoose";

export class UserRepository {
    private logger: AppLogger;

    constructor() {
        this.logger = new AppLogger("UserRepository");
    }

    private async createAndRefreshToken(email: string): Promise<string> {
        try {
            const options: SignOptions = { expiresIn: config.jwt.expires as SignOptions['expiresIn'] };
            const token = jwt.sign({ email }, config.jwt.secret, options);
            await User.findOneAndUpdate({ email }, { $set: { sessionKey: token } });
            return token;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async createUser(email: string, name: string, password: string): Promise<IUser | null> {
        try {
            const data = await User.findOne({ email });
            if (data) {
                this.logger.log("User already exist");
                return null;
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const options: SignOptions = { expiresIn: config.jwt.expires as SignOptions['expiresIn'] };
            const token = jwt.sign({ email }, config.jwt.secret, options);

            const newData = await new User({
                email,
                name,
                isVerified: false,
                password: hashedPassword,
                recoveryToken: token,
            }).save();

            await sendMail({
                subject: "Verify Your Email",
                to: newData.email,
                text: `Hello ${newData.name}, Welcome to KeepPlus! We're excited to have you on board. Please verify your email address by clicking the link: https://keepplus.netlify.app/auth/verify/${token}. This link will expire in 24 hours. If you did not sign up for KeepPlus, please ignore this email.`,
            });

            return newData;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async verifyEmail(token: string): Promise<boolean> {
        try {
            const decoded = jwt.decode(token) as { email?: string } | null;
            const email = decoded?.email;
            if (!email) {
                this.logger.log("Invalid token");
                return false;
            }

            const user = await User.findOne({ email, recoveryToken: token });
            if (!user) {
                this.logger.log("User not found or invalid token");
                return false;
            }

            await User.findOneAndUpdate(
                { _id: user._id },
                { $set: { isVerified: true }, $unset: { recoveryToken: "" } }
            );

            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async loginUser(email: string | null, password: string | null, viaToken: boolean = false, token: string = ''): Promise<string | null> {
        try {
            if (viaToken) {
                const decoded = jwt.decode(token) as { email?: string } | null;
                const user = await User.findOne({ email: decoded?.email, sessionKey: token });

                if (user) {
                    const session = await this.createAndRefreshToken(user?.email);
                    return session;
                }

                return null;
            } else {
                if (!email || !password) return null;

                const user = await User.findOne({ email });
                if (!user) {
                    this.logger.log("User not found");
                    return null;
                }

                const isMatched = await bcrypt.compare(password, user.password);
                if (!isMatched) {
                    this.logger.log("User pass not matched");
                    return null;
                }

                const session = await this.createAndRefreshToken(user?.email);
                return session;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async logout(token: string): Promise<boolean> {
        try {
            const decodedToken = jwt.decode(token) as { email?: string } | null;
            const email = decodedToken?.email;
            const user = await User.findOne({ email });

            if (!user) {
                this.logger.log("User not found");
                return false;
            }

            await User.findOneAndUpdate(
                { _id: user._id },
                { $unset: { sessionKey: "" } }
            );

            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async sendRecoveryLink(email: string): Promise<boolean | null> {
        try {
            const user = await User.findOne({ email });
            if (!user) {
                this.logger.log("User not found");
                return null;
            }

            const options: SignOptions = { expiresIn: '1h' };
            const recoveryToken = jwt.sign({ email: user.email }, config.jwt.secret, options);
            await User.findOneAndUpdate({ _id: user._id }, { $set: { recoveryToken } });

            const mail = await sendMail({
                subject: "Password Recovery",
                to: user.email,
                text: `Click the link to reset your password: https://keepplus.netlify.app/auth/recover/${recoveryToken}. This link will auto expire in 1 hour. If you did not request a password reset, please ignore this email.`,
            });

            return mail ? true : false;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async updatePassword(recoveryToken: string, newPassword: string): Promise<boolean> {
        try {
            const decoded = jwt.decode(recoveryToken) as { email?: string } | null;
            const email = decoded?.email;
            if (!email) {
                this.logger.log("Invalid recovery token");
                return false;
            }

            const user = await User.findOne({ email, recoveryToken });
            if (!user) {
                this.logger.log("User not found or invalid recovery token");
                return false;
            }

            const mail = await sendMail({
                subject: "Password Changed",
                to: user.email,
                text: `Your password has been successfully changed. If you did not perform this action, please contact support immediately.`,
            });

            if (!mail) {
                this.logger.log("Failed to send confirmation email");
                return false;
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await User.findOneAndUpdate(
                { _id: user._id },
                { $set: { password: hashedPassword }, $unset: { recoveryToken: "" } }
            );

            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async getUser(token: string): Promise<IUser | null> {
        try {
            const email = jwt.decode(token);
            return await User.findOne({ email });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async getUserById(id: mongoose.Types.ObjectId): Promise<IUser | null> {
        try {
            return await User.findOne({ _id: id });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }
}