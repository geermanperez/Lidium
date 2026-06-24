# =============================================================================
# LatinMS v111 (Lidium) — Dockerfile
# Java 16 (Azul Zulu) + JAR precompilado
# NO requiere compilacion desde fuente — usa dist/Lidium.jar directamente.
# =============================================================================

FROM eclipse-temurin:17-jre

# -----------------------------------------------------------------------------
# Metadatos
# -----------------------------------------------------------------------------
LABEL maintainer="LatinMS"
LABEL description="MapleStory v111 server emulator (Lidium)"
LABEL java.version="16"

# -----------------------------------------------------------------------------
# Variables de entorno base
# -----------------------------------------------------------------------------
ENV TZ=America/Argentina/Catamarca
ENV JAVA_OPTS="-Xms1G -Xmx2G"
ENV LANG=C.UTF-8
ENV CHANNEL_INTERFACE=0.0.0.0

# -----------------------------------------------------------------------------
# Zona horaria y dependencias del sistema
# -----------------------------------------------------------------------------
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        tzdata \
        default-mysql-client \
        curl \
        netcat-openbsd \
    && ln -snf /usr/share/zoneinfo/${TZ} /etc/localtime \
    && echo "${TZ}" > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# Usuario no root para mayor seguridad
# -----------------------------------------------------------------------------
RUN groupadd --gid 1001 latinms && \
    useradd --uid 1001 --gid latinms --shell /bin/bash --create-home latinms

# -----------------------------------------------------------------------------
# Directorio de trabajo
# -----------------------------------------------------------------------------
WORKDIR /app

# -----------------------------------------------------------------------------
# Copiar dependencias (cambian raramente — aprovechar cache de Docker)
# -----------------------------------------------------------------------------
COPY --chown=latinms:latinms lib/ ./lib/

# -----------------------------------------------------------------------------
# Copiar el JAR principal compilado
# -----------------------------------------------------------------------------
COPY --chown=latinms:latinms dist/Lidium.jar ./dist/Lidium.jar

# -----------------------------------------------------------------------------
# Copiar archivos de configuracion del servidor
# NOTA: db.properties NO se copia — se genera en runtime por entrypoint.sh
# -----------------------------------------------------------------------------
COPY --chown=latinms:latinms channel.properties       ./channel.properties
COPY --chown=latinms:latinms worldGMS.properties      ./worldGMS.properties
COPY --chown=latinms:latinms logging.properties       ./logging.properties
COPY --chown=latinms:latinms CashShopBlackList.ini    ./CashShopBlackList.ini
COPY --chown=latinms:latinms recvopsGMS.properties    ./recvopsGMS.properties
COPY --chown=latinms:latinms sendopsGMS.properties    ./sendopsGMS.properties

# -----------------------------------------------------------------------------
# Copiar scripts de eventos/NPCs/portales (GraalJS)
# Estos scripts son parte del gameplay — deben estar en la imagen.
# -----------------------------------------------------------------------------
COPY --chown=latinms:latinms scripts/ ./scripts/

# -----------------------------------------------------------------------------
# NOTA: Los archivos wz/ NO se copian en la imagen.
# Son ~1GB de datos binarios del cliente MapleStory.
# Se montan como volumen externo en EasyPanel:
#   Host path:      /etc/easypanel/projects/latinmsv111/wz
#   Container path: /app/wz
# Ver EASYPANEL_DEPLOYMENT.md para instrucciones de carga.
# -----------------------------------------------------------------------------
RUN mkdir -p /app/wz && chown latinms:latinms /app/wz

# -----------------------------------------------------------------------------
# Copiar el entrypoint
# -----------------------------------------------------------------------------
COPY --chown=latinms:latinms docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x /app/docker/entrypoint.sh

# -----------------------------------------------------------------------------
# Crear directorio de logs con permisos correctos
# -----------------------------------------------------------------------------
RUN mkdir -p /app/logs && chown -R latinms:latinms /app/logs

# -----------------------------------------------------------------------------
# Cambiar al usuario no root
# -----------------------------------------------------------------------------
USER latinms

# -----------------------------------------------------------------------------
# Puertos expuestos
# TCP — NO son HTTP. Configurar como TCP en EasyPanel.
# -----------------------------------------------------------------------------
EXPOSE 9484
EXPOSE 8585
EXPOSE 9494

# -----------------------------------------------------------------------------
# Entrypoint
# -----------------------------------------------------------------------------
ENTRYPOINT ["/app/docker/entrypoint.sh"]
