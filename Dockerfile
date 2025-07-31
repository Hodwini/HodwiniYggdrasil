# --- Сборка ---
FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lockb tsconfig.json bunfig.toml import_map.json ./

RUN bun install --frozen-lockfile

COPY src ./src

ENV NODE_ENV=production

RUN bun build ./src/index.ts \
    --compile \
    --minify \
    --outfile /app/server \
    --target bun

FROM gcr.io/distroless/base-debian12

WORKDIR /app

COPY --from=build /app/server /app/server

ENV NODE_ENV=production

EXPOSE 3000

CMD ["/app/server"]