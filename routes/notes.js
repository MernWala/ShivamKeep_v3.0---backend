import express from 'express'
import { body } from 'express-validator'
import BodyValidator from '../middleware/BodyValidator.js'
import UserSchema from '../models/User.js'
import NotesSchema from '../models/Notes.js'
import jwt from 'jsonwebtoken'

const router = express.Router()


// Route 1: Create a notes || login required
router.post('/', [

    body('notes').exists().withMessage("What is your notes?").isLength({ min: 3 }).withMessage("Notes is too short"),
    body('title').optional().isLength({ min: 3 }).withMessage("Title is too short"),
    body('tags').optional().isArray().withMessage("Not a valid tag"),
    body('shared').optional().isBoolean().withMessage("Shared form value invalid")

], BodyValidator, async (req, res) => {
    try {

        let { authToken } = req.cookies

        if (!authToken) {
            return res.status(400).json("Unauthorize")
        }

        let data = jwt.verify(authToken, process.env.JWT_SECRET);
        let user = await UserSchema.findOne({ _id: data?.id })

        let { notes, title, tags, shared } = req.body
        if (user) {
            let note = new NotesSchema({
                notes,
                tags,
                title,
                shared,
                user: data?.id,
            })

            await note.save()

            if (note) {
                return res.status(201).json(note)
            } else {
                return res.status(400).json("Bad request")
            }
        } else {
            return res.status(400).json("Unauthorize")
        }

    } catch (error) {
        console.log("CREATE_NOTES_ERROR", error);
        return res.status(500).json("Server Error")
    }
})


// Route 2: Get all notes || login required
router.get('/', async (req, res) => {
    try {

        let { authToken } = req.cookies

        if (!authToken) {
            return res.status(400).json("Unauthorize")
        }

        let data = jwt.verify(authToken, process.env.JWT_SECRET);
        let user = await UserSchema.findOne({ _id: data?.id })

        if (user) {

            let notes = await NotesSchema.find({ user: data?.id })
            return res.status(200).json(notes)

        } else {
            return res.status(400).json("Unauthorize")
        }

    } catch (error) {
        console.log("GET_NOTES_ERROR", error);
        return res.status(500).json("Server Error")
    }
})


// Route 3: Delete a particular notes
router.post('/delete-note', [

    body('id').exists().withMessage("Notes ID not found").isMongoId().withMessage("Not a valid ID")

], BodyValidator, async (req, res) => {

    try {

        let { authToken } = req.cookies

        if (!authToken) {
            return res.status(400).json("Unauthorize")
        }

        let data = jwt.verify(authToken, process.env.JWT_SECRET);
        let user = await UserSchema.findOne({ _id: data?.id })

        if (user) {

            let note = await NotesSchema.findById(req.body.id)

            if (note?.user.equals(user?._id)) {
                await NotesSchema.deleteOne({ _id: req.body.id })
                return res.status(200).json("Notes Deleted")
            } else {
                return res.status(400).json("Unauthorize")
            }

        } else {
            return res.status(400).json("Unauthorize")
        }

    } catch (error) {
        console.log("DELTE_NOTES_ERROR", error);
        return res.status(500).json("Server Error")
    }

})


// Route 4: Update a particuar notes
router.put('/', [

    body("_id").exists().withMessage("Notes id not found").isMongoId().withMessage("Not a valid ID"),
    body("title").optional().isLength({ min: 3 }).withMessage('Title is too short'),
    body("notes").exists().withMessage("Notes not found").isLength({ min: 3 }).withMessage("Notes if too short"),
    body("tags").optional().isArray().withMessage("Invalid tag defination"),
    body('shared').optional().isBoolean().withMessage("Shared form value invalid")

], BodyValidator, async (req, res) => {

    try {

        let { authToken } = req.cookies;
        let { _id, title, notes, tags, shared } = req.body

        if (!authToken) {
            return res.status(400).json("Unauthorize")
        }

        let data = jwt.verify(authToken, process.env.JWT_SECRET);
        let user = await UserSchema.findOne({ _id: data?.id })

        if (user) {

            let note = await NotesSchema.findById(_id)

            if (note?.user.equals(user?._id)) {
                await NotesSchema.findByIdAndUpdate(
                    { _id },
                    { $set: { title, notes, tags, shared } }
                )

                let updated = await NotesSchema.findById({ _id })

                return res.status(200).json(updated)

            } else {
                return res.status(400).json("Unauthorize")
            }

        } else {
            return res.status(400).json("Unauthorize")
        }

    } catch (error) {
        console.log("NOTES_DELETE_ERROR", error)
        return res.status(500).json("Server Error")
    }

})


// Route 5: getting Shared Notes
router.get('/shared', async (req, res) => {
    try {

        let { id } = JSON.parse(JSON.stringify(req.query))
        let user = await UserSchema.findOne({ _id: id }).select('email name')

        if (!user) {
            return res.status(400).json("Invalid Link")
        }

        let notes = await NotesSchema.find({ user: id, shared: true })

        return res.status(200).json({ user, notes })

    } catch (error) {
        console.log("SHARED_NOTES_ERROR", error);
        return res.status(500).json("Server Error")
    }
})


router.post('/toggle-share', [

    body("_id").exists().withMessage("ID not found").isMongoId().withMessage("Not a valid Mongo ID")

], BodyValidator, async (req, res) => {

    try {

        let flag = req.query.flag

        await NotesSchema.findOneAndUpdate(
            { _id: req.body._id },
            { $set: { shared: flag } }
        )

        let note = await NotesSchema.findOne({ _id: req.body._id })

        return res.status(200).json(note)

    } catch (error) {
        console.log("NOTES_SHARE_TOGGLE_ERROR", error)
        return res.status(500).json("Server Error")
    }

})


export default router