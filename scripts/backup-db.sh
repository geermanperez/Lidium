#!/bin/bash
# =============================================================================
# LatinMS v111 (Lidium) — scripts/backup-db.sh
# Realiza un dump de la base de datos y lo comprime con gzip.
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
    echo "[ERROR] Cargar el archivo .env antes de ejecutar este script."
    exit 1
fi

# -----------------------------------------------------------------------------
# Configuracion
# -----------------------------------------------------------------------------
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Iniciando backup de la base de datos '${DB_NAME}'..."
echo "[INFO] Host: ${DB_HOST}:${DB_PORT}"
echo "[INFO] Archivo destino: ${BACKUP_FILE}"

# -----------------------------------------------------------------------------
# Ejecutar mysqldump y comprimir
# --single-transaction: backup consistente sin bloquear tablas InnoDB
# --routines: incluir stored procedures y functions
# --triggers: incluir triggers
# --events: incluir eventos programados
# --set-gtid-purged=OFF: evitar problemas con replicacion
# -----------------------------------------------------------------------------
mysqldump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --user="${DB_USER}" \
    --password="${DB_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --set-gtid-purged=OFF \
    --column-statistics=0 \
    "${DB_NAME}" \
    | gzip -9 > "${BACKUP_FILE}"

# -----------------------------------------------------------------------------
# Verificar que el dump no quedo vacio
# -----------------------------------------------------------------------------
if [ ! -s "${BACKUP_FILE}" ]; then
    echo "[ERROR] El archivo de backup quedo vacio. El dump fallo."
    rm -f "${BACKUP_FILE}"
    exit 1
fi

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "[OK] Backup completado exitosamente."
echo "[OK] Archivo: ${BACKUP_FILE}"
echo "[OK] Tamano: ${BACKUP_SIZE}"

# -----------------------------------------------------------------------------
# Listar backups existentes (para referencia)
# -----------------------------------------------------------------------------
echo ""
echo "[INFO] Backups disponibles en ${BACKUP_DIR}:"
ls -lh "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | tail -10 || echo "  (ninguno encontrado)"
