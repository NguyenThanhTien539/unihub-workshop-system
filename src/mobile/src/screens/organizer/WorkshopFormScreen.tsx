import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { DateInput, TimeInput } from "../../components/DateTimeInputs";
import { SelectField, SelectOption } from "../../components/SelectField";
import { ManagedWorkshop, Room, WorkshopFormValues } from "../../models/types";
import { getRooms } from "../../services/workshopService";
import { colors, spacing } from "../../theme/theme";
import { Button, Card, Field, TabBar } from "../../components/ui";
import {
  compareDateTimes,
  isValidDateText,
  isValidTimeText,
} from "../../utils/dateTime";

type FormErrors = Partial<Record<keyof WorkshopFormValues, string>>;

const defaultValues: WorkshopFormValues = {
  title: "",
  speaker: "",
  speakerBio: "",
  date: "",
  startTime: "",
  endTime: "",
  roomId: "",
  room: "",
  capacity: "",
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
    roomId: workshop.roomId || "",
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
  submitting = false,
}: {
  mode: "create" | "edit";
  workshop?: ManagedWorkshop | null;
  onCancel: () => void;
  onSubmit: (values: WorkshopFormValues) => void;
  submitting?: boolean;
}) {
  const initialValues = useMemo(() => toWorkshopFormValues(workshop), [workshop]);
  const [values, setValues] = useState<WorkshopFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const roomOptions = useMemo(() => rooms.map(toRoomOption), [rooms]);
  const selectedRoom = rooms.find((room) => room.id === values.roomId);

  const refreshRooms = async () => {
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const activeRooms = (await getRooms()).filter(
        (room) => room.status === "ACTIVE",
      );
      setRooms(activeRooms);
      setValues((current) => {
        if (current.roomId || !current.room.trim()) {
          return current;
        }
        const matchedRoom = findRoomByDisplayText(activeRooms, current.room);
        return matchedRoom
          ? { ...current, roomId: matchedRoom.id, room: toRoomLabel(matchedRoom) }
          : current;
      });
    } catch (err) {
      setRooms([]);
      setRoomsError(err instanceof Error ? err.message : "Unable to load rooms.");
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    refreshRooms();
  }, []);

  const update = (field: keyof WorkshopFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const updateRoom = (roomId: string) => {
    const room = rooms.find((item) => item.id === roomId);
    setValues((current) => ({
      ...current,
      roomId,
      room: room ? toRoomLabel(room) : "",
      capacity:
        room && (!current.capacity || Number(current.capacity) > room.capacity)
          ? String(room.capacity)
          : current.capacity,
      roomHint: room?.building || current.roomHint,
    }));
    setErrors((current) => ({
      ...current,
      room: undefined,
      roomId: undefined,
      capacity: undefined,
    }));
  };

  const submit = () => {
    const nextErrors = validateWorkshopForm(values, workshop, selectedRoom);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    if (submitting) {
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
          Configure workshop details, room, seats, price, and publish state.
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
          <DateInput
            label="Date"
            value={values.date}
            onChangeText={(text) => update("date", text)}
            error={errors.date}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <TimeInput
                label="Start time"
                value={values.startTime}
                onChangeText={(text) => update("startTime", text)}
                error={errors.startTime}
              />
            </View>
            <View style={styles.flex}>
              <TimeInput
                label="End time"
                value={values.endTime}
                onChangeText={(text) => update("endTime", text)}
                error={errors.endTime}
              />
            </View>
          </View>
          <SelectField
            label="Room"
            value={values.roomId}
            options={roomOptions}
            placeholder="Select an active room"
            loading={roomsLoading}
            loadError={roomsError}
            emptyText="No active rooms available"
            onChange={updateRoom}
            onRetry={refreshRooms}
            error={errors.roomId || errors.room}
          />
          <Field
            label="Room note"
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
            label="Summary"
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
              label={
                submitting
                  ? "Saving..."
                  : mode === "create"
                    ? "Create Workshop"
                    : "Save Changes"
              }
              onPress={submit}
              disabled={submitting}
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
  selectedRoom?: Room,
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
  if (!values.roomId.trim()) {
    errors.roomId = "Select a room.";
  }
  if (!Number.isFinite(capacity) || capacity <= 0) {
    errors.capacity = "Capacity must be a positive number.";
  }
  if (workshop && Number.isFinite(capacity) && capacity < workshop.registrations) {
    errors.capacity = "Capacity cannot be lower than current registrations.";
  }
  if (
    selectedRoom &&
    Number.isFinite(capacity) &&
    capacity > selectedRoom.capacity
  ) {
    errors.capacity = `Capacity cannot exceed ${selectedRoom.capacity} seats in ${selectedRoom.name}.`;
  }
  if (!values.date.trim()) {
    errors.date = "Date is required.";
  } else if (!isValidDateText(values.date)) {
    errors.date = "Enter date as YYYY-MM-DD.";
  }
  if (!values.startTime.trim()) {
    errors.startTime = "Start time is required.";
  } else if (!isValidTimeText(values.startTime)) {
    errors.startTime = "Enter time as HH:mm.";
  }
  if (!values.endTime.trim()) {
    errors.endTime = "End time is required.";
  } else if (!isValidTimeText(values.endTime)) {
    errors.endTime = "Enter time as HH:mm.";
  }
  if (
    !errors.date &&
    !errors.startTime &&
    !errors.endTime &&
    compareDateTimes(values.date, values.endTime, values.date, values.startTime) <= 0
  ) {
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

function toRoomOption(room: Room): SelectOption {
  return {
    label: toRoomLabel(room),
    value: room.id,
    description: room.mapUrl ? `Map: ${room.mapUrl}` : undefined,
  };
}

function toRoomLabel(room: Room) {
  return `${room.name} - ${room.building} - ${room.capacity} seats`;
}

function findRoomByDisplayText(rooms: Room[], value: string) {
  const normalized = value.trim().toLowerCase();
  return rooms.find((room) => {
    const names = [
      room.id,
      room.name,
      `${room.building} ${room.name}`,
      `${room.name} - ${room.building}`,
      toRoomLabel(room),
    ];
    return names.some((name) => name.trim().toLowerCase() === normalized);
  });
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
