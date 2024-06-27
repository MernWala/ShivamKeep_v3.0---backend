import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import connectToDB from './middleware/ConnectToDB.js';
import auth from './routes/auth.js';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const whitelist = ['http://localhost:3000'];

app.use(express.json());
app.use(cookieParser());


// =============================================== DB Middleware ===============================================
app.use(connectToDB);
// =============================================== DB Middleware ===============================================


// =============================================== CORS setup start from here ===============================================
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || whitelist.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // Allow credentials (cookies, authorization headers)
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (whitelist.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    next()
})
// =============================================== CORS setup Ends from here ===============================================



// =============================================== Default API call Start ===============================================
app.get('/', (req, res) => {
    res.json('Server is active');
});
// =============================================== Default API call End ===============================================


// =============================================== Authentication API Start ===============================================
app.use('/api/auth/', auth);
// =============================================== Authentication API Start ===============================================


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
