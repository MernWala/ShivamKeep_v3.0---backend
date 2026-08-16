import mongoose from "mongoose";
import { NextFunction, Request, Response } from "express";
import { AppLogger } from "../util/AppLogger"
import { NotesRepository } from "../repository/NotesRepository";
import { UserRepository } from "../repository/UserRepository";
import { config } from "../../config";

export class NotesController {
    private logger: AppLogger;
    private repo: NotesRepository;
    private userRepo: UserRepository;

    constructor() {
        this.logger = new AppLogger("NotesController");
        this.repo = new NotesRepository();
        this.userRepo = new UserRepository();
    }

    private getToken(req: Request): string {
        const authHeader = req.headers.authorization;
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            return authHeader.slice(7);
        }
        return req.cookies?.[config.cookie.name] || '';
    }

    private async resolveUserId(req: Request): Promise<string | null> {
        const token = this.getToken(req);
        if (!token) {
            return null;
        }

        const user = await this.userRepo.getUserByToken(token);
        return user?._id ? String(user._id) : null;
    }

    private returnJson(res: Response, status: number, data: unknown, error: string | null = null) {
        return res.status(status).json({ status, data, error });
    }

    async createNote(req: Request, res: Response, _next: NextFunction) {
        try {
            const userId = await this.resolveUserId(req);
            const { title, notes, tags = [], shared = false } = req.body;

            if (!userId) {
                return this.returnJson(res, 401, null, 'Unauthorized');
            }

            if (!notes || typeof notes !== 'string') {
                return this.returnJson(res, 400, null, 'Note content is required');
            }

            const note = await this.repo.createNote(userId, notes, title ?? '', Array.isArray(tags) ? tags : [], Boolean(shared));
            if (!note) {
                return this.returnJson(res, 400, null, 'Unable to create note');
            }

            return this.returnJson(res, 201, { note }, null);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            return this.returnJson(res, 500, null, message);
        }
    }

    async readNote(req: Request, res: Response, _next: NextFunction) {
        try {
            const userId = await this.resolveUserId(req);
            if (!userId) {
                return this.returnJson(res, 401, null, 'Unauthorized');
            }

            const notes = await this.repo.readNotes(userId);
            return this.returnJson(res, 200, { notes }, null);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            return this.returnJson(res, 500, null, message);
        }
    }

    async updateNote(req: Request, res: Response, _next: NextFunction) {
        try {
            const userId = await this.resolveUserId(req);
            const { _id, title, notes, tags = [], shared = false } = req.body;

            if (!userId) {
                return this.returnJson(res, 401, null, 'Unauthorized');
            }

            if (!_id) {
                return this.returnJson(res, 400, null, 'Note id is required');
            }

            const note = await this.repo.updateNote(userId, _id, notes ?? '', title ?? '', Array.isArray(tags) ? tags : [], Boolean(shared));
            if (!note) {
                return this.returnJson(res, 404, null, 'Note not found or unauthorized');
            }

            return this.returnJson(res, 200, { note }, null);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            return this.returnJson(res, 500, null, message);
        }
    }

    async deleteNote(req: Request, res: Response, _next: NextFunction) {
        try {
            const userId = await this.resolveUserId(req);
            const noteId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            if (!userId) {
                return this.returnJson(res, 401, null, 'Unauthorized');
            }

            if (!noteId) {
                return this.returnJson(res, 400, null, 'Note id is required');
            }

            const deleted = await this.repo.deleteNote(userId, noteId);
            if (!deleted) {
                return this.returnJson(res, 404, null, 'Note not found or unauthorized');
            }

            return this.returnJson(res, 200, { success: true, note: { _id: noteId } }, null);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            return this.returnJson(res, 500, null, message);
        }
    }

    async getSharedNotes(req: Request, res: Response, _next: NextFunction) {
        try {
            const userId = String(req.query.id ?? '');
            if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                return this.returnJson(res, 400, null, 'Valid user id is required');
            }

            const notes = await this.repo.getShared(userId);
            return this.returnJson(res, 200, notes, null);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            return this.returnJson(res, 500, null, message);
        }
    }

    async toggleShare(req: Request, res: Response, _next: NextFunction) {
        try {
            const userId = await this.resolveUserId(req);
            const noteId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            if (!userId) {
                return this.returnJson(res, 401, null, 'Unauthorized');
            }

            if (!noteId) {
                return this.returnJson(res, 400, null, 'Note id is required');
            }

            const note = await this.repo.toggleShare(userId, noteId);
            if (!note) {
                return this.returnJson(res, 404, null, 'Note not found or unauthorized');
            }

            return this.returnJson(res, 200, { note }, null);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            return this.returnJson(res, 500, null, message);
        }
    }
}