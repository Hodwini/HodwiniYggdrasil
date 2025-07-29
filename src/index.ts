import { Elysia } from 'elysia';
import { cors } from "@elysiajs/cors";

const PORT = Bun.env.SERVER_PORT || 3000

const app = new Elysia()
    .use(cors({
        origin: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    }))

    .get("/health", () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "YgdrasilService"
    }))

    .get("/", () => ({
        name: "YgdrasilService",
        version: "1.0.0.",
        endpoints: {
            authserver: "/authserver",
            sessionserver: "/sessionserver",
            api: "/api",
            docs: "/swagger"
        }
    }))

app.listen(PORT, () => {
    console.log('🚀 YggdrasilAPI running at http://localhost:3000');
});