#!/bin/bash
# =============================================================================
# LatinMS v111 (Lidium) — scripts/verify-db.sh
# Verifica el estado e integridad de la base de datos del servidor.
# Solo lectura — no modifica ningun dato.
# =============================================================================
set -euo pipefail

# -----------------------------------------------------------------------------
# Validar variables de entorno
# -----------------------------------------------------------------------------
REQUIRED_VARS=(DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD)
MISSING=()

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR:-}" ]; then
        MISSING+=("$VAR")
    fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
    echo "[ERROR] Faltan variables de entorno: ${MISSING[*]}"
    exit 1
fi

# Helper para ejecutar SQL sin mostrar la contrasena
run_sql() {
    mysql \
        --host="${DB_HOST}" \
        --port="${DB_PORT}" \
        --user="${DB_USER}" \
        --password="${DB_PASSWORD}" \
        --database="${DB_NAME}" \
        --silent \
        --skip-column-names \
        -e "$1" 2>/dev/null
}

run_sql_verbose() {
    mysql \
        --host="${DB_HOST}" \
        --port="${DB_PORT}" \
        --user="${DB_USER}" \
        --password="${DB_PASSWORD}" \
        --database="${DB_NAME}" \
        --table \
        -e "$1" 2>/dev/null
}

echo "========================================================"
echo "  VERIFICACION DE BASE DE DATOS — ${DB_NAME}"
echo "  Host: ${DB_HOST}:${DB_PORT}"
echo "========================================================"
echo ""

# -----------------------------------------------------------------------------
# 1. Conexion basica
# -----------------------------------------------------------------------------
echo "[1/5] Verificando conexion..."
if mysqladmin ping --host="${DB_HOST}" --port="${DB_PORT}" \
    --user="${DB_USER}" --password="${DB_PASSWORD}" --silent 2>/dev/null; then
    echo "  [OK] Conexion exitosa a MySQL."
else
    echo "  [ERROR] No se puede conectar a MySQL en ${DB_HOST}:${DB_PORT}."
    exit 1
fi

# -----------------------------------------------------------------------------
# 2. Procesos activos
# -----------------------------------------------------------------------------
echo ""
echo "[2/5] Procesos activos (FULL PROCESSLIST):"
run_sql_verbose "SHOW FULL PROCESSLIST;" || echo "  (sin permiso para ver processlist)"

# -----------------------------------------------------------------------------
# 3. Transacciones InnoDB activas
# -----------------------------------------------------------------------------
echo ""
echo "[3/5] Transacciones InnoDB activas:"
TRX_COUNT=$(run_sql "SELECT COUNT(*) FROM information_schema.innodb_trx;" 2>/dev/null || echo "0")
echo "  Transacciones activas: ${TRX_COUNT}"
if [ "${TRX_COUNT:-0}" -gt 0 ]; then
    echo "  [WARN] Hay transacciones en curso — no reiniciar el servidor ahora."
    run_sql_verbose "SELECT trx_id, trx_state, trx_started, trx_rows_locked, trx_rows_modified FROM information_schema.innodb_trx;" 2>/dev/null || true
else
    echo "  [OK] Sin transacciones activas."
fi

# -----------------------------------------------------------------------------
# 4. Conteo de registros en tablas principales
#    Las tablas se verifican individualmente; si no existen, se reporta 0.
# -----------------------------------------------------------------------------
echo ""
echo "[4/5] Conteo de registros en tablas principales:"

TABLES=(
    "accounts"
    "characters"
    "inventoryitems"
    "inventoryequipment"
    "skills"
    "queststatus"
    "storages"
    "keymap"
    "buddies"
    "guilds"
    "guildmembers"
    "pets"
)

for TABLE in "${TABLES[@]}"; do
    COUNT=$(run_sql "SELECT COUNT(*) FROM \`${TABLE}\`;" 2>/dev/null || echo "N/A (tabla no existe)")
    printf "  %-25s %s\n" "${TABLE}:" "${COUNT}"
done

# -----------------------------------------------------------------------------
# 5. Variables de estado del servidor MySQL
# -----------------------------------------------------------------------------
echo ""
echo "[5/5] Estado del servidor MySQL:"
run_sql_verbose "SHOW STATUS WHERE Variable_name IN (
    'Uptime',
    'Threads_connected',
    'Threads_running',
    'Questions',
    'Slow_queries',
    'Aborted_connects',
    'Connection_errors_max_connections'
);" 2>/dev/null || echo "  (sin permiso para SHOW STATUS)"

echo ""
echo "========================================================"
echo "  Verificacion completada."
echo "========================================================"
