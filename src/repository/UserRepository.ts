import { AppLogger } from "../util/AppLogger";
import User, { IUser } from "../models/User";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../../config";

export class UserRepository {
    private logger: AppLogger;

    constructor() {
        this.logger = new AppLogger("UserRepository");
    }

    private async createAndRefreshToken(email: string): Promise<string> {
        try {
            const token = this.createTokenViaEmail(email);
            await User.findOneAndUpdate({ email }, { $set: { sessionKey: token } });
            return token;
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
            if (viaToken) {
                const decode = jwt.decode(token);
                const user = await User.findOne({ email, sessionKey: token });

                this.logger.log("Attempting login via token ", { decode, user, token });

                if (user) {
                    const session = await this.createAndRefreshToken(user?.email);
                    return session;
                }

                return null;
            } else {
                if (!email || !password) return null;

                const user = await User.findOne({ email });
                if (!user) {
                    this.logger.log("User not found", { email });
                    return null;
                }

                const isMatched = await bcrypt.compare(password, user.password);
                if (!isMatched) {
                    this.logger.log("User pass not matched");
                    return null;
                }

                const session = await this.createAndRefreshToken(user?.email);
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
            const decodedToken = jwt.decode(token) as { email?: string } | null;
            const email = decodedToken?.email;
            const user = await User.findOne({ email });

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

    async updatePassword(recoveryToken: string, newPassword: string): Promise<IUser|null> {
        try {
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
            if (!token && (email ?? "")?.length > 0) {
                const user = await User.findOne({ email })
                return [user, null];
            }

            if (!email && (token ?? "")?.length > 0) {
                const email = jwt.decode(token ?? "") as string;
                const user = await User.findOne({ email });
                const newToken = this.createTokenViaEmail(email);

                return [user, newToken]
            }

            return [null, null];
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }
}