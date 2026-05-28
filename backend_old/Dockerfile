FROM php:8.3-fpm-alpine

# Install dependencies
RUN apk add --no-cache     postgresql-dev     libzip-dev     zip     unzip     git     curl     nginx

# Install PHP extensions
RUN docker-php-ext-install     pdo_pgsql     pgsql     zip     bcmath     opcache

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy composer files
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader

# Copy application
COPY . .

# Set permissions
RUN chown -R www-data:www-data /var/www/html     && chmod -R 755 /var/www/html/storage

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
