# MEMORIA TÉCNICA DEL PROYECTO: CRIPTO SMC ALERT ENGINE

## VISIÓN DEL SISTEMA
Construir un sistema modular full-stack para escanear el mercado de Futuros de Binance en tiempo real, identificar escenarios de alta probabilidad según Smart Money Concepts (SMC) combinados con datos de Open Interest (OI), y enviar alertas flotantes persistentes con cálculo automático de gestión de riesgo a un dispositivo Android.

## REGLAS DE NEGOCIO Y ESTRATEGIA SMC
1. **Filtro del Top 10 de Activos:**
   - Seleccionar dinámicamente los 10 activos con mayor volumen en 24h y volatilidad superior al 5%.
   - Descartar activos con baja liquidez o manipulación extrema de Spread.

2. **Criterios de Estructura de Mercado:**
   - **Tendencia Macro (1H / 4H):** Determinada por la sucesión de HH/HL (Alcista) o LH/LL (Bajista).
   - **Punto de Interés (POI):** Identificación de Order Blocks (OB) no mitigados y Fair Value Gaps (FVG).
   - **Inducement / Liquidez:** Presencia de liquidez previa al OB/FVG (mínimos/máximos relativos iguales).
   - **Confirmación Micro (5m / 1m):** Esperar un ChoCH (Change of Character) cuando el precio interactúa con el OB o el 50% del FVG.

3. **Confirmación con Derivados y Osciladores:**
   - **Open Interest (OI):** Incremental (OINV) que sostenga la dirección de la ruptura.
   - **RSI (14):** Si el activo se encuentra saturado en zonas de sobrecompra (>70) o sobreventa (<30) por un tiempo prolongado en la temporalidad macro, descartar la entrada.

4. **Motor de Gestión de Riesgo Integrado:**
   - Riesgo parametrizable por el usuario: entre 1% y 2% del balance libre de la cuenta.
   - Recálculo en tiempo real: `Riesgo_Efectivo = Balance_Total - (Suma_Riesgo_Operaciones_Abiertas)`.
   - Cálculo automático del tamaño de posición basado en la distancia exacta en pips/puntos entre Entrada y Stop Loss.
   - Ratio Riesgo:Beneficio dinámico fijado por defecto en 1:3 para TP1.

## ARQUITECTURA TÉCNICA Y RESTRICCIONES
- **Backend:** Node.js (TypeScript) / PostgreSQL.
- **Frontend:** React Native (TypeScript) compilado para Android.
- **Overlay Window:** Debe usar permisos `SYSTEM_ALERT_WINDOW` de Android para dibujarse sobre otras aplicaciones.
- **Persistencia y Sonido:** Alerta con loop continuo de audio y vibración hasta ser descartada por el usuario.
- **Histórico:** Las alertas enviadas deben guardarse en PostgreSQL y sincronizarse con la vista de historial de la App.

## ESTRATEGIA DE IDEMPOTENCIA EN ENTIDADES BACKEND
- **Campo deduplicador:** la entidad `Alert` debe incluir `idempotencyKey: string` único por escenario SMC detectado.
- **Formato canónico de la clave:**
  `<SYMBOL>-<DIRECTION>-<TIMEFRAME>-<EPOCH_MS_DE_DETECCION>`
  Ejemplo: `BTCUSDT-LONG-1m-1724083200000`.
- **Regla de deduplicación previa al registro/notificación:**
  Antes de insertar una nueva alerta o de emitir un Overlay sobre la app Android,
  el backend debe validar que NO exista una alerta procesada con la misma
  `idempotencyKey` dentro de una **ventana de tiempo parametrizable**
  (valor por defecto: **15 minutos**, configurable vía `EngineConfig`).
- **Justificación:** evitar disparos duplicados tras reconexiones de Binance WebSocket
  o reintentos del motor de escaneo.
- **Capa técnica:**
  - Columna `idempotency_key varchar(128) UNIQUE NOT NULL` en `alerts`.
  - Índice `idx_alerts_idempotency_key_created_at` sobre (`idempotency_key`, `created_at DESC`).
  - Validación previa con `SELECT 1 ... WHERE created_at > now() - INTERVAL '15 minutes'`.
  - Si ya existe, descartar silenciosamente (`SKIP`) y NO emitir Overlay.
- **Idempotencia de esquema:** todas las migraciones deben usar
  `CREATE ... IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, y sembrados con
  `INSERT ... ON CONFLICT DO NOTHING` para garantizar re-ejecución segura.

## SISTEMA DE CHECKPOINT DE CONTEXTO PERSISTENTE (docs/CHECKPOINT.md)
- **Regla de Oro del Agente:** Antes de generar código para cualquier nueva instrucción
  o módulo, lo PRIMERO que se debe hacer es actualizar `docs/CHECKPOINT.md`
  reflejando el estado actual del proyecto.
- **Secciones obligatorias en cada actualización:**
  1. **Último Estado Completado** — lo que ya está 100 % programado y probado.
  2. **Trabajo en Progreso (In-Flight)** — la tarea exacta ejecutándose en el turno actual.
  3. **Pendientes Inmediatos** — el siguiente paso según el itinerario.
  4. **Decisiones Técnicas Tomadas** — librerías elegidas, esquemas de BD, rutas creadas.
- **Propósito:** garantizar continuidad del contexto entre turnos y entre agentes
  que colaboren en el proyecto (especialmente en trabajos en background).
- **Ubicación:** `docs/CHECKPOINT.md` en la raíz del repositorio.
- **Política de escritura:** una entrada por turno, fechada (ISO-8601), sin
  reescritura retroactiva: se añade al final y nunca se borra historial válido.

## MODO DE TRABAJO E ITINERARIO DE DESARROLLO
- Desarrollar en pasos incrementales y aislados.
- Paso 1: Interfaz gráfica y prototipo del Overlay/UI en React Native.
- Paso 2: Configuración del repositorio GitHub y esquema de base de datos PostgreSQL.
- Paso 3: Motor Backend de análisis e integración con Binance WS.
- Paso 4: Servicio de Notificaciones y canal nativo Android.
