# iDeveloper Academy API ( + static frontend )
# Works on Back4app Containers / Render / any Docker host.
# The server listens on $PORT (or 3000) and serves /api/* plus the built site.
FROM node:22-alpine

WORKDIR /app

# pnpm version is pinned in package.json (packageManager field)
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 3000
CMD ["node", "dist/index.js"]
