import { CameraView, useCameraPermissions } from "expo-camera";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AppButton } from "../components/AppButton";
import { ScanResultModal } from "../components/ScanResultModal";
import { StatusBadge } from "../components/StatusBadge";
import { colors } from "../config/theme";
import { useNetworkStore } from "../network/networkStore";
import { handleQrScan, ScanHandlingResult } from "../sync/checkinService";
import { getFriendlyErrorMessage } from "../utils/errors";
import { formatDateTime, nowIso } from "../utils/date";

type Props = NativeStackScreenProps<RootStackParamList, "Scanner">;

export function ScannerScreen({ navigation, route }: Props) {
  const { session } = route.params;
  const isOnline = useNetworkStore((state) => state.isOnline);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessingScan, setProcessingScan] = useState(false);
  const [result, setResult] = useState<ScanHandlingResult | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  async function onBarcodeScanned(event: { data: string }) {
    if (isProcessingScan) {
      return;
    }

    setProcessingScan(true);
    try {
      const scanResult = await handleQrScan({
        sessionId: session.sessionId,
        qrToken: event.data,
        scannedAt: nowIso(),
      });
      setResult(scanResult);
      setModalVisible(true);
    } catch (scanError) {
      setResult({
        result: "REJECTED",
        sourceMode: "ONLINE",
        message: getFriendlyErrorMessage(scanError),
      });
      setModalVisible(true);
    }
  }

  function scanNext() {
    setResult(null);
    setModalVisible(false);
    setProcessingScan(false);
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionCard}>
          <Text style={styles.title}>Cần quyền camera</Text>
          <Text style={styles.description}>Cấp quyền camera để quét QR check-in.</Text>
          <AppButton title="Cấp quyền" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{session.workshopTitle}</Text>
          <Text style={styles.description}>
            {session.roomName || "Chưa có phòng"} - {formatDateTime(session.startAt)}
          </Text>
        </View>
        <StatusBadge label={isOnline ? "Online" : "Offline"} tone={isOnline ? "success" : "warning"} />
      </View>

      <View style={styles.cameraWrap}>
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={isProcessingScan ? undefined : onBarcodeScanned}
          style={styles.camera}
        />
        <View style={styles.frame} pointerEvents="none" />
        {isProcessingScan ? (
          <View style={styles.processing}>
            <ActivityIndicator color="#ffffff" />
            <Text style={styles.processingText}>Đang xử lý...</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <AppButton title="Quay lại" onPress={() => navigation.goBack()} variant="secondary" />
      </View>

      <ScanResultModal
        visible={modalVisible}
        result={result}
        onScanNext={scanNext}
        onClose={() => navigation.goBack()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  center: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26,
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  cameraWrap: {
    backgroundColor: colors.dark,
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  frame: {
    borderColor: "rgba(255,255,255,0.88)",
    borderRadius: 8,
    borderWidth: 3,
    height: 240,
    left: "50%",
    marginLeft: -120,
    marginTop: -120,
    position: "absolute",
    top: "50%",
    width: 240,
  },
  processing: {
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.72)",
    borderRadius: 8,
    gap: 8,
    left: 24,
    padding: 14,
    position: "absolute",
    right: 24,
    top: 24,
  },
  processingText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  footer: {
    padding: 16,
  },
  permissionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    margin: 16,
    padding: 18,
  },
});
