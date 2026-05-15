import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme/theme";
import { Button, Card } from "./ui";

export type NotificationTone = "success" | "error" | "warning" | "info";

type NotificationOptions = {
  tone: NotificationTone;
  title?: string;
  message: string;
  actionLabel?: string;
};

type NotificationState = Required<Omit<NotificationOptions, "title">> & {
  title: string;
};

type NotificationContextValue = {
  showNotification: (options: NotificationOptions) => Promise<void>;
  showSuccess: (message: string, title?: string) => Promise<void>;
  showError: (message: string, title?: string) => Promise<void>;
  showWarning: (message: string, title?: string) => Promise<void>;
  showInfo: (message: string, title?: string) => Promise<void>;
};

const defaultTitle: Record<NotificationTone, string> = {
  success: "Success",
  error: "Action Failed",
  warning: "Please Check",
  info: "Notice",
};

const fallbackMessage: Record<NotificationTone, string> = {
  success: "The action completed successfully.",
  error: "Something went wrong. Please try again.",
  warning: "Please review the details and try again.",
  info: "The action has been updated.",
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<NotificationState | null>(
    null,
  );
  const closeResolverRef = useRef<(() => void) | null>(null);

  const closeNotification = useCallback(() => {
    setNotification(null);
    closeResolverRef.current?.();
    closeResolverRef.current = null;
  }, []);

  const showNotification = useCallback(
    (options: NotificationOptions) => {
      closeResolverRef.current?.();
      const tone = options.tone;
      setNotification({
        tone,
        title: options.title || defaultTitle[tone],
        message: capitalizeFirstLetter(
          options.message.trim() || fallbackMessage[tone],
        ),
        actionLabel: options.actionLabel || "OK",
      });
      return new Promise<void>((resolve) => {
        closeResolverRef.current = resolve;
      });
    },
    [],
  );

  const value: NotificationContextValue = {
    showNotification,
    showSuccess: (message, title) =>
      showNotification({ tone: "success", title, message }),
    showError: (message, title) =>
      showNotification({ tone: "error", title, message }),
    showWarning: (message, title) =>
      showNotification({ tone: "warning", title, message }),
    showInfo: (message, title) =>
      showNotification({ tone: "info", title, message }),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationModal notification={notification} onClose={closeNotification} />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider.");
  }
  return context;
}

export function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return capitalizeFirstLetter(error.message);
  }
  return capitalizeFirstLetter(fallback);
}

function capitalizeFirstLetter(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function NotificationModal({
  notification,
  onClose,
}: {
  notification: NotificationState | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={Boolean(notification)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {notification ? (
          <View style={styles.modalCard}>
            <Card>
              <View style={styles.header}>
                <View style={[styles.toneMark, styles[notification.tone]]}>
                  <Text style={styles.toneText}>
                    {toneLabel[notification.tone]}
                  </Text>
                </View>
                <View style={styles.titleCopy}>
                  <Text style={styles.title}>{notification.title}</Text>
                  <Text style={styles.message}>{notification.message}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Button label={notification.actionLabel} onPress={onClose} />
              </View>
            </Card>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const toneLabel: Record<NotificationTone, string> = {
  success: "OK",
  error: "!",
  warning: "!",
  info: "i",
};

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.56)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    maxWidth: 520,
    width: "100%",
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.lg,
    width: "100%",
  },
  toneMark: {
    alignItems: "center",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  toneText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  success: {
    backgroundColor: colors.success,
  },
  error: {
    backgroundColor: colors.danger,
  },
  warning: {
    backgroundColor: colors.warning,
  },
  info: {
    backgroundColor: colors.accent,
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  message: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  actions: {
    marginTop: spacing.xl,
  },
});
