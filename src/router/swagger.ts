import type { ElysiaSwaggerConfig } from "@elysiajs/swagger";

export const swaggerConfig: ElysiaSwaggerConfig<"/docs"> = {
    path: "/docs",
    theme: "dark",
    documentation: {
        info: {
            title: "Ygdrasil API",
            version: "1.0.0",
            description: "Custom Ygdrasil API for Minecraft Authorization. By the way, supported skins and capes."
        },
        tags: [
            { name: "authorization", description: "" },
            { name: "skins", description: ""         },
            { name: "capes", description: ""         },
        ],
        paths: {

        },
    }
}