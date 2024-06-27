import { validationResult } from "express-validator";

const validateBody = (req, res, next) => {
    try {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json(errors.array()[0].msg)
        }

        next();
    } catch (error) {
        console.log("BODY_VALIDATION_ERROR", error);
        res.status(500).json("Server Error")
    }
}

export default validateBody