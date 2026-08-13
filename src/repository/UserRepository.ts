import { AppLogger } from "../util/AppLogger";
import User, { IUser } from "../models/User";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../../config";
import { databaseConnection } from "../util/DatabaseConnection";

export class UserRepository {
    private logger: AppLogger;

    constructor() {
        this.logger = new AppLogger("UserRepository");
    }

    private async findUserByEmail(email: string): Promise<IUser | null> {
        await databaseConnection.ensureConnection();
        return await User.findOne({ email });
    }

    private async findUserBySessionToken(token: string): Promise<IUser | null> {
        await databaseConnection.ensureConnection();
        return await User.findOne({ sessionKey: token });
    }

    private verifyToken(token: string): { email?: string } | null {
        try {
            return jwt.verify(token, config.jwt.secret) as { email?: string } | null;
        } catch {
            return null;
        }
    }

    private async refreshSession(email: string): Promise<string> {
        const token = this.createTokenViaEmail(email);
        await databaseConnection.ensureConnection();
        await User.findOneAndUpdate({ email }, { $set: { sessionKey: token } });
        return token;
    }

    private async createAndRefreshToken(email: string): Promise<string> {
        try {
            return await this.refreshSession(email);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    private createTokenViaEmail(email: string, expiresIn: string | null = null): string {
        const options: SignOptions = { expiresIn: (expiresIn ?? config.jwt.expires) as SignOptions['expiresIn'] };
        return jwt.sign({ email }, config.jwt.secret, options);
    }

    async createUser(email: string, name: string, password: string): Promise<[IUser | null, string | null]> {
        try {
            await databaseConnection.ensureConnection();

            const data = await User.findOne({ email });
            if (data) {
                this.logger.log("User already exist");
                return [null, null];
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const token = this.createTokenViaEmail(email);

            const newUser = await new User({
                email,
                name,
                isVerified: false,
                password: hashedPassword,
            }).save();

            return [newUser, token];
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async verifyEmail(token: string): Promise<boolean> {
        try {
            await databaseConnection.ensureConnection();

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

            await User.findOneAndUpdate({ _id: user._id }, { $set: { isVerified: true } });

            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async loginUser(email: string | null, password: string | null, viaToken: boolean = false, token: string = ''): Promise<string | null> {
        try {
            await databaseConnection.ensureConnection();

            if (viaToken) {
                if (!token) return null;
                const decoded = this.verifyToken(token);
                const emailFromToken = decoded?.email;
                if (!emailFromToken) {
                    return null;
                }

                const user = await this.findUserBySessionToken(token);
                this.logger.debug("Attempting login via token", { email: emailFromToken, user: user?.name });

                if (user) {
                    return await this.refreshSession(user.email);
                }

                return null;
            } else {
                if (!email || !password) return null;

                const user = await this.findUserByEmail(email);
                if (!user) {
                    this.logger.log("User not found", { email });
                    return null;
                }

                const isMatched = await bcrypt.compare(password, user.password);
                if (!isMatched) {
                    this.logger.log("User pass not matched");
                    return null;
                }

                const session = await this.refreshSession(user.email);
                this.logger.debug("Login success with credentials", { email });
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
            await databaseConnection.ensureConnection();

            if (!token) {
                return false;
            }

            const user = await this.findUserBySessionToken(token);
            if (!user) {
                this.logger.log("User not found");
                return false;
            }

            await User.findOneAndUpdate({ _id: user._id }, { $unset: { sessionKey: "" } });
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async sendRecoveryLink(email: string): Promise<[IUser | null, string | null]> {
        try {
            await databaseConnection.ensureConnection();

            const user = await User.findOne({ email });
            if (!user) {
                this.logger.log("User not found");
                return [null, null];
            }

            const recoveryToken = this.createTokenViaEmail(email, '1h');
            const data = await User.findOneAndUpdate({ _id: user._id }, { $set: { recoveryToken } }, { new: true });

            return [data, recoveryToken];
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async updatePassword(recoveryToken: string, newPassword: string): Promise<IUser | null> {
        try {
            await databaseConnection.ensureConnection();

            const decoded = jwt.decode(recoveryToken) as { email?: string } | null;
            const email = decoded?.email;
            if (!email) {
                this.logger.log("Invalid recovery token");
                return null;
            }

            const user = await User.findOne({ email, recoveryToken });
            if (!user) {
                this.logger.log("User not found or invalid recovery token");
                return null;
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await User.findOneAndUpdate(
                { _id: user._id },
                { $set: { password: hashedPassword }, $unset: { recoveryToken: "" } },
                { new: true }
            );

            return user;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async getUser(token: string | null, email: string | null = null): Promise<[IUser | null, string | null]> {
        try {
            await databaseConnection.ensureConnection();

            if (!token && (email ?? "")?.length > 0) {
                const emailString = email ?? "";
                const user = await this.getUserByEmail(emailString);
                return [user, null];
            }

            if (!email && (token ?? "")?.length > 0) {
                const tokenString = token ?? "";
                const user = await this.getUserByToken(tokenString);
                return [user, tokenString];
            }

            return [null, null];
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async getUserByEmail(email: string): Promise<IUser | null> {
        try {
            await databaseConnection.ensureConnection();

            return await this.findUserByEmail(email);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async getUserByToken(token: string): Promise<IUser | null> {
        try {
            await databaseConnection.ensureConnection();

            if (!token) return null;
            const decoded = this.verifyToken(token);
            const email = decoded?.email;
            if (!email) return null;
            const user = await this.findUserBySessionToken(token);
            return user;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async clearSession(token: string): Promise<void> {
        try {
            await databaseConnection.ensureConnection();

            await User.findOneAndUpdate({ sessionKey: token }, { $unset: { sessionKey: "" } });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async UpdateProfile(id: string, token: string, buffer: Buffer): Promise<boolean> {
        try {
            const user = await this.getUserByToken(token);
            if (user && user?._id && String(user._id) === id) {
                await User.findByIdAndUpdate(user?._id, { $set: { picture: buffer } });
                return true;
            }

            return false;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }
}