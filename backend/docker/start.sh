#!/bin/sh
set -e

php artisan migrate --force

# Serve uploaded/generated media: public/storage -> storage/app/public. Without this
# symlink every Storage::url() link (AI social images, uploads) 404s in production.
php artisan storage:link --force

# nginx config files don't support $PORT substitution natively; sed in the only
# variable we need so nginx's own $uri/$query_string/etc are left untouched.
sed "s/\${PORT}/${PORT:-10000}/g" /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# php-fpm daemonizes into the background; nginx stays foreground as the
# container's PID 1 so Render's process supervision has something to watch.
php-fpm -D

nginx -g 'daemon off;'
