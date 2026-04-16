Session summary: trabajo del 16 abril 2026 — matchday-social-app login flow + adb PNG corruption bug

## Contexto

**Proyecto**: `C:\Users\spere\matchday-social-app` (app de fútbol amateur, monorepo Expo + Node API)
**Repo**: https://github.com/zeroz3r0/matchday-social-app (rama `master`)
**Stack**: Expo SDK 55, React Native, Node+Express API, Prisma + Neon Postgres (cloud)
**Device**: Samsung RFCW90L5T1Z (Android, 1080x2340, density 480)

## Problema inicial del usuario

Intentaba continuar la sesión de la app Matchday pero mi tool `Read` devolvía "Could not process image" al leer `device-screen.png`. Había probado varias "claves" pensando que era un tema de mi lado.

## ROOT CAUSE — adb + PowerShell PNG corruption

**Bug**: En PowerShell, `adb exec-out screencap -p > file.png` **corrompe el binario**.

**Evidencia**: Los primeros 8 bytes del PNG eran `FF FE EB 00 50 00 4E 00` en vez de la firma válida `89 50 4E 47 0D 0A 1A 0A`. `FF FE` es el **BOM UTF-16 LE** — PowerShell interpreta el stream binario como texto UTF-16 y añade BOM + hace conversiones CRLF.

**Fix (siempre usar este patrón en PowerShell)**:
```powershell
adb shell screencap -p /sdcard/s.png
adb pull /sdcard/s.png device-screen.png
adb shell rm /sdcard/s.png
```

Nunca usar `adb exec-out screencap -p > file.png` desde PowerShell. Alternativas válidas:
- `cmd /c "adb exec-out screencap -p > file.png"` (usa cmd.exe)
- El método `shell + pull` de arriba (más fiable)

**LECCIÓN CRÍTICA**: NUNCA redirigir salida binaria de adb con `>` en PowerShell. Siempre `adb shell + adb pull`.

## Credenciales de test (apps/api/prisma/seed.ts)

Todos con password `password123` (bcrypt hash en DB):
- `carlos@test.com` → CarlosGol, FORWARD, Madrid (40.4168, -3.7038)
- `marta@test.com` → MartaMuro, DEFENDER, Barcelona (41.3851, 2.1734)
- `david@test.com` → DavidMago, MIDFIELDER, Madrid

Club seed: "Los Cracks FC" (admin=carlos, captain=marta, player=david).

Re-seed: `npm run api:db:seed` desde raíz.

## Config de la app

- **Mobile `.env`**: `EXPO_PUBLIC_API_URL=http://192.168.40.128:3000/api`
  - ⚠️ Esa IP es la de la LAN de la oficina. **Al pasar a casa hay que cambiarla** por la IP local de casa (o usar túnel/ngrok o hardcodear localhost si está en emulador).
- **API `.env`**: Neon Postgres cloud, JWT secret dev, PORT 3000
- **CORS_ORIGIN**: `http://localhost:19006`
- Metro bundler corre vía `run-metro.bat` (nuevo helper en raíz del repo)
- API corre con `npm run api:dev` (desde raíz)

## Estado del login en el device (al final de la sesión)

1. Dismissed autofill overlay (Google sugería `qaindieteam@gmail.com`, no es usuario válido)
2. Email tecleado: `carlos@test.com` (via `adb shell input tap 540 1120` + `input text`)
3. Password tecleado: `password123` (via tap 540 1305)
4. Tap al botón "Entrar" en (540, 1520) → **adb dio `protocol fault: connection reset`**
5. Estado real en el device: desconocido — pudo haber entrado o no
6. **Verificado vía API**: el endpoint `POST /api/auth/login` con esas credenciales devuelve 200 + JWT válido, así que las credenciales son correctas y la API/DB está sana.

**Al retomar mañana**: tomar screenshot con el método correcto para ver en qué pantalla quedó, y si no entró, repetir el tap del botón Entrar.

## Commit realizado en esta sesión

Ver git log. WIP snapshot antes de migrar de máquina. Incluye:
- Prettier reformat masivo (31 archivos, +2286/-992)
- Iteración en API routes (matches, votes, competitions)
- Iteración en mobile screens (MatchDetail, Profile, Rankings, Voting, Home, Clubs)
- Assets de la app (iconos, splash) añadidos al repo
- `run-metro.bat` como helper Windows
- `.gitignore` extendido para ignorar `apps/mobile/android/{build,.gradle,.kotlin,hs_err*}` y `device-screen.png`

## Para MAÑANA (continuar en casa)

### Setup inicial (máquina de casa)
1. `git clone https://github.com/zeroz3r0/matchday-social-app.git` (o `git pull` si ya existe)
2. `npm install` en raíz (monorepo, instala todo)
3. Copiar `apps/api/.env` con DATABASE_URL de Neon + JWT_SECRET (NO está en git)
4. Copiar/crear `apps/mobile/.env` con `EXPO_PUBLIC_API_URL=http://<IP-LAN-CASA>:3000/api`
5. `npm run api:db:seed` si la DB de Neon está vacía (normalmente ya está poblada)
6. Arrancar API: `npm run api:dev` (desde raíz)
7. Arrancar Metro: `.\run-metro.bat` o `npm run mobile:start`
8. Correr la app en device/emulator con la app Expo Go o build nativo

### Checklist para retomar
- [ ] Ajustar `EXPO_PUBLIC_API_URL` con IP local de casa
- [ ] Verificar que la IP de la LAN de casa sea alcanzable desde el móvil (mismo WiFi)
- [ ] Si no hay device, usar emulador Android (Android Studio) o iOS (Xcode)
- [ ] Screenshot del device: `adb shell screencap -p /sdcard/s.png; adb pull /sdcard/s.png`
- [ ] Login: `carlos@test.com` / `password123`
- [ ] Continuar donde sea que quedó — posiblemente: HomeScreen, lista de partidos, crear match, etc.

### Tareas pendientes (de mayor a menor prioridad)
1. **ALTO**: Confirmar que el login funciona end-to-end desde el device (falló el último tap)
2. **ALTO**: Revisar si el WIP de prettier/reformat necesita algún ajuste (mirar diffs a fondo). Los diffs eran masivos pero la mayoría era solo formato.
3. **MEDIO**: Si hay feature en curso (no quedó claro cuál), identificarla por el último commit + archivos que más cambiaron (MatchDetailScreen +345, routes/matches +524, routes/votes +331, routes/competitions +285).
4. **MEDIO**: Considerar si `apps/mobile/android/` debería estar fully ignored o si hay archivos custom que sí deberían subirse (app/src/main/AndroidManifest.xml custom, etc.). Por ahora ignorado.
5. **BAJO**: Tests. Los `__tests__/*.test.ts` fueron tocados — verificar que pasan (`npm test` en apps/api y packages/shared).

## Archivos/paths relevantes

- `C:\Users\spere\matchday-social-app\` — proyecto
- `C:\Users\spere\matchday-social-app\apps\api\prisma\seed.ts` — usuarios de test
- `C:\Users\spere\matchday-social-app\apps\mobile\.env` — API URL (ajustar en casa)
- `C:\Users\spere\matchday-social-app\run-metro.bat` — arranque rápido Metro
- `C:\Users\spere\matchday-social-app\apps\api\.env` — DATABASE_URL + JWT (NO en git)

## Comandos útiles del día

```powershell
# Screenshot correcto (sin corruption)
adb shell screencap -p /sdcard/s.png; adb pull /sdcard/s.png device-screen.png; adb shell rm /sdcard/s.png

# Probar login via API
$body = @{ email = "carlos@test.com"; password = "password123" } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body $body

# Arrancar todo
npm run api:dev  # terminal 1
.\run-metro.bat  # terminal 2
```
