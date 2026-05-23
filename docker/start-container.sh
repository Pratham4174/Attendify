#!/usr/bin/env bash
set -euo pipefail

export PORT="${PORT:-10000}"
export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-prod}"

export MYSQL_DATA_DIR="${MYSQL_DATA_DIR:-/var/lib/mysql}"
export MYSQL_DATABASE="${MYSQL_DATABASE:-${DB_NAME:-attendance_system}}"
export MYSQL_USER="${MYSQL_USER:-${DB_USERNAME:-attendance}}"
export MYSQL_PASSWORD="${MYSQL_PASSWORD:-${DB_PASSWORD:-attendance_password}}"
export MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-${MARIADB_ROOT_PASSWORD:-root_password}}"
export MYSQL_PORT="${MYSQL_PORT:-${DB_PORT:-3306}}"
export MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
export SOCKET_PATH="/run/mysqld/mysqld.sock"

mkdir -p "${MYSQL_DATA_DIR}" /run/mysqld /var/log/mysql
chown -R mysql:mysql "${MYSQL_DATA_DIR}" /run/mysqld /var/log/mysql

if [ ! -d "${MYSQL_DATA_DIR}/mysql" ]; then
  mariadb-install-db \
    --user=mysql \
    --datadir="${MYSQL_DATA_DIR}" \
    --auth-root-authentication-method=normal
fi

mariadbd \
  --user=mysql \
  --datadir="${MYSQL_DATA_DIR}" \
  --bind-address=127.0.0.1 \
  --port="${MYSQL_PORT}" \
  --socket="${SOCKET_PATH}" \
  --pid-file=/run/mysqld/mysqld.pid \
  --log-error=/var/log/mysql/error.log &
MYSQL_PID=$!

echo "Waiting for MariaDB..."
for _ in $(seq 1 60); do
  if mariadb-admin ping --host=127.0.0.1 --port="${MYSQL_PORT}" --silent >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

run_mysql() {
  if mariadb --protocol=socket --socket="${SOCKET_PATH}" -e "SELECT 1;" >/dev/null 2>&1; then
    mariadb --protocol=socket --socket="${SOCKET_PATH}" "$@"
    return 0
  fi

  mariadb --protocol=socket --socket="${SOCKET_PATH}" -uroot -p"${MYSQL_ROOT_PASSWORD}" "$@"
}

run_mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\`;
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'127.0.0.1' IDENTIFIED BY '${MYSQL_PASSWORD}';
ALTER USER '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
ALTER USER '${MYSQL_USER}'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';
ALTER USER '${MYSQL_USER}'@'127.0.0.1' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'127.0.0.1';
ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';
FLUSH PRIVILEGES;
SQL

export SPRING_DATASOURCE_URL="${SPRING_DATASOURCE_URL:-jdbc:mariadb://${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}}"
export SPRING_DATASOURCE_USERNAME="${SPRING_DATASOURCE_USERNAME:-${MYSQL_USER}}"
export SPRING_DATASOURCE_PASSWORD="${SPRING_DATASOURCE_PASSWORD:-${MYSQL_PASSWORD}}"
export SPRING_DATASOURCE_DRIVER_CLASS_NAME="${SPRING_DATASOURCE_DRIVER_CLASS_NAME:-org.mariadb.jdbc.Driver}"

cleanup() {
  kill -TERM "${APP_PID:-0}" "${MYSQL_PID:-0}" 2>/dev/null || true
}

trap cleanup SIGTERM SIGINT

java ${JAVA_OPTS:-} -jar /opt/app/app.jar --server.port="${PORT}" &
APP_PID=$!

wait -n "${APP_PID}" "${MYSQL_PID}"
exit $?
