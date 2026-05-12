import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { ConfirmActionModal } from "../../components/ConfirmActionModal";
import { DateInput, TimeInput } from "../../components/DateTimeInputs";
import { FeeBadge, WorkshopStatusBadge } from "../../components/StatusBadge";
import { Badge, Button, Card, EmptyState, TabBar } from "../../components/ui";
import {
  Account,
  ManagedWorkshop,
  OrganizerStats,
  WorkshopFormValues,
  WorkshopStatus,
} from "../../models/types";
import {
  cancelWorkshop,
  createWorkshop,
  getOrganizerDashboard,
  updateWorkshop,
} from "../../services/workshopService";
import { colors, spacing } from "../../theme/theme";
import { isValidDateText, isValidTimeText } from "../../utils/dateTime";
import { WorkshopFormScreen } from "./WorkshopFormScreen";

type OrganizerTab = "dashboard" | "workshops" | "stats" | "profile";
type WorkshopView = "list" | "detail" | "create" | "edit";
type StatusFilter = "ALL" | WorkshopStatus;
type FeeFilter = "ALL" | "FREE" | "PAID";
type ScheduleQuickFilter = "ALL" | "TODAY" | "UPCOMING" | "PAST";
type ScheduleFilters = {
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  quick: ScheduleQuickFilter;
};

const emptyScheduleFilters: ScheduleFilters = {
  dateFrom: "",
  dateTo: "",
  timeFrom: "",
  timeTo: "",
  quick: "ALL",
};

export function OrganizerApp({ account }: { account: Account }) {
  const [tab, setTab] = useState<OrganizerTab>("dashboard");
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [workshops, setWorkshops] = useState<ManagedWorkshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workshopView, setWorkshopView] = useState<WorkshopView>("list");
  const [selectedWorkshop, setSelectedWorkshop] = useState<ManagedWorkshop | null>(
    null,
  );
  const [confirmWorkshop, setConfirmWorkshop] = useState<ManagedWorkshop | null>(
    null,
  );

  useEffect(() => {
    refreshDashboard();
  }, []);

  const refreshDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getOrganizerDashboard();
      setStats(result.stats);
      setWorkshops(result.workshops);
      setSelectedWorkshop((current) =>
        current
          ? result.workshops.find((workshop) => workshop.id === current.id) ??
            current
          : current,
      );
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load workshops.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const derivedStats = useMemo(() => buildStats(workshops, stats), [workshops, stats]);

  const openWorkshops = () => {
    setTab("workshops");
    setWorkshopView("list");
    setSelectedWorkshop(null);
  };

  const handleCreate = async (values: WorkshopFormValues) => {
    if (actionLoading) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createWorkshop(values);
      setMessage(`${created.title} created as ${created.status.toLowerCase()}.`);
      await refreshDashboard();
      setWorkshopView("list");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create workshop failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (values: WorkshopFormValues) => {
    if (!selectedWorkshop || actionLoading) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateWorkshop(selectedWorkshop, values);
      setSelectedWorkshop(updated);
      setWorkshops((current) =>
        current.map((workshop) =>
          workshop.id === updated.id ? updated : workshop,
        ),
      );
      setMessage("Workshop updated successfully");
      const refreshed = await refreshDashboard();
      const refreshedWorkshop = refreshed?.workshops.find(
        (workshop) => workshop.id === updated.id,
      );
      setSelectedWorkshop(refreshedWorkshop ?? updated);
      setWorkshopView("detail");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update workshop failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!confirmWorkshop || actionLoading) {
      return;
    }
    if (confirmWorkshop.status === "CANCELLED") {
      setError("This workshop has already been cancelled.");
      setConfirmWorkshop(null);
      return;
    }
    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await cancelWorkshop(confirmWorkshop);
      setSelectedWorkshop(result);
      setMessage(`${result.title} cancelled.`);
      await refreshDashboard();
      setConfirmWorkshop(null);
      setWorkshopView("list");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel workshop failed.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.stack}>
      <TabBar
        active={tab}
        onChange={(nextTab) => {
          setTab(nextTab);
          if (nextTab !== "workshops") {
            setWorkshopView("list");
            setSelectedWorkshop(null);
          }
        }}
        tabs={[
          { key: "dashboard", label: "Dashboard" },
          { key: "workshops", label: "Workshops" },
          { key: "stats", label: "Stats" },
          { key: "profile", label: "Profile" },
        ]}
      />
      {tab === "dashboard" ? (
        <Dashboard stats={derivedStats} onOpenWorkshops={openWorkshops} />
      ) : null}
      {tab === "workshops" ? (
        <WorkshopWorkspace
          loading={loading}
          view={workshopView}
          workshops={workshops}
          selectedWorkshop={selectedWorkshop}
          message={message}
          error={error}
          actionLoading={actionLoading}
          onClearMessage={() => setMessage(null)}
          onClearError={() => setError(null)}
          onCreate={() => {
            setSelectedWorkshop(null);
            setWorkshopView("create");
          }}
          onBack={() => {
            setWorkshopView("list");
            setSelectedWorkshop(null);
          }}
          onView={(workshop) => {
            setSelectedWorkshop(workshop);
            setWorkshopView("detail");
          }}
          onEdit={(workshop) => {
            setSelectedWorkshop(workshop);
            setWorkshopView("edit");
          }}
          onCancelRequest={setConfirmWorkshop}
          onCreateSubmit={handleCreate}
          onEditSubmit={handleUpdate}
        />
      ) : null}
      {tab === "stats" ? (
        <RegistrationStats stats={derivedStats} workshops={workshops} />
      ) : null}
      {tab === "profile" ? <OrganizerProfile account={account} /> : null}
      <ConfirmActionModal
        visible={Boolean(confirmWorkshop)}
        workshop={confirmWorkshop}
        onCancel={() => setConfirmWorkshop(null)}
        onConfirm={handleConfirmCancel}
      />
    </View>
  );
}

function Dashboard({
  stats,
  onOpenWorkshops,
}: {
  stats: OrganizerStats;
  onOpenWorkshops: () => void;
}) {
  return (
    <View style={styles.stack}>
      <Card>
        <Text style={styles.title}>Organizer Dashboard</Text>
        <Text style={styles.body}>
          Manage workshop publication, room capacity, and session readiness.
        </Text>
        <Button label="Create or manage workshops" onPress={onOpenWorkshops} />
      </Card>
      <View style={styles.grid}>
        <StatCard label="Workshops" value={stats.totalWorkshops} />
        <StatCard label="Registrations" value={stats.totalRegistrations} />
        <StatCard label="Checked in" value={stats.checkedInCount} />
        <StatCard label="Paid regs" value={stats.paidRegistrationCount} />
        <StatCard label="Cancelled" value={stats.cancelledWorkshops} danger />
      </View>
    </View>
  );
}

function WorkshopWorkspace({
  loading,
  view,
  workshops,
  selectedWorkshop,
  message,
  error,
  actionLoading,
  onClearMessage,
  onClearError,
  onCreate,
  onBack,
  onView,
  onEdit,
  onCancelRequest,
  onCreateSubmit,
  onEditSubmit,
}: {
  loading: boolean;
  view: WorkshopView;
  workshops: ManagedWorkshop[];
  selectedWorkshop: ManagedWorkshop | null;
  message: string | null;
  error: string | null;
  actionLoading: boolean;
  onClearMessage: () => void;
  onClearError: () => void;
  onCreate: () => void;
  onBack: () => void;
  onView: (workshop: ManagedWorkshop) => void;
  onEdit: (workshop: ManagedWorkshop) => void;
  onCancelRequest: (workshop: ManagedWorkshop) => void;
  onCreateSubmit: (values: WorkshopFormValues) => void;
  onEditSubmit: (values: WorkshopFormValues) => void;
}) {
  const notice =
    view === "list" ? null : (
      <Notice
        message={message}
        error={error}
        onClearMessage={onClearMessage}
        onClearError={onClearError}
      />
    );

  if (view === "create") {
    return (
      <View style={styles.stack}>
        {notice}
        <WorkshopFormScreen
          mode="create"
          onCancel={onBack}
          onSubmit={onCreateSubmit}
          submitting={actionLoading}
        />
      </View>
    );
  }

  if (view === "edit" && selectedWorkshop) {
    return (
      <View style={styles.stack}>
        {notice}
        <WorkshopFormScreen
          mode="edit"
          workshop={selectedWorkshop}
          onCancel={() => onView(selectedWorkshop)}
          onSubmit={onEditSubmit}
          submitting={actionLoading}
        />
      </View>
    );
  }

  if (view === "detail" && selectedWorkshop) {
    return (
      <View style={styles.stack}>
        {notice}
        <OrganizerWorkshopDetail
          workshop={selectedWorkshop}
          onBack={onBack}
          onEdit={() => onEdit(selectedWorkshop)}
          onCancel={() => onCancelRequest(selectedWorkshop)}
          actionLoading={actionLoading}
        />
      </View>
    );
  }

  return (
    <OrganizerWorkshopList
      loading={loading}
      workshops={workshops}
      message={message}
      error={error}
      onClearMessage={onClearMessage}
      onClearError={onClearError}
      onCreate={onCreate}
      onView={onView}
      onEdit={onEdit}
      onCancel={onCancelRequest}
    />
  );
}

function Notice({
  message,
  error,
  onClearMessage,
  onClearError,
}: {
  message: string | null;
  error: string | null;
  onClearMessage: () => void;
  onClearError: () => void;
}) {
  if (!message && !error) {
    return null;
  }

  return (
    <Card>
      {message ? (
        <View style={styles.messageRow}>
          <Text style={styles.success}>{message}</Text>
          <Button label="OK" onPress={onClearMessage} variant="secondary" />
        </View>
      ) : null}
      {error ? (
        <View style={styles.messageRow}>
          <Text style={styles.error}>{error}</Text>
          <Button label="OK" onPress={onClearError} variant="secondary" />
        </View>
      ) : null}
    </Card>
  );
}

function OrganizerWorkshopList({
  loading,
  workshops,
  message,
  error,
  onClearMessage,
  onClearError,
  onCreate,
  onView,
  onEdit,
  onCancel,
}: {
  loading: boolean;
  workshops: ManagedWorkshop[];
  message: string | null;
  error: string | null;
  onClearMessage: () => void;
  onClearError: () => void;
  onCreate: () => void;
  onView: (workshop: ManagedWorkshop) => void;
  onEdit: (workshop: ManagedWorkshop) => void;
  onCancel: (workshop: ManagedWorkshop) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [feeFilter, setFeeFilter] = useState<FeeFilter>("ALL");
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleFilters>(
    emptyScheduleFilters,
  );
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilters>(
    emptyScheduleFilters,
  );
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const filteredWorkshops = workshops.filter((workshop) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      workshop.title.toLowerCase().includes(normalizedQuery) ||
      workshop.speaker.toLowerCase().includes(normalizedQuery);
    const matchesStatus =
      statusFilter === "ALL" || workshop.status === statusFilter;
    const matchesFee = feeFilter === "ALL" || workshop.feeType === feeFilter;
    const matchesSchedule = matchesScheduleFilter(workshop, scheduleFilter);

    return matchesQuery && matchesStatus && matchesFee && matchesSchedule;
  });

  const activeScheduleLabel = describeScheduleFilter(scheduleFilter);

  const updateScheduleDraft = (
    field: keyof ScheduleFilters,
    value: string,
  ) => {
    setScheduleDraft((current) => ({
      ...current,
      [field]: value,
      quick: field === "quick" ? (value as ScheduleQuickFilter) : current.quick,
    }));
  };

  const applyScheduleFilter = () => {
    const validationError = validateScheduleFilter(scheduleDraft);
    if (validationError) {
      setScheduleError(validationError);
      return;
    }
    setScheduleFilter({ ...scheduleDraft });
    setScheduleError(null);
  };

  const clearScheduleFilter = () => {
    setScheduleDraft(emptyScheduleFilters);
    setScheduleFilter(emptyScheduleFilters);
    setScheduleError(null);
  };

  if (loading) {
    return (
      <Card>
        <Text style={styles.title}>Loading workshops...</Text>
        <Text style={styles.body}>Preparing admin workshop data.</Text>
      </Card>
    );
  }

  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Text style={styles.title}>Workshop Management</Text>
            <Text style={styles.body}>
              Create, edit, publish, and cancel workshop sessions.
            </Text>
          </View>
          <Button label="Create Workshop" onPress={onCreate} />
        </View>
        {message ? (
          <View style={styles.messageRow}>
            <Text style={styles.success}>{message}</Text>
            <Button label="OK" onPress={onClearMessage} variant="secondary" />
          </View>
        ) : null}
        {error ? (
          <View style={styles.messageRow}>
            <Text style={styles.error}>{error}</Text>
            <Button label="OK" onPress={onClearError} variant="secondary" />
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Filters</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search title or speaker"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        <Text style={styles.filterLabel}>Status</Text>
        <TabBar
          active={statusFilter}
          onChange={setStatusFilter}
          tabs={[
            { key: "ALL", label: "All" },
            { key: "DRAFT", label: "Draft" },
            { key: "PUBLISHED", label: "Published" },
            { key: "FULL", label: "Full" },
            { key: "CANCELLED", label: "Cancelled" },
          ]}
        />
        <Text style={styles.filterLabel}>Fee</Text>
        <TabBar
          active={feeFilter}
          onChange={setFeeFilter}
          tabs={[
            { key: "ALL", label: "All" },
            { key: "FREE", label: "Free" },
            { key: "PAID", label: "Paid" },
          ]}
        />
        <Text style={styles.filterLabel}>Schedule</Text>
        <TabBar
          active={scheduleDraft.quick}
          onChange={(quick) => updateScheduleDraft("quick", quick)}
          tabs={[
            { key: "ALL", label: "All" },
            { key: "TODAY", label: "Today" },
            { key: "UPCOMING", label: "Upcoming" },
            { key: "PAST", label: "Past" },
          ]}
        />
        <View style={styles.filterGrid}>
          <DateInput
            label="Date from"
            value={scheduleDraft.dateFrom}
            onChangeText={(value) => updateScheduleDraft("dateFrom", value)}
          />
          <DateInput
            label="Date to"
            value={scheduleDraft.dateTo}
            onChangeText={(value) => updateScheduleDraft("dateTo", value)}
          />
          <TimeInput
            label="Time from"
            value={scheduleDraft.timeFrom}
            onChangeText={(value) => updateScheduleDraft("timeFrom", value)}
          />
          <TimeInput
            label="Time to"
            value={scheduleDraft.timeTo}
            onChangeText={(value) => updateScheduleDraft("timeTo", value)}
          />
        </View>
        {scheduleError ? (
          <Text style={styles.errorInline}>{scheduleError}</Text>
        ) : null}
        {activeScheduleLabel ? (
          <Text style={styles.activeFilter}>{activeScheduleLabel}</Text>
        ) : null}
        <View style={styles.actions}>
          <Button label="Apply filter" onPress={applyScheduleFilter} />
          <Button label="Clear filter" onPress={clearScheduleFilter} variant="secondary" />
        </View>
      </Card>

      {filteredWorkshops.length === 0 ? (
        <EmptyState
          title="No workshops found"
          body="Try changing the search text or filters, or create a new workshop."
        />
      ) : (
        filteredWorkshops.map((workshop) => (
          <OrganizerWorkshopCard
            key={workshop.id}
            workshop={workshop}
            onView={() => onView(workshop)}
            onEdit={() => onEdit(workshop)}
            onCancel={() => onCancel(workshop)}
          />
        ))
      )}
    </View>
  );
}

function OrganizerWorkshopCard({
  workshop,
  onView,
  onEdit,
  onCancel,
}: {
  workshop: ManagedWorkshop;
  onView: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        <WorkshopStatusBadge status={workshop.status} />
        <FeeBadge feeType={workshop.feeType} />
      </View>
      <Text style={styles.workshopTitle}>{workshop.title}</Text>
      <Text style={styles.meta}>{workshop.speaker}</Text>
      <Text style={styles.meta}>
        {workshop.date}, {workshop.time} - {workshop.room}
      </Text>
      <View style={styles.metricGrid}>
        <Metric label="Capacity" value={workshop.capacity} />
        <Metric label="Registered" value={workshop.registrations} />
        <Metric label="Remaining" value={workshop.remainingSeats} />
      </View>
      <View style={styles.actions}>
        <Button label="View Detail" onPress={onView} variant="secondary" />
        <Button label="Edit" onPress={onEdit} variant="secondary" />
        {workshop.status === "CANCELLED" ? (
          <View style={styles.cancelledPill}>
            <Text style={styles.cancelledPillText}>Already cancelled</Text>
          </View>
        ) : (
          <Button
            label="Cancel"
            onPress={onCancel}
            variant="danger"
          />
        )}
      </View>
    </Card>
  );
}

function OrganizerWorkshopDetail({
  workshop,
  onBack,
  onEdit,
  onCancel,
  actionLoading,
}: {
  workshop: ManagedWorkshop;
  onBack: () => void;
  onEdit: () => void;
  onCancel: () => void;
  actionLoading: boolean;
}) {
  const revenue = workshop.feeType === "PAID" ? workshop.revenue : 0;

  return (
    <View style={styles.stack}>
      <Button label="Back to list" onPress={onBack} variant="secondary" />
      <Card>
        <View style={styles.rowBetween}>
          <WorkshopStatusBadge status={workshop.status} />
          <FeeBadge feeType={workshop.feeType} />
        </View>
        <Text style={styles.detailTitle}>{workshop.title}</Text>
        <Text style={styles.meta}>{workshop.speaker}</Text>
        <Text style={styles.meta}>{workshop.speakerBio}</Text>
        <Text style={styles.meta}>
          {workshop.date}, {workshop.time} - {workshop.room}
        </Text>
        <Text style={styles.body}>{workshop.description}</Text>
        <View style={styles.mapBox}>
          <Text style={styles.sectionTitle}>Room / map note</Text>
          <Text style={styles.body}>{workshop.roomHint || "No room note yet."}</Text>
        </View>
        <Text style={styles.sectionTitle}>Summary</Text>
        <Text style={styles.body}>{workshop.summary}</Text>
        <View style={styles.metricGrid}>
          <Metric label="Capacity" value={workshop.capacity} />
          <Metric label="Registered" value={workshop.registrations} />
          <Metric label="Checked in" value={workshop.checkedIn} />
          <Metric label="Remaining" value={workshop.remainingSeats} />
        </View>
        <Text style={styles.revenue}>
          Revenue estimate: {revenue.toLocaleString("vi-VN")} VND
        </Text>
        <View style={styles.actions}>
          <Button label="Edit" onPress={onEdit} disabled={actionLoading} />
          {workshop.status === "CANCELLED" ? (
            <View style={styles.cancelledPanel}>
              <Text style={styles.cancelledPanelTitle}>Already cancelled</Text>
              <Text style={styles.cancelledPanelBody}>
                This workshop can no longer be cancelled.
              </Text>
            </View>
          ) : (
            <Button
              label={actionLoading ? "Cancelling..." : "Cancel"}
              onPress={onCancel}
              variant="danger"
              disabled={actionLoading}
            />
          )}
        </View>
      </Card>
    </View>
  );
}

function RegistrationStats({
  stats,
  workshops,
}: {
  stats: OrganizerStats;
  workshops: ManagedWorkshop[];
}) {
  const maxRegistrations = Math.max(
    1,
    ...workshops.map((item) => item.registrations),
  );

  return (
    <View style={styles.stack}>
      <Card>
        <Text style={styles.title}>Registration Statistics</Text>
        <Text style={styles.body}>
          {stats.totalRegistrations} total registrations across career week.
        </Text>
      </Card>
      {workshops.map((workshop) => (
        <Card key={workshop.id}>
          <Text style={styles.itemTitle}>{workshop.title}</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.max(
                    8,
                    (workshop.registrations / maxRegistrations) * 100,
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.meta}>
            {workshop.registrations} registered - {workshop.checkedIn} checked in
          </Text>
        </Card>
      ))}
    </View>
  );
}

function OrganizerProfile({ account }: { account: Account }) {
  return (
    <Card>
      <Badge label="ORGANIZER" tone="warning" />
      <Text style={styles.title}>{account.name}</Text>
      <Text style={styles.meta}>{account.email}</Text>
      <Text style={styles.todo}>
        Organizer access is verified by the backend using your signed-in role.
      </Text>
    </Card>
  );
}

function StatCard({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <Card>
      <Text style={[styles.statValue, danger && styles.danger]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function buildStats(
  workshops: ManagedWorkshop[],
  fallback: OrganizerStats | null,
): OrganizerStats {
  if (workshops.length === 0 && fallback) {
    return fallback;
  }

  return {
    totalWorkshops: workshops.length,
    totalRegistrations: workshops.reduce(
      (sum, item) => sum + item.registrations,
      0,
    ),
    checkedInCount: workshops.reduce((sum, item) => sum + item.checkedIn, 0),
    paidRegistrationCount: workshops
      .filter((item) => item.feeType === "PAID")
      .reduce((sum, item) => sum + item.registrations, 0),
    cancelledWorkshops: workshops.filter((item) => item.status === "CANCELLED")
      .length,
  };
}

function validateScheduleFilter(filters: ScheduleFilters) {
  const dateFrom = filters.dateFrom.trim();
  const dateTo = filters.dateTo.trim();
  const timeFrom = filters.timeFrom.trim();
  const timeTo = filters.timeTo.trim();

  if (dateFrom && !isValidDateText(dateFrom)) {
    return "Enter Date from as YYYY-MM-DD.";
  }
  if (dateTo && !isValidDateText(dateTo)) {
    return "Enter Date to as YYYY-MM-DD.";
  }
  if (timeFrom && !isValidTimeText(timeFrom)) {
    return "Enter Time from as HH:mm.";
  }
  if (timeTo && !isValidTimeText(timeTo)) {
    return "Enter Time to as HH:mm.";
  }
  if (dateFrom && dateTo && dateTo < dateFrom) {
    return "Date to cannot be earlier than Date from.";
  }
  if (timeFrom && timeTo && timeTo < timeFrom) {
    return "Time to cannot be earlier than Time from.";
  }

  return null;
}

function matchesScheduleFilter(
  workshop: ManagedWorkshop,
  filters: ScheduleFilters,
) {
  if (!hasActiveScheduleFilter(filters)) {
    return true;
  }

  const schedules = workshop.scheduleSessions.length
    ? workshop.scheduleSessions
    : [{ date: workshop.date, startTime: workshop.startTime, endTime: workshop.endTime }];

  return schedules.some((schedule) => matchesScheduleSession(schedule, filters));
}

function hasActiveScheduleFilter(filters: ScheduleFilters) {
  return Boolean(
    filters.dateFrom ||
      filters.dateTo ||
      filters.timeFrom ||
      filters.timeTo ||
      filters.quick !== "ALL",
  );
}

function matchesScheduleSession(
  schedule: { date: string; startTime: string; endTime: string },
  filters: ScheduleFilters,
) {
  if (!schedule.date || !isValidDateText(schedule.date)) {
    return false;
  }

  const startTime = schedule.startTime;
  const endTime = schedule.endTime;
  if ((filters.timeFrom || filters.timeTo) && !isValidTimeText(startTime)) {
    return false;
  }

  const normalizedStartTime = isValidTimeText(startTime) ? startTime : "00:00";
  const normalizedEndTime = isValidTimeText(endTime)
    ? endTime
    : normalizedStartTime;
  const workshopStart = toComparableDateTime(schedule.date, normalizedStartTime);
  const workshopEnd = toComparableDateTime(schedule.date, normalizedEndTime);
  const now = new Date();
  const today = formatLocalDate(now);

  if (filters.quick === "TODAY" && schedule.date !== today) {
    return false;
  }
  if (filters.quick === "UPCOMING" && workshopStart < now.getTime()) {
    return false;
  }
  if (filters.quick === "PAST" && workshopEnd >= now.getTime()) {
    return false;
  }
  if (filters.dateFrom && schedule.date < filters.dateFrom) {
    return false;
  }
  if (filters.dateTo && schedule.date > filters.dateTo) {
    return false;
  }
  if (filters.timeFrom && normalizedStartTime < filters.timeFrom) {
    return false;
  }
  if (filters.timeTo && normalizedStartTime > filters.timeTo) {
    return false;
  }

  return true;
}

function describeScheduleFilter(filters: ScheduleFilters) {
  const parts: string[] = [];
  if (filters.quick !== "ALL") {
    parts.push(filters.quick.toLowerCase());
  }
  if (filters.dateFrom) {
    parts.push(`from ${filters.dateFrom}`);
  }
  if (filters.dateTo) {
    parts.push(`to ${filters.dateTo}`);
  }
  if (filters.timeFrom) {
    parts.push(`after ${filters.timeFrom}`);
  }
  if (filters.timeTo) {
    parts.push(`before ${filters.timeTo}`);
  }

  return parts.length ? `Active schedule filter: ${parts.join(", ")}` : "";
}

function toComparableDateTime(dateText: string, timeText: string) {
  return new Date(`${dateText}T${timeText}:00`).getTime();
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  grid: {
    gap: spacing.md,
  },
  rowBetween: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  flex: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  detailTitle: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  workshopTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  todo: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  success: {
    color: colors.success,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  error: {
    color: colors.danger,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  messageRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statValue: {
    color: colors.primaryDark,
    fontSize: 32,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  danger: {
    color: colors.danger,
  },
  barTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 12,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  barFill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: "100%",
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  filterLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  filterGrid: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  activeFilter: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  errorInline: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  metric: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    minWidth: 104,
    padding: spacing.md,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  mapBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  revenue: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900",
    marginTop: spacing.lg,
  },
  cancelledPill: {
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderColor: "#fecaca",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 45,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cancelledPillText: {
    color: "#991b1b",
    fontSize: 13,
    fontWeight: "900",
  },
  cancelledPanel: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cancelledPanelTitle: {
    color: "#991b1b",
    fontSize: 13,
    fontWeight: "900",
  },
  cancelledPanelBody: {
    color: "#9f1239",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
});
