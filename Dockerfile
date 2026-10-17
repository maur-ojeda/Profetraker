# =============================================================================
# Profe Tracker — Production Dockerfile (Coolify / self-hosted)
# =============================================================================
# Builds the Next.js app in standalone mode and produces a slim runtime image.
#
# Build:   docker build -t profe-tracker .
# Run:     docker run -p 3000:3000 \
#            -e NEXT_PUBLIC_SUPABASE_URL=... \
#            -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
#            -e NVIDIA_API_KEY=... \
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

# NEXT_PUBLIC_* vars are baked into the JS bundle at build time.
# Coolify passes them as Docker build args (is_buildtime=true).
# Fallback placeholders keep the build working if no arg is supplied.
ARG NEXT_PUBLIC_SUPABASE_URL=http://placeholder.invalid
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder.anon.key
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Server-side only — injected at runtime, not baked in.
ARG NVIDIA_API_KEY=placeholder_nvidia_key
ARG CRON_SECRET=placeholder_cron_secret
ENV NVIDIA_API_KEY=$NVIDIA_API_KEY
ENV CRON_SECRET=$CRON_SECRET

# Build with standalone output (configured in next.config.ts).
RUN npm run build

# ---------- Stage 3: runner ----------
# Final image: only the files needed at runtime. No devDependencies, no source.
#
# IMPORTANT: Next.js nests the standalone output under a path that mirrors
# the build host's absolute path. On this Mac, the repo lives at:
#   /Users/mauricioojeda/Projects/Profetraker
# so the build emits:
#   .next/standalone/Users/mauricioojeda/Projects/Profetraker/
#
# On a clean CI machine (Coolify), it would just be:
#   .next/standalone/Profetraker/  (or whatever WORKDIR is)
#
# Strategy: keep the nested structure intact (don't move files — that
# breaks relative require()s inside Next's compiled chunks). Instead,
# set WORKDIR to wherever `server.js` actually lives, and reference
# public/ and .next/static/ from the build context with absolute paths.
FROM node:20-alpine AS runner

# We don't know the path depth yet — set it to a stable prefix and then
# symlink the real app into /app/standalone. This is the simplest way to
# keep Next's relative require() graph working.
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Default port; Coolify will override via PORT env var if needed.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as the unprivileged `node` user that ships with the official image.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy the entire standalone tree. The directory containing server.js
# will be at an unpredictable nested path, so we copy as-is.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/ /app/standalone/

# Standalone does NOT copy public/ or .next/static/ automatically.
# We have to bring them in explicitly so assets and PWA icons are served.
# Place them next to server.js so that Next's relative-path lookups work.
COPY --from=builder --chown=nextjs:nodejs /app/public /app/standalone/public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static /app/standalone/.next/static

# Build-time: locate the APP's server.js (not Next's compiled/internal ones).
# The real entrypoint is always named server.js and lives at the top of the
# standalone app dir, NOT inside any node_modules/ subdir. We use `-not -path`
# to skip Next's internal copies.
RUN APP_DIR=$(find /app/standalone -name server.js -type f -not -path "*/node_modules/*" -not -path "*/compiled/*" | head -1 | xargs dirname) \
 && echo "Detected app dir: $APP_DIR" \
 && printf '#!/bin/sh\nset -e\ncd "%s"\nexec node server.js\n' "$APP_DIR" > /app/start.sh \
 && chmod +x /app/start.sh

USER nextjs

EXPOSE 3000

# Use the wrapper script to cd into the right directory before starting.
CMD ["sh", "/app/start.sh"]
