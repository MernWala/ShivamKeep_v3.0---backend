import mongoose from "mongoose";
import Notes, { INotes } from "../models/Notes";
import { AppLogger } from "../util/AppLogger"
import jwt from "jsonwebtoken";
import { UserRepository } from "./UserRepository";

export class NotesRepository {
    private logger: AppLogger;
    private userRepo: UserRepository;

    constructor() {
        this.logger = new AppLogger("NotesRepository");
        this.userRepo = new UserRepository();
    }

    async createNote(token: string, notes: string, title: string, tags: string[], shared: boolean = false): Promise<INotes | null> {
        try {
            const user = await this.userRepo.getUser(token);
            if (!user) {
                this.logger.log("User not found");
                return null;
            }

            const note = await new Notes({ notes, title, tags, shared, user: user?._id }).save();

            return note;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async readNotes(token: string): Promise<INotes[] | []> {
        try {
            const user = await this.userRepo.getUser(token);
            if (!user) {
                this.logger.log("User not found");
                return [];
            }

            return await Notes.find({ user: user._id });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async updateNote(token: string, noteId: mongoose.Types.ObjectId, notes: string, title: string, tags: string[], shared: boolean): Promise<INotes | null> {
        try {

            const user = await this.userRepo.getUser(token);
            if (!user) {
                this.logger.log("User not found");
                return null;
            }

            const note = await Notes.findOneAndUpdate(
                { _id: noteId, user: user._id },
                { notes, title, tags, shared },
                { new: true }
            );

            return note;

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async deleteNote(token: string, noteId: mongoose.Types.ObjectId): Promise<boolean> {
        try {
            const user = await this.userRepo.getUser(token);
            if (!user) {
                this.logger.log("User not found");
                return false;
            }

            const note = await Notes.findOneAndDelete({ _id: noteId, user: user._id });
            if (!note) {
                this.logger.log("Note not found");
                return false;
            }

            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async getShared(userId: mongoose.Types.ObjectId): Promise<INotes[] | []> {
        try {

            const user = await this.userRepo.getUserById(userId);
            if (!user) {
                this.logger.log("User not found");
                return [];
            }

            const notes = await Notes.find({ user: userId, shared: true });

            return notes ?? [];
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }
}
