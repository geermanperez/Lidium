#!/bin/bash
# =============================================================================
# LatinMS v111 (Lidium) — Docker entrypoint
# =============================================================================
set -euo pipefail

# -----------------------------------------------------------------------------
# 1. Validar variables de entorno obligatorias
# -----------------------------------------------------------------------------
REQUIRED_VARS=(DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD)
MISSING=()

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR:-}" ]; then
        MISSING+=("$VAR")
    fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
    echo "[ERROR] Faltan variables de entorno obligatorias: ${MISSING[*]}"
    echo "[ERROR] Copiar .env.example como .env y completar los valores."
    exit 1
fi

echo "[OK] Variables de entorno validadas."

# -----------------------------------------------------------------------------
# 2. Esperar que MySQL este disponible (hasta 60 intentos, 2s entre cada uno)
# -----------------------------------------------------------------------------
echo "[INFO] Esperando conexion a MySQL en ${DB_HOST}:${DB_PORT}..."

MAX_ATTEMPTS=60
ATTEMPT=0

until mysqladmin ping -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" --password="${DB_PASSWORD}" --silent 2>/dev/null; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
        echo "[ERROR] MySQL no respondio despues de ${MAX_ATTEMPTS} intentos. Abortando."
        exit 1
    fi
    echo "[INFO] Intento ${ATTEMPT}/${MAX_ATTEMPTS} — MySQL aun no disponible, reintentando en 2s..."
    sleep 2
done

echo "[OK] MySQL disponible en ${DB_HOST}:${DB_PORT}."

# -----------------------------------------------------------------------------
# 3. Generar db.properties desde variables de entorno
#    (el archivo original no se incluye en la imagen)
# -----------------------------------------------------------------------------
DB_PROPS_FILE="/app/db.properties"

cat > "${DB_PROPS_FILE}" <<EOF
# Generado automaticamente por docker/entrypoint.sh — NO editar manualmente.
# Modificar las variables de entorno en .env para cambiar la configuracion.
database.driver=com.mysql.cj.jdbc.Driver
database.url=jdbc:mysql://${DB_HOST}:${DB_PORT}/${DB_NAME}?autoReconnect=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
database.user=${DB_USER}
database.password=${DB_PASSWORD}
EOF

echo "[OK] db.properties generado (contrasena no mostrada en logs)."

# -----------------------------------------------------------------------------
# 4. Actualizar channel.properties para aceptar conexiones externas
#    net.sf.odinms.world.host controla donde bindea el LOGIN server.
#    Debe ser 0.0.0.0 en Docker para que docker-proxy pueda alcanzarlo.
#    net.sf.odinms.channel.net.interface controla el bind de los canales.
# -----------------------------------------------------------------------------
CHANNEL_PROPS="/app/channel.properties"
CHANNEL_IFACE="${CHANNEL_INTERFACE:-0.0.0.0}"

if [ -f "${CHANNEL_PROPS}" ]; then
    # Login server bind address (world.host): debe ser 0.0.0.0 en Docker
    sed -i "s|^net\.sf\.odinms\.world\.host=.*|net.sf.odinms.world.host=0.0.0.0|g" "${CHANNEL_PROPS}"
    echo "[OK] channel.properties: net.sf.odinms.world.host=0.0.0.0 (login server bind)"

    # Channel server bind address
    sed -i "s|^net\.sf\.odinms\.channel\.net\.interface=.*|net.sf.odinms.channel.net.interface=${CHANNEL_IFACE}|g" "${CHANNEL_PROPS}"
    echo "[OK] channel.properties: net.sf.odinms.channel.net.interface=${CHANNEL_IFACE}"
else
    echo "[WARN] No se encontro ${CHANNEL_PROPS}. Los canales pueden no ser accesibles externamente."
fi

# -----------------------------------------------------------------------------
# 5. Validar y aplicar la IP publica del servidor.
#    El protocolo v111 redirige con una IPv4 cruda; no acepta nombres DNS.
#    Nunca usar localhost aqui: desde un jugador remoto apunta a su propia PC.
# -----------------------------------------------------------------------------
WORLD_PROPS="/app/worldGMS.properties"
PUBLIC_IP="${SERVER_PUBLIC_IP:-}"

if [ -z "${PUBLIC_IP}" ]; then
    echo "[ERROR] Falta SERVER_PUBLIC_IP. Debe contener la IPv4 publica que usan los clientes."
    exit 1
fi

if ! [[ "${PUBLIC_IP}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    echo "[ERROR] SERVER_PUBLIC_IP debe ser una IPv4, no un dominio: ${PUBLIC_IP}"
    exit 1
fi

IFS='.' read -r -a PUBLIC_IP_OCTETS <<< "${PUBLIC_IP}"
for OCTET in "${PUBLIC_IP_OCTETS[@]}"; do
    if (( 10#${OCTET} > 255 )); then
        echo "[ERROR] SERVER_PUBLIC_IP contiene un octeto invalido: ${PUBLIC_IP}"
        exit 1
    fi
done

if [ -f "${WORLD_PROPS}" ]; then
    sed -i "s|^net\.sf\.odinms\.channel\.net\.interface=.*|net.sf.odinms.channel.net.interface=${PUBLIC_IP}|g" "${WORLD_PROPS}"
    if grep -q '^net\.sf\.odinms\.server\.publicIp=' "${WORLD_PROPS}"; then
        sed -i "s|^net\.sf\.odinms\.server\.publicIp=.*|net.sf.odinms.server.publicIp=${PUBLIC_IP}|g" "${WORLD_PROPS}"
    else
        echo "net.sf.odinms.server.publicIp=${PUBLIC_IP}" >> "${WORLD_PROPS}"
    fi
    echo "[OK] worldGMS.properties: interfaz publica actualizada a ${PUBLIC_IP}"
fi

# -----------------------------------------------------------------------------
# 6. Verificar que el JAR principal existe
# -----------------------------------------------------------------------------
JAR_FILE="/app/dist/Lidium.jar"
if [ ! -f "${JAR_FILE}" ]; then
    echo "[ERROR] No se encontro el JAR principal: ${JAR_FILE}"
    echo "[ERROR] Verificar que dist/Lidium.jar esta presente en el repositorio."
    exit 1
fi

echo "[OK] JAR encontrado: ${JAR_FILE}"

# -----------------------------------------------------------------------------
# 7. Construir classpath y arrancar el servidor con exec
#    Se usa exec para que Java reciba las senales del sistema (SIGTERM, SIGINT)
#    y pueda apagarse limpiamente.
# -----------------------------------------------------------------------------
CLASSPATH=".:${JAR_FILE}:/app/lib/*:/app/lib/graal/*"
JAVA_OPTS_FINAL="${JAVA_OPTS:--Xms1G -Xmx2G}"

echo "[INFO] Iniciando servidor Lidium (MapleStory v111)..."
echo "[INFO] Classpath: ${CLASSPATH}"
echo "[INFO] JVM opts: ${JAVA_OPTS_FINAL}"
echo "[INFO] Base de datos: ${DB_NAME}@${DB_HOST}:${DB_PORT}"

exec java \
    -server \
    ${JAVA_OPTS_FINAL} \
    -Dfile.encoding=UTF-8 \
    -Dlatinms.publicIp="${PUBLIC_IP}" \
    -Dpolyglot.engine.WarnInterpreterOnly=false \
    -Dnet.sf.odinms.wzpath=wz/ \
    -cp "${CLASSPATH}" \
    server.Start
