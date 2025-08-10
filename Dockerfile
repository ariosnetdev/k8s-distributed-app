FROM oven/bun:latest

COPY package.json ./
COPY tsconfig.json ./
COPY bun.lock ./

RUN bun install

COPY src ./

CMD ["bun", "run", "./server.tsx"]
