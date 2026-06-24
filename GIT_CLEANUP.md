# Limpieza de archivos sensibles en Git — LatinMS v111

> ADVERTENCIA: Estos pasos modifican el historial de git.
> Si el repositorio ya fue pusheado a GitHub, los archivos sensibles
> pueden estar en el historial publico. Ejecutar estos pasos ANTES
> de hacer cualquier push adicional.
>
> NO ejecutar git push hasta completar todos los pasos y verificar.

---

## Paso 1: Retirar archivos sensibles del git index (sin borrarlos del disco)

Copiar y pegar en una terminal en la raiz del proyecto:

```bash
# db.properties y backups
git rm --cached db.properties
git rm --cached db.properties.backup-original
git rm --cached db.properties.backup-test

# Dumps SQL con datos reales de jugadores
git rm --cached sql/lidium.sql
git rm --cached sql/lidium-fixed.sql

# Dumps de migracion con datos reales
git rm --cached migration/backups/v111-antes-migracion.sql
git rm --cached "migration/backups/v111-antes-migracion-seguro.sql"
git rm --cached migration/source/cosmic-v82-20260623-201352-mariadb.sql
git rm --cached migration/source/cosmic-v82-20260623-201352.sql
git rm --cached migration/source/cosmic-v82-20260623-201352.sql.gz

# .env de maple-web
git rm --cached maple-web/.env
```

---

## Paso 2: Verificar que el .gitignore cubre todos los archivos sensibles

```bash
# Verificar que db.properties queda ignorado
echo "db.properties" | git check-ignore --stdin -v

# Verificar que los .sql quedan ignorados
echo "sql/lidium.sql" | git check-ignore --stdin -v
```

---

## Paso 3: Agregar los nuevos archivos de infraestructura

```bash
git add .gitignore
git add .env.example
git add Dockerfile
git add docker-compose.yml
git add docker-compose.local.yml
git add docker/entrypoint.sh
git add scripts/backup-db.sh
git add scripts/restore-db.sh
git add scripts/verify-db.sh
git add scripts/pre-restart-check.sh
git add scripts/post-start-check.sh
git add database/init/.gitkeep
git add DEPLOYMENT_AUDIT.md
git add EASYPANEL_DEPLOYMENT.md
git add README.md
git add GIT_CLEANUP.md
```

---

## Paso 4: Verificar que no hay secretos en el staging area

```bash
# Este comando debe devolver VACIO — si lista db.properties o .sql, algo fallo
git diff --cached --name-only | grep -iE "db\.properties|\.sql$|\.env$|password|secret"
```

Si devuelve algo, ejecutar `git reset HEAD <archivo>` para sacarlo del stage.

---

## Paso 5: Hacer el commit

```bash
git commit -m "feat: dockerizacion y preparacion para EasyPanel

- Dockerfile con Java 16 (Azul Zulu) y usuario no root
- docker-compose.yml con MySQL 8.0 y servidor Lidium
- docker/entrypoint.sh: valida env vars, espera MySQL, genera db.properties
- .env.example con todas las variables requeridas
- scripts/: backup-db, restore-db, verify-db, pre-restart-check, post-start-check
- database/init/: directorio para schema limpio inicial
- .gitignore actualizado: excluye .sql, db.properties, .env, backups
- DEPLOYMENT_AUDIT.md: auditoria completa del proyecto
- EASYPANEL_DEPLOYMENT.md: guia paso a paso para EasyPanel
- README.md: instrucciones de uso Docker y comandos

IMPORTANTE: db.properties, sql/ y migration/backups/ removidos del tracking.
Los dumps SQL con datos reales NO se incluyen en el repositorio."
```

---

## Paso 6: Verificar el estado final

```bash
# Ver que archivos quedaron en el ultimo commit
git show --stat HEAD

# Confirmar que los sensibles NO estan rastreados
git ls-files | grep -iE "db\.properties|\.sql$|\.env$" || echo "OK: ninguno encontrado"
```

---

## Paso 7: Limpiar el historial previo (OPCIONAL pero recomendado)

Si el repositorio ya fue pusheado y los archivos sensibles estan en commits
anteriores, el historial aun los contiene. Para purgarlos del historial completo:

```bash
# Instalar git-filter-repo si no esta instalado:
pip install git-filter-repo

# Purgar db.properties del historial completo
git filter-repo --path db.properties --invert-paths
git filter-repo --path db.properties.backup-original --invert-paths
git filter-repo --path db.properties.backup-test --invert-paths
git filter-repo --path sql/ --invert-paths
git filter-repo --path migration/backups/ --invert-paths
git filter-repo --path migration/source/ --invert-paths
git filter-repo --path maple-web/.env --invert-paths

# Reconfigurar el remote (filter-repo lo elimina por seguridad)
git remote add origin https://github.com/geermanperez/Lidium.git

# Push forzado (ADVERTENCIA: requiere que el repo sea privado o no tenga forks)
git push origin --force --all
```

ADVERTENCIA: El force push reescribe el historial remoto. Si hay colaboradores
con copias del repo, deben hacer `git fetch --all && git reset --hard origin/main`.

---

## Paso 8: Rotar la contrasena de la base de datos

Dado que `db.properties` con la contrasena real estaba en el repositorio,
**la contrasena debe cambiarse aunque el repositorio sea privado**:

1. Conectar a MySQL: `mysql -u root -p`
2. Cambiar contrasena:
   ```sql
   ALTER USER 'latinms'@'%' IDENTIFIED BY 'nueva_contrasena_segura';
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'nueva_root_password';
   FLUSH PRIVILEGES;
   ```
3. Actualizar el archivo `.env` con las nuevas contrasenas
4. Reiniciar el servidor: `docker compose restart`

---

## Verificacion final de seguridad

```bash
# Confirmar que ninguna contrasena esta en archivos rastreados
git grep -i "password" -- "*.properties" "*.env" "*.sql" 2>/dev/null || echo "OK: sin contrasenas en archivos rastreados"

# Confirmar que .gitignore cubre los patrones criticos
cat .gitignore | grep -E "db\.properties|\.sql|\.env"
```

---

## Resumen de comandos a ejecutar manualmente

```bash
# En orden, desde la raiz del proyecto:

git rm --cached db.properties db.properties.backup-original db.properties.backup-test
git rm --cached sql/lidium.sql sql/lidium-fixed.sql
git rm --cached "migration/backups/v111-antes-migracion.sql"
git rm --cached "migration/backups/v111-antes-migracion-seguro.sql"
git rm --cached migration/source/cosmic-v82-20260623-201352-mariadb.sql
git rm --cached migration/source/cosmic-v82-20260623-201352.sql
git rm --cached migration/source/cosmic-v82-20260623-201352.sql.gz
git rm --cached maple-web/.env

git add .gitignore .env.example Dockerfile docker-compose.yml docker-compose.local.yml
git add docker/entrypoint.sh
git add scripts/backup-db.sh scripts/restore-db.sh scripts/verify-db.sh
git add scripts/pre-restart-check.sh scripts/post-start-check.sh
git add database/init/.gitkeep
git add DEPLOYMENT_AUDIT.md EASYPANEL_DEPLOYMENT.md README.md GIT_CLEANUP.md

git status  # Verificar antes de commitear

git commit -m "feat: dockerizacion y preparacion para EasyPanel"

# Verificar que no hay secretos:
git ls-files | grep -iE "db\.properties|\.sql$|\.env$" || echo "OK"

# SOLO despues de verificar, hacer push:
# git push origin main
```
