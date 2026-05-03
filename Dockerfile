FROM node:22-alpine AS build

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
RUN if [ ! -f pnpm-lock.yaml ]; then corepack enable && corepack prepare pnpm@10 --activate && pnpm install; else corepack enable && corepack prepare pnpm@10 --activate && pnpm install --frozen-lockfile; fi

COPY packages/web/package.json packages/web/
COPY packages/web/app packages/web/app
COPY packages/web/vite.config.ts packages/web/
COPY packages/web/tsconfig.json packages/web/
COPY packages/web/vitest.config.ts packages/web/

RUN cd packages/web && pnpm build

FROM node:22-alpine

WORKDIR /app
COPY --from=build /app/package.json /app/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/web/.output ./packages/web/.output

EXPOSE 3000
CMD ["node", "packages/web/.output/server/index.mjs"]
