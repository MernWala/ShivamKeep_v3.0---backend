import { Router } from 'express'
import { NotesController } from "../controller/NotesController"

export function notesRoutes() {
    const router = Router();
    const controller = new NotesController();

    router.post("/", controller.createNote.bind(controller));
    router.get("/", controller.readNote.bind(controller));
    router.get("/shared", controller.getSharedNotes.bind(controller));
    router.put("/", controller.updateNote.bind(controller));
    router.delete("/:id", controller.deleteNote.bind(controller));
    router.patch("/:id", controller.toggleShare.bind(controller));

    return router;
};
