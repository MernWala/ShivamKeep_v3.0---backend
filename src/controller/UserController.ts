import { NextFunction, Request, Response } from "express";
import { AppLogger } from "../util/AppLogger"
import { UserRepository } from "../repository/UserRepository";
import { config } from "../../config";
import { sendMail } from "../util/NodemailerClient";

export class UserController {
    private logger: AppLogger;
    private repo: UserRepository;

    constructor() {
        this.logger = new AppLogger("UserController");
        this.repo = new UserRepository();
    }

    private returnType(res: Response, data: { status: number; data: unknown; error: string | null }) {
        return res.status(data.status).json({
            status: data.status,
            data: data.data,
            error: data.error,
        });
    }

    private getTokenFromCookies(req: Request): string {
        return req.cookies?.[config.cookie.name] || "";
    }

    private sendAuthTokenCookie(res: Response, token: string): void {
        const isProduction = config.env === "production";

        res.cookie(config.cookie.name, token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })
    }

    private clearCookieAuthToken(res: Response): void {
        res.clearCookie(config.cookie.name, { path: '/' });
    }

    async manualRegister(req: Request, res: Response, _next: NextFunction) {
        try {
            const { email, name, password } = req.body;
            const [user, token] = await this.repo.createUser(email, name, password);

            if (!user || !token) {
                return this.returnType(res, {
                    status: 400,
                    data: null,
                    error: "User already exists",
                });
            }

            // Abstrating information
            const { isVerified, picture, githubId } = user;

            // Sending onbording email
            await sendMail({
                subject: "Verify Your Email",
                to: user.email,
                text: `Hello ${user.name}, Welcome to KeepPlus! We're excited to have you on board. Please verify your email address by clicking the link: ${config.frontendHost}/auth/verify/${token}. This link will expire in 24 hours. If you did not sign up for KeepPlus, please ignore this email.`,
            });

            return this.returnType(res, {
                status: 201,
                data: { user: { email, name, isVerified, picture, githubId } },
                error: null,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            return this.returnType(res, {
                status: 500,
                data: null,
                error: message,
            });
        }
    }

    async resendVerificationEmail(req: Request, res: Response, _next: NextFunction) {
        try {
            const { email } = req.body;
            const [user, token] = await this.repo.getUser(null, email);

            if (!user) {
                return this.returnType(res, {
                    status: 404,
                    data: null,
                    error: "User not found",
                });
            }

            const mail = await sendMail({
                subject: "Verify Your Email",
                to: user.email,
                text: `Hello ${user.name}, Welcome to KeepPlus! We're excited to have you on board. Please verify your email address by clicking the link: ${config.frontendHost}/auth/verify/${token}. This link will expire in 24 hours. If you did not sign up for KeepPlus, please ignore this email.`,
            });

            if (!mail) {
                this.logger.log("Failed to send email for user: ", user);
                return this.returnType(res, {
                    status: 500,
                    data: null,
                    error: "Failed to send mail! Try again later.",
                });
            } else {
                return this.returnType(res, {
                    status: 200,
                    data: { message: "Mail has been send! Verify account within 24 hrs" },
                    error: null,
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            return this.returnType(res, {
                status: 500,
                data: null,
                error: message,
            });
        }
    }

    async verifyEmail(req: Request, res: Response, _next: NextFunction) {
        try {
            const { token } = req.body;
            const isVerified = await this.repo.verifyEmail(token);

            if (!isVerified) {
                return this.returnType(res, {
                    status: 400,
                    data: null,
                    error: "Invalid or expired token",
                });
            }

            return this.returnType(res, {
                status: 200,
                data: { success: true },
                error: null,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            return this.returnType(res, {
                status: 500,
                data: null,
                error: message,
            });
        }
    }

    async manualLogin(req: Request, res: Response, _next: NextFunction) {
        try {
            const { email, password } = req.body;
            this.logger.debug("Attempting login", { email, password });
            const session = await this.repo.loginUser(email, password, false, "");

            if (!session) {
                this.clearCookieAuthToken(res);
                return this.returnType(res, {
                    status: 498,
                    data: null,
                    error: "Invalid credentials",
                });
            }

            const user = await this.repo.getUserByEmail(email);
            const userPayload = user ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                isVerified: user.isVerified,
                picture: user.picture,
                githubId: user.githubId,
            } : null;

            this.sendAuthTokenCookie(res, session);
            return this.returnType(res, {
                status: 200,
                data: { token: session, user: userPayload },
                error: null,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            return this.returnType(res, {
                status: 500,
                data: null,
                error: message,
            });
        }
    }

    async loginViaToken(req: Request, res: Response, _next: NextFunction) {
        try {
            const token = this.getTokenFromCookies(req);
            const user = await this.repo.getUserByToken(token);
            const session = await this.repo.loginUser(null, null, true, token);

            if (!session || !user) {
                this.clearCookieAuthToken(res);
                await this.repo.clearSession(token);
                return this.returnType(res, {
                    status: 498,
                    data: { message: "Token Expired! Login again with credentials" },
                    error: "Invalid token",
                });
            }

            const userPayload = {
                _id: user._id,
                name: user.name,
                email: user.email,
                isVerified: user.isVerified,
                picture: user.picture,
                githubId: user.githubId,
            };

            this.sendAuthTokenCookie(res, session);
            return this.returnType(res, {
                status: 200,
                data: { token: session, user: userPayload },
                error: null,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            return this.returnType(res, {
                status: 500,
                data: null,
                error: message,
            });
        }
    }

    async logout(req: Request, res: Response, _next: NextFunction) {
        try {
            const token = this.getTokenFromCookies(req);
            const isRemovedSession = await this.repo.logout(token);

            if (isRemovedSession) {
                this.clearCookieAuthToken(res);
                return this.returnType(res, {
                    status: 200,
                    data: { success: true },
                    error: null,
                });
            }

            return this.returnType(res, {
                status: 500,
                data: null,
                error: "Logout failed",
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            return this.returnType(res, {
                status: 500,
                data: null,
                error: message,
            });
        }
    }

    async sendRecoveryLink(req: Request, res: Response, _next: NextFunction) {
        try {
            const { email } = req.body;
            const [user, token] = await this.repo.sendRecoveryLink(email);

            if (!user) {
                return this.returnType(res, {
                    status: 404,
                    data: null,
                    error: "User not found",
                });
            }

            const mail = await sendMail({
                subject: "Password Recovery",
                to: user.email,
                text: `Click the link to reset your password: ${config.frontendHost}/auth/recover/${token}. This link will auto expire in 1 hour. If you did not request a password reset, please ignore this email.`,
            });

            if (mail) {
                return this.returnType(res, {
                    status: 200,
                    data: { success: true, message: "Link sent to registered email" },
                    error: null,
                });
            } else {
                return this.returnType(res, {
                    status: 500,
                    data: { success: false, message: "Failed to generate link" },
                    error: "Failed to send recovery mail.",
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async updatePassword(req: Request, res: Response, _next: NextFunction) {
        try {
            const { newPassowrd, recoveryToken } = req.body;
            const user = await this.repo.updatePassword(recoveryToken, newPassowrd);

            if (!user) {
                return this.returnType(res, {
                    status: 400,
                    data: null,
                    error: "Failed to update password",
                });
            } else {
                const mail = await sendMail({
                    subject: "Password Changed",
                    to: user.email,
                    text: `Your password has been successfully changed. If you did not perform this action, please contact support immediately.`,
                });

                return this.returnType(res, {
                    status: 200,
                    error: null,
                    data: {
                        message: "Password has beeen updated",
                        mail: mail ? "Information via mail has bee sent." : "Failed to update via email",
                    },
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async updateProfile(req: Request, res: Response, _next: NextFunction) {
        try {
            const token = this.getTokenFromCookies(req);
            const { pictureBuffer } = req.body as { pictureBuffer: Buffer };

            const update = await this.repo.UpdateProfile(token, pictureBuffer);
            if (!update) {
                return this.returnType(res, {
                    status: 400,
                    data: null,
                    error: "Profile not updated",
                });
            }

            return this.returnType(res, {
                status: 200,
                data: {
                    token,
                    user: {
                        _id: update?._id,
                        name: update?.name,
                        email: update?.email,
                        isVerified: update?.isVerified,
                        picture: update?.picture,
                        githubId: update?.githubId,
                    }
                },
                error: null
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }
}