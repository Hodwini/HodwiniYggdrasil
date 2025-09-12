FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock tsconfig.json bunfig.toml import_map.json ./

RUN bun install --frozen-lockfile

COPY src ./src

RUN bun build src/index.ts \
    --outdir ./dist \
    --target bun \
    --no-minify

FROM alpine:3.18

RUN apk add --no-cache libc6-compat bash curl git

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

COPY bunfig.toml import_map.json ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "run", "dist/index.js"]
