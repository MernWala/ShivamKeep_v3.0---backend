import { Request, Response, NextFunction } from 'express';

const MAX_PICTURE_BYTES = 20 * 1024; // 20KB

export function validateProfilePicture(req: Request, res: Response, next: NextFunction) {
    // express.raw() puts the parsed binary buffer directly on req.body
    const buffer = req.body as Buffer;

    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
        return res.status(400).json({
            data: null,
            error: 'picture binary blob is required',
            status: 400,
        });
    }

    if (buffer.length > MAX_PICTURE_BYTES) {
        return res.status(400).json({
            data: null,
            error: `picture exceeds max size of ${MAX_PICTURE_BYTES / 1024}KB (received ${(buffer.length / 1024).toFixed(1)}KB)`,
            status: 400,
        });
    }

    // Attach buffer to request for clean controller access
    req.body.pictureBuffer = buffer;
    next();
}