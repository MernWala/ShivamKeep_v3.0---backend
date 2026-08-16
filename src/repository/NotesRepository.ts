import mongoose from "mongoose";
import Notes, { INotes } from "../models/Notes";
import { AppLogger } from "../util/AppLogger"
import { databaseConnection } from "../util/DatabaseConnection";
export class NotesRepository {
    private logger: AppLogger;

    constructor() {
        this.logger = new AppLogger("NotesRepository");
    }

    private buildNoteFilter(userId: mongoose.Types.ObjectId | string, noteId?: mongoose.Types.ObjectId | string) {
        return noteId ? { _id: noteId, user: userId } : { user: userId };
    }

    async createNote(userId: mongoose.Types.ObjectId | string, notes: string, title: string, tags: string[], shared: boolean = false): Promise<INotes | null> {
        try {
            await databaseConnection.ensureConnection()
            const note = await new Notes({ notes, title, tags, shared, user: userId }).save();
            return note;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async readNotes(userId: mongoose.Types.ObjectId | string): Promise<INotes[] | []> {
        try {
            await databaseConnection.ensureConnection()
            return await Notes.find(this.buildNoteFilter(userId));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async updateNote(userId: mongoose.Types.ObjectId | string, noteId: mongoose.Types.ObjectId | string, notes: string, title: string, tags: string[], shared: boolean): Promise<INotes | null> {
        try {
            await databaseConnection.ensureConnection()
            const note = await Notes.findOneAndUpdate(
                this.buildNoteFilter(userId, noteId),
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

    async deleteNote(userId: mongoose.Types.ObjectId | string, noteId: mongoose.Types.ObjectId | string): Promise<boolean> {
        try {
            await databaseConnection.ensureConnection()
            const note = await Notes.findOneAndDelete(this.buildNoteFilter(userId, noteId));
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

    async toggleShare(userId: mongoose.Types.ObjectId | string, noteId: mongoose.Types.ObjectId | string): Promise<INotes | null> {
        try {
            await databaseConnection.ensureConnection()
            const note = await Notes.findOneAndUpdate(
                this.buildNoteFilter(userId, noteId),
                [{ $set: { shared: { $not: "$shared" } } }],
                { new: true }
            );

            return note;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }

    async getShared(userId: mongoose.Types.ObjectId | string): Promise<INotes[] | []> {
        try {
            await databaseConnection.ensureConnection()
            const notes = await Notes.find({ user: userId, shared: true });
            return notes ?? [];
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(message);
            throw error;
        }
    }
}
