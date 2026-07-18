# Sectores Pendientes de Cotejo

> **Origen**: Archivo `kits-donados-registros.md` (ve-commerce)
> **Fecha extracción**: 2026-07-17
> **Estado**: NO incorporados a la DB — requieren revisión manual antes de migrar

Estos sectores/zona recibieron kits/combo según el inventario bruto (01-09 jul), pero **no** se han creado como entregas colectivas ni individuales en la DB de persons. Hay que decidir caso por caso si se convierten en:

- **Entrega colectiva** → si el destinatario fue una organización/grupo que redistribuyó
- **Personas individuales** → si fueron personas concretas (buscar si ya están registradas en la DB con otro nombre)
- **Se descarta** → si es un duplicado, error de registro, o ya está cubierto por las personas individuales existentes

---

## 🏢 Organizaciones/Grupos (probables colectivas)

| # | Destinatario | Total Unidades | Desglose | Personas ya en DB? |
|---|---|---|---|---|
| 1 | **Parroquia Caraballeda** | 977 | Electrolit 400, Aseo 250, Alimentos 60, Prearmados 147, Bebé 104, Emergencia 16 | 10 personas en "Caraballeda" |
| 2 | **Marisol San Julian** | 143 | Alimentos 64, Aseo 64, Emergencia 15 | "Marisol San Julian" aparece como ubicación en 1 persona? |
| 3 | **Mercal/Corral** | 74 | Alimentos 37, Aseo 37 | 2 personas en "El Corral" |
| 4 | **La Asequia** | 70 | Alimentos 35, Aseo 20, Emergencia 15 | No aparece en DB |

---

## 🏘️ Sectores/Zonas (posibles colectivas o ya cubiertos por persons)

| # | Destinatario | Total Unidades | Desglose | Personas ya en DB? |
|---|---|---|---|---|
| 5 | **Casco Central** | 205 | Alimentos 105, Aseo 80, Bebé 6, Emergencia 14 | ✅ 237 personas |
| 6 | **Palmar Este** | 65 | Alimentos 51, Aseo 12, Emergencia 2 | ✅ 68 personas |
| 7 | **Tucacas** | 64 | Alimentos 31, Aseo 11, Bebé 2, Emergencia 20 | ✅ 6 personas (Las Tucacas) |
| 8 | **27 de Julio** | 57 | Alimentos 28, Aseo 15, Bebé 1, Emergencia 13 | ✅ 16 personas |
| 9 | **Miel y Tarigua** | 48 | Alimentos 24, Emergencia 24 | ✅ 3 (La Miel) + 29 (Tarigua) |
| 10 | **El Collao** | 44 | Alimentos 22, Aseo 20, Emergencia 2 | ✅ 36 personas |
| 11 | **San Her 1** | 25 | Alimentos 6, Aseo 18, Bebé 1 | ✅ 1 persona (San Her I.) |
| 12 | **Las Tomitas** | 12 | Alimentos 6, Aseo 6 | ✅ 31 personas (La Tomita) |
| 13 | **La Miel** | 9 | Alimentos 4, Aseo 3, Emergencia 2 | ✅ 3 personas |
| 14 | **San Julian** | 6 | Alimentos 3, Aseo 2, Emergencia 1 | ✅ 82 personas |
| 15 | **Tarigua** | 5 | Alimentos 2, Aseo 1, Emergencia 2 | ✅ 29 personas |
| 16 | **La Tomita** | 3 | Alimentos 1, Aseo 1, Bebé 1 | ✅ 31 personas |
| 17 | **Tarigua/Calle del frente** | 2 | Alimentos 1, Aseo 1 | ✅ 29 personas (Tarigua) |
| 18 | **Montesano** | 2 | Alimentos 2 | ✅ 1 persona |
| 19 | **Calle Real y Tarigua** | 2 | Bebé 2 | ✅ 7 (Calle Real) + 29 (Tarigua) |

---

## 📝 Notas

- **"Casco central"** (12 u, minúscula) es duplicado de "Casco Central" (193 u) → total real: 205 u
- **"27 de Julio"** (3 u, mayúscula) es duplicado de "27 de julio" (54 u) → total real: 57 u
- Los sectores con ✅ ya tienen personas registradas individualmente en la DB (carga masiva del 11-12 jul). La pregunta es si los kits del archivo son **adicionales** a los ya registrados o son **los mismos** contados desde el inventario.
- La Parroquia Caraballeda concentra el **46%** de todas las salidas (977 de 2139). Es el mayor redistribuidor.

---

## 🔜 Próximos pasos

1. Revisar cada destinatario y decidir: `colectiva` / `individual` / `descartar`
2. Para los que sean colectiva: crear person-organización + delivery colectiva
3. Para los sectores con personas ya registradas: verificar si hay solapamiento o son entregas adicionales
4. Sync local → prod
