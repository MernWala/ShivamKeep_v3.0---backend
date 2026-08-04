import dotenv from 'dotenv';
import { z } from "zod"

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: '.env' });
}

const envSchma = z.object({
    CORS_ORIGIN: z.string().default(
        "http://127.0.0.1:5173" + "," +
        "http://localhost:5173" + "," +
        "http://localhost:3000" + "," +
        "https://keepplus.netlify.app/" + "," +
        "http://keepplus.netlify.app/" + ","
    ),
    BCRYPT_SALT_ROUNDS: z.coerce.number().default(10),
    JWT_EXPIRES_IN: z.string().default("24h"),
    JWT_SECRET: z.string().default("keepplus-secret"),
    MONGODB_URI: z.string().min(1, "MongoDB URI is required"),
    SEED_DATABASE: z.union([z.string(), z.boolean()]).default(false).transform((value) => value === 'true' || value === true),
    COOKIE_VARIABLE_NAME: z.string().default("authToken"),
    COOKIE_EXPIRES: z.string().default("7d"),
    MAIL_SERVICE_EMAIL: z.string().default("shivam.keepplus@gmail.com"),
    MAIL_SERVICE_PASSWORD: z.string().min(1, "Mail service password is required"),
    PORT: z.coerce.number().default(3001),
    ENV: z.enum(['development', 'production', 'test']).default('development'),
    FRONTEND_HOST: z.url().default("http://localhost:3000"),
});

const env = envSchma.parse({
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    MONGODB_URI: process.env.MONGODB_URI,
    SEED_DATABASE: process.env.SEED_DATABASE,
    COOKIE_VARIABLE_NAME: process.env.COOKIE_VARIABLE_NAME,
    COOKIE_EXPIRES: process.env.COOKIE_EXPIRES,
    MAIL_SERVICE_EMAIL: process.env.MAIL_SERVICE_EMAIL,
    MAIL_SERVICE_PASSWORD: process.env.MAIL_SERVICE_PASSWORD,
    PORT: process.env.PORT,
    ENV: process.env.ENV,
    FRONTEND_HOST: process.env.FRONTEND_HOST
});

export const config = {
    cors: env.CORS_ORIGIN,
    uri: env.MONGODB_URI,
    port: env.PORT,
    env: env.ENV,
    seed: env.SEED_DATABASE,
    frontendHost: env.FRONTEND_HOST,
    hash: {
        round: env.BCRYPT_SALT_ROUNDS,
    },
    jwt: {
        secret: env.JWT_SECRET,
        expires: env.JWT_EXPIRES_IN,
    },
    cookie: {
        name: env.COOKIE_VARIABLE_NAME,
        expires: env.COOKIE_EXPIRES,
    },
    mail: {
        email: env.MAIL_SERVICE_EMAIL,
        pass: env.MAIL_SERVICE_PASSWORD
    }
}

/**
 * Masks a sensitive string value, keeping only a few edge characters visible.
 * e.g. "keepplus-secret" -> "ke***********et"
 */
const maskValue = (value: string, visibleChars: number = 2): string => {
    if (!value) return "";
    if (value.length <= visibleChars * 2) {
        return "*".repeat(value.length);
    }
    const start = value.slice(0, visibleChars);
    const end = value.slice(-visibleChars);
    const masked = "*".repeat(Math.max(value.length - visibleChars * 2, 3));
    return `${start}${masked}${end}`;
};

/**
 * Masks a Mongo connection string, preserving the scheme and host
 * but hiding username/password/credentials.
 * e.g. "mongodb+srv://user:pass@cluster.mongodb.net/db"
 *   -> "mongodb+srv://***:***@cluster.mongodb.net/db"
 */
const maskMongoUri = (uri: string): string => {
    try {
        return uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
    } catch {
        return maskValue(uri);
    }
};

/**
 * Masks an email, keeping the first char of the local part and full domain.
 * e.g. "shivam.keepplus@gmail.com" -> "s***************@gmail.com"
 */
const maskEmail = (email: string): string => {
    const [local, domain] = email.split("@");
    if (!domain) return maskValue(email);
    const maskedLocal = local.length > 1
        ? `${local[0]}${"*".repeat(local.length - 1)}`
        : "*";
    return `${maskedLocal}@${domain}`;
};

const maskedConfig = {
    cors: config.cors,
    uri: maskMongoUri(config.uri),
    port: config.port,
    seed: config.seed,
    hash: {
        round: config.hash.round,
    },
    jwt: {
        secret: maskValue(config.jwt.secret),
        expires: config.jwt.expires,
    },
    cookie: {
        name: config.cookie.name,
        expires: config.cookie.expires,
    },
    mail: {
        email: maskEmail(config.mail.email),
        pass: maskValue(config.mail.pass),
    },
};

console.log("========================================");
console.log(" Loaded Application Configuration");
console.log("========================================");
console.log(JSON.stringify(maskedConfig, null, 2));
console.log("========================================");