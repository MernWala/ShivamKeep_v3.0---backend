import express from 'express'
import { body } from 'express-validator'
import BodyValidator from '../middleware/BodyValidator.js'
import UserSchema from '../models/User.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const router = express.Router()


// Route 1: Login User
router.post('/manual/login', [

    body('email').exists().withMessage("Enter your email").isEmail().withMessage("Email is not valid"),
    body('password').exists().withMessage("Enter your password").isLength({ min: 6 }).withMessage("Password is too short")

], BodyValidator, async (req, res, next) => {

    try {

        let { email, password } = req.body

        let user = await UserSchema.findOne({ email: email })

        if (!user) {
            return res.status(400).json("User not found")
        }

        let isMatched = await bcrypt.compare(password, user.password);

        if (!isMatched) {
            return res.status(400).json("Invalid Password")
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' })
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        })

        return res.status(200).json("Login Success")

    } catch (error) {
        console.log("MANUAL_LOGIN_ERROR", error);
        return res.status(500).json("Server Error")
    }
})


// Route 2: Create new user
router.post('/manual/register', [

    body('email').exists().withMessage("Please provie you email").isEmail().withMessage("Email is not valid"),
    body('password').exists().withMessage("Provide password").isLength({ min: 6 }).withMessage("Password is too short"),
    body('name').exists().withMessage("We need your nick name").isLength({ min: 3 }).withMessage("Name is too short"),

], BodyValidator, async (req, res, next) => {

    try {

        let { email, password, name } = req.body
        let exist = await UserSchema.findOne({ email: email })

        if (!exist) {

            const hashedPassword = await bcrypt.hash(password, 10)
            let user = new UserSchema({
                "name": name,
                "email": email,
                "password": hashedPassword
            })

            await user.save();

            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' })
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            })

            return res.status(201).json("Register Success");

        } else {

            return res.json("User with this email already exist")

        }

    } catch (error) {
        console.log("MANUAL_REGISTER_ERROR", error);
        return res.status(500).json("Server Error")
    }

})


export default router