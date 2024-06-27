import dotenv from 'dotenv'
import express from 'express';
import cors from 'cors';
import connectToDB from './middleware/ConnectToDB.js';
import auth from './routes/auth.js'
import cookieParser from 'cookie-parser'



dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001
const whitelist = ['http://localhost:3000'];

app.use(express.json());
app.use(cookieParser());



/* ================================================= Database Middleware Start =================================================  */
app.use(connectToDB);
/* ================================================== Database Middleware End ==================================================  */



/* ========================================= Middleware Setup for API protection Start =========================================  */
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || whitelist.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    }
};

app.use((req, res, next) => {
    cors(corsOptions)(req, res, (err) => {
        if (err) {
            return next(err);
        }
        if (req.headers.origin && !whitelist.includes(req.headers.origin)) {
            return res.status(403).json({ message: 'Unauthorized access not allowed' });
        }
        next();
    });
});
/* ========================================= Middleware Setup for API protection End =========================================  */



/* ====================================================== API routes Start ======================================================  */
app.get('/', (req, res) => {
    res.json('Server is active');
});

// API route for authentication -> Login || Register
app.use('/api/auth/', auth)
/* ======================================================= API routes End =======================================================  */



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
