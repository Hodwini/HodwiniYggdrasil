import { Elysia } from 'elysia';
import { cors } from "@elysiajs/cors";
import { routes } from '@/routes';
import swagger from '@elysiajs/swagger';

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
        service: "YggdrasilService"
    }))

    .get("/", () => ({
        name: "YggdrasilService",
        version: "1.0.0.",
        endpoints: {
            authserver: "/authserver",
            sessionserver: "/sessionserver",
            docs: "/swagger"
        }
    }))
    .use(routes)
    .use(swagger())

app.listen(PORT, () => {
    console.log(`🚀 YggdrasilAPI running at http://localhost:${PORT}`);
});