export class AppLogger {
    private module;

    constructor(module: string) {
        this.module = module
    }

    log(message: string, obj: any | null = null) {
        console.log(`[${this.module}] ${message}`, obj);
    }

    debug(message: string, obj: any | null = null) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEBUG] [${this.module}] ${message}`, obj);
        }
    }

    error(message: string, obj: any | null = null) {
        console.log(`[ERROR] [${this.module}] ${message}`, obj);
    }
}
