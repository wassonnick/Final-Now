#!/bin/sh
set -e

php artisan migrate --force

# Serve uploaded/generated media: public/storage -> storage/app/public. Without this
# symlink every Storage::url() link (AI social images, uploads) 404s in production.
php artisan storage:link --force

# nginx config files don't support $PORT substitution natively; sed in the only
# variable we need so nginx's own $uri/$query_string/etc are left untouched.
sed "s/\${PORT}/${PORT:-10000}/g" /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Run the Laravel scheduler inside this container: there is no separate worker service on
# Render, so this loop is what drives ALL scheduled automation (SEO autopilot, social
# autopilot, market refresh, import ticks, queue processing). schedule:run fires whatever is
# due, once a minute; withoutOverlapping mutexes live in the database cache, so restarts and
# concurrent instances stay safe.
(
    sleep 15
    while true; do
        php artisan schedule:run --no-interaction >> storage/logs/scheduler.log 2>&1 || true
        sleep 60
    done
) &

# php-fpm daemonizes into the background; nginx stays foreground as the
# container's PID 1 so Render's process supervision has something to watch.
php-fpm -D

nginx -g 'daemon off;'
