#!/bin/sh
echo "Running database migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration skipped"
echo "Starting Next.js server..."
exec npx next start -p ${PORT:-3000} -H ${HOSTNAME:-0.0.0.0}
