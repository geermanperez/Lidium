# =============================================================================
# LatinMS v111 (Lidium) — Dockerfile con compilación desde fuente
# Compila el código Java con Maven y luego ejecuta en JRE
# =============================================================================

# Stage 1: Compilación
FROM maven:3.8-openjdk-16 AS builder

WORKDIR /build
COPY . .

# Compila el proyecto
RUN mvn clean compile package -DskipTests -q

# Stage 2: Ejecución
FROM eclipse-temurin:17-jre

LABEL maintainer="LatinMS"
LABEL description="MapleStory v111 server emulator (Lidium)"

ENV TZ=America/Argentina/Catamarca
ENV JAVA_OPTS="-Xms1G -Xmx2G"
ENV LANG=C.UTF-8

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        tzdata \
        default-mysql-client \
        curl \
        netcat-openbsd \
    && ln -snf /usr/share/zoneinfo/${TZ} /etc/localtime \
    && echo "${TZ}" > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1001 latinms && \
    useradd --uid 1001 --gid latinms --shell /bin/bash --create-home latinms

WORKDIR /app

# Copiar JAR compilado desde Stage 1
COPY --from=builder --chown=latinms:latinms /build/target/Lidium.jar ./Lidium.jar

# Copiar dependencias y configuración
COPY --chown=latinms:latinms lib/ ./lib/
COPY --chown=latinms:latinms channel.properties ./channel.properties
COPY --chown=latinms:latinms worldGMS.properties ./worldGMS.properties
COPY --chown=latinms:latinms logging.properties ./logging.properties
COPY --chown=latinms:latinms CashShopBlackList.ini ./CashShopBlackList.ini
COPY --chown=latinms:latinms recvopsGMS.properties ./recvopsGMS.properties
COPY --chown=latinms:latinms sendopsGMS.properties ./sendopsGMS.properties
COPY --chown=latinms:latinms scripts/ ./scripts/
COPY --chown=latinms:latinms sql/migrations/ ./sql/migrations/
COPY --chown=latinms:latinms docker/entrypoint.sh ./docker/entrypoint.sh

RUN mkdir -p /app/wz /app/logs && \
    touch /app/db.properties && \
    chmod +x /app/docker/entrypoint.sh && \
    chown -R latinms:latinms /app

USER latinms

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["java", "-jar", "Lidium.jar"]
