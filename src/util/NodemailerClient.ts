import { buildCheckFunction } from "express-validator";
import nodemailer from "nodemailer";
import { AppLogger } from "./AppLogger";
import { config } from "../../config";

const logger = new AppLogger("NodemailerClient");

export const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: config.mail.email,
        pass: config.mail.pass,
    }
});

export const sendMail = async (data: {
    to: string,
    subject: string,
    text?: string,
    html?: string,
    cc?: string[],
    bcc?: string[]
}) => {
    try {
        const mail = await transporter.sendMail({
            from: config.mail.email,
            to: data?.to,
            subject: data?.subject,
            text: data.text,
            html: data?.html,
            cc: data.cc?.join(","),
            bcc: data.bcc?.join(","),
        });

        return mail;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(message);
        throw error;
    }
}
