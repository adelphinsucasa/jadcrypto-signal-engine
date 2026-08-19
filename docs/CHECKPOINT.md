# JadCrypto Signal Engine — Checkpoint de Contexto Persistente

> **Regla de Oro (Agent_Context.md):** Antes de generar código para cualquier nueva
> instrucción o módulo, lo primero que se debe hacer es **actualizar este archivo**
> reflejando el estado actual del proyecto. Una entrada por turno, fechada (ISO-8601),
> sin reescritura retroactiva.

---

## 📌 Entry 001 — Inicialización del proyecto y reglas de arquitectura

**Fecha (ISO-8601):** 2026-08-19
**Turno:** Inicial
**Agente:** jadcrypto-ai (Qwen Code)

### ✅ Último Estado Completado

- **Paso 1 — Frontend Móvil (React Native + TypeScript)** — 100 % prototipado y listo para pruebas visuales:
  - `mobile/JadCryptoMobile/src/types/alert.ts` — tipos SMC completos (`SMCAlert`, `POIType`, `RiskManagement`, etc.).
  - `mobile/JadCryptoMobile/src/mocks/mockAlerts.ts` — 8 alertas mock cubriendo los 8 estados del ciclo de vida y 8 símbolos Top 10.
  - `mobile/JadCryptoMobile/src/components/OverlayAlertCard.tsx` — tarjeta overlay tema oscuro Binance (`#121824`) con secciones de estructura SMC, operación, confirmación (OI + RSI), gestión de riesgo (1–2 %) y botón silenciar.
  - `mobile/JadCryptoMobile/src/components/index.ts` — barrel de exports.
  - `mobile/JadCryptoMobile/src/screens/HistoryScreen.tsx` — pantalla de histórico con `FlatList` en orden cronológico inverso, banner de estado del motor (`Motor: ACTIVO | Escaneo: cada 3 min`) y fondo `#0B0E11`.
  - `mobile/JadCryptoMobile/src/screens/index.ts` — barrel de exports.
  - `mobile/setup-project.bat` — script de bootstrap del proyecto RN con dependencias (`system-alert-window`, `sound`, `vibration`, navigation, axios, async-storage, date-fns).
- **Paso 2 — Backend (Node + TS + Express + PostgreSQL) inicializado:**
  - `docker-compose.yml` (raíz) — PostgreSQL 16 + PgAdmin 8, healthcheck, volúmenes nombrados.
  - `backend/package.json` + `tsconfig.json` (strict mode completo).
  - `backend/.env.example` + `backend/.gitignore`.
  - `backend/db/init/001_init.sql` — script SQL idempotente.
  - `backend/src/config/env.ts` — validación con Zod.
  - `backend/src/db/datasource.ts` — TypeORM DataSource.
  - `backend/src/db/migrations/1700000000000-InitSchema.ts` — migración idempotente con `IF NOT EXISTS` + sembrado singleton de `EngineConfig`.
  - `backend/src/entities/Alert.ts` — entidad completa con `idempotencyKey` único.
  - `backend/src/entities/EngineConfig.ts` — singleton con `engineEnabled`, `scanIntervalMinutes`, `symbolsUniverse`, optimistic locking.
  - `backend/src/types/smc.ts` — enums y tipos compartidos.
  - `backend/src/app.ts` + `backend/src/server.ts` — bootstrap Express con helmet/cors/morgan, conexión a DB y ejecución de migraciones.

### 🚧 Trabajo en Progreso (In-Flight)

- **Actualización de arquitectura (este turno):**
  - Adición al `Agent_Context.md` de la sección **ESTRATEGIA DE IDEMPOTENCIA EN ENTIDADES BACKEND**.
  - Adición al `Agent_Context.md` de la sección **SISTEMA DE CHECKPOINT DE CONTEXTO PERSISTENTE** (Regla de Oro).
  - Modificación de la entidad `Alert` para incluir `idempotencyKey: varchar(128) UNIQUE NOT NULL` + índice `idx_alerts_idempotency_key_created_at`.
  - Reflejado en script SQL `001_init.sql` y en la migración TypeORM.
  - Creación de `docs/CHECKPOINT.md` con la presente entrada.

### 🎯 Pendientes Inmediatos (siguiente paso del itinerario)

- **Paso 2 (continuación) — Repositorio GitHub:** inicializar repo, `.gitignore` raíz, primer commit versionado.
- **Paso 3 — Motor Backend de análisis SMC:** `EngineService` (start/stop dinámico), cliente WebSocket Binance Futures (`fstream.binance.com`), módulo de detección POI/ChoCH/Inducement, integración OI + RSI, deduplicación por `idempotencyKey` con ventana de 15 min.
- **Endpoints REST pendientes:** `GET/POST /api/alerts`, `PATCH /api/engine/config`, `GET /api/engine/status`.
- **Paso 4 — Notificaciones Android nativas** + canal overlay con `SYSTEM_ALERT_WINDOW`.

### 🧠 Decisiones Técnicas Tomadas

| Área | Decisión | Motivo |
|---|---|---|
| Stack backend | **Node 20 + Express 4 + TypeORM 0.3 + PostgreSQL 16** | Coherente con modelfile; TS estricto end-to-end. |
| Validación env | **Zod** | Errores claros al arranque; tipado automático. |
| Seguridad HTTP | **helmet + cors + morgan** | Hardening base para API pública. |
| Idempotencia BD | **UUID (`pgcrypto`) + `idempotency_key UNIQUE` + índice compuesto (`idempotency_key`, `created_at DESC`)** | Evita duplicados por reconexión WS sin migrar de nuevo. |
| Persistencia de configuración | **`engine_config` singleton** con sembrado `INSERT … WHERE NOT EXISTS` | Un único registro vivo; cambios vía API. |
| Concurrencia de engine | **`@VersionColumn` (optimistic locking)** en `EngineConfig` | Evita carreras en start/stop simultáneo. |
| Persistencia de estructura SMC | **JSONB** para `poi`, `choch`, `inducement`, `openInterest`, `rsi`, `risk`, `takeProfits` | Esquema estable, evolutivo sin migraciones constantes. |
| TypeScript | **strict + noUnusedLocals + noUnusedParameters + noImplicitReturns + noFallthroughCasesInSwitch** | Máxima rigurosidad. |
| Frontend móvil | **React Native 0.74+ + TS** vía `@react-native-community/cli` | Plantilla oficial ya incluye TS desde 0.71. |
| Tema visual | **#121824 base (overlay), #0B0E11 base (history), acentos `#02C076` LONG / `#F6465D` SHORT / `#F0B90B` Binance** | Coherencia con Binance dark. |
| Orden histórico | **cronológico inverso** (`createdAt DESC`) | Última alerta arriba, como pide el requisito. |
| Idempotencia a nivel aplicación | **Ventana de 15 minutos** (configurable en `EngineConfig`) | Valor por defecto sugerido en este turno. |

---

## 📌 Entry 002 — _Reservado para la próxima actualización del agente_

> Cada nueva instrucción añadirá una entrada al final de este archivo,
> manteniendo historial y trazabilidad del proyecto.
