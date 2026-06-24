Maple API (minimal web account endpoints)

Instalación

1. Copiar variables: `cp .env.example .env` y ajustar valores.
2. Instalar dependencias:

```bash
npm install
```

Inicio

```bash
npm start
```

Endpoints principales

- `GET /status` — estado general.
- `POST /register` — crear cuenta (compatible con servidor Cosmic).
- `POST /login` — recibe `{ "username", "password" }`, devuelve `token`.
- `GET /account/me` — datos de cuenta y perfil (requiere `Authorization: Bearer TOKEN`).
- `GET /account/me/characters` — personajes del account (requiere token).
- `PUT /account/me/profile` — actualizar `display_name`, `avatar_url`, `bio` (requiere token).
- `POST /account/me/change-password` — cambiar contraseña (requiere token).
- `GET /account/check` — health autenticada (requiere token).
- `GET /vote/status` — devuelve el cooldown de voto de la cuenta autenticada (requiere token).
- `POST /vote/token` — genera el token temporal para GTop100 solo si la cuenta ya puede votar (requiere token).

Cooldown de GTop100

- El cooldown es fijo de 24 horas y se calcula exclusivamente desde el último registro `status = 'accepted'` de la misma `account_id`.
- La API usa el epoch de MySQL para comparar fechas y responde las fechas en UTC (`lastAcceptedVote`, `nextVoteAt`). La web solo las formatea para Argentina.
- Durante el cooldown, `GET /vote/status` devuelve `canVote: false` y `remainingSeconds`; `POST /vote/token` devuelve `429` con el código `VOTE_COOLDOWN` y no crea ni persiste un token.
- El pingback mantiene sus protecciones de token, `pb_id` duplicado y `too_soon` como defensa final. Un registro `too_soon` no reinicia el cooldown.

Pruebas manuales sugeridas

1. Con una cuenta sin votos accepted, consultar `GET /vote/status`: debe responder `canVote: true`; `POST /vote/token` debe devolver un token.
2. Con el último accepted de hace 25 horas, ambos endpoints deben permitir iniciar el voto.
3. Con el último accepted de hace 23 horas, el estado debe devolver `canVote: false` y el inicio `429 VOTE_COOLDOWN`; el botón web debe quedar deshabilitado y mostrar contador y próximo horario.
4. Si el registro más reciente es `too_soon`, pero el último `accepted` tiene más de 24 horas, el estado debe permitir votar.
5. Repetir los casos 2-4 desde otra IP/dispositivo y con otra cuenta autenticada: el resultado depende solo de `account_id`.
6. Abrir dos pestañas y presionar a la vez: los tokens siguen ligados a la cuenta y el pingback conserva el control por token/pb_id y la defensa final contra doble recompensa.
7. Dejar agotar el contador: la web debe volver a pedir `GET /vote/status` antes de habilitar el botón. Una petición sin `Authorization` a ambos endpoints debe responder `401`.

Uso de token

Enviar header:

```
Authorization: Bearer <TOKEN>
```

Advertencias

- Nunca conecte el frontend directamente a la base de datos. Siempre usar esta API.
- No exponer `JWT_SECRET` en repositorios públicos.
- Los endpoints mantienen compatibilidad con el formato de `password` actual usado por `/register`.
