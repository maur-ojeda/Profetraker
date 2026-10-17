# Profe Tracker — Despliegue en Coolify (self-host)

> **Objetivo:** correr Profe Tracker (Next.js 16 + Supabase) en tu propio servidor
> a través de Coolify, con HTTPS real cuando compres un dominio, ideal para
> demos a clientes y validación de ideas sin pagar infraestructura cloud.

---

## ✅ Estado del setup (verificado en local)

Antes de hacer push, este setup fue probado localmente con Docker:

- ✅ `npm run build` con `output: 'standalone'` genera `.next/standalone/` correctamente
- ✅ La imagen Docker se construye sin errores (~712 MB con todas las deps)
- ✅ El container arranca, Next.js 16.2.6 bootea en 0ms
- ✅ Las rutas `/`, `/login`, `/dashboard`, `/profesores`, `/calendario` devuelven HTTP 200
- ✅ El endpoint `/api/cron/keep-alive` autentica con `Bearer <CRON_SECRET>` (401 sin secret, 500 con secret cuando Supabase no responde — comportamiento esperado)

---

## 📋 Requisitos

| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| **Coolify** | v4.x | v4.x (la que tenés en `192.168.1.81:8000`) |
| **RAM servidor** | 4 GB | 8 GB+ (Supabase + Next + DB) |
| **Disco** | 20 GB | 50 GB+ (DB + Storage + imágenes) |
| **CPU** | 2 vCPU | 4 vCPU |
| **Docker** | 24+ | 25+ |
| **Dominio** (opcional para HTTPS) | — | DuckDNS gratis o dominio real |

> 💡 **Por qué 8 GB de RAM:** el stack de Supabase self-hosted levanta ~10
> contenedores (Postgres, GoTrue, PostgREST, Realtime, Storage, Studio, Kong,
> Imgproxy, Meta, Functions) y cada uno traga entre 100–500 MB en idle.

---

## 🏗 Arquitectura

```
Coolify (192.168.1.81:8000)
│
├── 📦 Proyecto 1: "Profe Tracker — Supabase"   (docker-compose)
│   ├── Postgres 17   (DB)         → host port 5432
│   ├── Kong          (API GW)     → host port 8000  ← APP conecta acá
│   ├── GoTrue        (Auth)       → solo red interna
│   ├── PostgREST     (REST)       → solo red interna
│   ├── Realtime                   → solo red interna
│   ├── Storage                    → solo red interna
│   ├── Studio        (DB UI)      → host port 3000  ← vos entrás acá
│   └── Functions, Meta, Imgproxy  → solo red interna
│
└── 📦 Proyecto 2: "Profe Tracker — App"   (Dockerfile)
    └── Next.js 16 standalone      → host port 3000
```

> ⚠️ **Colisión de puertos:** el Studio de Supabase usa 3000 y la app Next.js
> también usa 3000. Coolify te deja mapear puertos distintos o poner cada
> proyecto detrás de un dominio diferente. Ver [Troubleshooting](#colisión-de-puerto-3000).

---

## 🚀 Quick start (TL;DR)

Si ya tenés Coolify corriendo y querés ir directo:

1. **Stack Supabase:** en Coolify, nuevo Docker Compose → pegar `deploy/docker-compose.coolify.yml` → setear las variables de `.env.coolify.example` (con los secrets generados con `openssl rand -hex 32`).
2. **Migraciones:** entrar a Studio (host port 3000) y correr el SQL de `supabase/migrations/20260527170000_init_schema.sql`.
3. **App:** nuevo Application (Dockerfile) → apuntar a la rama `feat/coolify-self-host` → setear `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `CRON_SECRET`.
4. **Probar:** abrir `http://192.168.1.81:3000` y loguearse.

Para más detalle, seguí leyendo.

---

## 🚀 Setup paso a paso

### 1. Preparar variables de entorno (localmente)

```bash
# En tu Mac, desde la raíz del proyecto
cp .env.coolify.example .env.coolify
```

Luego generá los secretos:

```bash
# Cada uno en una línea
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 32   # → POSTGRES_PASSWORD
openssl rand -hex 64   # → SECRET_KEY_BASE
openssl rand -hex 32   # → VAULT_ENC_KEY
openssl rand -hex 32   # → PG_META_CRYPTO_KEY
openssl rand -hex 32   # → CRON_SECRET
```

Abrí `.env.coolify` y reemplazá todos los `replace-with-openssl-...` por los
valores generados. **Anotalos en un gestor de contraseñas** — si los perdés,
no podés recuperar la DB.

### 2. Generar ANON_KEY y SERVICE_ROLE_KEY

Estos son JWTs firmados con `JWT_SECRET`. Necesitás un script chico para
generarlos (la forma soportada por Supabase):

**Opción A — con Node (recomendado):**

```bash
# Una vez que tengas JWT_SECRET en tu shell:
export JWT_SECRET="el-valor-que-generaste"

# Generar ANON_KEY
node -e '
const header = { alg: "HS256", typ: "JWT" };
const payload = {
  role: "anon",
  iss: "supabase",
  iat: Math.floor(Date.now()/1000),
  exp: Math.floor(Date.now()/1000) + 10*365*24*3600  // 10 años
};
const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const crypto = require("crypto");
const sig = crypto.createHmac("sha256", process.env.JWT_SECRET)
  .update(`${enc(header)}.${enc(payload)}`).digest("base64url");
console.log(`${enc(header)}.${enc(payload)}.${sig}`);
'  # → copiar como ANON_KEY

# Generar SERVICE_ROLE_KEY (mismo comando, cambiar role a "service_role")
```

**Opción B — con Docker (sin instalar nada):**

```bash
docker run --rm -e JWT_SECRET=$JWT_SECRET node:20-alpine sh -c '
node -e "
const crypto = require(\"crypto\");
const enc = (o) => Buffer.from(JSON.stringify(o)).toString(\"base64url\");
const header = enc({alg:\"HS256\",typ:\"JWT\"});
const anon = enc({role:\"anon\",iss:\"supabase\",iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+315360000});
const srv = enc({role:\"service_role\",iss:\"supabase\",iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+315360000});
const sigA = crypto.createHmac(\"sha256\", process.env.JWT_SECRET).update(`${header}.${anon}`).digest(\"base64url\");
const sigS = crypto.createHmac(\"sha256\", process.env.JWT_SECRET).update(`${header}.${srv}`).digest(\"base64url\");
console.log(\"ANON_KEY=\" + header + \".\" + anon + \".\" + sigA);
console.log(\"SERVICE_ROLE_KEY=\" + header + \".\" + srv + \".\" + sigS);
"'
```

Pegá ambos valores en `.env.coolify`.

### 3. Deploy del stack Supabase en Coolify

1. Abrí `http://192.168.1.81:8000` y logueate.
2. **Projects → + Add → New Resource → Docker Compose**.
3. Como origen, elegí **"Docker Compose"** y pegá el contenido de
   `deploy/docker-compose.coolify.yml` (o apuntá el repo a esa ruta).
4. En la sección **"Environment Variables"**, pegá las variables de tu
   `.env.coolify` (las que tienen prefijo POSTGRES, JWT, ANON, SERVICE, etc.).
5. **Deploy**. La primera vez tarda ~5-10 minutos (descarga ~2 GB de imágenes).
6. Verificá que los 10 contenedores estén `running`:
   ```bash
   # Desde Coolify UI: Service → Logs de cada contenedor
   # O por SSH al servidor:
   docker ps | grep profe-tracker
   ```
7. Entrá a **Studio** (host port 3000) y comprobá que ves la DB vacía.
   Credenciales: `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` que pusiste.

### 4. Aplicar las migraciones de Profe Tracker

La DB está vacía. Hay que correr las migraciones de `supabase/migrations/`:

**Opción A — desde la UI de Studio:**
1. Abrí Studio (host port 3000).
2. SQL Editor → New query.
3. Copiá el contenido de `supabase/migrations/20260527170000_init_schema.sql`
   y ejecutalo.

**Opción B — con psql directo (más rápido para repetir):**

```bash
# Una vez (instalá psql en tu Mac con: brew install postgresql@17)
docker exec -i profe-tracker-db psql \
  -U postgres -d postgres \
  < supabase/migrations/20260527170000_init_schema.sql
```

> 💡 **RLS:** la migración ya incluye las policies. Verificá en Studio
> que `Authentication → Policies` muestre las reglas de cada tabla.

### 5. Deploy de la app Next.js en Coolify

1. **Projects → + Add → New Resource → Application → Dockerfile**.
2. Apuntá a la **rama `feat/coolify-self-host`** de tu repo.
3. Configuración del build:
   - **Build Pack:** Dockerfile
   - **Dockerfile Location:** `/Dockerfile` (raíz)
   - **Port:** 3000
4. **Environment Variables** (estas son las que ve la app, no Supabase):
   ```
   NEXT_PUBLIC_SUPABASE_URL=http://192.168.1.81:8000
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<el mismo ANON_KEY que generaste>
   GEMINI_API_KEY=<tu key de Google AI Studio>
   NEXT_PUBLIC_DEV_MODE=false
   CRON_SECRET=<el que generaste>
   PORT=3000
   ```
5. **Deploy**. La primera build tarda ~3-5 minutos.
6. La app queda accesible en `http://192.168.1.81:3000` (o el puerto
   que Coolify le asigne).

### 6. Probar el flujo completo

1. Abrí `http://192.168.1.81:3000` → debería cargar el login.
2. Logueate con `admin@colegio.cl` / `password123` (si dejaste
   `NEXT_PUBLIC_DEV_MODE=true`) o creá un usuario desde Studio.
3. Andá a **Profesores** y cargá uno.
4. Verificá en **Studio → Table Editor → profesores** que se vea la fila.
5. Andá a **Calendario Semanal** y comprobá que carguen los eventos.

---

## 🔐 Configurar HTTPS con dominio real (opcional)

> Saltá esta sección si por ahora solo querés probar en `192.168.1.81`.

### 6.1. Comprar dominio y apuntar DNS

Dominios baratos para demos (~$10-15/año): `.xyz`, `.site`, `.online`.

En el panel DNS del dominio:

```
Tipo: A
Host: profe-tracker  (o @ para el raíz)
Valor: TU_IP_PUBLICA  (la de tu casa, búscala en https://ifconfig.me)
TTL: 3600
```

### 6.2. Si tu IP es dinámica (lo más probable)

Usá **DuckDNS** (gratis):

1. Andá a https://www.duckdns.org y creá un subdominio: `profe.duckdns.org`
2. Apuntalo a tu IP pública actual.
3. Instalá un script en tu servidor (o NAS) que actualice la IP cada 5 min.
4. Coolify va a poder obtener el cert de Let's Encrypt contra `profe.duckdns.org`.

### 6.3. Port forwarding en tu router

Coolify necesita los puertos 80 y 443 abiertos para emitir el cert:

| Puerto externo | Puerto interno | IP destino |
|----------------|----------------|------------|
| 80  | 80  | 192.168.1.81 |
| 443 | 443 | 192.168.1.81 |

### 6.4. Configurar dominio en Coolify

1. Editá el proyecto de la **app** en Coolify.
2. **Domains** → agregá `https://profe.tudominio.com`.
3. Coolify detecta el dominio, pide el cert a Let's Encrypt, y configura
   el proxy reverso automáticamente.
4. **Actualizá `.env.coolify` (o las variables en Coolify UI):**
   - `SITE_URL=https://profe.tudominio.com`
   - `API_EXTERNAL_URL=https://supabase.tudominio.com` (si querés dominio
     separado para Supabase) **o** `http://kong:8000` si ambos están en
     la misma red Docker.
   - `NEXT_PUBLIC_SUPABASE_URL=https://supabase.tudominio.com` (o el mismo
     dominio si Coolify lo enruta por path).
5. Re-deploy.

---

## 🛠 Troubleshooting

### Colisión de puerto 3000

Síntoma: la app o Studio no levanta, "port already in use".

**Fix:** En Coolify, cambiá el port mapping de la app a 3001
(o de Studio a 3001). Luego actualizá `SITE_URL` y
`NEXT_PUBLIC_SUPABASE_URL` correspondientemente.

### App no conecta a Supabase

Síntoma: la app carga el login pero al loguearte da error de red.

1. Verificá que los contenedores de Supabase estén `healthy`:
   ```bash
   docker ps | grep profe-tracker
   # Todos deben decir "healthy" o "Up X minutes"
   ```
2. Verificá que `NEXT_PUBLIC_SUPABASE_URL` en la app sea **accesible
   desde el navegador**, no solo desde la red Docker. Si la app está en
   `http://192.168.1.81:3000`, Supabase tiene que estar en
   `http://192.168.1.81:8000` (puerto host de Kong).
3. Logs de la app en Coolify → "Logs" → buscá errores de Supabase.

### Error "Invalid API key" en login

**Causa:** el `NEXT_PUBLIC_SUPABASE_ANON_KEY` de la app no coincide con
el `ANON_KEY` de Supabase.

**Fix:** tienen que ser **exactamente iguales** (los dos se generan
desde el mismo `JWT_SECRET`).

### Migraciones no se aplican

**Fix:** la app no las aplica sola. Aplicalas manualmente con Studio
o psql como se explica en el paso 4.

### Cron / keep-alive no corre

`vercel.json` define el cron de Vercel. **Coolify no usa `vercel.json`**.

**Fix:** en Coolify, editá la app → **Scheduled Tasks** → agregá:
```
0 6 * * *  curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/keep-alive
```

(Ojo: si vas a estar en una IP pública con dominio, apuntá al dominio público.)

### Disco lleno

Síntoma: la DB se cayó con errores de "no space left".

**Fix:** los volúmenes persisten en `/var/lib/docker/volumes`. Limpiá
imágenes viejas y volúmenes huérfanos:
```bash
docker system prune -a --volumes
# CUIDADO: esto borra TODO. Solo si no tenés otros proyectos importantes.
```

---

## 📦 Reutilizar este patrón en otros proyectos

La estructura de archivos creada en esta rama es **genérica** y se puede
copiar tal cual a cualquier proyecto Next.js + Supabase:

```
proyecto-nuevo/
├── Dockerfile                # Multi-stage, mismo formato
├── .dockerignore             # Mismo formato
├── deploy/
│   └── docker-compose.coolify.yml   # Supabase self-host
├── .env.coolify.example      # Plantilla de variables
└── COOLIFY.md                # Adaptar URLs y dominios
```

**Checklist de adaptación:**

1. [ ] Cambiar `output: 'standalone'` en `next.config.ts`
2. [ ] Copiar `Dockerfile` y `.dockerignore`
3. [ ] Crear el proyecto Supabase en Coolify con el compose
4. [ ] Generar JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY (no compartir entre proyectos)
5. [ ] Aplicar migraciones del nuevo proyecto
6. [ ] Deploy de la app apuntando a las URLs correctas
7. [ ] Configurar cron para keep-alive (si aplica)

---

## 📚 Referencias

- [Supabase Self-hosting docs](https://supabase.com/docs/guides/self-hosting/docker)
- [Coolify docs](https://coolify.io/docs)
- [Next.js Standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [DuckDNS](https://www.duckdns.org/)

---

## 🔬 Notas técnicas: por qué el Dockerfile se ve así

Esto es lo que aprendí en el proceso, por si tenés que adaptarlo a otro
proyecto Next.js 16:

### 1. El output standalone está anidado bajo el path del repo

Next.js anida el output de standalone bajo la **ruta absoluta del repo en
el host de build**. En este Mac (`/Users/mauricioojeda/Projects/Profetraker`),
el bundle queda en:

```
.next/standalone/Users/mauricioojeda/Projects/Profetraker/server.js
```

En un CI limpio (Coolify) sería:

```
.next/standalone/Profetraker/server.js
```

**No hardcodear el path.** El Dockerfile usa `find` para localizar
`server.js` y un wrapper shell script para hacer `cd` antes de ejecutar.
El `-not -path '*/node_modules/*' -not -path '*/compiled/*'` es crítico:
sin él, el `find` agarra primero los `server.js` internos de Next
(`next/dist/compiled/...`) que NO son el entrypoint.

### 2. La imagen pesa ~712 MB, no ~100 MB

El `outputFileTracingIncludes` original (con un whitelist de `@supabase`,
`@google`, etc.) dejaba la imagen en 265 MB pero crasheaba en runtime con
`Cannot find module 'react'`. Next 16 / Turbopack es menos preciso que
Next 14 / webpack al hacer el trace de dependencias.

**Decisión:** incluir todo `node_modules/**` y `.next/server/**`. La
imagen crece a ~712 MB, pero funciona. Si en el futuro el size es
problema, se puede:

- Auditar con `docker history` qué carpeta es la más pesada
- Reemplazar dependencias pesadas (¿`lucide-react` de 1.14.0 es realmente
  la versión correcta? Probablemente NO, es un typo en `package.json`)
- Multi-stage más agresivo: copiar solo `node_modules/{react,react-dom,...}`

### 3. Placeholders en build, valores reales en runtime

El Dockerfile define las env vars como placeholders durante `npm run build`
para que Next pueda analizar estáticamente las API routes que usan
`process.env.NEXT_PUBLIC_SUPABASE_URL` en import-time. Sin esto, la build
falla con "Failed to collect page data for /api/calendario".

Los valores **reales** se inyectan en runtime desde Coolify y reemplazan
los placeholders, así que no hay riesgo de leak.

---
