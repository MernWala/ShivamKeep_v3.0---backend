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
        const { email, password } = req.body
        const user = await UserSchema.findOne({ email })

        if (!user) {
            return res.status(400).json("User not found")
        }

        const isMatched = await bcrypt.compare(password, user.password)

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
        console.log("MANUAL_LOGIN_ERROR")
        return res.status(500).json("Server Error")
    }
})


// Route 2: Create new user
router.post('/manual/register', [

    body('email').exists().withMessage("Please provide your email").isEmail().withMessage("Email is not valid"),
    body('password').exists().withMessage("Provide password").isLength({ min: 6 }).withMessage("Password is too short"),
    body('name').exists().withMessage("We need your nick name").isLength({ min: 3 }).withMessage("Name is too short"),

], BodyValidator, async (req, res, next) => {
    try {
        const { email, password, name } = req.body
        const existingUser = await UserSchema.findOne({ email })

        if (existingUser) {
            return res.status(400).json("User with this email already exists")
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const newUser = new UserSchema({
            name,
            email,
            password: hashedPassword
        })

        await newUser.save()

        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '24h' })
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        })

        return res.status(201).json("Register Success")

    } catch (error) {
        console.log("MANUAL_REGISTER_ERROR")
        return res.status(500).json("Server Error")
    }
})


// Route 3: isVerified user ?
router.post('/is-verified', async (req, res) => {

    try {

        let { authToken } = req.cookies

        let data = jwt.verify(authToken, process.env.JWT_SECRET);
        let user = await UserSchema.findOne({ _id: data.id }).select("-password")

        return res.status(200).json({ isVerified: user?.isVerified })

    } catch (error) {
        console.log("IS_VERIFIED_ERROR")
        return res.status(500).json("Server Error")
    }

})


// Route to logout user
router.post('/logout', (req, res) => {
    res.clearCookie('authToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
    return res.status(200).json("Logout Success");
});



export default router