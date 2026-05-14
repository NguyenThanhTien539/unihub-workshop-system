import { validateQr } from "../api/checkinApi";
import { CheckinResult, ValidateQrResponse } from "../api/types";
import {
  createPendingEvent,
  findActiveEventBySessionAndQr,
} from "../db/offlineEventDao";
import { addScanHistory } from "../db/scanHistoryDao";
import { useNetworkStore } from "../network/networkStore";
import { getOrCreateDeviceId } from "../auth/tokenStorage";
import { nowIso } from "../utils/date";
import { AppError, isNetworkError, toAppError } from "../utils/errors";
import { getQrPreview, isPlausibleQrToken, normalizeQrToken } from "../utils/qr";
import { createId } from "../utils/uuid";

export type ScanHandlingResult = ValidateQrResponse & {
  sourceMode: "ONLINE" | "OFFLINE";
  syncEventId?: string;
};

type HandleQrScanParams = {
  sessionId: string;
  qrToken: string;
  scannedAt?: string;
};

export async function handleQrScan(params: HandleQrScanParams): Promise<ScanHandlingResult> {
  const qrToken = normalizeQrToken(params.qrToken);
  const scannedAt = params.scannedAt ?? nowIso();

  if (!isPlausibleQrToken(qrToken)) {
    const rejected: ScanHandlingResult = {
      result: "REJECTED",
      sourceMode: "ONLINE",
      errorCode: "CHECKIN_INVALID_QR",
      message: "Ma QR khong hop le.",
    };
    await saveHistory(params.sessionId, qrToken, rejected, "ONLINE", scannedAt);
    return rejected;
  }

  const isOnline = useNetworkStore.getState().isOnline;
  if (!isOnline) {
    return saveOfflineScan(params.sessionId, qrToken, scannedAt, "Dang offline. Da luu vao hang cho dong bo.");
  }

  try {
    const result = await validateQr({
      sessionId: params.sessionId,
      qrToken,
      scannedAt,
    });

    await saveHistory(params.sessionId, qrToken, result, "ONLINE", scannedAt);
    return {
      ...result,
      sourceMode: "ONLINE",
    };
  } catch (error) {
    if (isNetworkError(error)) {
      return saveOfflineScan(params.sessionId, qrToken, scannedAt, "Mat ket noi. Da luu vao hang cho dong bo.");
    }

    const appError = toAppError(error);
    if (appError.code === "CHECKIN_REJECTED" || appError.code === "CHECKIN_DUPLICATE") {
      const result: ScanHandlingResult = {
        result: appError.code === "CHECKIN_DUPLICATE" ? "DUPLICATE" : "REJECTED",
        sourceMode: "ONLINE",
        errorCode: appError.backendCode,
        message: appError.message,
      };
      await saveHistory(params.sessionId, qrToken, result, "ONLINE", scannedAt);
      return result;
    }

    throw appError;
  }
}

async function saveOfflineScan(
  sessionId: string,
  qrToken: string,
  scannedAt: string,
  message: string,
): Promise<ScanHandlingResult> {
  const existing = await findActiveEventBySessionAndQr(sessionId, qrToken);
  if (existing) {
    const result: ScanHandlingResult = {
      result: "PENDING_SYNC",
      sourceMode: "OFFLINE",
      syncEventId: existing.syncEventId,
      message: "Ma QR nay da nam trong hang cho dong bo.",
    };
    await saveHistory(sessionId, qrToken, result, "OFFLINE", scannedAt);
    return result;
  }

  const syncEventId = createId("sync");
  const deviceId = await getOrCreateDeviceId();
  const createdAt = nowIso();

  await createPendingEvent({
    syncEventId,
    sessionId,
    qrToken,
    scannedAt,
    deviceId,
    localStatus: "PENDING_SYNC",
    retryCount: 0,
    createdAt,
  });

  const result: ScanHandlingResult = {
    result: "PENDING_SYNC",
    sourceMode: "OFFLINE",
    syncEventId,
    message,
  };
  await saveHistory(sessionId, qrToken, result, "OFFLINE", scannedAt);
  return result;
}

async function saveHistory(
  sessionId: string,
  qrToken: string,
  result: { result: CheckinResult; studentName?: string; studentCode?: string; studentId?: string; registrationId?: string; message?: string },
  sourceMode: "ONLINE" | "OFFLINE" | "SYNC",
  scannedAt: string,
) {
  try {
    await addScanHistory({
      id: createId("scan"),
      sessionId,
      qrTokenPreview: getQrPreview(qrToken),
      result: result.result,
      sourceMode,
      studentName: result.studentName ?? null,
      studentCode: result.studentCode ?? result.studentId ?? null,
      registrationId: result.registrationId ?? null,
      message: result.message ?? null,
      scannedAt,
      createdAt: nowIso(),
    });
  } catch (error) {
    throw new AppError("UNKNOWN_ERROR", toAppError(error).message);
  }
}
