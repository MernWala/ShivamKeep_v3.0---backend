import express, { Router } from 'express'
import { UserController } from "../controller/UserController"
import { validateProfilePicture } from '../middleware/ValidateProfilePicture';

export function authRoutes() {
    const router = Router();
    const controller = new UserController();

    router.post("/register", controller.manualRegister.bind(controller));
    router.patch(
        "/",
        express.raw({ type: ['application/octet-stream', 'image/*'], limit: '20kb' }),
        validateProfilePicture,
        controller.updateProfile.bind(controller)
    );
    router.post("/resend-verification", controller.resendVerificationEmail.bind(controller));
    router.post("/verify-email", controller.verifyEmail.bind(controller));
    router.post("/login", controller.manualLogin.bind(controller));
    router.get("/login-token", controller.loginViaToken.bind(controller));
    router.get("/logout", controller.logout.bind(controller));
    router.get("/recover", controller.sendRecoveryLink.bind(controller));
    router.post("/update-password", controller.updatePassword.bind(controller));

    return router;
};
