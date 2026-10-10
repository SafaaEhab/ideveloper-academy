// @ts-check
/**
 * جدول المواعيد — the group timetable, drawn like a calendar app.
 *
 * Week view is a real time grid: sessions are blocks positioned by their actual
 * minutes, you can drag one to another day or time, and clicking one opens the
 * editor. Month view is the familiar chip grid for spotting a bad week.
 *
 * Recurring slots are expanded client-side from `lib/schedule`, so dragging a
 * block has to answer the question Google Calendar asks: does this move just
 * this week, or every week? That choice stays in `pendingMove` until the admin
 * picks it in the scope dialog.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Repeat,
  Trash2,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import {
  DAY_LABELS,
  DAY_LABELS_SHORT,
  buildColorMap,
  buildOccurrences,
  colorFor,
  findConflicts,
  formatDuration,
  formatTime,
  formatTimeRange,
  fromDateKey,
  layoutOverlaps,
  minutesToTime,
  monthGrid,
  parseGroupSchedule,
  timeToMinutes,
  toDateKey,
  weekDays,
  type GroupColor,
  type Occurrence,
  type ScheduleException,
} from "@/lib/schedule";

/** 44 minutes per hour keeps a 90-minute class readable inside a 640px grid. */
const HOUR_HEIGHT = 44;
const GRID_HEIGHT = HOUR_HEIGHT * 24;
/** Dragging snaps like every other calendar. */
const SNAP_MINUTES = 15;
/** Pointer travel, in px, below which a press counts as a click rather than a drag. */
const DRAG_THRESHOLD = 5;
const MONTH_CHIPS = 3;

type ViewMode = "week" | "month";

type MoveTarget = {
  occurrence: Occurrence;
  /** Where the admin dropped it. */
  dateKey: string;
  startTime: string;
  endTime: string;
};

type EditorForm = {
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
};

type EditorState = {
  /** `null` while creating. */
  sessionId: number | null;
  occurrence: Occurrence | null;
  form: EditorForm;
  scope: "series" | "week";
};

const emptyForm: EditorForm = {
  groupId: "",
  dayOfWeek: 6,
  startTime: "17:00",
  endTime: "18:30",
  location: "",
  notes: "",
};

export default function ScheduleCalendar() {
  const utils = trpc.useUtils();

  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [weekStartsOn, setWeekStartsOn] = useState(0);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [pendingMove, setPendingMove] = useState<MoveTarget | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const sessions = trpc.admin.groupSessions.useQuery(undefined, { retry: false, refetchInterval: LIVE_REFETCH_INTERVAL });
  const groups = trpc.admin.groups.useQuery(undefined, { retry: false, refetchInterval: LIVE_REFETCH_INTERVAL });

  const sessionRows = sessions.data ?? [];
  const groupRows = groups.data ?? [];

  // The window the grid draws. A month pads out to whole weeks, so this is
  // wider than the anchor month; exceptions for the whole window load at once.
  const days = useMemo(
    () =>
      view === "week"
        ? weekDays(anchor, weekStartsOn)
        : monthGrid(anchor, weekStartsOn),
    [anchor, view, weekStartsOn],
  );

  const exceptions = trpc.admin.sessionExceptions.useQuery(
    { from: toDateKey(days[0]), to: toDateKey(days[days.length - 1]) },
    { retry: false, refetchInterval: LIVE_REFETCH_INTERVAL },
  );

  const occurrenceRows = useMemo(
    () =>
      buildOccurrences(
        sessionRows,
        (exceptions.data ?? []) as ScheduleException[],
        days[0],
        days[days.length - 1],
      ),
    [sessionRows, exceptions.data, days],
  );

  const conflicts = useMemo(() => findConflicts(occurrenceRows), [occurrenceRows]);

  const colors = useMemo(
    () => buildColorMap(groupRows.map(group => group.id)),
    [groupRows],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const occurrence of occurrenceRows) {
      const list = map.get(occurrence.dateKey);
      if (list) list.push(occurrence);
      else map.set(occurrence.dateKey, [occurrence]);
    }
    return map;
  }, [occurrenceRows]);

  const refresh = () => {
    utils.admin.groupSessions.invalidate();
    utils.admin.sessionExceptions.invalidate();
  };

  const createSession = trpc.admin.createGroupSession.useMutation({
    onSuccess: () => {
      toast.success("Session added to the timetable");
      setEditor(null);
      refresh();
    },
    onError: error => toast.error(error.message),
  });

  const updateSession = trpc.admin.updateGroupSession.useMutation({
    onSuccess: () => {
      toast.success("Timetable updated");
      setEditor(null);
      setPendingMove(null);
      refresh();
    },
    onError: error => toast.error(error.message),
  });

  const deleteSession = trpc.admin.deleteGroupSession.useMutation({
    onSuccess: () => {
      toast.success("Session removed from the timetable");
      setEditor(null);
      refresh();
    },
    onError: error => toast.error(error.message),
  });

  const saveException = trpc.admin.saveSessionException.useMutation({
    onSuccess: () => {
      toast.success("That week only — the rest of the series is untouched");
      setEditor(null);
      setPendingMove(null);
      refresh();
    },
    onError: error => toast.error(error.message),
  });

  // ── Navigation ───────────────────────────────────────────────────────────

  const step = (direction: number) => {
    setAnchor(current => {
      const next = new Date(current.getTime());
      if (view === "week") next.setDate(next.getDate() + 7 * direction);
      else next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const heading = useMemo(() => {
    if (view === "month") {
      return anchor.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
    const week = weekDays(anchor, weekStartsOn);
    const first = week[0];
    const last = week[6];
    // Always spell the month on both ends. Omitting `month` makes some ICU
    // builds fall back to "2026 (day: 10)", which reads as a bug to the admin.
      return `${first.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} – ${last.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
  }, [anchor, view, weekStartsOn]);

  // ── Creating and editing ─────────────────────────────────────────────────

  function openCreate(date: Date, startTime = "17:00") {
    const endTime = minutesToTime((timeToMinutes(startTime) ?? 1020) + 90);
    setEditor({
      sessionId: null,
      occurrence: null,
      form: {
        ...emptyForm,
        groupId: groupRows[0] ? String(groupRows[0].id) : "",
        dayOfWeek: date.getDay(),
        startTime,
        endTime,
      },
      scope: "series",
    });
  }

  function openEdit(occurrence: Occurrence) {
    const series = sessionRows.find(item => item.id === occurrence.sessionId);
    setEditor({
      sessionId: occurrence.sessionId,
      occurrence,
      form: {
        groupId: String(occurrence.groupId),
        // A recurring slot carries its own weekday; a moved week shows where it
        // actually sits.
        dayOfWeek: series ? series.dayOfWeek : occurrence.dayOfWeek,
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
        location: series?.location ?? "",
        notes: series?.notes ?? "",
      },
      scope: "series",
    });
  }

  function editorPayload(form: EditorForm) {
    const groupId = Number(form.groupId);
    if (!groupId) return { error: "Pick the group this session belongs to" };
    const start = timeToMinutes(form.startTime);
    const end = timeToMinutes(form.endTime);
    if (start === null || end === null) return { error: "Enter the start and end time" };
    if (end <= start) return { error: "The session has to end after it starts" };
    return {
      values: {
        groupId,
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        location: form.location,
        notes: form.notes,
      },
    };
  }

  function saveEditor() {
    if (!editor) return;
    const parsed = editorPayload(editor.form);
    if ("error" in parsed) {
      toast.error(parsed.error);
      return;
    }
    const values = parsed.values;

    // Editing one week writes an exception and leaves the series alone.
    if (editor.sessionId && editor.scope === "week" && editor.occurrence) {
      const originalDay = fromDateKey(editor.occurrence.dateKey).getDay();
      const sameDay = editor.form.dayOfWeek === originalDay;
      saveException.mutate({
        sessionId: editor.sessionId,
        dateKey: editor.occurrence.dateKey,
        kind: "moved",
        moveToDate: sameDay ? "" : shiftWeek(editor.occurrence.dateKey, originalDay, editor.form.dayOfWeek),
        startTime: values.startTime,
        endTime: values.endTime,
      });
      return;
    }

    if (editor.sessionId) updateSession.mutate({ id: editor.sessionId, ...values });
    else createSession.mutate(values);
  }

  /** Skips one dated occurrence without touching the series. */
  function cancelWeek(occurrence: Occurrence) {
    saveException.mutate({
      sessionId: occurrence.sessionId,
      dateKey: occurrence.dateKey,
      kind: "cancelled",
      moveToDate: "",
      startTime: occurrence.startTime,
      endTime: occurrence.endTime,
    });
  }

  /**
   * Applies a finished drag. `week` writes a one-off exception; `series`
   * rewrites the recurring slot so every future week follows.
   */
  function applyMove(target: MoveTarget, scope: "series" | "week") {
    if (
      target.dateKey === target.occurrence.dateKey &&
      target.startTime === target.occurrence.startTime
    ) {
      setPendingMove(null);
      return;
    }
    if (scope === "week") {
      saveException.mutate({
        sessionId: target.occurrence.sessionId,
        dateKey: target.occurrence.dateKey,
        kind: "moved",
        moveToDate:
          target.dateKey === target.occurrence.dateKey ? "" : target.dateKey,
        startTime: target.startTime,
        endTime: target.endTime,
      });
      return;
    }
    updateSession.mutate({
      id: target.occurrence.sessionId,
      groupId: target.occurrence.groupId,
      dayOfWeek: fromDateKey(target.dateKey).getDay(),
      startTime: target.startTime,
      endTime: target.endTime,
      location: target.occurrence.location ?? "",
      notes: target.occurrence.notes ?? "",
    });
  }

  // ── Dragging ─────────────────────────────────────────────────────────────

  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Where inside the block the pointer grabbed it, in minutes. */
  const grabOffset = useRef(0);
  /** Where the pointer went down, so a plain click can be told from a drag. */
  const dragOrigin = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Open the grid near the afternoon, where an academy actually teaches.
    if (scrollRef.current) scrollRef.current.scrollTop = HOUR_HEIGHT * 7;
  }, [view, weekStartsOn]);

  /** Turns a pointer position over the grid into a day index and a snapped time. */
  function locate(event: { clientX: number; clientY: number }) {
    const node = gridRef.current;
    if (!node) return null;
    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return null;
    const dayWidth = box.width / 7;
    const dayIndex = Math.min(
      6,
      Math.max(0, Math.floor((event.clientX - box.left) / dayWidth)),
    );
    const rawMinutes = ((event.clientY - box.top) / HOUR_HEIGHT) * 60 - grabOffset.current;
    const snapped = Math.min(
      24 * 60 - SNAP_MINUTES,
      Math.max(0, Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES),
    );
    return { dayIndex, snapped };
  }

  function beginDrag(event: React.PointerEvent, occurrence: Occurrence) {
    if (event.button !== 0) return;
    const node = gridRef.current;
    if (!node) return;
    // Capture on the grid so the drag survives leaving the block or the column.
    node.setPointerCapture?.(event.pointerId);
    const box = node.getBoundingClientRect();
    const start = timeToMinutes(occurrence.startTime) ?? 0;
    grabOffset.current = ((event.clientY - box.top) / HOUR_HEIGHT) * 60 - start;
    dragOrigin.current = { x: event.clientX, y: event.clientY };
    setDrag(occurrence.key);
  }

  function onGridPointerUp(event: React.PointerEvent) {
    const key = drag;
    if (!key) return;
    setDrag(null);
    gridRef.current?.releasePointerCapture?.(event.pointerId);
    const occurrence = occurrenceRows.find(item => item.key === key);
    if (!occurrence) return;
    // The grid captures the pointer, so this handler — not the block's onClick —
    // is the one that sees the release. A pointer that never travelled is a
    // click, so open the editor instead of the move dialog.
    const travelled =
      Math.abs(event.clientX - dragOrigin.current.x) +
      Math.abs(event.clientY - dragOrigin.current.y);
    if (travelled < DRAG_THRESHOLD) {
      openEdit(occurrence);
      return;
    }
    const located = locate(event);
    if (!located) return;
    const length = Math.max(
      SNAP_MINUTES,
      (timeToMinutes(occurrence.endTime) ?? 0) -
        (timeToMinutes(occurrence.startTime) ?? 0),
    );
    setPendingMove({
      occurrence,
      dateKey: toDateKey(days[located.dayIndex]),
      startTime: minutesToTime(located.snapped),
      endTime: minutesToTime(located.snapped + length),
    });
  }

  // ── Importing the old free-text schedule ─────────────────────────────────

  const importSessions = trpc.admin.createGroupSession.useMutation();

  async function importFromGroups() {
    const pending: Record<string, unknown>[] = [];
    const skipped: string[] = [];
    for (const group of groupRows) {
      const slots = parseGroupSchedule(group);
      if (slots.length === 0) {
        if (group.scheduleDays || group.scheduleTime) skipped.push(group.name);
        continue;
      }
      for (const slot of slots) {
        pending.push({
          groupId: group.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          location: "",
          notes: "",
        });
      }
    }
    if (pending.length === 0) {
      toast.error(
        skipped.length > 0
          ? `Could not read a schedule from ${skipped.join(", ")} — check the day and time text.`
          : "No groups have a day and time to import yet",
      );
      return;
    }
    setImporting(true);
    try {
      for (const values of pending) {
        await importSessions.mutateAsync(values as never);
      }
      toast.success(`Imported ${pending.length} weekly session${pending.length === 1 ? "" : "s"}`);
      if (skipped.length > 0) {
        toast.warning(`Skipped ${skipped.join(", ")} — could not read the schedule`);
      }
      refresh();
    } catch {
      // The mutation already surfaced the message.
    } finally {
      setImporting(false);
    }
  }

  const hasLegacyText = groupRows.some(
    group => group.scheduleDays || group.scheduleTime,
  );

  const upcoming = useMemo(() => {
    const today = toDateKey(new Date());
    return occurrenceRows.filter(item => item.dateKey >= today).slice(0, 6);
  }, [occurrenceRows]);

  const clashCount = conflicts.size / 2;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => step(-1)}
            aria-label={view === "week" ? "Previous week" : "Previous month"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => step(1)}
            aria-label={view === "week" ? "Next week" : "Next month"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
          <h2 className="ms-2 text-lg font-bold tracking-tight">{heading}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(weekStartsOn)}
            onValueChange={value => setWeekStartsOn(Number(value))}
          >
            <SelectTrigger className="w-[168px]" aria-label="First day of the week">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Week starts Sunday</SelectItem>
              <SelectItem value="1">Week starts Monday</SelectItem>
              <SelectItem value="6">Week starts Saturday</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-2xl border border-border p-1">
            {(["week", "month"] as ViewMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                aria-pressed={view === mode}
                className={`rounded-xl px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                  view === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <Button onClick={() => openCreate(weekDays(anchor, weekStartsOn)[0])}>
            <Plus className="me-2 h-4 w-4" />
            New session
          </Button>
        </div>
      </div>

      {groupRows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-semibold">No groups yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a group first, then come back to lay out its weekly sessions.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-card px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {sessionRows.length} weekly session{sessionRows.length === 1 ? "" : "s"}
            </span>
            {groupRows.map(group => (
              <span key={group.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${colorFor(group.id, colors).dot}`}
                />
                {group.name}
              </span>
            ))}
            {clashCount > 0 && (
              <span className="ms-auto flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                <TriangleAlert className="h-4 w-4" />
                {clashCount} clash{clashCount === 1 ? "" : "es"}
              </span>
            )}
          </div>

          {hasLegacyText && sessionRows.length === 0 && (
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
              <p className="text-sm">
                Your groups already have day and time text. Turn it into real
                calendar events in one go.
              </p>
              <Button variant="outline" disabled={importing} onClick={importFromGroups}>
                <Wand2 className="me-2 h-4 w-4" />
                {importing ? "Importing…" : "Import from groups"}
              </Button>
            </div>
          )}

          {view === "week" ? (
            <WeekGrid
              days={days}
              byDate={byDate}
              colors={colors}
              conflicts={conflicts}
              gridRef={gridRef}
              scrollRef={scrollRef}
              dragKey={drag}
              onPointerDown={beginDrag}
              onPointerUp={onGridPointerUp}
              onSelect={openEdit}
              onCreateSlot={openCreate}
            />
          ) : (
            <MonthGrid
              days={days}
              anchor={anchor}
              byDate={byDate}
              colors={colors}
              conflicts={conflicts}
              onSelect={openEdit}
              onSelectDay={openCreate}
            />
          )}

          {upcoming.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Coming up
              </h3>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {upcoming.map(occurrence => (
                  <button
                    key={occurrence.key}
                    type="button"
                    onClick={() => openEdit(occurrence)}
                    className="flex items-start gap-3 rounded-2xl border border-border/70 p-3 text-start transition-colors hover:bg-muted/50"
                  >
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        colorFor(occurrence.groupId, colors).dot
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {occurrence.groupName}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {fromDateKey(occurrence.dateKey).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {` · ${formatTimeRange(occurrence.startTime, occurrence.endTime)}`}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <SessionDialog
        state={editor}
        groups={groupRows.map(group => ({
          id: group.id,
          name: group.name,
        }))}
        busy={
          createSession.isPending ||
          updateSession.isPending ||
          saveException.isPending
        }
        onChange={patch =>
          setEditor(current => (current ? { ...current, ...patch } : current))
        }
        onClose={() => setEditor(null)}
        onSave={saveEditor}
        onDelete={
          editor?.sessionId
            ? () => deleteSession.mutate({ id: editor.sessionId as number })
            : undefined
        }
        onSkipWeek={
          editor?.occurrence ? () => cancelWeek(editor.occurrence as Occurrence) : undefined
        }
      />

      <MoveScopeDialog
        target={pendingMove}
        busy={saveException.isPending || updateSession.isPending}
        onClose={() => setPendingMove(null)}
        onApply={applyMove}
      />
    </div>
  );
}

/** Moves a date to another weekday inside the same week. */
function shiftWeek(dateKey: string, fromDay: number, toDay: number): string {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + ((toDay - fromDay + 7) % 7));
  return toDateKey(date);
}

// ── Week time grid ─────────────────────────────────────────────────────────

type WeekGridProps = {
  days: Date[];
  byDate: Map<string, Occurrence[]>;
  colors: Map<number, GroupColor>;
  conflicts: Set<string>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  dragKey: string | null;
  onPointerDown: (event: React.PointerEvent, occurrence: Occurrence) => void;
  onPointerUp: (event: React.PointerEvent) => void;
  onSelect: (occurrence: Occurrence) => void;
  onCreateSlot: (date: Date, startTime?: string) => void;
};

function WeekGrid({
  days,
  byDate,
  colors,
  conflicts,
  gridRef,
  scrollRef,
  dragKey,
  onPointerDown,
  onPointerUp,
  onSelect,
  onCreateSlot,
}: WeekGridProps) {
  const today = toDateKey(new Date());
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const gridColumns = `repeat(7, minmax(0, 1fr))`;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div
        className="grid border-b border-border bg-muted/40"
        style={{ gridTemplateColumns: `64px ${gridColumns}` }}
      >
        <div />
        {days.map(day => {
          const isToday = toDateKey(day) === today;
          return (
            <div key={day.getTime()} className="border-s border-border/60 px-2 py-2 text-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {DAY_LABELS_SHORT[day.getDay()]}
              </div>
              <div
                className={`mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  isToday ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div ref={scrollRef} className="max-h-[640px] overflow-y-auto overscroll-contain">
            <div className="flex">
              <div className="w-16 shrink-0" style={{ height: GRID_HEIGHT }}>
                {hours.map(hour => (
                  <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
                    <span className="absolute -top-2 end-2 text-[11px] font-medium text-muted-foreground">
                      {hour % 12 === 0 ? 12 : hour % 12} {hour < 12 ? "AM" : "PM"}
                    </span>
                  </div>
                ))}
              </div>

              <div
                ref={gridRef}
                className="relative grid flex-1 touch-none select-none"
                style={{ gridTemplateColumns: gridColumns, height: GRID_HEIGHT }}
                onPointerUp={onPointerUp}
              >
                {hours.map(hour => (
                  <div
                    key={hour}
                    className="pointer-events-none absolute inset-x-0 border-t border-border/60"
                    style={{ top: hour * HOUR_HEIGHT }}
                  />
                ))}

                {days.map((day, dayIndex) => {
                  const key = toDateKey(day);
                  const placed = layoutOverlaps(byDate.get(key) ?? []);
                  const isToday = key === today;
                  const now = new Date();
                  const nowTop =
                    isToday
                      ? ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT
                      : -1;
                  return (
                    <div
                      key={key}
                      className={`relative border-s border-border/60 ${
                        isToday ? "bg-primary/[0.05]" : ""
                      }`}
                      style={{ gridColumn: dayIndex + 1, gridRow: 1 }}
                    >
                      {hours.map(hour => {
                        const hourTime = `${String(hour).padStart(2, "0")}:00`;
                        return (
                          <button
                            key={hour}
                            type="button"
                            tabIndex={-1}
                            aria-label={`Add a session on ${DAY_LABELS[day.getDay()]} ${day.getDate()} at ${formatTime(hourTime)}`}
                            className="block w-full transition-colors hover:bg-primary/10"
                            style={{ height: HOUR_HEIGHT }}
                            onDoubleClick={() => onCreateSlot(day, hourTime)}
                          />
                        );
                      })}

                      {nowTop >= 0 && (
                        <div
                          className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-destructive"
                          style={{ top: nowTop }}
                        >
                          <span className="absolute -top-1 start-0 h-2 w-2 rounded-full bg-destructive" />
                        </div>
                      )}

                      {placed.map(({ occurrence, column, columns }) => (
                        <SessionBlock
                          key={occurrence.key}
                          occurrence={occurrence}
                          color={colorFor(occurrence.groupId, colors)}
                          top={
                            ((timeToMinutes(occurrence.startTime) ?? 0) / 60) * HOUR_HEIGHT
                          }
                          height={Math.max(
                            22,
                            (((timeToMinutes(occurrence.endTime) ?? 0) -
                              (timeToMinutes(occurrence.startTime) ?? 0)) /
                              60) *
                              HOUR_HEIGHT -
                              2,
                          )}
                          left={column}
                          columns={columns}
                          clashing={conflicts.has(occurrence.key)}
                          dragging={dragKey === occurrence.key}
                          onPointerDown={onPointerDown}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        Double-click an empty slot to add a session, or drag a block to move it.
      </p>
    </div>
  );
}

type SessionBlockProps = {
  occurrence: Occurrence;
  color: GroupColor;
  top: number;
  height: number;
  left: number;
  columns: number;
  clashing: boolean;
  dragging: boolean;
  onPointerDown: (event: React.PointerEvent, occurrence: Occurrence) => void;
};

function SessionBlock({
  occurrence,
  color,
  top,
  height,
  left,
  columns,
  clashing,
  dragging,
  onPointerDown,
}: SessionBlockProps) {
  const width = 100 / columns;
  return (
    <button
      type="button"
      onPointerDown={event => {
        // No onClick here: the grid captures the pointer on pointerdown, so the
        // release — and the decision between "click to edit" and "drag to move"
        // — happens in the grid's onPointerUp.
        onPointerDown(event, occurrence);
      }}
      className={`absolute overflow-hidden rounded-lg border text-start transition-shadow ${color.chip} ${
        clashing ? "ring-2 ring-amber-500" : ""
      } ${
        dragging
          ? "z-30 cursor-grabbing opacity-80 shadow-lg"
          : "z-10 cursor-grab hover:shadow-md"
      }`}
      style={{
        top,
        height,
        insetInlineStart: `calc(${left * width}% + 2px)`,
        width: `calc(${width}% - 4px)`,
        touchAction: "none",
      }}
    >
      <span className="block truncate px-1.5 pt-0.5 text-[11px] font-bold leading-tight">
        {occurrence.groupName}
      </span>
      {height > 34 && (
        <span className="block truncate px-1.5 text-[11px] font-medium leading-tight">
          {formatTimeRange(occurrence.startTime, occurrence.endTime)}
        </span>
      )}
      {height > 56 && occurrence.location && (
        <span className="block truncate px-1.5 text-[11px] leading-tight opacity-90">
          {occurrence.location}
        </span>
      )}
      {occurrence.moved && (
        <span className="absolute end-1 top-0.5">
          <Repeat className="h-3 w-3 opacity-80" />
        </span>
      )}
    </button>
  );
}

// ── Month grid ─────────────────────────────────────────────────────────────

type MonthGridProps = {
  days: Date[];
  anchor: Date;
  byDate: Map<string, Occurrence[]>;
  colors: Map<number, GroupColor>;
  conflicts: Set<string>;
  onSelect: (occurrence: Occurrence) => void;
  onSelectDay: (date: Date) => void;
};

function MonthGrid({
  days,
  anchor,
  byDate,
  colors,
  conflicts,
  onSelect,
  onSelectDay,
}: MonthGridProps) {
  const today = toDateKey(new Date());
  const [expanded, setExpanded] = useState<string | null>(null);
  const weekdayLabels = days.slice(0, 7).map(day => DAY_LABELS_SHORT[day.getDay()]);

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {weekdayLabels.map(label => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const key = toDateKey(day);
          const occurrences = byDate.get(key) ?? [];
          const outside = day.getMonth() !== anchor.getMonth();
          const isToday = key === today;
          const isExpanded = expanded === key;
          const shown = isExpanded
            ? occurrences
            : occurrences.slice(0, MONTH_CHIPS);
          const hidden = occurrences.length - shown.length;
          return (
            <div
              key={key}
              className={`group min-h-[124px] border-b border-border/60 p-1.5 ${
                index % 7 === 6 ? "" : "border-e"
              } ${outside ? "bg-muted/20" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : outside
                        ? "text-muted-foreground"
                        : ""
                  }`}
                >
                  {day.getDate()}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  aria-label={`Add a session on ${DAY_LABELS[day.getDay()]} ${day.getDate()}`}
                  className="rounded-md p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1 space-y-0.5">
                {shown.map(occurrence => {
                  const color = colorFor(occurrence.groupId, colors);
                  return (
                    <button
                      key={occurrence.key}
                      type="button"
                      onClick={() => onSelect(occurrence)}
                      className={`flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-start text-[11px] font-medium transition-colors hover:brightness-95 ${color.chip} ${
                        conflicts.has(occurrence.key) ? "ring-1 ring-amber-500" : ""
                      }`}
                    >
                      <span className="shrink-0 font-mono opacity-90">
                        {occurrence.startTime}
                      </span>
                      <span className="truncate">{occurrence.groupName}</span>
                    </button>
                  );
                })}
                {hidden > 0 && (
                  <button
                    type="button"
                    className="px-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => setExpanded(key)}
                  >
                    +{hidden} more
                  </button>
                )}
                {isExpanded && occurrences.length > MONTH_CHIPS && (
                  <button
                    type="button"
                    className="px-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => setExpanded(null)}
                  >
                    Show less
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Editor dialog ──────────────────────────────────────────────────────────

type SessionDialogProps = {
  state: EditorState | null;
  groups: { id: number; name: string }[];
  busy: boolean;
  onChange: (patch: Partial<EditorState>) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  onSkipWeek?: () => void;
};

function SessionDialog({
  state,
  groups,
  busy,
  onChange,
  onClose,
  onSave,
  onDelete,
  onSkipWeek,
}: SessionDialogProps) {
  const [pickDate, setPickDate] = useState<Date | undefined>(undefined);
  if (!state) return null;
  const { form } = state;
  const setForm = (patch: Partial<EditorForm>) =>
    onChange({ form: { ...form, ...patch } });

  const dateLabel = state.occurrence
    ? fromDateKey(state.occurrence.dateKey).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "Every week";

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {state.sessionId ? "Edit session" : "New session"}
          </DialogTitle>
          <DialogDescription>
            {state.sessionId
              ? `Weekly session · ${dateLabel}`
              : "This becomes a weekly slot the calendar repeats for you."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm" htmlFor="session-group">
              Group
            </Label>
            <Select
              value={form.groupId || undefined}
              onValueChange={value => setForm({ groupId: value })}
            >
              <SelectTrigger id="session-group">
                <SelectValue placeholder="Choose a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block text-sm" htmlFor="session-day">
                Repeats every
              </Label>
              <Select
                value={String(form.dayOfWeek)}
                onValueChange={value => setForm({ dayOfWeek: Number(value) })}
              >
                <SelectTrigger id="session-day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((label, index) => (
                    <SelectItem key={label} value={String(index)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block text-sm">Or pick that weekday</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="me-2 h-4 w-4" />
                    {pickDate
                      ? pickDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : DAY_LABELS[form.dayOfWeek]}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={pickDate}
                    onSelect={date => {
                      setPickDate(date);
                      if (date) setForm({ dayOfWeek: date.getDay() });
                    }}
                    classNames={{
                      // The popover already sits inside a Dialog, so Radix has
                      // marked everything outside it aria-hidden. Hiding the
                      // caption keeps the picker to its 7x6 grid.
                      caption_label: "sr-only",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block text-sm" htmlFor="session-start">
                Starts
              </Label>
              <Input
                id="session-start"
                type="time"
                dir="ltr"
                value={form.startTime}
                onChange={event => setForm({ startTime: event.target.value })}
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm" htmlFor="session-end">
                Ends
              </Label>
              <Input
                id="session-end"
                type="time"
                dir="ltr"
                value={form.endTime}
                onChange={event => setForm({ endTime: event.target.value })}
              />
            </div>
          </div>

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatTimeRange(form.startTime, form.endTime)}
            {formatDuration(form.startTime, form.endTime) &&
              ` · ${formatDuration(form.startTime, form.endTime)}`}
          </p>

          <div>
            <Label className="mb-2 block text-sm" htmlFor="session-location">
              Room or link
            </Label>
            <Input
              id="session-location"
              value={form.location}
              onChange={event => setForm({ location: event.target.value })}
              placeholder="Room A"
            />
          </div>

          <div>
            <Label className="mb-2 block text-sm" htmlFor="session-notes">
              Notes
            </Label>
            <Textarea
              id="session-notes"
              rows={2}
              value={form.notes}
              onChange={event => setForm({ notes: event.target.value })}
              placeholder="Bring the robots kit"
            />
          </div>

          {state.sessionId && state.occurrence && (
            <>
              <Separator />
              <div>
                <Label className="mb-2 block text-sm">Apply changes to</Label>
                <RadioGroup
                  value={state.scope}
                  onValueChange={value => onChange({ scope: value as "series" | "week" })}
                  className="gap-2"
                >
                  <label
                    htmlFor="scope-series"
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 has-[[data-state=checked]]:border-primary"
                  >
                    <RadioGroupItem value="series" id="scope-series" className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium">Every week</span>
                      <span className="block text-xs text-muted-foreground">
                        Moves the whole series, including weeks already passed.
                      </span>
                    </span>
                  </label>
                  <label
                    htmlFor="scope-week"
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 has-[[data-state=checked]]:border-primary"
                  >
                    <RadioGroupItem value="week" id="scope-week" className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium">This week only</span>
                      <span className="block text-xs text-muted-foreground">
                        Only {dateLabel} changes; every other week stays put.
                      </span>
                    </span>
                  </label>
                </RadioGroup>
              </div>

              {state.occurrence.moved && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                  <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    This week was already moved once. Saving keeps the rest of the
                    series intact.
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-1">
            {onSkipWeek && (
              <Button variant="ghost" disabled={busy} onClick={onSkipWeek}>
                Skip this week
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                className="text-destructive"
                disabled={busy}
                onClick={onDelete}
              >
                <Trash2 className="me-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={onSave}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Drag scope dialog ──────────────────────────────────────────────────────

type MoveScopeDialogProps = {
  target: MoveTarget | null;
  busy: boolean;
  onClose: () => void;
  onApply: (target: MoveTarget, scope: "series" | "week") => void;
};

function MoveScopeDialog({ target, busy, onClose, onApply }: MoveScopeDialogProps) {
  if (!target) return null;
  const { occurrence, dateKey, startTime, endTime } = target;
  const landing = fromDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const movedDay = dateKey !== occurrence.dateKey;

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move {occurrence.groupName}</DialogTitle>
          <DialogDescription>
            {formatTimeRange(startTime, endTime)} · {landing}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm">
            <Repeat className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              This group meets every {DAY_LABELS[occurrence.dayOfWeek]} at{" "}
              {formatTimeRange(occurrence.startTime, occurrence.endTime)}. How far
              should the move go?
            </p>
          </div>

          <Button
            className="h-12 w-full justify-between rounded-2xl"
            disabled={busy}
            onClick={() => onApply(target, "series")}
          >
            Move every week
            <Repeat className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full justify-between rounded-2xl"
            disabled={busy}
            onClick={() => onApply(target, "week")}
          >
            {movedDay ? `Only ${landing}` : "Only this week"}
            <CalendarClock className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}