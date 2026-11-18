function chicagoParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function syncSlot(date = new Date()) {
  let parts = chicagoParts(date);
  let hour = Number(parts.hour);
  if (hour < 6) {
    parts = chicagoParts(new Date(date.getTime() - 12 * 60 * 60 * 1000));
    hour = 18;
  }
  const window = hour >= 18 ? "18" : "06";
  return `${parts.year}-${parts.month}-${parts.day}T${window}:00:00-America/Chicago`;
}

export function nextSyncIso(date = new Date()) {
  // Walk UTC hours so a daylight saving change does not move the local deadline.
  const candidate = new Date(date);
  candidate.setUTCMinutes(0, 0, 0);
  for (let step = 0; step < 25; step += 1) {
    candidate.setUTCHours(candidate.getUTCHours() + 1);
    const hour = Number(chicagoParts(candidate).hour);
    if (hour === 6 || hour === 18) return candidate.toISOString();
  }
  throw new Error("Unable to determine the next Central sync window.");
}

export function chicagoDate(date = new Date()) {
  const parts = chicagoParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}
