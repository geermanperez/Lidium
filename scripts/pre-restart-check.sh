#!/bin/bash
# =============================================================================
# LatinMS v111 (Lidium) — scripts/pre-restart-check.sh
# Verificaciones de seguridad ANTES de reiniciar el servidor.
# NO detiene ni reinicia el servidor. Solo informa y aborta si hay riesgo critico.
# =============================================================================
set -euo pipefail

ERRORS=0
WARNINGS=0

# Helper para ejecutar SQL
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

echo "========================================================"
echo "  PRE-RESTART CHECK — LatinMS v111"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================"
echo ""

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

# -----------------------------------------------------------------------------
# 1. Verificar conexion a MySQL
# -----------------------------------------------------------------------------
echo "[1/5] Verificando conexion a MySQL..."
if mysqladmin ping --host="${DB_HOST}" --port="${DB_PORT}" \
    --user="${DB_USER}" --password="${DB_PASSWORD}" --silent 2>/dev/null; then
    echo "  [OK] MySQL accesible en ${DB_HOST}:${DB_PORT}."
else
    echo "  [CRITICO] No se puede conectar a MySQL. Abortando."
    echo "  El servidor no arrancara si la DB no esta disponible."
    exit 1
fi

# -----------------------------------------------------------------------------
# 2. Verificar transacciones activas
# -----------------------------------------------------------------------------
echo ""
echo "[2/5] Verificando transacciones activas en InnoDB..."
TRX_COUNT=$(run_sql "SELECT COUNT(*) FROM information_schema.innodb_trx;" 2>/dev/null || echo "0")

if [ "${TRX_COUNT:-0}" -gt 0 ]; then
    echo "  [WARN] Hay ${TRX_COUNT} transacciones activas en InnoDB."
    echo "  Reiniciar ahora puede dejar datos en estado inconsistente."
    echo "  Esperar a que finalicen o solicitar confirmacion manual."
    WARNINGS=$((WARNINGS + 1))
else
    echo "  [OK] Sin transacciones activas."
fi

# -----------------------------------------------------------------------------
# 3. Detectar jugadores online (cuentas con loggedin != 0)
# -----------------------------------------------------------------------------
echo ""
echo "[3/5] Detectando jugadores conectados..."
ONLINE_COUNT=$(run_sql "SELECT COUNT(*) FROM accounts WHERE loggedin != 0;" 2>/dev/null || echo "N/A")

if [ "${ONLINE_COUNT}" = "N/A" ]; then
    echo "  [WARN] No se pudo consultar la tabla accounts."
    WARNINGS=$((WARNINGS + 1))
elif [ "${ONLINE_COUNT}" -gt 0 ]; then
    echo "  [WARN] Hay ${ONLINE_COUNT} cuenta(s) marcada(s) como conectada(s) (loggedin != 0)."
    echo "  Esto puede indicar jugadores activos o sesiones no cerradas del arranque anterior."
    echo "  Al reiniciar, el servidor resetea loggedin=0 en el arranque (comportamiento normal)."
    WARNINGS=$((WARNINGS + 1))
else
    echo "  [OK] Sin jugadores con sesion activa (loggedin=0 en todas las cuentas)."
fi

# -----------------------------------------------------------------------------
# 4. Realizar backup antes del reinicio
# -----------------------------------------------------------------------------
echo ""
echo "[4/5] Realizando backup preventivo de la base de datos..."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/pre-restart_${DB_NAME}_${TIMESTAMP}.sql.gz"
mkdir -p "${BACKUP_DIR}"

if mysqldump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --user="${DB_USER}" \
    --password="${DB_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --set-gtid-purged=OFF \
    --column-statistics=0 \
    "${DB_NAME}" \
    | gzip -9 > "${BACKUP_FILE}" 2>/dev/null && [ -s "${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
    echo "  [OK] Backup creado: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    echo "  [WARN] No se pudo crear el backup automatico."
    echo "  Continuar con precaucion o crear el backup manualmente con:"
    echo "  ./scripts/backup-db.sh"
    WARNINGS=$((WARNINGS + 1))
fi

# -----------------------------------------------------------------------------
# 5. Resumen y decision final
# -----------------------------------------------------------------------------
echo ""
echo "[5/5] Resumen:"
echo "  Errores criticos: ${ERRORS}"
echo "  Advertencias:     ${WARNINGS}"
echo ""

if [ "${ERRORS}" -gt 0 ]; then
    echo "  [ABORTADO] Se detectaron errores criticos. NO reiniciar el servidor."
    echo "  Revisar los mensajes anteriores y resolver antes de continuar."
    exit 1
elif [ "${WARNINGS}" -gt 0 ]; then
    echo "  [PRECAUCION] Hay ${WARNINGS} advertencia(s). Reinicio es posible pero revisar."
    echo "  El servidor puede reiniciarse si se acepta el riesgo."
    exit 0
else
    echo "  [OK] Sin problemas detectados. El servidor puede reiniciarse con seguridad."
    exit 0
fi
