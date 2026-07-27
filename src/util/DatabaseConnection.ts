import mongoose from "mongoose";
import { config } from "../../config";

class DatabaseConnection {
    private static instance: DatabaseConnection;
    private isConnected: boolean = false;

    private readonly MAX_RETRIES = 5;
    private readonly RETRY_DELAY_MS = 5000;

    private constructor() {
        this.registerEventListeners();
    }

    public static getInstance(): DatabaseConnection {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }

    public async connect(): Promise<void> {
        if (this.isConnected) {
            console.log("[Database] Already connected, skipping reconnection.");
            return;
        }

        let attempt = 0;

        while (attempt < this.MAX_RETRIES) {
            try {
                await mongoose.connect(config.uri, {
                    maxPoolSize: 10,
                    minPoolSize: 2,
                    socketTimeoutMS: 45000,
                    serverSelectionTimeoutMS: 10000,
                    family: 4,
                });

                this.isConnected = true;
                console.log("[Database] Connected successfully.");
                return;
            } catch (error) {
                attempt++;
                console.error(
                    `[Database] Connection attempt ${attempt}/${this.MAX_RETRIES} failed:`,
                    error instanceof Error ? error.message : error
                );

                if (attempt >= this.MAX_RETRIES) {
                    console.error("[Database] Max retries reached. Exiting process.");
                    process.exit(1);
                }

                await this.delay(this.RETRY_DELAY_MS);
            }
        }
    }

    public async disconnect(): Promise<void> {
        if (!this.isConnected) return;

        try {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log("[Database] Disconnected gracefully.");
        } catch (error) {
            console.error("[Database] Error during disconnection:", error);
        }
    }

    private registerEventListeners(): void {
        mongoose.connection.on("connected", () => {
            console.log("[Database] Mongoose default connection open.");
        });

        mongoose.connection.on("error", (err) => {
            console.error("[Database] Mongoose connection error:", err);
        });

        mongoose.connection.on("disconnected", () => {
            console.warn("[Database] Mongoose connection disconnected.");
            this.isConnected = false;
        });

        mongoose.connection.on("reconnected", () => {
            console.log("[Database] Mongoose reconnected.");
            this.isConnected = true;
        });

        // Graceful shutdown on process termination signals
        process.on("SIGINT", async () => {
            await this.disconnect();
            process.exit(0);
        });

        process.on("SIGTERM", async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    public getConnectionState(): boolean {
        return this.isConnected;
    }

    public async ensureConnection(): Promise<void> {
        if (!this.isConnected) {
            console.warn("[Database] Connection lost. Attempting to reconnect...");
            await this.connect();
        }
    }
}

export const databaseConnection = DatabaseConnection.getInstance();