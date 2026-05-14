"use client";

import { apiRequest } from "./apiClient";

export type CsvImportStatus =
  | "PROCESSING"
  | "SUCCESS"
  | "PARTIAL_SUCCESS"
  | "FAILED"
  | "MISSED";

export type CsvImportBatchSummary = {
  batchId: string;
  fileName: string;
  checksum: string | null;
  status: CsvImportStatus;
  startedAt: string;
  finishedAt: string | null;
  totalRows: number;
  successCount: number;
  errorCount: number;
};

export type CsvImportBatchDetail = CsvImportBatchSummary & {
  failureReason: string | null;
};

export type CsvImportRowError = {
  rowNumber: number;
  studentId: string | null;
  fieldName: string | null;
  errorCode: string;
  errorMessage: string;
};

export async function listCsvImportBatches(page = 0, size = 50) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  return apiRequest<CsvImportBatchSummary[]>(
    `/api/admin/csv-imports?${params.toString()}`,
    undefined,
    { auth: true },
  );
}

export async function getCsvImportBatch(batchId: string) {
  return apiRequest<CsvImportBatchDetail>(
    `/api/admin/csv-imports/${batchId}`,
    undefined,
    { auth: true },
  );
}

export async function getCsvImportErrors(batchId: string) {
  return apiRequest<CsvImportRowError[]>(
    `/api/admin/csv-imports/${batchId}/errors`,
    undefined,
    { auth: true },
  );
}

export function csvImportStatusLabel(status: CsvImportStatus) {
  switch (status) {
    case "PROCESSING":
      return "Dang xu ly";
    case "SUCCESS":
      return "Thanh cong";
    case "PARTIAL_SUCCESS":
      return "Mot phan";
    case "FAILED":
      return "That bai";
    case "MISSED":
      return "Bi thieu";
    default:
      return status;
  }
}

export function formatImportDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
