import { Request, Response, NextFunction } from 'express';

const MAX_PICTURE_BYTES = 2 * 1024; // 2KB

export function validateProfilePicture(req: Request, res: Response, next: NextFunction) {
    const { picture } = req.body as { picture?: string };

    if (!picture) {
        return res.status(400).json({
            data: null,
            error: 'picture is required',
            status: 400,
        });
    }

    // Strip data URL prefix if present, e.g. "data:image/jpeg;base64,...."
    const base64Data = picture.includes(',') ? picture.split(',')[1] : picture;
    let buffer: Buffer;
    try {
        buffer = Buffer.from(base64Data, 'base64');
    } catch {
        return res.status(400).json({
            data: null,
            error: 'picture must be valid base64',
            status: 400,
        });
    }

    if (buffer.length > MAX_PICTURE_BYTES) {
        return res.status(400).json({
            data: null,
            error: `picture exceeds max size of ${MAX_PICTURE_BYTES} bytes (received ${buffer.length} bytes)`,
            status: 400,
        });
    }

    req.body.pictureBuffer = buffer;
    next();
}