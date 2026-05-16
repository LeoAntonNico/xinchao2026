export interface StatusResult {
  isOpen: boolean;
  statusLabel: string;      // "Open", "Closed", "Closing soon", "Opens soon"
  nextChange: string;       // "21:00"
  nextDay: "today" | "tomorrow";
  minutesUntilClose?: number;
  minutesUntilOpen?: number;
}

const DAY_NAMES_NL = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const DAY_NAMES_EN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function calculateStatus(
  hours: Array<{ day: string; hours: string }>,
  locale: string
): StatusResult {
  const now = new Date();
  const amsTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  const todayNameNl = DAY_NAMES_NL[amsTime.getDay()];
  const todayNameEn = DAY_NAMES_EN[amsTime.getDay()];

  const todayEntry = hours.find(
    (h) =>
      h.day.toLowerCase().includes(todayNameNl) ||
      h.day.toLowerCase().includes(todayNameEn)
  );

  if (!todayEntry) {
    return { isOpen: false, statusLabel: locale === "nl" ? "Gesloten" : "Closed", nextChange: "", nextDay: "tomorrow" };
  }

  const match = todayEntry.hours.match(/(\d{1,2}):(\d{2})\s*[\u2013-]\s*(\d{1,2}):(\d{2})/);
  if (!match) {
    return { isOpen: false, statusLabel: todayEntry.hours, nextChange: todayEntry.hours, nextDay: "tomorrow" };
  }

  const [, openH, openM, closeH, closeM] = match.map(Number);
  const currentMinutes = amsTime.getHours() * 60 + amsTime.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  const nextTime = `${String(isOpen ? closeH : openH).padStart(2, "0")}:${String(isOpen ? closeM : openM).padStart(2, "0")}`;

  if (isOpen) {
    const minutesUntilClose = closeMinutes - currentMinutes;
    let statusLabel = locale === "nl" ? "Open" : "Open";
    if (minutesUntilClose <= 30) {
      statusLabel = locale === "nl" ? "Sluit binnenkort" : "Closing soon";
    }
    return {
      isOpen: true,
      statusLabel,
      nextChange: nextTime,
      nextDay: "today",
      minutesUntilClose,
    };
  }

  const nextDay: "today" | "tomorrow" = currentMinutes < openMinutes ? "today" : "tomorrow";
  const minutesUntilOpen = nextDay === "today" ? openMinutes - currentMinutes : undefined;

  let statusLabel = locale === "nl" ? "Gesloten" : "Closed";
  if (nextDay === "today" && minutesUntilOpen !== undefined && minutesUntilOpen <= 60) {
    statusLabel = locale === "nl" ? "Opent binnenkort" : "Opens soon";
  }

  return {
    isOpen: false,
    statusLabel,
    nextChange: nextTime,
    nextDay,
    minutesUntilOpen,
  };
}
