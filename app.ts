import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from "./config"
import { authRoutes } from "./src/routes/user";
import { notesRoutes } from "./src/routes/notes";
import { requestLogger } from './src/middleware/RequestLogger';
import { databaseConnection } from "./src/util/DatabaseConnection";
import express, { Request, Response, NextFunction } from 'express';

const app = express();
const PORT = config.port;
const whitelist = config.cors.split(",").map(origin => origin.trim()).filter(Boolean);

app.use(helmet());
app.use(requestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// =============================================== CORS setup ===============================================
const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        if (!origin || whitelist.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
// =============================================================================================================

app.use("/api/auth", authRoutes());
app.use("/api/notes", notesRoutes());

app.get('/', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Server is active' });
});

// 404 handler — must come after all routes
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler — must be LAST, and have 4 args for Express to recognize it
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`[Error] ${req.method} ${req.path}:`, err.message);

    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS: Origin not allowed' });
    }

    res.status(500).json({
        error: config.env === 'production' ? 'Internal server error' : err.message,
    });
});

const startServer = async () => {
    try {
        await databaseConnection.connect();

        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
            console.log(`CORS allowed origins:`, whitelist);
        });
    } catch (error) {
        console.error('[Server] Failed to start:', error);
        process.exit(1);
    }
};

startServer();