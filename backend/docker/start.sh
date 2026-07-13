#!/bin/sh
set -e

php artisan migrate --force

# Serve uploaded/generated media: public/storage -> storage/app/public. Without this
# symlink every Storage::url() link (AI social images, uploads) 404s in production.
php artisan storage:link --force

# nginx config files don't support $PORT substitution natively; sed in the only
# variable we need so nginx's own $uri/$query_string/etc are left untouched.
sed "s/\${PORT}/${PORT:-10000}/g" /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Hand the container off to supervisord, which runs php-fpm + nginx AND the two long-running
# Laravel processes that drive all automation — the scheduler (schedule:work) and the queue
# worker (queue:work) — each supervised and auto-restarted. This replaces the old fragile
# backgrounded subshell that had no restart or visibility (when it stopped, so did every
# scheduled/queued job — the root cause of "automation only works from the shell").
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/societyflats.conf -n
