const truthy = new Set(["1", "true", "yes", "on"]);

function enabled(value: unknown): boolean {
  return truthy.has(String(value ?? "").trim().toLowerCase());
}

export function isNcrMulticityEnabled(): boolean {
  return enabled(import.meta.env.VITE_NCR_MULTICITY_ENABLED);
}
