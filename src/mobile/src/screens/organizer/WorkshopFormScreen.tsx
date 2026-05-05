import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { ManagedWorkshop, WorkshopFormValues } from "../../models/types";
import { colors, spacing } from "../../theme/theme";
import { Button, Card, Field, TabBar } from "../../components/ui";

type FormErrors = Partial<Record<keyof WorkshopFormValues, string>>;

const defaultValues: WorkshopFormValues = {
  title: "",
  speaker: "",
  speakerBio: "",
  date: "May 17, 2026",
  startTime: "09:00",
  endTime: "11:00",
  room: "A101",
  capacity: "50",
  feeType: "FREE",
  feeAmount: "0",
  description: "",
  summary: "",
  status: "DRAFT",
  roomHint: "",
};

export function toWorkshopFormValues(
  workshop?: ManagedWorkshop | null,
): WorkshopFormValues {
  if (!workshop) {
    return defaultValues;
  }

  return {
    title: workshop.title,
    speaker: workshop.speaker,
    speakerBio: workshop.speakerBio,
    date: workshop.date,
    startTime: workshop.startTime,
    endTime: workshop.endTime,
    room: workshop.room,
    capacity: String(workshop.capacity),
    feeType: workshop.feeType,
    feeAmount: String(workshop.feeAmount),
    description: workshop.description,
    summary: workshop.summary,
    status: workshop.status === "DRAFT" ? "DRAFT" : "PUBLISHED",
    roomHint: workshop.roomHint,
  };
}

export function WorkshopFormScreen({
  mode,
  workshop,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  workshop?: ManagedWorkshop | null;
  onCancel: () => void;
  onSubmit: (values: WorkshopFormValues) => void;
}) {
  const initialValues = useMemo(() => toWorkshopFormValues(workshop), [workshop]);
  const [values, setValues] = useState<WorkshopFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});

  const update = (field: keyof WorkshopFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = () => {
    const nextErrors = validateWorkshopForm(values, workshop);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    onSubmit(values);
  };

  const cancel = () => {
    if (JSON.stringify(values) !== JSON.stringify(initialValues)) {
      Alert.alert("Discard changes?", "Unsaved workshop changes will be lost.", [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: onCancel },
      ]);
      return;
    }
    onCancel();
  };

  return (
    <View style={styles.stack}>
      <Card>
        <Text style={styles.title}>
          {mode === "create" ? "Create Workshop" : "Edit Workshop"}
        </Text>
        <Text style={styles.body}>
          Configure workshop details, room, seats, price, AI summary preview,
          and publish state.
        </Text>
      </Card>
      <Card>
        <View style={styles.form}>
          <Field
            label="Title"
            value={values.title}
            onChangeText={(text) => update("title", text)}
            error={errors.title}
          />
          <Field
            label="Speaker name"
            value={values.speaker}
            onChangeText={(text) => update("speaker", text)}
            error={errors.speaker}
          />
          <Field
            label="Speaker bio"
            value={values.speakerBio}
            onChangeText={(text) => update("speakerBio", text)}
            multiline
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Field
                label="Date"
                value={values.date}
                onChangeText={(text) => update("date", text)}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Field
                label="Start time"
                value={values.startTime}
                onChangeText={(text) => update("startTime", text)}
                error={errors.startTime}
              />
            </View>
            <View style={styles.flex}>
              <Field
                label="End time"
                value={values.endTime}
                onChangeText={(text) => update("endTime", text)}
                error={errors.endTime}
              />
            </View>
          </View>
          <Field
            label="Room"
            value={values.room}
            onChangeText={(text) => update("room", text)}
            error={errors.room}
          />
          <Field
            label="Room note / map placeholder"
            value={values.roomHint}
            onChangeText={(text) => update("roomHint", text)}
          />
          <Field
            label="Capacity"
            value={values.capacity}
            keyboardType="numeric"
            onChangeText={(text) => update("capacity", text)}
            error={errors.capacity}
          />
          <Text style={styles.fieldLabel}>Fee type</Text>
          <TabBar
            active={values.feeType}
            onChange={(feeType) => {
              setValues((current) => ({
                ...current,
                feeType,
                feeAmount: feeType === "FREE" ? "0" : current.feeAmount,
              }));
            }}
            tabs={[
              { key: "FREE", label: "Free" },
              { key: "PAID", label: "Paid" },
            ]}
          />
          <Field
            label="Price"
            value={values.feeAmount}
            keyboardType="numeric"
            onChangeText={(text) => update("feeAmount", text)}
            error={errors.feeAmount}
          />
          <Field
            label="Description"
            value={values.description}
            onChangeText={(text) => update("description", text)}
            multiline
          />
          <Field
            label="AI summary / preview"
            value={values.summary}
            onChangeText={(text) => update("summary", text)}
            multiline
          />
          <Text style={styles.fieldLabel}>Status</Text>
          <TabBar
            active={values.status}
            onChange={(status) => update("status", status)}
            tabs={[
              { key: "DRAFT", label: "Draft" },
              { key: "PUBLISHED", label: "Published" },
            ]}
          />
          <View style={styles.actions}>
            <Button label="Cancel" onPress={cancel} variant="secondary" />
            <Button
              label={mode === "create" ? "Create Workshop" : "Save Changes"}
              onPress={submit}
            />
          </View>
        </View>
      </Card>
    </View>
  );
}

function validateWorkshopForm(
  values: WorkshopFormValues,
  workshop?: ManagedWorkshop | null,
): FormErrors {
  const errors: FormErrors = {};
  const capacity = Number(values.capacity);
  const price = Number(values.feeAmount || "0");

  if (!values.title.trim()) {
    errors.title = "Title is required.";
  }
  if (!values.speaker.trim()) {
    errors.speaker = "Speaker is required.";
  }
  if (!values.room.trim()) {
    errors.room = "Room is required.";
  }
  if (!Number.isFinite(capacity) || capacity <= 0) {
    errors.capacity = "Capacity must be a positive number.";
  }
  if (workshop && Number.isFinite(capacity) && capacity < workshop.registrations) {
    errors.capacity = "Capacity cannot be lower than current registrations.";
  }
  if (values.startTime && values.endTime && values.endTime <= values.startTime) {
    errors.endTime = "End time must be after start time.";
  }
  if (values.feeType === "FREE" && price !== 0) {
    errors.feeAmount = "Free workshops must have price 0.";
  }
  if (values.feeType === "PAID" && (!Number.isFinite(price) || price <= 0)) {
    errors.feeAmount = "Paid workshops must have a positive price.";
  }

  return errors;
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
