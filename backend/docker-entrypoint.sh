#!/bin/sh
set -e

# Wait for database to be ready
echo "Waiting for database..."
sleep 5

# Run migrations
echo "Running migrations..."
php artisan migrate --force || true

# Seed database if empty
echo "Seeding database..."
php artisan db:seed --force || true

# Cache config
echo "Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Execute the main command
exec "$@"
