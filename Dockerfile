# ── BioForma Production Dockerfile ──
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source
COPY . .

# Build (frontend + backend)
RUN npm run build

# ── Production image ──
FROM node:20-alpine AS production

WORKDIR /app

# Copy only what's needed
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

# Expose port
ENV PORT=5000
ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "dist/index.cjs"]
