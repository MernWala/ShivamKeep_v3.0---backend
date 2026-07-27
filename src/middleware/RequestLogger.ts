import { Request, Response, NextFunction } from 'express';
import { AppLogger } from '../util/AppLogger';

const logger = new AppLogger('HTTP');

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });

    next();
};