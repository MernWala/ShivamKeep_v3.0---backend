import express from 'express'
import { body } from 'express-validator'
import BodyValidator from '../middleware/BodyValidator.js'
import UserSchema from '../models/User.js'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'

const router = express.Router()

// Route for setting up recovery roken
router.post('/', [

    body("email").exists().withMessage("Email not found").isEmail().withMessage("Invalid Email"),
    body("url").exists().withMessage("host url not found").custom((str) => {
        if (str.slice(-26) === '/#/account/change-password') {
            return true
        }

        throw new Error("URL threatening not allowed")
    })

], BodyValidator, async (req, res) => {

    try {

        let { email, url } = req.body

        let user = await UserSchema.findOne({ email })

        if (!user) {
            return res.status(400).json("Invalid email")
        }

        const sent = { _id: user?._id, createdAt: user?.createdAt }
        const recoveryToken = await jwt.sign(sent, process.env.JWT_SECRET)

        const newUrl = `${url}?token=${recoveryToken}`

        await UserSchema.findOneAndUpdate({ _id: user?._id }, { $set: { recoveryToken: recoveryToken } })

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_KEY
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Account Recovery: Shivam Keep',
            text: `Your account recovery link is <br><br>${newUrl}`,
        })

        return res.status(201).json("Mail has been sent")

    } catch (error) {
        console.log("ACCOUNT_RECOVER_ERROR", error);
        return res.status(500).json("Server Error")
    }

})


// Router for password changing
router.post('/change-pass', [

    body("token").exists().withMessage("Token not found"),
    body("password").exists().withMessage("Password not found").isLength({ min: 6 }).withMessage("Password is too short")

], BodyValidator, async (req, res) => {

    try {

        let { token, password } = req.body

        let user = await UserSchema.findOne({ recoveryToken: token })
        if (!user) {
            return res.status(400).json("Invalid url")
        }

        let hashpassword = await bcrypt.hash(password, 10)
        await UserSchema.findOneAndUpdate({ _id: user?._id }, { $set: { password: hashpassword, recoveryToken: null } })

        const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' })
        res.cookie('authToken', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        })

        return res.status(200).json("Password Changed")

    } catch (error) {
        console.log("CHANGE_PASSWORD_ERROR", error)
        return res.status(500).json("Server Error")
    }

})

export default router