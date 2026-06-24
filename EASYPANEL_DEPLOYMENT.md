# Guia de Despliegue en EasyPanel — LatinMS v111 (Lidium)

> Esta guia asume que tenes acceso a un servidor EasyPanel funcionando
> y un repositorio GitHub privado con el codigo del proyecto.

---

## Tabla de puertos

| Servicio       | Puerto interno | Puerto externo | Protocolo | Publico |
|----------------|---------------|----------------|-----------|---------|
| MySQL          | 3306          | —              | TCP       | NO      |
| Login Server   | 9484          | 9484           | TCP       | SI      |
| Channel 1      | 8585          | 8585           | TCP       | SI      |
| Cash Shop      | 9494          | 9494           | TCP       | SI      |

**Importante:** Los puertos del servidor MapleStory son TCP binario puro,
NO son HTTP/HTTPS. En EasyPanel deben configurarse como tipo "TCP", no como
"HTTP" ni "HTTPS". Los clientes MapleStory conectan directamente a estos puertos.

---

## Paso 1: Crear proyecto en EasyPanel

1. Iniciar sesion en tu panel EasyPanel (normalmente `https://tu-servidor:3000`)
2. Hacer clic en **"+ Create Project"**
3. Nombre sugerido: `latinms-v111`
4. Hacer clic en **"Create"**

---

## Paso 2: Conectar el repositorio GitHub privado

1. Ir a **Settings → GitHub** en EasyPanel
2. Conectar tu cuenta de GitHub si aun no esta vinculada
3. Autorizar acceso al repositorio `geermanperez/Lidium` (o el nombre que tenga)
4. Confirmar que EasyPanel tiene permisos de lectura sobre el repositorio

---

## Paso 3: Configurar el servicio MySQL

1. Dentro del proyecto `latinms-v111`, hacer clic en **"+ Create Service"**
2. Seleccionar tipo: **"MySQL"** (o **"App"** con imagen `mysql:8.0`)
3. Configuracion recomendada:
   - **Image:** `mysql:8.0`
   - **Service name:** `db`
   - **Restart policy:** `Unless Stopped`

### Variables de entorno para MySQL:

```
MYSQL_ROOT_PASSWORD=tu_contrasena_root_segura
MYSQL_DATABASE=v111
MYSQL_USER=latinms
MYSQL_PASSWORD=tu_contrasena_latinms_segura
```

### Argumentos de comando MySQL:
```
--character-set-server=utf8mb4
--collation-server=utf8mb4_unicode_ci
--default-authentication-plugin=mysql_native_password
--max_allowed_packet=64M
```

**NO exponer el puerto 3306** — dejar sin mapeo externo.

---

## Paso 4: Configurar volumen persistente para MySQL

1. En el servicio `db`, ir a la seccion **"Volumes"** o **"Mounts"**
2. Agregar un volumen:
   - **Volume name:** `latinms-mysql-data`
   - **Mount path:** `/var/lib/mysql`
3. Guardar cambios

**Este volumen persiste la base de datos entre reinicios y actualizaciones.**
Nunca borrarlo a menos que se quiera resetear toda la base de datos.

---

## Paso 5: Configurar variables de entorno del servidor Java

Antes de crear el servicio del servidor, preparar las variables de entorno.
Copiar `.env.example` como referencia:

```
DB_HOST=db
DB_PORT=3306
DB_NAME=v111
DB_USER=latinms
DB_PASSWORD=tu_contrasena_latinms_segura
MYSQL_ROOT_PASSWORD=tu_contrasena_root_segura
LOGIN_PORT=9484
CHANNEL_PORT=8585
CASHSHOP_PORT=9494
JAVA_OPTS=-Xms1G -Xmx2G
TZ=America/Argentina/Catamarca
CHANNEL_INTERFACE=0.0.0.0
SERVER_PUBLIC_IP=IP_PUBLICA_DEL_SERVIDOR
```

Reemplazar:
- `tu_contrasena_latinms_segura` → contrasena fuerte (min 20 caracteres)
- `tu_contrasena_root_segura` → contrasena root fuerte (min 20 caracteres)
- `IP_PUBLICA_DEL_SERVIDOR` → IP publica del servidor EasyPanel

---

## Paso 6: Crear el servicio LatinMS desde Dockerfile

1. En el proyecto `latinms-v111`, hacer clic en **"+ Create Service"**
2. Seleccionar tipo: **"App"**
3. En la seccion de source, seleccionar **"GitHub"**
4. Seleccionar el repositorio `geermanperez/Lidium`
5. Branch: `main` (o la rama principal)
6. **Build method:** Dockerfile (usar el `Dockerfile` en la raiz)
7. **Service name:** `latinms-server`

---

## Paso 7: Publicar puertos TCP

En el servicio `latinms-server`, ir a la seccion **"Ports"** o **"Domains"**:

> En EasyPanel, los puertos TCP se configuran diferente a los HTTP.
> Buscar la opcion "TCP Ports" o "Port Mapping".

Agregar los siguientes mapeos:

| Puerto interno | Puerto externo | Tipo |
|---------------|----------------|------|
| 9484          | 9484           | TCP  |
| 8585          | 8585           | TCP  |
| 9494          | 9494           | TCP  |

**Si EasyPanel no permite puertos TCP directamente:**
Algunos setups de EasyPanel usan Traefik o Caddy solo para HTTP. En ese caso,
configurar los puertos TCP en el `docker-compose.yml` subyacente o en la
configuracion de red del host (iptables / ufw).

Comandos UFW de ejemplo en el servidor:
```bash
sudo ufw allow 9484/tcp
sudo ufw allow 8585/tcp
sudo ufw allow 9494/tcp
```

---

## Paso 8: Configurar reinicio automatico

En el servicio `latinms-server`:
- **Restart policy:** `Unless Stopped`
- **Memory limit:** `3GB` (recomendado con JAVA_OPTS=-Xms1G -Xmx2G)

En el servicio `db`:
- **Restart policy:** `Unless Stopped`

---

## Paso 9: Ver logs

Desde el panel EasyPanel:
1. Hacer clic en el servicio `latinms-server`
2. Ir a la pestana **"Logs"**
3. Buscar lineas como:
   - `[OK] Variables de entorno validadas.`
   - `[OK] MySQL disponible`
   - `[OK] db.properties generado`
   - `Lidium` (nombre del servidor al arrancar)
   - `LoginServer started on port 9484`

Desde SSH en el servidor:
```bash
docker compose logs -f latinms-server
docker compose logs -f db
```

---

## Paso 10: Validar conexion servidor-base de datos

Desde SSH en el servidor, ejecutar el script de verificacion:
```bash
# Cargar variables de entorno primero
export $(cat .env | grep -v '^#' | xargs)
./scripts/verify-db.sh
```

O desde dentro del contenedor:
```bash
docker exec -it latinms-server bash
# Dentro del contenedor:
mysql -h db -u latinms -p v111
```

---

## Paso 11: Primer despliegue con base de datos vacia

Si es la primera vez y no tenes un backup para restaurar:

1. El volumen `latinms-mysql-data` estara vacio al crear
2. Si existen archivos `.sql` en `database/init/`, MySQL los ejecutara automaticamente
3. Si no hay schema inicial, importar manualmente:

```bash
# Copiar el schema limpio al contenedor db
docker cp database/init/schema_limpio.sql latinms-db:/tmp/

# Importar
docker exec -it latinms-db mysql -u root -p v111 < /tmp/schema_limpio.sql
```

**IMPORTANTE:** Los archivos de `sql/` (lidium.sql, lidium-fixed.sql) contienen
datos reales de jugadores y NO deben importarse en produccion nueva.
Solo importar si es una migracion de la instancia existente (ver Paso 15).

---

## Paso 12: Probar desde cliente externo

1. Configurar el cliente MapleStory para conectarse a la IP publica del servidor
2. El archivo `localhost.txt` o configuracion del cliente debe apuntar a:
   ```
   IP_PUBLICA_DEL_SERVIDOR:9484
   ```
3. Verificar que los puertos 9484, 8585 y 9494 son accesibles:
   ```bash
   # Desde cualquier maquina externa:
   nc -zv IP_PUBLICA_DEL_SERVIDOR 9484
   nc -zv IP_PUBLICA_DEL_SERVIDOR 8585
   nc -zv IP_PUBLICA_DEL_SERVIDOR 9494
   ```

---

## Paso 13: Verificar persistencia

Para confirmar que los datos persisten entre reinicios:

1. Crear una cuenta de prueba en el servidor
2. Reiniciar el servicio: `docker compose restart latinms-server`
3. Verificar que la cuenta sigue existiendo:
   ```bash
   export $(cat .env | grep -v '^#' | xargs)
   ./scripts/verify-db.sh
   ```

---

## Paso 14: Configurar backups automaticos

### Opcion A: Cron en el servidor host
```bash
# Agregar al crontab del servidor:
crontab -e

# Backup diario a las 4:00 AM
0 4 * * * cd /ruta/al/proyecto && export $(cat .env | grep -v '^#' | xargs) && ./scripts/backup-db.sh >> /var/log/latinms-backup.log 2>&1
```

### Opcion B: Script manual antes de cada reinicio
```bash
export $(cat .env | grep -v '^#' | xargs)
./scripts/pre-restart-check.sh
# Luego reiniciar si el check pasa
docker compose restart latinms-server
```

Los backups se guardan en `./backups/` con nombre `backup_v111_YYYYMMDD_HHMMSS.sql.gz`.
Asegurarse de que `backups/` esta en `.gitignore` (ya esta configurado).

---

## Paso 15: Migrar la base de datos existente (instancia live)

Si se quiere migrar la base de datos actual de produccion:

1. Hacer backup en el servidor actual:
   ```bash
   export $(cat .env | grep -v '^#' | xargs)
   ./scripts/backup-db.sh
   ```

2. Copiar el backup al servidor EasyPanel:
   ```bash
   scp backups/backup_v111_*.sql.gz usuario@servidor-easypanel:/ruta/proyecto/backups/
   ```

3. Restaurar en EasyPanel:
   ```bash
   export $(cat .env | grep -v '^#' | xargs)
   ALLOW_RESTORE=yes ./scripts/restore-db.sh backups/backup_v111_FECHA.sql.gz
   ```

4. Verificar la restauracion:
   ```bash
   ./scripts/verify-db.sh
   ```

---

## Notas de seguridad

- El archivo `.env` NUNCA debe commitearse al repositorio
- Las contrasenas de DB deben ser distintas en cada entorno
- MySQL solo debe ser accesible dentro de la red interna de Docker
- Revisar periodicamente `docker compose logs db` en busca de intentos de conexion no autorizados
- Rotar las contrasenas cada 90 dias como minimo
- Los archivos en `backups/` contienen datos reales — proteger el acceso al servidor
