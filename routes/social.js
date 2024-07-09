import express from 'express';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config('../.env')

const router = express.Router();

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: 'http://localhost:3001/api/auth/social/github'
}, async (accessToken, refreshToken, profile, done) => {
    try {

        let user = await User.findOne({ githubId: profile.id });
        if (!user) {

            const hashedPassword = await bcrypt.hash(profile.id, 10)
            let user = new User({
                githubId: profile?.id,
                name: profile?.displayName,
                email: profile?._raw?.email ?? `github-id: ${profile?.id}`,
                password: hashedPassword,
                isVerified: true,
                picture: profile?.photos[0]?.value
            });

            await user.save();
        }

        return done(null, user);

    } catch (error) {

        return done(error, null);

    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', passport.authenticate('github', { failureRedirect: '/' }), async (req, res) => {

    // const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '24h' })
    // res.cookie('authToken', token, {
    //     httpOnly: true,
    //     secure: process.env.NODE_ENV === 'production',
    //     sameSite: 'strict',
    // })

});

export default router;
