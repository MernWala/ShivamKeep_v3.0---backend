import { NextFunction, Request, Response } from "express";
import { AppLogger } from "../util/AppLogger"
import { NotesRepository } from "../repository/NotesRepository";

export class NotesController {
    private logger: AppLogger;
    private repo: NotesRepository;

    constructor() {
        this.logger = new AppLogger("NotesController");
        this.repo = new NotesRepository();
    }

    async createNote(req: Request, res: Response, _next: NextFunction) {
        try {

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async readNote(req: Request, res: Response, _next: NextFunction) {
        try {

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async updateNote(req: Request, res: Response, _next: NextFunction) {
        try {

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async deleteNote(req: Request, res: Response, _next: NextFunction) {
        try {

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async toggleShare(req: Request, res: Response, _next: NextFunction) {
        try {

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }
}