# PROFE TRACKER — Sistema de Gestión de Asistencia Docente

> **Centraliza toda la gestión de asistencia del plantel docente en un solo lugar.**  
> Licencias, permisos, reemplazos, salidas pedagógicas, reuniones, consejo de profesores, hitos PME y más — todo bajo control.

---

## 🎯 Objetivo

Reemplazar el Excel cooperativo con un sistema colaborativo donde el equipo administrativo del colegio (inspectores, administradores, directivos) pueda gestionar la asistencia docente de forma rápida, visual y en tiempo real.

**Filosofía:** Toda la información es abierta y editable — sin barreras de solo lectura, todos pueden aportar, editar y mantener los registros.

---

## ✨ Módulos

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| 👨‍🏫 **Profesores** | ✅ Completo | ABM + importación CSV con drag & drop y preview |
| 🗓️ **Calendario Semanal** | ✅ Completo | Vista 60/40 con sidebar, integración de todos los eventos, filtros por tipo |
| 🏥 **Licencias Médicas** | ✅ Completo | Registro desde/hasta, cálculo automático de días, alertas de pago |
| 🪪 **Permisos Admin** | ✅ Completo | Día completo, medio día (AM/PM) |
| 📵 **Ausencias** | ✅ Completo | Con aviso / sin aviso + justificación |
| 🚌 **Salidas Pedagógicas** | ✅ Completo | Registro con acompañantes y cobertura |
| 🤝 **Reuniones** | ✅ Completo | Registro con acuerdos, actas y seguimiento |
| 🏫 **Consejo de Profesores** | ✅ Completo | Convocatoria, responsables, temas, acuerdos y compromisos |
| 🎉 **Hitos PME** | ✅ Completo | Días especiales, fechas del PME, evaluaciones, simulacros |
| 🔐 **Autenticación** | ✅ Completo | Email/password + Google OAuth |
| 🤖 **Chatbot IA** | ✅ Completo | Asistente Gemini que responde sobre datos del sistema |
| 📊 **Analytics** | 🔄 Planificado | Dashboard de KPIs, reportes de ausentismo, exportación PDF/Excel |
| 👀 **Observaciones de Aula** | ⏳ Futuro | Rúbrica, acompañamiento docente, seguimiento |
| 🔔 **Alertas Push** | ⏳ Futuro | Notificaciones para clases sin reemplazo, licencias largas, etc. |

---

## 🛠 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 16 + React 19 + TypeScript |
| **Estilos** | Tailwind CSS v4 + sistema de diseño Cohere |
| **Base de Datos** | Supabase (PostgreSQL + Realtime) |
| **Autenticación** | Google OAuth 2.0 + Supabase Auth |
| **IA** | Google Gemini API (chatbot) |
| **Hosting** | Vercel |
| **Animaciones** | Anime.js v4 |
| **Iconos** | Lucide React |

---

## 🚀 Empezar

```bash
# 1. Clonar
git clone https://github.com/maur-ojeda/Profetraker.git
cd Profetraker

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales de Supabase y Gemini

# 4. Iniciar desarrollo
npm run dev
```

### Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `GEMINI_API_KEY` | API key de Google Gemini |

---

## 🏗 Arquitectura

```
src/
├── app/
│   ├── api/          # 15 API routes (CRUD + semanal + chat + import)
│   ├── auth/         # Callback OAuth
│   ├── calendario/   # Vista semanal 60/40
│   ├── dashboard/    # Página principal con calendario + sidebar
│   ├── login/        # Login con email + Google OAuth
│   ├── profesores/   # CRUD profesores + import CSV
│   ├── licencias/    # Gestión de licencias
│   ├── permisos/     # Permisos administrativos
│   ├── ausencias/    # Registro de ausencias
│   ├── salidas/      # Salidas pedagógicas
│   ├── reuniones/    # Reuniones y acuerdos
│   ├── consejo/      # Consejo de profesores
│   ├── hitos/        # Hitos PME
│   └── chat/         # Chatbot Gemini
├── lib/
│   ├── supabase.ts   # Cliente Supabase browser
│   ├── animaciones.ts # Anime.js helpers
│   ├── gemini.ts     # Cliente Gemini
│   └── chat-functions.ts # Schema definitions para Gemini
└── components/       # Componentes compartidos
```

---

## 🗄 Base de Datos (Supabase)

9 tablas con relaciones, RLS policies e índices:

- `profesores`
- `licencias_medicas`
- `permisos_administrativos`
- `ausencias`
- `salidas_pedagogicas`
- `reemplazos`
- `reuniones` + `compromisos_reunion`
- `consejo_profesores`
- `hitos_pme`

Migraciones en `supabase/migrations/`.

---

## 🌐 Deploy

### Producción (Vercel)

- **URL producción:** `https://profe-tracker-beta.vercel.app`
- **Proyecto Vercel:** `profe-tracker` (mauriciojedab-7488s-projects)
- **Supabase Cloud:** `wsgexugriptybzeflsew`

> ⚠️ **Nota:** Este proyecto usa API routes de Next.js, por lo que **no es compatible con GitHub Pages** (solo contenido estático). Las alternativas de hosting son Vercel, Railway, Fly.io o un VPS con Node.

### Desarrollo (Local)

```bash
# Iniciar Supabase local
supabase start

# Iniciar Next.js
npm run dev
```

---

## 📄 Licencia

Uso interno — Proyecto privado.
