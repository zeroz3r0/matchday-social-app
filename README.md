# MatchDay Social ⚽

> Red social deportiva para gestionar partidos, ligas y torneos de futbol amateur (F5, F7, F11).

---

## Arquitectura

```
matchday-social-app/
├── apps/
│   ├── api/          # Backend — Node.js + Express + Prisma + PostgreSQL/PostGIS
│   └── mobile/       # Frontend — React Native + Expo (iOS & Android)
├── packages/
│   └── shared/       # Tipos, constantes, validaciones compartidas
├── package.json      # Monorepo root (npm workspaces)
└── tsconfig.base.json
```

### Stack Tecnico

| Capa               | Tecnologia                                   |
| ------------------ | -------------------------------------------- |
| Mobile             | React Native 0.73 + Expo 50                  |
| Navigation         | React Navigation 6 (Stack + Bottom Tabs)     |
| Backend            | Node.js + Express + TypeScript               |
| Base de Datos      | PostgreSQL + PostGIS (extension geoespacial) |
| ORM                | Prisma 5                                     |
| Auth               | JWT (jsonwebtoken) + bcrypt                  |
| Validacion         | Zod                                          |
| Push Notifications | Firebase Cloud Messaging (FCM)               |
| Maps               | Google Maps API + react-native-maps          |
| Cron Jobs          | node-cron                                    |

---

## Esquema de Base de Datos

### Tablas Principales

```
Users
├── id, email, password, nickname (unique), avatarUrl
├── position (GOALKEEPER | DEFENDER | MIDFIELDER | FORWARD)
├── bio, latitude, longitude, city, fcmToken
└── timestamps

Clubs
├── id, name (unique), badgeUrl, description, preferredFormation
└── createdById → Users

ClubMembers
├── clubId → Clubs, userId → Users
└── role (ADMIN | CAPTAIN | PLAYER)

Matches
├── id, gameType (F5 | F7 | F11), status
├── locationName, locationAddress, lat/lon, contactPhone, googlePlaceId
├── scheduledAt, completedAt, votingDeadline (completedAt + 12h)
├── homeScore, awayScore
├── createdById → Users, competitionId → Competitions (nullable)
└── timestamps

MatchTeams
├── matchId → Matches, clubId → Clubs (nullable para partidos informales)
├── name, isHome
└── UNIQUE(matchId, isHome)

MatchPlayers
├── matchTeamId → MatchTeams, userId → Users
├── position, invitationStatus (PENDING | ACCEPTED | DECLINED)
└── UNIQUE(matchTeamId, userId)

MatchStats
├── matchId → Matches, playerId → Users
├── goals, assists, yellowCards, redCards
├── submittedById → Users
├── validationStatus (PENDING | CONFIRMED | DISPUTED | AUTO_CONFIRMED)
├── confirmationsCount, requiredConfirmations (50% jugadores)
├── autoConfirmAt (createdAt + 24h)
└── UNIQUE(matchId, playerId)

StatConfirmations
├── matchStatId → MatchStats, userId → Users
├── confirmed (boolean)
└── UNIQUE(matchStatId, userId)

PlayerVotes
├── matchId → Matches, voterId → Users, targetPlayerId → Users
├── rating (1-10, entero), isMvpVote (boolean)
└── UNIQUE(matchId, voterId, targetPlayerId)

MvpResults
├── matchId → Matches (UNIQUE)
├── homeTeamMvpId, awayTeamMvpId, globalMvpId
└── calculatedAt

Competitions
├── id, name, type (LEAGUE | TOURNAMENT), gameType
├── startDate, endDate, maxPostponeDays (default: 14)
├── latitude, longitude, city
└── createdById → Users

CompetitionClubs
├── competitionId → Competitions, clubId → Clubs
└── UNIQUE(competitionId, clubId)

LeagueStandings
├── competitionId → Competitions, clubId → Clubs
├── played, won, drawn, lost, goalsFor, goalsAgainst, points
└── UNIQUE(competitionId, clubId)

TournamentBrackets
├── competitionId → Competitions, stage, matchOrder
├── matchId → Matches (nullable), homeClubId, awayClubId
├── isBypass, winnerId
└── UNIQUE(competitionId, stage, matchOrder)
```

---

## Flujos Principales

### 1. Flujo de Votacion (Post-Partido)

```
PARTIDO FINALIZADO
       │
       ▼
┌──────────────────────┐
│  Admin marca partido │
│  como COMPLETED      │
│  + introduce marcador│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Se abre ventana de  │
│  votacion (12 horas) │
│                      │
│  Push notification:  │
│  "Vota a tu MVP!"   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Cada jugador puede: │
│                      │
│  • Nota 1-10 a cada  │
│    compañero/rival   │
│    (privada)         │
│                      │
│  • Elegir 1 MVP      │
│    (por partido)     │
│                      │
│  NO auto-votarse     │
└──────────┬───────────┘
           │
           ▼ (12h o cierre manual)
┌──────────────────────┐
│  CALCULO DE MVP      │
│                      │
│  Desempate:          │
│  1. Mas votos MVP    │
│  2. Equipo ganador   │
│  3. Goles+Asist.     │
│  4. Random           │
│                      │
│  Resultado:          │
│  • MVP Equipo Local  │
│  • MVP Equipo Visit. │
│  • MVP Global        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Actualizacion de    │
│  perfiles:           │
│  • Nota media        │
│  • Contador MVP      │
│  • Estadisticas      │
│                      │
│  Push: "MVP anunciad │
└──────────────────────┘
```

### 2. Flujo de Validacion de Estadisticas

```
JUGADOR SUBE STATS (goles, asist., tarjetas)
       │
       ▼
┌──────────────────────┐
│  Estado: PENDING     │
│                      │
│  Se requiere 50% de  │
│  confirmaciones de   │
│  jugadores del       │
│  partido             │
└──────────┬───────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
  50% confirma    24h sin objeciones
     │           │
     ▼           ▼
  CONFIRMED    AUTO_CONFIRMED
     │           │
     └─────┬─────┘
           │
           ▼
  Stats sumadas al perfil
  (Medallas actualizadas)

  Si alguien disputa → DISPUTED
  (requiere revision manual del admin)
```

### 3. Jerarquia de Ligas y Torneos

```
COMPETICIONES
├── MODO LIGA
│   ├── Sistema de puntos: Victoria +3, Empate +1, Derrota 0
│   ├── Validacion de plantilla minima segun tipo:
│   │   ├── F5  → minimo 5 jugadores
│   │   ├── F7  → minimo 7 jugadores
│   │   └── F11 → minimo 11 jugadores
│   ├── Generacion automatica de calendario (round-robin)
│   ├── Clasificacion por: Puntos → Goles a favor
│   └── Aplazamiento: maximo 2 semanas (configurable)
│
└── MODO TORNEO
    ├── Eliminacion directa (brackets)
    ├── Generacion automatica de cuadro
    ├── Gestion de BYE para equipos impares
    │   (equipo sin rival pasa automaticamente)
    ├── Fases: R64 → R32 → R16 → Cuartos → Semis → Final
    └── Aplazamiento: mismo limite de 2 semanas
```

### 4. Ladderboard (Rankings)

```
RANKINGS
├── Categorias:
│   ├── Goles totales
│   ├── Asistencias totales
│   ├── Nota media (redondeada a 1 decimal)
│   └── Contador de MVPs
│
├── Filtros geograficos:
│   ├── LOCAL  → Radio de 50km (PostGIS / Haversine)
│   ├── CIUDAD → Misma ciudad
│   └── NACIONAL → España completa
│
└── Solo stats CONFIRMED o AUTO_CONFIRMED
    (las pendientes/disputadas NO cuentan)
```

---

## Configuracion del Proyecto

### Requisitos

- Node.js >= 20
- PostgreSQL >= 14 (con extension PostGIS)
- Expo CLI (`npm install -g expo-cli`)

### Instalacion

```bash
# Clonar repositorio
git clone https://github.com/TU_USUARIO/matchday-social-app.git
cd matchday-social-app

# Instalar dependencias (monorepo)
npm install

# Compilar paquete compartido
npm run shared:build
```

### Backend

```bash
# Copiar variables de entorno
cp apps/api/.env.example apps/api/.env

# Editar .env con tus credenciales de PostgreSQL, JWT secret, Firebase, etc.

# Generar Prisma client
npm run api:db:generate -w apps/api

# Ejecutar migraciones
npm run api:db:migrate

# (Opcional) Seed de datos de prueba
npm run api:db:seed

# Iniciar servidor de desarrollo
npm run api:dev
```

### Mobile

```bash
# Iniciar Expo dev server
npm run mobile:start

# O directamente en plataforma
npm run mobile:ios
npm run mobile:android
```

### Variables de Entorno Requeridas

| Variable                | Descripcion                               |
| ----------------------- | ----------------------------------------- |
| `DATABASE_URL`          | Connection string PostgreSQL              |
| `JWT_SECRET`            | Clave secreta para tokens JWT             |
| `JWT_EXPIRES_IN`        | Expiracion del token (default: 7d)        |
| `FIREBASE_PROJECT_ID`   | ID proyecto Firebase (push notifications) |
| `FIREBASE_PRIVATE_KEY`  | Clave privada Firebase                    |
| `FIREBASE_CLIENT_EMAIL` | Email del service account Firebase        |
| `GOOGLE_MAPS_API_KEY`   | API key de Google Maps                    |
| `PORT`                  | Puerto del servidor (default: 3000)       |

---

## API Endpoints

### Auth

| Method | Endpoint             | Descripcion                            |
| ------ | -------------------- | -------------------------------------- |
| POST   | `/api/auth/register` | Registro con nickname, email, posicion |
| POST   | `/api/auth/login`    | Login, devuelve JWT                    |

### Users

| Method | Endpoint         | Descripcion                      |
| ------ | ---------------- | -------------------------------- |
| GET    | `/api/users/me`  | Perfil propio + medallas + stats |
| GET    | `/api/users/:id` | Perfil publico                   |
| PATCH  | `/api/users/me`  | Actualizar perfil                |

### Matches

| Method | Endpoint                                 | Descripcion                       |
| ------ | ---------------------------------------- | --------------------------------- |
| POST   | `/api/matches`                           | Crear partido + invitar jugadores |
| GET    | `/api/matches/:id`                       | Detalle del partido               |
| POST   | `/api/matches/:id/complete`              | Finalizar + abrir votacion        |
| POST   | `/api/matches/:id/stats`                 | Subir estadisticas (pending)      |
| POST   | `/api/matches/:id/stats/:statId/confirm` | Confirmar/disputar stat           |

### Votes

| Method | Endpoint                    | Descripcion                    |
| ------ | --------------------------- | ------------------------------ |
| POST   | `/api/votes/:matchId`       | Votar nota + MVP               |
| POST   | `/api/votes/:matchId/close` | Cerrar votacion + calcular MVP |
| GET    | `/api/votes/:matchId`       | Resumen de votos               |

### Clubs

| Method | Endpoint                 | Descripcion       |
| ------ | ------------------------ | ----------------- |
| POST   | `/api/clubs`             | Crear club        |
| GET    | `/api/clubs`             | Listar mis clubes |
| GET    | `/api/clubs/:id`         | Detalle del club  |
| POST   | `/api/clubs/:id/members` | Añadir miembro    |

### Competitions

| Method | Endpoint                                  | Descripcion                 |
| ------ | ----------------------------------------- | --------------------------- |
| POST   | `/api/competitions`                       | Crear liga/torneo           |
| POST   | `/api/competitions/:id/register`          | Inscribir club              |
| POST   | `/api/competitions/:id/generate-calendar` | Generar calendario/brackets |
| GET    | `/api/competitions/:id/standings`         | Clasificacion liga          |
| GET    | `/api/competitions/:id/brackets`          | Cuadro torneo               |
| POST   | `/api/competitions/:id/postpone/:matchId` | Aplazar partido             |

### Rankings

| Method | Endpoint                                                       | Descripcion |
| ------ | -------------------------------------------------------------- | ----------- |
| GET    | `/api/rankings?category=GOALS&scope=LOCAL&lat=40.41&lon=-3.70` | Ladderboard |

---

## Cron Jobs Automaticos

| Job                | Frecuencia | Accion                                                             |
| ------------------ | ---------- | ------------------------------------------------------------------ |
| Auto-confirm stats | Cada 5 min | Stats PENDING con `autoConfirmAt` expirado → AUTO_CONFIRMED        |
| Auto-close voting  | Cada 5 min | Partidos con `votingDeadline` expirado sin MvpResult → Calcula MVP |

---

## Notas Tecnicas

- **Geolocalización**: Rankings LOCAL usan formula Haversine en SQL (compatible sin PostGIS). Con PostGIS instalado, usar `ST_DWithin` para mejor rendimiento.
- **Notas redondeadas**: Todas las notas medias se redondean a 1 decimal (`Math.round(avg * 10) / 10`) para evitar decimales infinitos en la UI.
- **Notificaciones Push**: Requiere Firebase Cloud Messaging. Los tokens FCM se almacenan en el perfil del usuario y se actualizan via `PATCH /api/users/me`.
- **Algoritmo MVP**: Implementado en `@matchday/shared` para reutilizarlo en backend (calculo) y potencialmente en frontend (preview).

---

## Licencia

MIT
