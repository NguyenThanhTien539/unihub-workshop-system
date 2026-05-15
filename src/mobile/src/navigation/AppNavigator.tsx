import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CheckinSession } from "../api/types";
import { colors } from "../config/theme";
import { CheckinSessionsScreen } from "../screens/CheckinSessionsScreen";
import { OfflineSyncScreen } from "../screens/OfflineSyncScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ScannerScreen } from "../screens/ScannerScreen";
import { useAutoSync } from "../sync/useAutoSync";
import { AuthGate } from "./AuthGate";

export type RootStackParamList = {
  Sessions: undefined;
  Scanner: { session: CheckinSession };
  OfflineSync: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <AuthGate>
        <MainStackNavigator />
      </AuthGate>
    </NavigationContainer>
  );
}

export function MainStackNavigator() {
  useAutoSync();

  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontWeight: "800" },
      }}
    >
      <Stack.Screen name="Sessions" component={CheckinSessionsScreen} options={{ title: "Buổi học" }} />
      <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: "Quét QR" }} />
      <Stack.Screen name="OfflineSync" component={OfflineSyncScreen} options={{ title: "Đồng bộ" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Tài khoản" }} />
    </Stack.Navigator>
  );
}
