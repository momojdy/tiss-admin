export type ScheduleDay = {date: Date; slots: Date[]};
const STEP = 5 * 60_000;
const LEAD = 15 * 60_000;

export function scheduleMinimum(now: number): number {
  return Math.ceil((now + LEAD + 1) / STEP) * STEP;
}

/** Calendar-day boundaries use the customer's timezone; merchant admission checks each real instant. */
export function scheduleDays(now: number, available: (instant: Date) => boolean, count = 7): ScheduleDay[] {
  const minimum = scheduleMinimum(now), start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Array.from({length: count}, (_, offset) => {
    const date = new Date(start); date.setDate(date.getDate() + offset);
    const end = new Date(date); end.setDate(end.getDate() + 1);
    const slots: Date[] = [];
    for (let timestamp = Math.max(date.getTime(), minimum); timestamp < end.getTime(); timestamp += STEP) {
      const instant = new Date(timestamp);
      if (available(instant)) slots.push(instant);
    }
    return {date, slots};
  });
}

export function scheduleChoice(days: ScheduleDay[], preferred: number, now: number): Date | null {
  const minimum = scheduleMinimum(now), slots = days.flatMap(day => day.slots).filter(slot => slot.getTime() >= minimum);
  return slots.find(slot => slot.getTime() >= preferred) || slots[0] || null;
}

/** Android time mode ignores native date bounds, so every picker event is bounded here too. */
export function clampScheduleTime(day: ScheduleDay, requested: Date, now: number): Date | null {
  const minimum = scheduleMinimum(now), slots = day.slots.filter(slot => slot.getTime() >= minimum);
  if (!slots.length) return null;
  const sameDay = requested.getFullYear() === day.date.getFullYear() && requested.getMonth() === day.date.getMonth() && requested.getDate() === day.date.getDate();
  const candidate = sameDay ? new Date(requested) : new Date(day.date);
  if (!sameDay) candidate.setHours(requested.getHours(), requested.getMinutes(), 0, 0);
  candidate.setSeconds(0, 0);
  return slots.find(slot => slot.getTime() >= candidate.getTime()) || slots[slots.length - 1];
}
