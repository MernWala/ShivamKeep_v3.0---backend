import { Router } from 'express'
import { NotesController } from "../controller/NotesController"

export function notesRoutes() {
    const router = Router();
    const controller = new NotesController();

    router.post("/", controller.createNote.bind(controller));
    router.get("/", controller.readNote.bind(controller));
    router.put("/", controller.updateNote.bind(controller));
    router.delete("/", controller.deleteNote.bind(controller));
    router.patch("/", controller.toggleShare.bind(controller));

    return router;
};
