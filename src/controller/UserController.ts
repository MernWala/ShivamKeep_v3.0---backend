import { NextFunction, Request, Response } from "express";
import { AppLogger } from "../util/AppLogger"
import { UserRepository } from "../repository/UserRepository";
import { config } from "../../config";

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
        const { authToken } = req.cookies;
        return authToken;
    }

    async manualRegister(req: Request, res: Response, _next: NextFunction) {
        try {
            const { email, name, password } = req.body;
            const user = await this.repo.createUser(email, name, password);

            if (!user) {
                return this.returnType(res, {
                    status: 400,
                    data: null,
                    error: "User already exists",
                });
            }

            return this.returnType(res, {
                status: 201,
                data: user,
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
            const session = await this.repo.loginUser(email, password);

            if (!session) {
                res.clearCookie(config.cookie.name);
                return this.returnType(res, {
                    status: 498,
                    data: null,
                    error: "Invalid credentials",
                });
            }

            return this.returnType(res, {
                status: 200,
                data: { token: session },
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
            const session = await this.repo.loginUser(null, null, true, token);

            if (!session) {
                return this.returnType(res, {
                    status: 401,
                    data: null,
                    error: "Invalid token",
                });
            }

            return this.returnType(res, {
                status: 200,
                data: { token: session },
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
                res.clearCookie(config.cookie.name);
                return this.returnType(res, {
                    status: 200,
                    data: { success: true },
                    error: null,
                });
            }

            return this.returnType(res, {
                status: 400,
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
            const user = await this.repo.sendRecoveryLink(email);

            if (user === null) {
                return this.returnType(res, {
                    status: 404,
                    data: null,
                    error: "User not found",
                });
            } else if (user === false) {
                return this.returnType(res, {
                    status: 500,
                    data: null,
                    error: "Failed to send recovery link",
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
            throw error;
        }
    }

    async updatePassword(req: Request, res: Response, _next: NextFunction) {
        try {
            const { newPassowrd, recoveryToken } = req.body;
            const isUpdated = await this.repo.updatePassword(recoveryToken, newPassowrd);
            if (!isUpdated) {
                return this.returnType(res, {
                    status: 400,
                    data: null,
                    error: "Failed to update password",
                });
            } else {
                return this.returnType(res, {
                    status: 200,
                    data: { success: true },
                    error: null,
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }
}