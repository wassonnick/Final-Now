FROM php:8.4-fpm

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    nginx \
    supervisor \
    libpq-dev \
    libzip-dev \
    && docker-php-ext-install pdo pdo_pgsql zip \
    && docker-php-ext-enable opcache \
    && rm -rf /var/lib/apt/lists/*

RUN { \
    echo "upload_max_filesize=25M"; \
    echo "post_max_size=26M"; \
    echo "memory_limit=256M"; \
    echo "max_execution_time=120"; \
    echo "max_input_time=120"; \
  } > /usr/local/etc/php/conf.d/societyflats-uploads.ini

RUN { \
    echo "opcache.enable=1"; \
    echo "opcache.memory_consumption=64"; \
    echo "opcache.max_accelerated_files=10000"; \
    echo "opcache.validate_timestamps=0"; \
  } > /usr/local/etc/php/conf.d/societyflats-opcache.ini

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY . .

RUN composer install --no-dev --optimize-autoloader

RUN chown -R www-data:www-data /app/storage /app/bootstrap/cache

COPY docker/nginx.conf.template /etc/nginx/conf.d/default.conf.template
RUN rm -f /etc/nginx/sites-enabled/default

COPY docker/supervisord.conf /etc/supervisor/conf.d/societyflats.conf

COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 10000

# Replaces the previous `php artisan serve` setup (Laravel's own docs: dev-only, not for
# production). PHP-FPM + Nginx is the standard production pattern: Nginx serves as the single
# foreground process (so Render's process supervision has something to watch), proxying PHP
# requests to a PHP-FPM pool that reuses an OPcache-warmed process pool instead of re-bootstrapping
# Laravel on every request. opcache.validate_timestamps=0 is safe here because each deploy is a
# fresh container/image build, so there's no risk of stale cached bytecode from a previous deploy.
CMD ["/usr/local/bin/start.sh"]
