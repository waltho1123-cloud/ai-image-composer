#!/bin/sh
echo "Running database migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration warning (may be OK on first run)"
echo "Starting Next.js server..."
exec node server.js
