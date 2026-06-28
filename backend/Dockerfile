FROM php:8.4-cli

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpq-dev \
    libzip-dev \
    && docker-php-ext-install pdo pdo_pgsql zip

RUN { \
    echo "upload_max_filesize=25M"; \
    echo "post_max_size=26M"; \
    echo "memory_limit=256M"; \
    echo "max_execution_time=120"; \
    echo "max_input_time=120"; \
  } > /usr/local/etc/php/conf.d/societyflats-uploads.ini

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY . .

RUN composer install --no-dev --optimize-autoloader

EXPOSE 10000

# The built-in server is single-process by default, so concurrent requests (e.g. the admin
# dashboard firing several API calls at once) queue and appear to "hang". Forking workers lets
# it serve requests in parallel. PHP_CLI_SERVER_WORKERS is silently ignored unless --no-reload
# is also passed (confirmed via Render logs: "Unable to respect... Only creating a single
# server."), so --no-reload is required here for the worker count to actually take effect.
# Bumped 4 -> 8: on the 0.5 CPU / 512MB Starter instance, 4 workers was exhausted easily by a
# few concurrent tabs/admin widgets, queuing the 5th+ request behind any slow one (Google
# Places/Gemini/Claude calls). 8 roughly doubles concurrency; kept conservative since each
# worker is a separate process and 512MB total RAM is tight. NOTE: artisan serve is still not a
# real production server (Laravel's own docs say dev-only) -- this is a mitigation, not a fix.
# A proper fix means PHP-FPM+Nginx or Laravel Octane (FrankenPHP/Swoole).
ENV PHP_CLI_SERVER_WORKERS=8

CMD ["sh", "-c", "php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=${PORT:-10000} --no-reload"]
