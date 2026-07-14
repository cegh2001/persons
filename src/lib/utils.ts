import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getLocationColor = (loc: string) => {
  switch (loc) {
    case "Calle Paez":
      return "bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400";
    case "Casco Central":
      return "bg-violet-50 border-violet-100 text-violet-700 dark:bg-violet-950/30 dark:border-violet-900/50 dark:text-violet-400";
    case "El Collao":
      return "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400";
    case "Palmar Este":
      return "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400";
    case "San Julian":
      return "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400";
    case "La Tomita":
    case "Las Tomitas":
    case "Tomitas 1":
    case "Tomitas 2":
      return "bg-sky-50 border-sky-100 text-sky-700 dark:bg-sky-950/30 dark:border-sky-900/50 dark:text-sky-400";
    case "El Caimito":
      return "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-400";
    case "Caribe":
      return "bg-cyan-50 border-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:border-cyan-900/50 dark:text-cyan-400";
    case "27 de Julio":
      return "bg-orange-50 border-orange-100 text-orange-700 dark:bg-orange-950/30 dark:border-orange-900/50 dark:text-orange-400";
    case "Las Tucacas":
      return "bg-teal-50 border-teal-100 text-teal-700 dark:bg-teal-950/30 dark:border-teal-900/50 dark:text-teal-400";
    case "Tarigua":
      return "bg-fuchsia-50 border-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/30 dark:border-fuchsia-900/50 dark:text-fuchsia-400";
    case "Punto Fijo":
      return "bg-purple-50 border-purple-100 text-purple-700 dark:bg-purple-950/30 dark:border-purple-900/50 dark:text-purple-400";
    case "Blanquita Perez":
      return "bg-pink-50 border-pink-100 text-pink-700 dark:bg-pink-950/30 dark:border-pink-900/50 dark:text-pink-400";
    case "Corapal":
      return "bg-red-50 border-red-100 text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400";
    case "Catia La Mar":
      return "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-400";
    case "La Llanada":
      return "bg-teal-50 border-teal-100 text-teal-700 dark:bg-teal-950/30 dark:border-teal-900/50 dark:text-teal-400";
    case "Boca de Río / Caribe":
      return "bg-cyan-50 border-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:border-cyan-900/50 dark:text-cyan-400";
    case "La Tomita / Casco Central":
      return "bg-sky-50 border-sky-100 text-sky-700 dark:bg-sky-950/30 dark:border-sky-900/50 dark:text-sky-400";
    case "Calle Vargas":
      return "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400";
    case "Calle La Iglesia":
      return "bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400";
    case "El Dispensario":
      return "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400";
    case "Calle Guaicaipuro":
      return "bg-purple-50 border-purple-100 text-purple-700 dark:bg-purple-950/30 dark:border-purple-900/50 dark:text-purple-400";
    case "Maiquetia":
      return "bg-pink-50 border-pink-100 text-pink-700 dark:bg-pink-950/30 dark:border-pink-900/50 dark:text-pink-400";
    case "Quebrada Seca":
      return "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400";
    default:
      return "bg-slate-50 border-slate-100 text-slate-700 dark:bg-slate-900/50 dark:border-slate-800/50 dark:text-slate-400";
  }
}

