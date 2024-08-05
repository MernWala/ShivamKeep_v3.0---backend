import express from 'express'
import { body } from 'express-validator'
import BodyValidator from '../middleware/BodyValidator.js'
import UserSchema from '../models/User.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import nodemailer from 'nodemailer'
import otpGenerator from 'otp-generator'
import OTPSchema from '../models/OTP.js'


// Multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads');
    },
    filename: async (req, file, cb) => {
        try {
            let ext = file.originalname.split('.').pop();
            let id = req.query.id;

            await UserSchema.findOneAndUpdate(
                { _id: id },
                { $set: { picture: `/uploads/${id}.${ext}` } }
            );

            cb(null, `${id}.${ext}`);
        } catch (error) {
            console.error("Error in filename callback:", error);
            cb(error);
        }
    }
});

const upload = multer({ storage: storage })

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
            sameSite: 'None',
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
            isVerified: false,
            password: hashedPassword
        })

        await newUser.save()

        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '24h' })
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None',
        })

        return res.status(201).json("Register Success")

    } catch (error) {
        console.log(error);
        console.log("MANUAL_REGISTER_ERROR")
        return res.status(500).json("Server Error")
    }
})


// Route 3: Is authentic user
router.post('/get-user', async (req, res) => {

    try {

        let { authToken } = req.cookies

        if (!authToken) {
            return res.status(400).json("Token Not Found")
        }

        let data = jwt.verify(authToken, process.env.JWT_SECRET);
        let user = await UserSchema.findOne({ _id: data.id }).select("-password -recoveryToken")

        if (!user) {
            return res.status(404).json("User not found")
        } else {
            return res.status(200).json(user)
        }

    } catch (error) {
        console.log("IS_AUTHENTIC_ERROR", error)
        return res.status(500).json('IS_AUTHENTIC_ERROR')
    }

})


// Route to logout user
router.post('/logout', (req, res) => {
    res.clearCookie('authToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None',
    });
    return res.status(200).json("Logout Success");
});


// Route for update user name
router.post('/update-name', [

    body('name').exists().withMessage("Updated name not found").isLength({ min: 3 }).withMessage("Name is too short"),
    body('_id').exists().withMessage("ID not found").isMongoId().withMessage("Invalid ID")

], BodyValidator, async (req, res) => {

    try {

        let { authToken } = req.cookies
        let { _id, name } = req.body

        if (!authToken) {
            return res.status(400).json("Unauthorize")
        }

        let token = await jwt.verify(authToken, process.env.JWT_SECRET)
        let curr = await UserSchema.findOne({ _id: token?.id })

        if (curr._id.equals(_id)) {
            await UserSchema.findByIdAndUpdate({ _id }, { $set: { name: name } })
            let user = await UserSchema.findOne({ _id }).select('-password')
            return res.status(200).json(user)
        } else {
            return res.status(400).json("Unauthorize")
        }

    } catch (error) {
        console.log("NAME_UPDATE_ERROR", error)
        return res.status(500).json("Server Error")
    }

})


// Route for add profile image
router.post('/update-profile', async (req, res, next) => {

    try {

        let { authToken } = req.cookies
        let _id = req.query.id

        if (!authToken) {
            return res.status(400).json("Unauthorize - token")
        }

        let token = await jwt.verify(authToken, process.env.JWT_SECRET)
        let curr = await UserSchema.findOne({ _id: token?.id })

        if (curr._id.equals(_id)) {
            next();
        } else {
            return res.status(400).json("Unauthorize")
        }

    } catch (error) {
        console.log("PROFILE_UPDATE_ERROR", error)
        return res.status(500).json("Server Error")
    }

}, upload.single('avatar'), async (req, res) => {
    try {
        let update = await UserSchema.findOne({ _id: req.userId }).select("-password");
        return res.status(200).json(update?.picture)
    } catch (error) {
        console.error("PROFILE_UPDATE_ERROR", error);
        return res.status(500).json("Server Error");
    }
});


// Route for send auth OTP
router.post('/send-otp', [

    body("email").exists().withMessage("Email not found").isEmail().withMessage("Not a valid email")

], BodyValidator, async (req, res) => {

    try {

        let { email } = req.body
        let otp = otpGenerator.generate(6, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_KEY
            }
        });

        let curr = await UserSchema.findOne({ email: req.body.email })
        let existingOtp = await OTPSchema.findOne({ user: curr?._id })

        if (curr !== null && existingOtp === null) {
            let otpObj = new OTPSchema({
                user: curr._id,
                otp: otp
            })

            await otpObj.save()

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'OTP: Shivam Keep',
                text: `Your account verification OTP: ${otp}`,
            })

            return res.status(201).json(curr?._id)
        } else {
            return res.status(400).json("Try again after few minutes")
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json("Server Error")
    }

})


// Route for verify -> user?.isVerified = true
router.post('/match-otp', [

    body("otp").exists().withMessage("OTP not found").isNumeric().withMessage("Invalid OTP").custom((val) => {
        if (val < 999999 && val > 100000) {
            return true
        }

        throw new Error("Invalid OTP")
    }),
    body("_id").exists().withMessage("ID not found").isMongoId().withMessage("Invalid ID")

], BodyValidator, async (req, res) => {

    try {

        let { otp, _id } = req.body

        let user = await UserSchema.findOne({ _id: _id })
        if (!user) {
            return res.status(400).json("No user found")
        }

        let curr = await OTPSchema.findOne({ user: _id })
        if (curr) {
            if ((curr?.otp - otp) === 0) {

                await UserSchema.findOneAndUpdate({ _id }, { $set: { isVerified: true } })

                const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' })
                res.cookie('authToken', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'None',
                })

                return res.status(200).json("Status Updated")
            } else {
                return res.status(400).json("Invalid OTP")
            }
        } else {
            return res.status(400).json("Previous OTP expired")
        }

    } catch (error) {
        return res.status(500).json("Server Error")
    }

})

export default router