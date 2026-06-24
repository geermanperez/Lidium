#!/bin/bash
# =============================================================================
# LatinMS v111 (Lidium) — scripts/restore-db.sh
# Restaura un backup de la base de datos desde un archivo .sql.gz
# REQUIERE confirmacion explicita. NO se ejecuta automaticamente al iniciar.
# =============================================================================
set -euo pipefail

# -----------------------------------------------------------------------------
# Proteccion: requiere confirmacion explicita via variable de entorno
# -----------------------------------------------------------------------------
if [ "${ALLOW_RESTORE:-no}" != "yes" ]; then
    echo "[ERROR] Restauracion bloqueada por seguridad."
    echo "[ERROR] Para habilitar, ejecutar con: ALLOW_RESTORE=yes $0 <archivo.sql.gz>"
    echo ""
    echo "        ADVERTENCIA: esto sobreescribira todos los datos actuales de '${DB_NAME:-?}'."
    echo "        Hacer un backup antes con scripts/backup-db.sh"
    exit 1
fi

# -----------------------------------------------------------------------------
# Validar argumento: archivo de backup
# -----------------------------------------------------------------------------
if [ $# -lt 1 ]; then
    echo "[ERROR] Uso: ALLOW_RESTORE=yes $0 <ruta/al/backup.sql.gz>"
    echo ""
    echo "  Ejemplo: ALLOW_RESTORE=yes ./scripts/restore-db.sh backups/backup_v111_20240101_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[ERROR] Archivo no encontrado: ${BACKUP_FILE}"
    exit 1
fi

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
# Mostrar informacion de la operacion y solicitar confirmacion interactiva
# -----------------------------------------------------------------------------
BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)

echo "========================================================"
echo "  RESTAURACION DE BASE DE DATOS"
echo "========================================================"
echo "  Archivo:  ${BACKUP_FILE} (${BACKUP_SIZE})"
echo "  DB:       ${DB_NAME}"
echo "  Host:     ${DB_HOST}:${DB_PORT}"
echo "  Usuario:  ${DB_USER}"
echo ""
echo "  ADVERTENCIA: Se sobreescribiran TODOS los datos actuales."
echo "========================================================"
echo ""

# Confirmacion interactiva solo si hay terminal
if [ -t 0 ]; then
    read -r -p "  Escribir 'RESTAURAR' para confirmar: " CONFIRM
    if [ "${CONFIRM}" != "RESTAURAR" ]; then
        echo "[ABORTADO] Restauracion cancelada por el usuario."
        exit 0
    fi
fi

echo ""
echo "[INFO] Iniciando restauracion..."

# -----------------------------------------------------------------------------
# Descomprimir y restaurar
# -----------------------------------------------------------------------------
gunzip -c "${BACKUP_FILE}" | mysql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --user="${DB_USER}" \
    --password="${DB_PASSWORD}" \
    "${DB_NAME}"

echo ""
echo "[OK] Restauracion completada exitosamente."
echo "[OK] Base de datos '${DB_NAME}' restaurada desde '${BACKUP_FILE}'."
echo ""
echo "[INFO] Verificar integridad con: ./scripts/verify-db.sh"
