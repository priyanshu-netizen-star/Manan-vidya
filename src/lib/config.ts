/** Shared constants. Server-only values are read through functions so they are never inlined into client bundles. */

export const BASE_PATH = "/mananvidyademo";

export const SCHOOL = {
  name: "Manan Vidya Manrakhan Mahto School",
  shortName: "Manan Vidya",
  city: "Ranchi, Jharkhand",
  publicWebsite: "https://www.mananvidya.com/",
} as const;

export const PRODUCT = {
  name: "VoxVision School OS",
  vendor: "VoxVision",
  vendorSite: "https://www.voxvision.site",
  vendorEmail: "voxvision6@gmail.com",
  vendorPhone: "+91 79758 82681",
} as const;

/** Prefix an app path with the basePath for use in fetch() and plain <a> tags. */
export function withBase(path: string) {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

export function appEnv(): "presentation" | "production" {
  return process.env.APP_ENV === "production" ? "production" : "presentation";
}

export function isPresentation() {
  return appEnv() === "presentation";
}

export type AiProvider = "anthropic" | "gemini";

/** AI_PROVIDER picks the provider explicitly; otherwise whichever key is set (Anthropic first). */
export function aiProvider(): AiProvider {
  const p = process.env.AI_PROVIDER?.toLowerCase();
  if (p === "gemini" || p === "anthropic") return p;
  return !process.env.ANTHROPIC_API_KEY && process.env.GEMINI_API_KEY ? "gemini" : "anthropic";
}

export function aiConfigured() {
  return Boolean(aiProvider() === "gemini" ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY);
}

export function aiModel() {
  if (aiProvider() === "gemini") return process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return process.env.AI_MODEL || "claude-opus-5-5";
}

/** Gemini models tried in order when the main model is busy or over its free-tier limit. */
export function geminiFallbackModels() {
  return (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-flash-lite-latest,gemini-flash-latest")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}
