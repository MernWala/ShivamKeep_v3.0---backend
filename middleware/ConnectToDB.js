import mongoose from 'mongoose';

const connectToDB = async (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        try {
            await mongoose.connect('mongodb://localhost:27017/Notes');
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

export default connectToDB;
