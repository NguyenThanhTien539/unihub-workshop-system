import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, spacing } from "../theme/theme";
import { isValidDateText, isValidTimeText } from "../utils/dateTime";

type InputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
};

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function DateInput({ label, value, onChangeText, error }: InputProps) {
  const [visible, setVisible] = useState(false);
  const [cursor, setCursor] = useState(() => parseDateOrToday(value));
  const days = useMemo(() => buildMonthDays(cursor), [cursor]);

  const openPicker = () => {
    setCursor(parseDateOrToday(value));
    setVisible(true);
  };

  const selectDay = (day: number) => {
    onChangeText(formatDate(cursor.getFullYear(), cursor.getMonth(), day));
    setVisible(false);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94a3b8"
          keyboardType="numbers-and-punctuation"
          style={[styles.input, styles.flexInput]}
        />
        <Pressable
          accessibilityLabel={`Open ${label} calendar picker`}
          onPress={openPicker}
          style={styles.pickerButton}
        >
          <Text style={styles.pickerButtonText}>Calendar</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}

      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
                }
                style={styles.navButton}
              >
                <Text style={styles.navText}>Prev</Text>
              </Pressable>
              <Text style={styles.modalTitle}>
                {monthNames[cursor.getMonth()]} {cursor.getFullYear()}
              </Text>
              <Pressable
                onPress={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
                }
                style={styles.navButton}
              >
                <Text style={styles.navText}>Next</Text>
              </Pressable>
            </View>

            <View style={styles.dayGrid}>
              {days.map((day, index) =>
                day ? (
                  <Pressable
                    key={`${day}-${index}`}
                    onPress={() => selectDay(day)}
                    style={[
                      styles.dayCell,
                      value === formatDate(cursor.getFullYear(), cursor.getMonth(), day) &&
                        styles.selectedCell,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        value === formatDate(cursor.getFullYear(), cursor.getMonth(), day) &&
                          styles.selectedText,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                ) : (
                  <View key={`blank-${index}`} style={styles.dayCell} />
                ),
              )}
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setVisible(false)} style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onChangeText(formatDateInputOrToday(value));
                  setVisible(false);
                }}
                style={styles.primaryAction}
              >
                <Text style={styles.primaryActionText}>Today</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function TimeInput({ label, value, onChangeText, error }: InputProps) {
  const [visible, setVisible] = useState(false);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

  const openPicker = () => {
    const parsed = parseTimeOrDefault(value);
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setVisible(true);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="HH:mm"
          placeholderTextColor="#94a3b8"
          keyboardType="numbers-and-punctuation"
          style={[styles.input, styles.flexInput]}
        />
        <Pressable
          accessibilityLabel={`Open ${label} time picker`}
          onPress={openPicker}
          style={styles.pickerButton}
        >
          <Text style={styles.pickerButtonText}>Clock</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}

      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{label}</Text>
            <View style={styles.timePicker}>
              <Stepper label="Hour" value={hour} max={23} onChange={setHour} />
              <Text style={styles.timeColon}>:</Text>
              <Stepper label="Minute" value={minute} max={59} step={5} onChange={setMinute} />
            </View>
            <Text style={styles.previewTime}>{formatTime(hour, minute)}</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setVisible(false)} style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onChangeText(formatTime(hour, minute));
                  setVisible(false);
                }}
                style={styles.primaryAction}
              >
                <Text style={styles.primaryActionText}>Use time</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Stepper({
  label,
  value,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const update = (delta: number) => {
    const range = max + 1;
    onChange((value + delta + range) % range);
  };

  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <Pressable onPress={() => update(step)} style={styles.stepButton}>
        <Text style={styles.stepButtonText}>+</Text>
      </Pressable>
      <Text style={styles.stepValue}>{String(value).padStart(2, "0")}</Text>
      <Pressable onPress={() => update(-step)} style={styles.stepButton}>
        <Text style={styles.stepButtonText}>-</Text>
      </Pressable>
    </View>
  );
}

function parseDateOrToday(value: string) {
  if (isValidDateText(value)) {
    const [year, month] = value.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function parseTimeOrDefault(value: string) {
  if (isValidTimeText(value)) {
    const [hour, minute] = value.split(":").map(Number);
    return { hour, minute };
  }
  return { hour: 9, minute: 0 };
}

function buildMonthDays(cursor: Date) {
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0,
  ).getDate();
  return [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateInputOrToday(value: string) {
  if (isValidDateText(value)) {
    return value.trim();
  }
  const today = new Date();
  return formatDate(today.getFullYear(), today.getMonth(), today.getDate());
}

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  inputRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.sm,
  },
  flexInput: {
    flex: 1,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pickerButton: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: 8,
    justifyContent: "center",
    minWidth: 92,
    paddingHorizontal: spacing.md,
  },
  pickerButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.38)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 360,
    padding: spacing.lg,
    width: "100%",
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  navButton: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  navText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  dayCell: {
    alignItems: "center",
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: "center",
    width: "13.4%",
  },
  selectedCell: {
    backgroundColor: colors.primary,
  },
  dayText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  selectedText: {
    color: "#ffffff",
  },
  timePicker: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  stepper: {
    alignItems: "center",
    gap: spacing.sm,
  },
  stepperLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  stepButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 56,
  },
  stepButtonText: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  stepValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
  },
  timeColon: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: spacing.lg,
  },
  previewTime: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "900",
    marginTop: spacing.lg,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.lg,
  },
  secondaryAction: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryActionText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryActionText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
