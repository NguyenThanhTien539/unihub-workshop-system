import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, spacing } from "../theme/theme";

export type SelectOption = {
  label: string;
  value: string;
  description?: string;
};

type SelectFieldProps = {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder: string;
  error?: string;
  loading?: boolean;
  loadError?: string | null;
  emptyText?: string;
  onChange: (value: string) => void;
  onRetry?: () => void;
};

export function SelectField({
  label,
  value,
  options,
  placeholder,
  error,
  loading,
  loadError,
  emptyText = "No options available",
  onChange,
  onRetry,
}: SelectFieldProps) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.description?.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        onPress={() => setVisible(true)}
        style={[styles.selector, error && styles.selectorError]}
      >
        <View style={styles.selectorCopy}>
          <Text style={[styles.selectorText, !selected && styles.placeholder]}>
            {selected?.label || placeholder}
          </Text>
          {selected?.description ? (
            <Text style={styles.selectorDescription}>{selected.description}</Text>
          ) : null}
        </View>
        <Text style={styles.selectorAction}>Select</Text>
      </Pressable>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}

      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{label}</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
            />

            {loading ? <Text style={styles.stateText}>Loading options...</Text> : null}
            {loadError ? (
              <View style={styles.stateBox}>
                <Text style={styles.errorText}>{loadError}</Text>
                {onRetry ? (
                  <Pressable onPress={onRetry} style={styles.secondaryAction}>
                    <Text style={styles.secondaryActionText}>Retry</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {!loading && !loadError && filteredOptions.length === 0 ? (
              <Text style={styles.stateText}>{emptyText}</Text>
            ) : null}
            {!loading && !loadError ? (
              <ScrollView style={styles.optionList}>
                {filteredOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      setVisible(false);
                      setQuery("");
                    }}
                    style={[
                      styles.option,
                      option.value === value && styles.selectedOption,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        option.value === value && styles.selectedOptionText,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {option.description ? (
                      <Text
                        style={[
                          styles.optionDescription,
                          option.value === value && styles.selectedOptionText,
                        ]}
                      >
                        {option.description}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setVisible(false);
                  setQuery("");
                }}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
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
  selector: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectorError: {
    borderColor: colors.danger,
  },
  selectorCopy: {
    flex: 1,
  },
  selectorText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  placeholder: {
    color: colors.muted,
    fontWeight: "600",
  },
  selectorDescription: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  selectorAction: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
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
    maxHeight: "82%",
    maxWidth: 420,
    padding: spacing.lg,
    width: "100%",
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  searchInput: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  stateBox: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stateText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  option: {
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  optionList: {
    marginTop: spacing.xs,
  },
  selectedOption: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  optionLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  optionDescription: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  selectedOptionText: {
    color: "#ffffff",
  },
  modalActions: {
    alignItems: "flex-end",
    marginTop: spacing.lg,
  },
  secondaryAction: {
    alignItems: "center",
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
});
