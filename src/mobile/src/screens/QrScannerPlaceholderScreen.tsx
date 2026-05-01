import ScreenPlaceholder from "../components/ScreenPlaceholder";

export function QrScannerPlaceholderScreen() {
  // TODO: Replace this placeholder with Expo Camera QR scanning.
  return (
    <ScreenPlaceholder
      title="QR Scanner"
      description="Placeholder for scanning attendee QR codes."
      todo="Integrate Expo Camera and validate scans with the backend."
    />
  );
}
