import { adminFetch } from "@/lib/adminApi";

async function json(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || Object.values(payload?.errors || {}).flat().join(" ") || "Verified importer request failed.");
  return payload;
}

export const getVerifiedImporterJobs = () => adminFetch("/admin/verified-importer/jobs?per_page=50").then(json);
export const getVerifiedImporterJob = (id: number) => adminFetch(`/admin/verified-importer/jobs/${id}`).then(json);
export const createSingleVerifiedImport = (payload: Record<string, unknown>) => adminFetch("/admin/verified-importer/single", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(json);
export const createBulkVerifiedImport = (payload: Record<string, unknown>) => adminFetch("/admin/verified-importer/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(json);
export async function previewVerifiedExcelImport(file: File) { const body = new FormData(); body.append("file", file); return adminFetch("/admin/verified-importer/excel/preview", { method: "POST", body }).then(json); }
export const confirmVerifiedExcelImport = (payload: Record<string, unknown>) => adminFetch("/admin/verified-importer/excel/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(json);
export const getVerifiedReviewQueue = () => adminFetch("/admin/verified-importer/review").then(json);
export const approveVerifiedImportField = (id: number) => adminFetch(`/admin/verified-importer/fields/${id}/approve`, { method: "POST" }).then(json);
export const rejectVerifiedImportField = (id: number) => adminFetch(`/admin/verified-importer/fields/${id}/reject`, { method: "POST" }).then(json);
export const approveVerifiedImportImage = (id: number) => adminFetch(`/admin/verified-importer/images/${id}/approve`, { method: "POST" }).then(json);
export const rejectVerifiedImportImage = (id: number) => adminFetch(`/admin/verified-importer/images/${id}/reject`, { method: "POST" }).then(json);
export const setVerifiedImportCoverImage = (id: number) => adminFetch(`/admin/verified-importer/images/${id}/set-cover`, { method: "POST" }).then(json);
export const retryVerifiedImportFailedRows = (id: number) => adminFetch(`/admin/verified-importer/jobs/${id}/retry-failed`, { method: "POST" }).then(json);
export async function downloadVerifiedImportTemplate() { const response = await adminFetch("/admin/verified-importer/template"); if (!response.ok) throw new Error("Template download failed."); const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = "verified-society-import-template.csv"; link.click(); URL.revokeObjectURL(url); }
