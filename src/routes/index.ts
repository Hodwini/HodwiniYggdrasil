import { Elysia } from "elysia";
import { authServerRoutes } from "./authserver.route";

export const routes = new Elysia()
    .use(authServerRoutes)