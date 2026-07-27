import multer from 'multer'
import UserSchema from '../models/User';

const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, 'uploads');
    },
    filename: async (req, file, cb) => {
        try {
            const ext = file.originalname.split('.').pop() ?? 'png';
            const id = req.query.id;

            if (typeof id !== 'string' || !id) {
                return cb(new Error('User id is required'), '');
            }

            await UserSchema.findOneAndUpdate(
                { _id: id },
                { $set: { picture: `/uploads/${id}.${ext}` } }
            );

            cb(null, `${id}.${ext}`);
        } catch (error) {
            console.error('Error in filename callback:', error);
            cb(new Error(error instanceof Error ? error.message : 'Unknown upload error'), '');
        }
    }
});

export const upload = multer({ storage: storage });
