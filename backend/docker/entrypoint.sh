#!/bin/sh
set -e

# Render tells the container which port to listen on.
PORT="${PORT:-10000}"
sed -ri "s/Listen [0-9]+/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

if [ -z "$APP_KEY" ]; then
  echo "ERROR: APP_KEY is not set. Add it in the Render dashboard (Environment tab)." >&2
  exit 1
fi

php artisan package:discover --ansi
php artisan config:cache
php artisan route:cache

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  php artisan migrate --force
fi

if [ "${RUN_SEEDER:-false}" = "true" ]; then
  php artisan db:seed --class=RoleUserSeeder --force
fi

chown -R www-data:www-data storage bootstrap/cache

exec apache2-foreground
