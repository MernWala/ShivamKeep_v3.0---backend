import mongoose from 'mongoose';
import { config } from "../../config";
import { NextFunction, Request, Response } from 'express';

export const connectToDB = async (req: Request, res: Response, next: NextFunction) => {
    if (mongoose.connection.readyState !== 1) {
        try {
            await mongoose.connect(config.uri);
            console.log('Connected to MongoDB');
            next();
        } catch (error) {
            console.error('Error connecting to MongoDB:', error);
            return res.status(500).json({ message: 'Database connection failed' });
        }
    } else {
        next();
    }
};
