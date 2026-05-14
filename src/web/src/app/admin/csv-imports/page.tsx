"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  ListFilter,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { getFriendlyErrorMessage } from "../../../lib/apiClient";
import {
  csvImportStatusLabel,
  formatImportDateTime,
  getCsvImportBatch,
  getCsvImportErrors,
  listCsvImportBatches,
  type CsvImportBatchDetail,
  type CsvImportBatchSummary,
  type CsvImportRowError,
  type CsvImportStatus,
} from "../../../lib/csvImports";

const STATUS_OPTIONS: Array<CsvImportStatus | "ALL"> = [
  "ALL",
  "SUCCESS",
  "PARTIAL_SUCCESS",
  "FAILED",
  "MISSED",
  "PROCESSING",
];

export default function CsvImportsAdminPage() {
  const [batches, setBatches] = useState<CsvImportBatchSummary[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CsvImportBatchDetail | null>(null);
  const [errors, setErrors] = useState<CsvImportRowError[]>([]);
  const [statusFilter, setStatusFilter] = useState<CsvImportStatus | "ALL">("ALL");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredBatches = useMemo(() => {
    if (statusFilter === "ALL") return batches;
    return batches.filter((batch) => batch.status === statusFilter);
  }, [batches, statusFilter]);

  const totals = useMemo(() => {
    return batches.reduce(
      (acc, batch) => {
        acc.errors += batch.errorCount;
        if (batch.status === "SUCCESS") acc.successBatches += 1;
        if (batch.status === "PARTIAL_SUCCESS") acc.partialBatches += 1;
        if (batch.status === "FAILED" || batch.status === "MISSED") acc.problemBatches += 1;
        return acc;
      },
      {
        errors: 0,
        successBatches: 0,
        partialBatches: 0,
        problemBatches: 0,
      },
    );
  }, [batches]);

  useEffect(() => {
    void loadBatches();
  }, []);

  useEffect(() => {
    if (!selectedBatchId) return;
    void loadBatchDetail(selectedBatchId);
  }, [selectedBatchId]);

  async function loadBatches() {
    setLoadingList(true);
    setError(null);
    try {
      const data = await listCsvImportBatches(0, 100);
      setBatches(data);
      setSelectedBatchId((current) => current ?? data[0]?.batchId ?? null);
    } catch (err) {
      setBatches([]);
      setSelectedBatchId(null);
      setDetail(null);
      setErrors([]);
      setError(getFriendlyErrorMessage(err, "Khong tai duoc lich su import CSV."));
    } finally {
      setLoadingList(false);
    }
  }

  async function loadBatchDetail(batchId: string) {
    setLoadingDetail(true);
    setError(null);
    try {
      const [batchDetail, rowErrors] = await Promise.all([
        getCsvImportBatch(batchId),
        getCsvImportErrors(batchId),
      ]);
      setDetail(batchDetail);
      setErrors(rowErrors);
    } catch (err) {
      setDetail(null);
      setErrors([]);
      setError(getFriendlyErrorMessage(err, "Khong tai duoc chi tiet batch CSV."));
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Bao cao import CSV</h2>
          <p className="mt-1 text-sm text-slate-500">
            Theo doi batch, ket qua xu ly va loi dong cua danh sach sinh vien.
          </p>
        </div>
        <button
          type="button"
          onClick={loadBatches}
          disabled={loadingList}
          className="inline-flex w-fit items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={loadingList ? "animate-spin" : ""} />
          Tai lai
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Batch" value={batches.length} />
        <Stat label="Thanh cong" value={totals.successBatches} tone="green" />
        <Stat label="Mot phan" value={totals.partialBatches} tone="amber" />
        <Stat label="Can xem" value={totals.problemBatches} tone="red" />
        <Stat label="Dong loi" value={totals.errors} tone="sky" />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <ListFilter size={16} className="text-slate-500" />
              Trang thai
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(parseStatusFilter(event.target.value))}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "Tat ca" : csvImportStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">File</th>
                    <th className="px-4 py-3 font-semibold">Trang thai</th>
                    <th className="px-4 py-3 font-semibold">Dong</th>
                    <th className="px-4 py-3 font-semibold">Loi</th>
                    <th className="px-4 py-3 font-semibold">Bat dau</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingList ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-slate-500">
                        Dang tai lich su import...
                      </td>
                    </tr>
                  ) : filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-slate-500">
                        Khong co batch phu hop.
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((batch) => (
                      <tr
                        key={batch.batchId}
                        className={
                          batch.batchId === selectedBatchId ? "bg-sky-50" : "hover:bg-slate-50"
                        }
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedBatchId(batch.batchId)}
                            className="block max-w-[18rem] truncate text-left font-medium text-slate-950 hover:text-sky-700"
                            title={batch.fileName}
                          >
                            {batch.fileName}
                          </button>
                          <div className="mt-1 max-w-[18rem] truncate text-xs text-slate-500">
                            {batch.checksum ?? "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={batch.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {batch.successCount.toLocaleString("vi-VN")} /{" "}
                          {batch.totalRows.toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {batch.errorCount.toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatImportDateTime(batch.startedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-950">Chi tiet batch</h3>
            </div>
            {loadingDetail ? (
              <div className="p-4 text-sm text-slate-500">Dang tai chi tiet...</div>
            ) : detail ? (
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950" title={detail.fileName}>
                      {detail.fileName}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">{detail.batchId}</p>
                  </div>
                  <StatusBadge status={detail.status} />
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Tong dong" value={detail.totalRows.toLocaleString("vi-VN")} />
                  <Metric label="Da import" value={detail.successCount.toLocaleString("vi-VN")} />
                  <Metric label="Dong loi" value={detail.errorCount.toLocaleString("vi-VN")} />
                  <Metric label="Bat dau" value={formatImportDateTime(detail.startedAt)} />
                  <Metric label="Ket thuc" value={formatImportDateTime(detail.finishedAt)} wide />
                  <Metric label="Checksum" value={detail.checksum ?? "-"} wide truncate />
                </dl>

                {detail.failureReason && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {detail.failureReason}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-sm text-slate-500">Chua chon batch.</div>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-950">Loi dong</h3>
              <span className="text-sm text-slate-500">{errors.length.toLocaleString("vi-VN")}</span>
            </div>
            <div className="max-h-[30rem] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Dong</th>
                    <th className="px-4 py-3 font-semibold">Sinh vien</th>
                    <th className="px-4 py-3 font-semibold">Loi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingDetail ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-slate-500">
                        Dang tai loi dong...
                      </td>
                    </tr>
                  ) : errors.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-slate-500">
                        Khong co loi dong.
                      </td>
                    </tr>
                  ) : (
                    errors.map((item, index) => (
                      <tr key={`${item.rowNumber}-${item.errorCode}-${index}`}>
                        <td className="px-4 py-3 font-medium text-slate-950">
                          {item.rowNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{item.studentId ?? "-"}</div>
                          <div className="text-xs text-slate-500">{item.fieldName ?? "-"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{item.errorCode}</div>
                          <div className="mt-1 text-slate-600">{item.errorMessage}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "green" | "amber" | "red" | "sky";
}) {
  const color =
    tone === "green"
      ? "text-green-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "red"
          ? "text-red-600"
          : tone === "sky"
            ? "text-sky-600"
            : "text-slate-950";

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${color}`}>
        {value.toLocaleString("vi-VN")}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  wide = false,
  truncate = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm font-medium text-slate-900 ${truncate ? "truncate" : ""}`} title={value}>
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({ status }: { status: CsvImportStatus }) {
  const styles =
    status === "SUCCESS"
      ? "bg-green-100 text-green-700"
      : status === "PARTIAL_SUCCESS"
        ? "bg-amber-100 text-amber-700"
        : status === "FAILED"
          ? "bg-red-100 text-red-700"
          : status === "MISSED"
            ? "bg-slate-100 text-slate-700"
            : "bg-sky-100 text-sky-700";

  const icon =
    status === "SUCCESS" ? (
      <CheckCircle2 size={14} />
    ) : status === "PARTIAL_SUCCESS" ? (
      <AlertTriangle size={14} />
    ) : status === "FAILED" ? (
      <XCircle size={14} />
    ) : status === "MISSED" ? (
      <FileWarning size={14} />
    ) : (
      <RefreshCw size={14} className="animate-spin" />
    );

  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {icon}
      {csvImportStatusLabel(status)}
    </span>
  );
}

function parseStatusFilter(value: string): CsvImportStatus | "ALL" {
  if (
    value === "PROCESSING" ||
    value === "SUCCESS" ||
    value === "PARTIAL_SUCCESS" ||
    value === "FAILED" ||
    value === "MISSED"
  ) {
    return value;
  }
  return "ALL";
}
