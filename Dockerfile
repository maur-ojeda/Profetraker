# =============================================================================
# Profe Tracker — Production Dockerfile (Coolify / self-hosted)
# =============================================================================
# Builds the Next.js app in standalone mode and produces a slim runtime image.
#
# Build:   docker build -t profe-tracker .
# Run:     docker run -p 3000:3000 \
#            -e NEXT_PUBLIC_SUPABASE_URL=... \
#            -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
#            -e GEMINI_API_KEY=... \
#            profe-tracker
# =============================================================================

# ---------- Stage 1: deps ----------
# Installs ALL dependencies (including devDependencies) so that `next build`
# has access to TypeScript, ESLint, PostCSS, etc.
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
# `npm ci` is the reproducible, lockfile-driven install.
# We deliberately skip `--production` here because the next stage needs devDeps
# to compile TypeScript and run ESLint during the build.
RUN npm ci

# ---------- Stage 2: builder ----------
# Produces the standalone output under .next/standalone/.
FROM node:20-alpine AS builder
WORKDIR /app

# Reuse the installed node_modules from the deps stage.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects anonymous telemetry; disable it during container builds.
ENV NEXT_TELEMETRY_DISABLED=1

# Build with standalone output (configured in next.config.ts).
RUN npm run build

# ---------- Stage 3: runner ----------
# Final image: only the files needed at runtime. No devDependencies, no source.
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Default port; Coolify will override via PORT env var if needed.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as the unprivileged `node` user that ships with the official image.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy the standalone server bundle. This includes:
#   - server.js (entrypoint)
#   - node_modules/ (minimal subset traced by Next)
#   - .next/  (server chunks, manifests, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Standalone does NOT copy public/ or .next/static/ automatically.
# We have to bring them in explicitly so assets and PWA icons are served.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Standalone exposes a single `server.js` entrypoint.
CMD ["node", "server.js"]
