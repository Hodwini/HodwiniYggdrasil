FROM oven/bun:1 AS build

WORKDIR /app
COPY package.json bun.lock tsconfig.json bunfig.toml import_map.json ./ 
RUN bun install --frozen-lockfile

COPY src ./src
ENV NODE_ENV=production
RUN bun build src/index.ts --outdir ./dist --target bun --minify

FROM oven/bun:1
WORKDIR /app
COPY --from=build /app/dist /app/dist
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
