# LatinMS v111 — Lidium Server Emulator

Servidor privado de MapleStory versión 111 basado en el emulador Lidium.
Java 16 + MySQL 8 + Docker.

---

## Requisitos

### Para ejecutar localmente (sin Docker)
- Java 16 (Azul Zulu JDK 16 recomendado)
- MySQL 8.0
- Archivos `wz/` (datos del cliente, no incluidos en el repo)

### Para ejecutar con Docker
- Docker 24+
- Docker Compose v2+
- Archivos `wz/` presentes en la raiz del proyecto

---

## Estructura del proyecto

```
LatinMS-v111/
├── dist/                   # JAR precompilado: Lidium.jar
├── lib/                    # Dependencias Java (mina, mysql-connector, slf4j)
│   └── graal/              # GraalVM JS engine para scripts de eventos
├── src/                    # Codigo fuente Java
├── scripts/                # Scripts JS de eventos, NPCs, portales, quests
├── wz/                     # Datos del cliente MapleStory (.wz) — NO en git
├── docker/
│   └── entrypoint.sh       # Script de inicio del contenedor Docker
├── database/
│   └── init/               # Scripts SQL de schema limpio (sin datos reales)
├── scripts/
│   ├── backup-db.sh        # Backup de la base de datos
│   ├── restore-db.sh       # Restaurar un backup
│   ├── verify-db.sh        # Verificar estado de la DB
│   ├── pre-restart-check.sh   # Checks antes de reiniciar
│   └── post-start-check.sh    # Checks despues de arrancar
├── channel.properties      # Configuracion de canales
├── worldGMS.properties     # Configuracion del mundo (rates, nombre)
├── logging.properties      # Configuracion de logging Java
├── Dockerfile
├── docker-compose.yml
├── docker-compose.local.yml  # Override para desarrollo (expone MySQL)
├── .env.example            # Variables de entorno (copiar como .env)
├── DEPLOYMENT_AUDIT.md     # Auditoria completa del proyecto
└── EASYPANEL_DEPLOYMENT.md # Guia de despliegue en EasyPanel
```

---

## Configuracion inicial

```bash
# 1. Clonar el repositorio
git clone https://github.com/geermanperez/Lidium.git
cd Lidium

# 2. Copiar y completar las variables de entorno
cp .env.example .env
# Editar .env con las contrasenas reales

# 3. Agregar los archivos wz/ (datos del cliente — obtener por separado)
# Los archivos wz son necesarios para que el servidor funcione.
```

---

## Ejecucion local (sin Docker)

```bash
# Requiere Java 16 y MySQL corriendo localmente
# Configurar db.properties con los datos de conexion a la DB local

# Windows:
launch.bat

# Linux/Mac:
export CLASSPATH=".:dist/Lidium.jar:lib/*:lib/graal/*"
java -server \
  -Dfile.encoding=UTF-8 \
  -Dpolyglot.engine.WarnInterpreterOnly=false \
  -Dnet.sf.odinms.wzpath=wz/ \
  -cp "$CLASSPATH" \
  server.Start
```

---

## Ejecucion con Docker

### Produccion (MySQL sin puerto publico)
```bash
# Primera vez: construir imagen y levantar servicios
docker compose up --build -d

# Ver logs en tiempo real
docker compose logs -f latinms-server
docker compose logs -f db

# Detener
docker compose down

# Detener y borrar volumenes (BORRA LA BASE DE DATOS)
docker compose down -v
```

### Desarrollo local (MySQL accesible en puerto 3307)
```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build -d
```

---

## Variables de entorno

Todas las variables se configuran en el archivo `.env` (copiar desde `.env.example`).

| Variable           | Descripcion                              | Default                  |
|--------------------|------------------------------------------|--------------------------|
| `DB_HOST`          | Host de MySQL                            | `db`                     |
| `DB_PORT`          | Puerto de MySQL                          | `3306`                   |
| `DB_NAME`          | Nombre de la base de datos               | `v111`                   |
| `DB_USER`          | Usuario de MySQL                         | `latinms`                |
| `DB_PASSWORD`      | Contrasena de MySQL                      | —                        |
| `MYSQL_ROOT_PASSWORD` | Contrasena root de MySQL              | —                        |
| `JAVA_OPTS`        | Opciones JVM                             | `-Xms1G -Xmx2G`         |
| `TZ`               | Zona horaria                             | `America/Argentina/Catamarca` |
| `CHANNEL_INTERFACE`| Interfaz de red del channel server       | `0.0.0.0`                |
| `SERVER_PUBLIC_IP` | IP publica del servidor (para clientes)  | `127.0.0.1`              |

---

## Puertos

| Servicio       | Puerto | Protocolo | Publico |
|----------------|--------|-----------|---------|
| Login Server   | 9484   | TCP       | SI      |
| Channel Server | 8585   | TCP       | SI      |
| Cash Shop      | 9494   | TCP       | SI      |
| MySQL          | 3306   | TCP       | NO      |

Los puertos del servidor son **TCP binario**, no HTTP. Configurarlos como TCP en firewalls y balanceadores de carga.

---

## Comandos utiles

```bash
# Build de la imagen Docker
docker compose build

# Arrancar en primer plano (ver logs)
docker compose up

# Arrancar en background
docker compose up -d

# Ver logs
docker compose logs -f latinms-server

# Acceder al contenedor del servidor
docker exec -it latinms-server bash

# Acceder a MySQL
docker exec -it latinms-db mysql -u latinms -p v111

# Backup de la base de datos
export $(cat .env | grep -v '^#' | xargs)
./scripts/backup-db.sh

# Restaurar un backup
export $(cat .env | grep -v '^#' | xargs)
ALLOW_RESTORE=yes ./scripts/restore-db.sh backups/backup_v111_FECHA.sql.gz

# Verificar estado de la DB
export $(cat .env | grep -v '^#' | xargs)
./scripts/verify-db.sh

# Checks antes de reiniciar (recomendado)
export $(cat .env | grep -v '^#' | xargs)
./scripts/pre-restart-check.sh

# Checks despues de arrancar
export $(cat .env | grep -v '^#' | xargs)
./scripts/post-start-check.sh

# Reiniciar solo el servidor (mantiene la DB)
docker compose restart latinms-server
```

---

## Despliegue en EasyPanel

Ver `EASYPANEL_DEPLOYMENT.md` para la guia completa paso a paso.

```bash
# Resumen rapido:
# 1. Crear proyecto en EasyPanel
# 2. Crear servicio MySQL (imagen mysql:8.0)
# 3. Crear servicio App desde este repositorio (Dockerfile)
# 4. Configurar variables de entorno desde .env.example
# 5. Publicar puertos 9484, 8585, 9494 como TCP
# 6. Configurar volumen para /var/lib/mysql
```

---

## Advertencias de seguridad

- **NUNCA commitear `.env` ni `db.properties`** — contienen contrasenas
- **NUNCA exponer el puerto MySQL (3306) publicamente** — solo red interna Docker
- Los archivos en `sql/` y `migration/backups/` contienen datos reales de jugadores — NO subirlos a GitHub
- Los archivos `wz/` son grandes y binarios — no van en git (usar volumen o storage externo)
- Rotar contrasenas regularmente y usar valores diferentes en cada entorno
- Hacer backup de la base de datos antes de cada actualizacion o reinicio importante

---

## Auditoria y documentacion tecnica

- `DEPLOYMENT_AUDIT.md` — Auditoria completa: build system, Java version, configs, puertos, riesgos
- `EASYPANEL_DEPLOYMENT.md` — Guia paso a paso para desplegar en EasyPanel

---

## Creditos

Basado en [Lidium](https://github.com/sexdeeza/Lidium) — MapleStory v111 server emulator.
Java 16 recomendado. Motor de scripts: GraalVM JS 21.2.0.
