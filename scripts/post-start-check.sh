#!/bin/bash
# =============================================================================
# LatinMS v111 (Lidium) — scripts/post-start-check.sh
# Verificaciones DESPUES de iniciar el servidor.
# Solo lectura — NO altera datos ni reinicia servicios.
# =============================================================================
set -euo pipefail

ERRORS=0
WARNINGS=0

echo "========================================================"
echo "  POST-START CHECK — LatinMS v111"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================"
echo ""

# Helper para ejecutar SQL
run_sql() {
    mysql \
        --host="${DB_HOST:-db}" \
        --port="${DB_PORT:-3306}" \
        --user="${DB_USER:-latinms}" \
        --password="${DB_PASSWORD}" \
        --database="${DB_NAME:-v111}" \
        --silent \
        --skip-column-names \
        -e "$1" 2>/dev/null
}

# -----------------------------------------------------------------------------
# 1. Verificar MySQL accesible
# -----------------------------------------------------------------------------
echo "[1/4] Verificando MySQL..."
if mysqladmin ping \
    --host="${DB_HOST:-db}" \
    --port="${DB_PORT:-3306}" \
    --user="${DB_USER:-latinms}" \
    --password="${DB_PASSWORD:-}" \
    --silent 2>/dev/null; then
    echo "  [OK] MySQL accesible en ${DB_HOST:-db}:${DB_PORT:-3306}."
else
    echo "  [ERROR] MySQL NO responde."
    ERRORS=$((ERRORS + 1))
fi

# -----------------------------------------------------------------------------
# 2. Verificar que el proceso Java esta activo
# -----------------------------------------------------------------------------
echo ""
echo "[2/4] Verificando proceso Java..."
JAVA_PID=$(pgrep -f "server.Start" 2>/dev/null || echo "")

if [ -n "${JAVA_PID}" ]; then
    echo "  [OK] Proceso Java activo (PID: ${JAVA_PID})."
    # Mostrar uso de memoria si disponible
    MEM=$(ps -o rss= -p "${JAVA_PID}" 2>/dev/null || echo "")
    if [ -n "${MEM}" ]; then
        MEM_MB=$((MEM / 1024))
        echo "  [INFO] Memoria RSS: ${MEM_MB} MB"
    fi
else
    echo "  [ERROR] No se encontro proceso Java con server.Start."
    echo "  El servidor puede no haber arrancado correctamente."
    echo "  Revisar logs con: docker compose logs latinms-server"
    ERRORS=$((ERRORS + 1))
fi

# -----------------------------------------------------------------------------
# 3. Verificar puertos TCP abiertos
# -----------------------------------------------------------------------------
echo ""
echo "[3/4] Verificando puertos TCP del servidor..."

check_port() {
    local PORT="$1"
    local NAME="$2"
    local HOST="${3:-localhost}"

    if nc -z -w3 "${HOST}" "${PORT}" 2>/dev/null; then
        echo "  [OK] Puerto ${PORT} (${NAME}): ABIERTO"
        return 0
    else
        echo "  [ERROR] Puerto ${PORT} (${NAME}): CERRADO o NO RESPONDE"
        return 1
    fi
}

CHECK_HOST="${SERVER_CHECK_HOST:-localhost}"

check_port 9484 "Login Server"  "${CHECK_HOST}" || ERRORS=$((ERRORS + 1))
check_port 8585 "Channel Server" "${CHECK_HOST}" || ERRORS=$((ERRORS + 1))
check_port 9494 "Cash Shop"     "${CHECK_HOST}" || ERRORS=$((ERRORS + 1))

# -----------------------------------------------------------------------------
# 4. Estado de la base de datos post-arranque
# -----------------------------------------------------------------------------
echo ""
echo "[4/4] Estado de la base de datos post-arranque..."

# El servidor resetea loggedin=0 en el arranque; verificar que ocurrio
LOGGEDIN_COUNT=$(run_sql "SELECT COUNT(*) FROM accounts WHERE loggedin != 0;" 2>/dev/null || echo "N/A")

if [ "${LOGGEDIN_COUNT}" = "N/A" ]; then
    echo "  [WARN] No se pudo verificar el estado de cuentas."
    WARNINGS=$((WARNINGS + 1))
elif [ "${LOGGEDIN_COUNT}" -gt 0 ]; then
    echo "  [WARN] Hay ${LOGGEDIN_COUNT} cuenta(s) con loggedin != 0 tras el arranque."
    echo "  Puede indicar un arranque incompleto o falla en el reset de sesiones."
    WARNINGS=$((WARNINGS + 1))
else
    echo "  [OK] Todas las cuentas tienen loggedin=0 (reset de sesiones correcto)."
fi

# Verificar tablas criticas accesibles
for TABLE in accounts characters guilds; do
    COUNT=$(run_sql "SELECT COUNT(*) FROM \`${TABLE}\`;" 2>/dev/null || echo "ERROR")
    if [ "${COUNT}" = "ERROR" ]; then
        echo "  [WARN] Tabla '${TABLE}' no accesible."
        WARNINGS=$((WARNINGS + 1))
    else
        echo "  [OK] Tabla '${TABLE}': ${COUNT} registros."
    fi
done

# -----------------------------------------------------------------------------
# Resumen final
# -----------------------------------------------------------------------------
echo ""
echo "========================================================"
echo "  RESULTADO:"

if [ "${ERRORS}" -gt 0 ]; then
    echo "  [FALLO] ${ERRORS} error(es) critico(s) detectado(s)."
    echo "  El servidor puede no estar funcionando correctamente."
    echo "  Revisar logs: docker compose logs -f latinms-server"
    echo "========================================================"
    exit 1
elif [ "${WARNINGS}" -gt 0 ]; then
    echo "  [PRECAUCION] ${WARNINGS} advertencia(s). Servidor aparentemente activo."
    echo "========================================================"
    exit 0
else
    echo "  [OK] Todos los checks pasaron. Servidor funcionando correctamente."
    echo "========================================================"
    exit 0
fi
