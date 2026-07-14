# 🦴 Boneyard — Plan de Implementación (Corregido)

> **Boneyard** extrae skeletons pixel-perfect de tu UI real durante el build.
> Sin skeletons a mano. Sin layout shifts. Sin adivinar tamaños.

---

## 1. Diagnóstico Actual

### Loading states hoy

| Componente | Estado actual | Problema |
|---|---|---|
| **authLoading** (page.tsx) | Spinner + "Verificando sesión..." | Genérico, no comunica estructura |
| **CensoTable** | Spinner centrado + overlay translúcido + "Cargando censo..." | Layout shift al montar la tabla real |
| **CensoStats** | Muestra `0` mientras `stats === null` | El usuario ve datos falsos (ceros) |
| **CensoHeader** | Sin loading state | No lo necesita — es UI pura, no carga datos |
| **CensoFilters** | Sin loading state | No lo necesita — es UI pura, no carga datos |
| **Login** | Tiene `loading` para el submit button | Ya está bien resuelto, no necesita skeleton |

### Lo que realmente duele

1. **CensoTable** es el peor: overlay absoluto que desaparece y la tabla aparece de golpe. Layout shift grosero.
2. **CensoStats** muestra `0` en vez de nada — el usuario cree que no hay datos.
3. **authLoading** es un spinner solitario — pero es aceptable porque la verificación de sesión dura < 1s típicamente.

---

## 2. Arquitectura Propuesta (Simplificada)

```
src/
├── bones/                          # ← Generado por Boneyard CLI
│   ├── registry.ts                 # Auto-generado, se importa una vez
│   ├── censo-table.bones.json
│   └── censo-stats.bones.json
│
├── components/
│   ├── CensoTable.tsx              # ← Modificado: skeleton vía <Skeleton>
│   ├── CensoStats.tsx              # ← Modificado: skeleton vía <Skeleton>
│   ├── CensoHeader.tsx             # Sin cambios (no necesita skeleton)
│   ├── CensoFilters.tsx            # Sin cambios (no necesita skeleton)
│   └── Login.tsx                   # Sin cambios (ya tiene loading state)
│
├── hooks/
│   └── useCenso.ts                 # Sin cambios estructurales
│
└── app/
    ├── layout.tsx                  # ← Agregar import del registry de bones
    └── page.tsx                    # ← Modificado: tipado más estricto para loading
```

### Principio rector

**Solo ponés skeleton donde hay datos asíncronos.** Componentes de UI pura (Header, Filters) no necesitan skeletons. Esto reduce complejidad y evita falsos positivos visuales.

---

## 3. Plan de Implementación (4 Fases)

---

### Fase 1 — Setup

#### 3.1.1 Instalar dependencias

```bash
pnpm add boneyard-js
```

#### 3.1.2 Instalar el navegador de Playwright (PASO CRÍTICO)

Boneyard usa Playwright para abrir un Chromium headless y capturar tus componentes renderizados. El binario del navegador **no viene incluido** con la librería.

```bash
npx playwright install chromium
```

> ⚠️ Si salteás este paso, `pnpm bones` va a fallar con errores de "browser not found". Es el error más común en first-run.

#### 3.1.3 Archivo de configuración

```jsonc
// boneyard.config.json (raíz del proyecto)
{
  "breakpoints": [375, 768, 1280],
  "out": "./src/bones",
  "wait": 1500,
  "color": "rgba(0,0,0,0.06)",
  "animate": "shimmer",
  "shimmerColor": "rgba(0,0,0,0.02)",
  "speed": "2s"
}
```

> **Nota sobre dark mode:** Este proyecto no tiene dark mode implementado (no hay clase `.dark` en `<html>`). Si lo agregás en el futuro, Boneyard lo detecta automáticamente vía la clase `.dark` en `<html>` — no hace falta cambiar nada, solo agregar `"darkColor"` y `"darkShimmerColor"` a la config.

#### 3.1.4 Scripts en `package.json`

```jsonc
{
  "scripts": {
    "dev": "next dev --port 3456",
    "build": "next build",
    "bones": "npx boneyard-js build http://localhost:3456",
    "bones:watch": "npx boneyard-js build --watch http://localhost:3456",
    "dev:full": "concurrently -n next,bones \"next dev --port 3456\" \"npx boneyard-js build --watch http://localhost:3456\""
  }
}
```

> **¿Por qué puerto fijo 3456?** El CLI de Boneyard necesita saber dónde está tu app corriendo. Fijar el puerto en el script evita inconsistencias entre sesiones.

Instalá `concurrently` si querés el script `dev:full`:

```bash
pnpm add -D concurrently
```

#### 3.1.5 No necesitás tocar `next.config.ts`

Next.js 16 con Turbopack maneja imports JSON nativamente. No hace falta agregar reglas de webpack (que Turbopack ignora de todos modos).

#### 3.1.6 Verificación

```bash
pnpm dev          # Terminal 1: arrancá Next.js en puerto 3456
pnpm bones        # Terminal 2: debería ejecutar sin errores y crear src/bones/
```

---

### Fase 2 — CensoTable (el cambio grande)

Este es el componente que más gana con Boneyard. Pasa de un spinner con overlay a un skeleton shimmer con efecto cascada que respeta exactamente la estructura de la tabla.

#### Antes

```tsx
// CensoTable.tsx (líneas 62-67 actuales)
{loading ? (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 backdrop-blur-[1px] z-10 space-y-2">
    <div className="size-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs text-muted-foreground">Cargando censo...</span>
  </div>
) : null}
```

#### Después

```tsx
import { Skeleton } from "boneyard-js/react";

// En el JSX, reemplazar el bloque de loading:
<Skeleton
  name="censo-table"
  loading={loading}
  animate="shimmer"
  stagger={50}
  transition={300}
>
  {/* Todo el contenido de la tabla va acá adentro */}
  {persons.length === 0 ? (
    <div className="p-12 text-center ...">
      {/* Empty state existente, sin cambios */}
    </div>
  ) : (
    <Table>
      {/* Tabla existente, sin cambios */}
    </Table>
  )}
</Skeleton>
```

**Cambios concretos en el archivo:**

1. Agregar `import { Skeleton } from "boneyard-js/react";` al inicio
2. Eliminar el bloque `{loading ? (...) : null}` (líneas 62-67)
3. Envolver el contenido de `<div className="relative min-h-[300px]">` con `<Skeleton>`
4. El `<Skeleton>` va **adentro** del div contenedor, reemplazando el overlay spinner

#### Por qué shimmer + stagger

- **shimmer**: Ideal para tablas. Da sensación de movimiento horizontal, comunica "esto está cargando datos fila por fila".
- **stagger={50}**: 50ms entre cada bone. Las filas aparecen en cascada. Más natural que todo apareciendo a la vez.
- **transition={300}**: 300ms de fade cuando los datos llegan. Suaviza la transición.

---

### Fase 3 — CensoStats (eliminar los ceros falsos)

Este cambio es más sutil pero igual de importante. Actualmente el usuario ve `0` en total, suministros y médica mientras carga — eso es **información falsa**.

#### Antes

```tsx
// CensoStats.tsx (línea 54 y equivalentes)
<span className="text-2xl font-bold tracking-tight">{stats?.total || 0}</span>
```

#### Después

```tsx
import { Skeleton } from "boneyard-js/react";

// Envolver cada Card individual, o el grid entero según prefieras.
// Opción recomendada: envolver el grid de 3 cards principales.

<Skeleton
  name="censo-stats"
  loading={!stats}
  animate="pulse"
  transition={300}
>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    {/* Total card, Supplies card, Medical card — sin cambios */}
  </div>
</Skeleton>
```

**Cambios concretos:**

1. Agregar `import { Skeleton } from "boneyard-js/react";` al inicio
2. Envolver el grid de stats cards con `<Skeleton name="censo-stats" loading={!stats} animate="pulse" transition={300}>`
3. Las sector cards (scroll horizontal) pueden ir dentro del mismo skeleton o quedar visibles — como están siempre disponibles vía `sectors` array, no necesitan skeleton.

#### Por qué pulse

- **pulse**: Más suave que shimmer. Ideal para cards que no tienen estructura de filas. Da efecto "respiración".
- Sin stagger: 3 cards son pocas, el stagger no suma.

---

### Fase 4 — Generar bones + Verificar

#### 4.1. Importar el registry

```tsx
// src/app/layout.tsx — agregar al inicio
import "@/bones/registry";
```

Esto se hace **una sola vez**. Boneyard lo usa para resolver los nombres de skeletons en runtime.

#### 4.2. Generar los archivos de huesos

```bash
# Asegurate de que el dev server esté corriendo en puerto 3456
pnpm bones
```

Esto:
1. Abre Chromium headless
2. Navega a `http://localhost:3456`
3. Espera `wait: 1500ms` (configurado en boneyard.config.json)
4. Captura el layout de cada `<Skeleton name="...">` en 3 breakpoints
5. Genera `src/bones/censo-table.bones.json` y `src/bones/censo-stats.bones.json`
6. Actualiza `src/bones/registry.ts` automáticamente

#### 4.3. Verificar visualmente

```bash
pnpm dev
# Abrí http://localhost:3456
# Forzá un loading lento (Network tab → throttling: Slow 3G)
# Verificá que:
```

- [ ] La tabla muestra skeleton shimmer con 5+ filas fantasma
- [ ] Las stats cards muestran skeleton pulse (no muestran `0`)
- [ ] La transición de skeleton a contenido es suave (300ms fade)
- [ ] No hay layout shift: los skeletons ocupan exactamente el mismo espacio que el contenido real
- [ ] En mobile (375px) los skeletons se adaptan correctamente
- [ ] El CensoHeader y CensoFilters se ven normales (no necesitan skeleton)

---

## 4. Resumen de Tareas

| # | Fase | Qué | Archivos |
|---|---|---|---|
| 1 | Setup | Instalar boneyard-js, playwright, config, scripts | `package.json`, `boneyard.config.json` |
| 2 | CensoTable | Reemplazar spinner con `<Skeleton>` | `src/components/CensoTable.tsx` |
| 3 | CensoStats | Reemplazar `\|\| 0` con `<Skeleton>` | `src/components/CensoStats.tsx` |
| 4 | Bones + QA | Registry import, generar bones, verificar | `src/app/layout.tsx`, `src/bones/` |

---

## 5. Edge Cases

### 5.1. CLI necesita auth para capturar

Boneyard abre un Chromium **limpio**, sin cookies de sesión. Si tu app redirige a login, el CLI no va a ver los componentes protegidos.

**Solución:** Crear un fixture para el build:

```tsx
// Ejemplo para CensoTable — datos mock mínimos
const TABLE_FIXTURE = (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Nombre</TableHead>
        <TableHead>Cédula</TableHead>
        {/* ... mismas columnas que el componente real */}
      </TableRow>
    </TableHeader>
    <TableBody>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>Nombre Apellido</TableCell>
          <TableCell>V-12345678</TableCell>
          {/* ... mismas celdas con datos dummy */}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// Pasarlo como fixture:
<Skeleton name="censo-table" loading={loading} fixture={TABLE_FIXTURE}>
  {/* contenido real */}
</Skeleton>
```

Alternativa más simple: pasar una cookie de sesión al CLI.

```bash
npx boneyard-js build --cookie "session=TU_SESSION_TOKEN" http://localhost:3456
```

### 5.2. Stats con valor 0 (no null)

Cuando `stats` existe pero `total === 0` (legítimo), **no** queremos mostrar skeleton. Queremos mostrar `0`.

La condición `loading={!stats}` resuelve esto: solo muestra skeleton cuando `stats` es `null` (no cargado). Cuando `stats` es un objeto con `total: 0`, muestra `0` normalmente.

### 5.3. Tabla vacía (no loading)

El empty state (`persons.length === 0` sin loading) se maneja normalmente adentro del `<Skeleton>`:

```tsx
<Skeleton name="censo-table" loading={loading}>
  {persons.length === 0 ? <EmptyState /> : <Table />}
</Skeleton>
```

Cuando `loading` es `false`, Boneyard muestra el contenido real — sea el empty state o la tabla con datos.

### 5.4. Diálogos (Add/Edit/Delete)

No necesitan skeleton. Son interacciones del usuario, no cargas iniciales de datos. El botón de submit ya tiene su propio estado de carga con spinner.

### 5.5. Bundle size

`boneyard-js` pesa ~3KB gzipped en runtime. Los archivos `.bones.json` son JSON plano — la tabla genera ~2-5KB, las stats ~1KB. Total: <10KB adicionales. No es significativo.

### 5.6. Modo desarrollo con watch

```bash
pnpm dev:full
```

Usa `concurrently` para correr Next.js y el CLI watch en paralelo. Cada vez que cambiás un layout de componente, Boneyard re-captura automáticamente.

> **Limitación:** El watch del CLI puede tener un delay de 2-5s. Si necesitás regenerar instantáneamente, corré `pnpm bones` manualmente.

---

## Apéndice A: Lo que NO vas a hacer (y por qué)

### ❌ No crees componentes `SkeletonTable`, `SkeletonStats` custom

Boneyard ya provee `<Skeleton>`. Crear wrappers custom en `src/components/boneyard/` es código redundante que tenés que mantener. El plan original proponía esto — es innecesario para un proyecto de este tamaño.

### ❌ No uses `<BoneSuspense>` para todo el dashboard

`<BoneSuspense>` es útil con React `use()` + Suspense nativo. Tu proyecto usa `useState`/`useEffect` estándar. Forzar `BoneSuspense` requeriría refactorizar todo el data fetching — no vale la pena para este scope.

### ❌ No pongas skeleton en CensoHeader ni CensoFilters

Son componentes de UI pura. No cargan datos asíncronos. Ponerles skeleton es agregar "ruido visual" sin beneficio.

### ❌ No migres a React 19 `use()` todavía

Es un cambio arquitectónico grande que requiere repensar cómo fluyen los datos. No es una "optimización de Fase 5". Si en el futuro querés hacerlo, Boneyard ya va a estar listo porque usa el mismo `<Skeleton>` component.

---

## Apéndice B: Dark Mode (para el futuro)

Cuando agregues dark mode (probablemente con `next-themes`), solo necesitás dos cosas:

1. Asegurate de que la clase `.dark` esté en `<html>` (lo hace `next-themes` automáticamente)
2. Agregá las props de color oscuro a tu config o a cada `<Skeleton>`:

```jsonc
// boneyard.config.json
{
  "darkColor": "rgba(255,255,255,0.06)",
  "darkShimmerColor": "rgba(255,255,255,0.02)"
}
```

Boneyard detecta la clase `.dark` en runtime y cambia los colores automáticamente. No necesitás tocar los componentes.

---

## Apéndice C: Referencias

- **Boneyard docs:** https://boneyard.vercel.app
- **npm:** https://www.npmjs.com/package/boneyard-js
- **GitHub:** https://github.com/0xGF/boneyard
- **Playwright browsers:** https://playwright.dev/docs/browsers
