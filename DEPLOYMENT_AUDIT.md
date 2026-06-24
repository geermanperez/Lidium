# DEPLOYMENT AUDIT — LatinMS v111 (Lidium)
Generado: 2026-06-24

---

## 1. Estructura general del proyecto

```
LatinMS-v111/
├── dist/               # JAR precompilado principal: Lidium.jar
├── lib/                # Dependencias runtime (mina, mysql-connector, slf4j)
│   └── graal/          # GraalVM JS engine (js-21.2.0.jar, truffle-api, icu4j, regex, graal-sdk)
├── src/                # Código fuente Java (NO necesario en producción si hay JAR)
├── scripts/            # Scripts de eventos/NPCs/portales en JavaScript (GraalJS)
│   ├── event/
│   ├── npc/
│   ├── portal/
│   ├── quest/
│   └── reactor/
├── wz/                 # Archivos de datos del cliente MapleStory (.wz)
│   └── *.wz (Base, Character, Effect, Etc, Item, List, Map, Mob, ...)
├── wz.zip              # Archivo zip de los datos wz (NO incluir en Docker imagen)
├── sql/                # Dumps SQL — CONTIENEN DATOS REALES (ver sección 8)
├── migration/          # Dumps y scripts de migración — DATOS REALES
├── build/              # Artefactos de compilación temporal, logs
├── maple-api/          # API Node.js separada — IGNORAR en despliegue del server
├── maple-web/          # Frontend React/Vite — IGNORAR en despliegue del server
├── launch.bat          # Script de inicio Windows
├── db.properties       # Configuración DB — ARCHIVO SENSIBLE
├── channel.properties  # Config canales y eventos
├── worldGMS.properties # Config del mundo (rates, nombre, límites)
├── logging.properties  # Config de logging Java
├── CashShopBlackList.ini
├── recvopsGMS.properties
├── sendopsGMS.properties
└── LogIPs.txt
```

---

## 2. Sistema de compilación

**Tipo:** JAR precompilado (NO Maven, NO Gradle, NO Ant)

El proyecto incluye código fuente en `src/` pero el artefacto de producción es `dist/Lidium.jar` (1.7 MB), ya compilado. No hay `pom.xml`, `build.gradle` ni `build.xml` en la raíz.

La carpeta `build/` contiene utilidades de diagnóstico y archivos de compilación ad-hoc (TestDatabase.java, TestGraalJS.java, etc.), no un sistema de build estándar.

**Conclusión para Docker:** se usa el JAR precompilado directamente. No se necesita compilar desde fuente en el contenedor.

---

## 3. Versión de Java

**Requerida: Java 16**

- El README indica explícitamente: "It is highly recommended that you use Java 16 for this project."
- `launch.bat` apunta a `C:\Program Files\Zulu\zulu-16` (Azul Zulu JDK 16)
- Las dependencias GraalVM son versión 21.2.0, compatible con JDK 16
- El motor de scripts usa GraalJS 21.2.0 con `polyglot.engine.WarnInterpreterOnly=false`

**Imagen Docker recomendada:** `eclipse-temurin:16-jre` o `azul/zulu-openjdk:16`

---

## 4. Clase principal y comando de inicio

**Clase principal:** `server.Start`

**Comando original (Windows):**
```bat
set "CLASSPATH=.;dist\Lidium.jar;lib\*;lib\graal\*"
java -server -Dfile.encoding=UTF-8 -Dpolyglot.engine.WarnInterpreterOnly=false \
     -Dnet.sf.odinms.wzpath=wz\ -cp "%CLASSPATH%" server.Start
```

**Comando equivalente Linux (Docker):**
```bash
java -server \
  -Dfile.encoding=UTF-8 \
  -Dpolyglot.engine.WarnInterpreterOnly=false \
  -Dnet.sf.odinms.wzpath=wz/ \
  -cp ".:dist/Lidium.jar:lib/*:lib/graal/*" \
  server.Start
```

**Nota crítica:** El servidor NO usa `-jar`. Usa `-cp` (classpath) con clase principal explícita porque necesita cargar múltiples JARs de lib/ y lib/graal/ simultáneamente.

---

## 5. Configuraciones relevantes

### db.properties (SENSIBLE — ver sección 8)
```
database.driver=com.mysql.cj.jdbc.Driver
database.url=jdbc:mysql://[HOST]:[PORT]/[DB]?autoReconnect=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
database.user=[REDACTED]
database.password=[REDACTED]
```
Este archivo es generado por `docker/entrypoint.sh` en runtime desde variables de entorno. No se incluye en la imagen Docker ni en el repositorio.

### channel.properties
- `net.sf.odinms.world.host=127.0.0.1` → **DEBE CAMBIARSE** a `0.0.0.0` o IP pública en Docker
- `net.sf.odinms.channel.count=6` (6 canales activos, claves release1..release6)
- `net.sf.odinms.channel.net.port1=8585` (puerto del channel server)
- `net.sf.odinms.channel.net.interface=127.0.0.1` → **DEBE CAMBIARSE** a `0.0.0.0` en Docker

### worldGMS.properties
- Rates: EXP x2, Meso x2, Drop x2
- Nombre del servidor: `Lidium`
- Límite de usuarios: 600
- Admin only: false
- Puerto channel: 8585

---

## 6. Puertos

| Servicio       | Puerto | Protocolo | Config fuente              |
|----------------|--------|-----------|----------------------------|
| Login Server   | 9484   | TCP       | Hardcoded en LoginServer   |
| Channel Server | 8585   | TCP       | channel.properties         |
| Cash Shop      | 9494   | TCP       | Hardcoded en CashShopServer|
| MySQL (interno)| 3306   | TCP       | db.properties (solo interno)|

---

## 7. Dependencias runtime

### JARs en lib/
- `mina-core-1.1.7.jar` — Apache MINA (networking)
- `mysql-connector-java-8.0.25.jar` — Driver MySQL
- `slf4j-api-1.7.21.jar` + `slf4j-jdk14-1.7.5.jar` — Logging

### JARs en lib/graal/
- `graal-sdk-21.2.0.jar`
- `js-21.2.0.jar` — Motor JavaScript GraalJS
- `js-scriptengine-21.2.0.jar`
- `truffle-api-21.2.0.jar`
- `icu4j-69.1.jar`
- `regex-21.2.0.jar`

### Archivos de datos en runtime (OBLIGATORIOS)
- `wz/` — Directorio completo con todos los archivos .wz del cliente
- `scripts/` — Scripts JS de eventos, NPCs, portales, quests, reactores
- `channel.properties`
- `worldGMS.properties`
- `logging.properties`
- `CashShopBlackList.ini`
- `recvopsGMS.properties`
- `sendopsGMS.properties`
- `db.properties` (generado en runtime desde env vars)

---

## 8. Archivos sensibles detectados

| Archivo | Contenido sensible | Estado en git | Acción requerida |
|---|---|---|---|
| `db.properties` | Contraseña DB: [REDACTED] | **RASTREADO** | `git rm --cached db.properties` |
| `db.properties.backup-original` | Contraseña DB antigua: [REDACTED] | **RASTREADO** | `git rm --cached db.properties.backup-original` |
| `db.properties.backup-test` | Contraseña DB test: [REDACTED] | **RASTREADO** | `git rm --cached db.properties.backup-test` |
| `maple-web/.env` | URL de API (VITE_API_URL) | **RASTREADO** | `git rm --cached maple-web/.env` |
| `sql/lidium.sql` | Dump completo con datos reales de cuentas | **RASTREADO** | `git rm --cached sql/lidium.sql` |
| `sql/lidium-fixed.sql` | Dump completo con datos reales de cuentas | **RASTREADO** | `git rm --cached sql/lidium-fixed.sql` |
| `migration/backups/v111-antes-migracion.sql` | Backup con datos reales | **RASTREADO** | `git rm --cached migration/backups/v111-antes-migracion.sql` |
| `migration/backups/v111-antes-migracion-seguro.sql` | Backup con datos | **RASTREADO** | `git rm --cached "migration/backups/v111-antes-migracion-seguro.sql"` |
| `migration/source/cosmic-v82-20260623-201352.sql` | Dump de base fuente | **RASTREADO** | `git rm --cached` |
| `migration/source/cosmic-v82-20260623-201352-mariadb.sql` | Dump de base fuente | **RASTREADO** | `git rm --cached` |
| `migration/source/cosmic-v82-20260623-201352.sql.gz` | Dump comprimido | **RASTREADO** | `git rm --cached` |

### Contenido del dump sql/lidium.sql
- Contiene 203 sentencias INSERT con datos reales
- Tabla `accounts`: incluye nombres de usuario, hashes de contraseña, sales, direcciones MAC, NxCredit, SessionIP
- Tabla `achievements`: datos de personajes con IDs reales
- **Este archivo NO debe estar en el repositorio público ni privado de GitHub**

---

## 9. Rutas incompatibles Windows → Linux

| Ruta Windows | Equivalente Linux | Dónde aparece |
|---|---|---|
| `C:\Program Files\Zulu\zulu-16` | `/usr/lib/jvm/...` | launch.bat (ignorar) |
| `wz\` (backslash) | `wz/` (slash) | launch.bat, Start.java |
| `dist\Lidium.jar` | `dist/Lidium.jar` | launch.bat |
| `lib\*` | `lib/*` | launch.bat |
| `lib\graal\*` | `lib/graal/*` | launch.bat |

El código fuente `Start.java` usa `System.setProperty("net.sf.odinms.wzpath", "wz")` sin backslash, lo cual es compatible con Linux.

**Problema crítico de red:** `channel.properties` tiene `net.sf.odinms.channel.net.interface=127.0.0.1` — en un contenedor Docker esto hace que el channel server solo escuche en loopback y sea inaccesible desde afuera. El entrypoint.sh debe sobrescribir este valor o el archivo debe modificarse para producción Docker.

---

## 10. Datos a persistir (volúmenes Docker)

| Dato | Ruta en contenedor | Tipo de volumen |
|---|---|---|
| Base de datos MySQL | `/var/lib/mysql` (en contenedor `db`) | Named volume `latinms_mysql_data` |
| Logs del servidor | `/app/logs` o `/app/build/` | Named volume `latinms_logs` |
| Archivos wz | `/app/wz` | Incluidos en imagen (estáticos) |
| Scripts JS | `/app/scripts` | Incluidos en imagen (estáticos) |

---

## 11. Estado de Git

- **Repositorio inicializado:** Sí
- **Remote origin:** https://github.com/geermanperez/Lidium.git
- **Remote upstream:** https://github.com/sexdeeza/Lidium.git
- **Commits existentes:** 5 commits (f805a05, 128c6cd, 20b6e52, 22e0571, 762f954)
- **Archivos modificados sin commitear:** Numerosos (ver `git status`)
- **Archivos sensibles rastreados:** 11 archivos (ver sección 8) — ACCIÓN URGENTE REQUERIDA

---

## 12. Riesgos y recomendaciones para EasyPanel

### Riesgo CRÍTICO
- `db.properties` con contraseña real está commiteado en git — si el repo es público, la contraseña está expuesta en el historial
- Los dumps SQL con datos reales de jugadores están commiteados — GDPR/privacidad comprometida
- Considerar usar `git filter-repo` para purgar el historial si el repositorio fue público

### Riesgo ALTO
- `channel.properties` con `net.sf.odinms.channel.net.interface=127.0.0.1` impide conectividad externa en Docker
- Los archivos `.wz` son grandes (~cientos de MB descomprimidos) — la imagen Docker puede ser pesada
- Java 16 requiere imagen base específica; no usar Java 17+ sin pruebas (puede haber cambios en módulos)

### Riesgo MEDIO
- GraalVM JS 21.2.0 está diseñado para JDK 16; versiones distintas pueden fallar
- El servidor usa `-server` flag que requiere JDK Server VM (no JRE headless puro en algunos casos)
- MySQL 8.4 puede tener incompatibilidades con el conector 8.0.25; probar con MySQL 8.0

### Recomendaciones EasyPanel
1. Usar MySQL 8.0 (no 8.4) por compatibilidad con el conector mysql-connector-java-8.0.25
2. Exponer puertos 9484, 8585, 9494 como TCP (no HTTP) en EasyPanel
3. Configurar memoria mínima 3GB para el contenedor Java
4. Los archivos wz deben estar en la imagen Docker (son estáticos de juego, no datos de usuarios)
5. Hacer backup de la base de datos antes de cada reinicio (ver scripts/pre-restart-check.sh)
6. NO exponer el puerto MySQL 3306 públicamente
