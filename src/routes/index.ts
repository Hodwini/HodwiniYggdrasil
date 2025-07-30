import { Elysia } from "elysia";
import { authServerRoutes } from "./authserver.route";
import { sessionServerRoutes } from "./sessionserver.route";

export const routes = new Elysia()
    .use(authServerRoutes)
    .use(sessionServerRoutes)