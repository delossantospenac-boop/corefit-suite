/**
 * Unidades configurables.
 * Los datos SIEMPRE se guardan en unidades base: kg (peso), cm (longitud), m (distancia).
 * Estas utilidades solo convierten para mostrar / para leer lo que escribe el usuario.
 */

export type WeightUnit = "kg" | "lb";
export type LengthUnit = "cm" | "in";
export type DistanceUnit = "km" | "mi";

export type UnitPrefs = {
  weight: WeightUnit;
  length: LengthUnit;
  distance: DistanceUnit;
};

export const DEFAULT_UNITS: UnitPrefs = { weight: "kg", length: "cm", distance: "km" };

export const WEIGHT_UNITS: { value: WeightUnit; label: string }[] = [
  { value: "kg", label: "Kilogramos (kg)" },
  { value: "lb", label: "Libras (lb)" },
];

export const LENGTH_UNITS: { value: LengthUnit; label: string }[] = [
  { value: "cm", label: "Centímetros (cm)" },
  { value: "in", label: "Pulgadas (pulg)" },
];

export const DISTANCE_UNITS: { value: DistanceUnit; label: string }[] = [
  { value: "km", label: "Kilómetros (km)" },
  { value: "mi", label: "Millas (mi)" },
];

const LB_PER_KG = 2.20462262;
const IN_PER_CM = 0.3937007874;
const M_PER_KM = 1000;
const M_PER_MI = 1609.344;

export function unitLabel(unit: WeightUnit | LengthUnit | DistanceUnit): string {
  if (unit === "in") return "pulg";
  return unit;
}

function round(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/* ------------------------- base -> display ------------------------- */

export function kgToDisplay(kg: number | null | undefined, unit: WeightUnit): number | null {
  if (kg === null || kg === undefined) return null;
  return unit === "lb" ? round(kg * LB_PER_KG) : round(kg);
}

export function cmToDisplay(cm: number | null | undefined, unit: LengthUnit): number | null {
  if (cm === null || cm === undefined) return null;
  return unit === "in" ? round(cm * IN_PER_CM) : round(cm);
}

export function metersToDisplay(m: number | null | undefined, unit: DistanceUnit): number | null {
  if (m === null || m === undefined) return null;
  return unit === "mi" ? round(m / M_PER_MI, 2) : round(m / M_PER_KM, 2);
}

/* ------------------------- display -> base ------------------------- */

export function displayToKg(value: number | null | undefined, unit: WeightUnit): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return unit === "lb" ? round(value / LB_PER_KG, 2) : round(value, 2);
}

export function displayToCm(value: number | null | undefined, unit: LengthUnit): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return unit === "in" ? round(value / IN_PER_CM, 2) : round(value, 2);
}

export function displayToMeters(value: number | null | undefined, unit: DistanceUnit): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return unit === "mi" ? round(value * M_PER_MI, 2) : round(value * M_PER_KM, 2);
}

/* ------------------------- formateo ------------------------- */

export function formatWeight(kg: number | null | undefined, unit: WeightUnit): string {
  const v = kgToDisplay(kg, unit);
  return v === null ? "—" : `${v} ${unitLabel(unit)}`;
}

export function formatLength(cm: number | null | undefined, unit: LengthUnit): string {
  const v = cmToDisplay(cm, unit);
  return v === null ? "—" : `${v} ${unitLabel(unit)}`;
}

export function formatDistance(m: number | null | undefined, unit: DistanceUnit): string {
  const v = metersToDisplay(m, unit);
  return v === null ? "—" : `${v} ${unitLabel(unit)}`;
}

export function parseNumber(input: string): number | null {
  const clean = input.replace(",", ".").trim();
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}
