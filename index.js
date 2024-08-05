import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import connectToDB from './middleware/ConnectToDB.js';
import auth from './routes/auth.js';
import notes from './routes/notes.js';
import recover from './routes/recover.js';
import cookieParser from 'cookie-parser';
import path from 'path'
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const whitelist = ['http://localhost:3000', 'https://keepplus.netlify.app/', 'https://keepplus.netlify.app', 'http://keepplus.netlify.app', 'http://keepplus.netlify.app/'];

app.use(express.json());
app.use(cookieParser());

// ==================================================== Middleware for static file ==============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ==================================================== Middleware for static file ==============================================


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
// =============================================== Authentication API End ===============================================


// =============================================== Notes API Start ===============================================
app.use('/api/notes/', notes);
// =============================================== Notes API End ===============================================


// =============================================== Account Recovery API Start ===============================================
app.use('/api/recover/', recover);
// =============================================== Account Recovery API End ===============================================


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
