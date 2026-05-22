"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  Clock3,
  HeartHandshake,
  Leaf,
  LockKeyhole,
  MapPin,
  Utensils,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

type Step = {
  id: number;
  label: string;
  status: "complete" | "active" | "inactive";
};

type TimeSlot = {
  time: string;
  recommended?: boolean;
  disabled?: boolean;
};

type ReassuranceItem = {
  label: string;
  icon: typeof Leaf;
};

type PickupDay = {
  date: string;
  summaryLabel: string;
  helper: string;
};

type PickupLocation = {
  id: string;
  name: string;
  slug: string;
  address: string;
  openFrom: string;
  openUntil: string;
  imageSrc: string;
};

type OrderCopy = ReturnType<typeof getOrderCopy>;

const steps: Step[] = [
  { id: 1, label: "Location", status: "complete" },
  { id: 2, label: "Time", status: "active" },
  { id: 3, label: "Your order", status: "inactive" },
  { id: 4, label: "Checkout", status: "inactive" },
];

const pickupLocations: PickupLocation[] = [
  {
    id: "utrecht",
    slug: "utrecht",
    name: "Xin Chào Utrecht",
    address: "Voor Clarenburg 6, 3511 JE Utrecht",
    openFrom: "12:00",
    openUntil: "21:30",
    imageSrc: "/images/utrecht-exterior.jpg",
  },
  {
    id: "wageningen",
    slug: "wageningen",
    name: "Xin Chào Wageningen",
    address: "Hoogstraat 18, 6701 BT Wageningen",
    openFrom: "12:00",
    openUntil: "20:00",
    imageSrc: "/images/wageningen-exterior.jpg",
  },
];

function getOrderCopy(locale: string) {
  const isNl = locale === "nl";
  return {
    steps: isNl ? ["Locatie", "Tijd", "Je bestelling", "Afrekenen"] : ["Location", "Time", "Your order", "Checkout"],
    reassuranceItems: [
      { label: isNl ? "Elke dag verse ingredienten" : "Fresh ingredients every day", icon: Leaf },
      { label: isNl ? "Op bestelling voor jou gemaakt" : "Made to order just for you", icon: Utensils },
      { label: isNl ? "Dank je wel voor je lokale steun" : "Thank you for supporting local", icon: HeartHandshake },
      { label: isNl ? "Veilig afrekenen, je gegevens zijn beschermd" : "Secure checkout, your data is protected", icon: LockKeyhole },
    ],
    changeLocation: isNl ? "Locatie wijzigen" : "Change location",
    availablePickupTimes: isNl ? "Beschikbare afhaaltijden" : "Available pickup times",
    chooseAnotherDay: isNl ? "Kies een andere dag" : "Choose another day",
    choosePickupTime: isNl ? "Kies je afhaaltijd" : "Choose your pickup time",
    checkoutProgress: isNl ? "Voortgang bestelling" : "Checkout progress",
    continueToMenu: isNl ? "Verder naar menu" : "Continue to menu",
    dayPickerTitle: isNl ? "Andere dag ophalen?" : "Need to pick up another day?",
    heroLine1: isNl ? "Wanneer wil je" : "When do you want",
    heroLine2: isNl ? "je bestelling ophalen?" : "to pick up your order?",
    heroSubtitle: isNl ? "We bereiden het vers en zetten het voor je klaar." : "We'll have it freshly prepared and ready for you.",
    open: isNl ? "Open" : "Open",
    openTodayUntil: isNl ? "Vandaag open tot" : "Open today until",
    openUntil: isNl ? "Open tot" : "Open until",
    pickupDay: isNl ? "Afhaaldag" : "Pickup day",
    pickupDate: isNl ? "Selecteer afhaaldatum" : "Select pickup date",
    recommended: isNl ? "Aanbevolen" : "Recommended",
    showLaterTimes: isNl ? "Toon latere afhaaltijden" : "Show later pickup times",
    today: isNl ? "vandaag" : "today",
    viewHours: isNl ? "Bekijk onze openingstijden en plan vooruit." : "View our opening hours and plan ahead.",
    weShowSlots: isNl ? "We tonen afhaalmomenten voor de gekozen dag." : "We show pickup slots for the selected day.",
  };
}

function getDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

const todayDate = new Date();
const todayInputValue = getDateInputValue(todayDate);
const tomorrowInputValue = getDateInputValue(addDays(todayDate, 1));

type ApiLocation = {
  id: string;
  name: string;
  slug: string;
  address: string;
  openTime: string;
  closeTime: string;
};

type ApiSlot = {
  id: string;
  date: string;
  time: string;
};

function locationImage(slug: string) {
  return slug === "wageningen" ? "/images/wageningen-exterior.jpg" : "/images/utrecht-exterior.jpg";
}

function parseTimeToMinutes(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function formatMinutesAsTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function buildPickupTimeSlots(location: PickupLocation): TimeSlot[] {
  const openMinutes = parseTimeToMinutes(location.openFrom);
  const closeMinutes = parseTimeToMinutes(location.openUntil);
  if (openMinutes === null || closeMinutes === null || closeMinutes < openMinutes) return [];

  const slots: TimeSlot[] = [];
  for (let minutes = openMinutes; minutes <= closeMinutes; minutes += 15) {
    const time = formatMinutesAsTime(minutes);
    slots.push({ time, recommended: time === "18:15" });
  }

  return slots;
}

function getPickupDay(dateValue: string, locale: string): PickupDay {
  const date = new Date(`${dateValue}T00:00:00`);
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB";
  const longLabel = date.toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const shortLabel = date.toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  if (dateValue === todayInputValue) {
    return { date: dateValue, summaryLabel: locale === "nl" ? "Vandaag" : "Today", helper: longLabel };
  }

  if (dateValue === tomorrowInputValue) {
    return { date: dateValue, summaryLabel: locale === "nl" ? "Morgen" : "Tomorrow", helper: longLabel };
  }

  return { date: dateValue, summaryLabel: shortLabel, helper: longLabel };
}

export default function OrderPickupPage() {
  const locale = useLocale();
  const router = useRouter();
  const copy = getOrderCopy(locale);
  const localizedSteps = useMemo(
    () => steps.map((step, index) => ({ ...step, label: copy.steps[index] })),
    [copy.steps]
  );
  const [selectedTime, setSelectedTime] = useState("18:15");
  const [selectedDate, setSelectedDate] = useState(todayInputValue);
  const [selectedLocationId, setSelectedLocationId] = useState("utrecht");
  const [locations, setLocations] = useState<PickupLocation[]>(pickupLocations);
  const [savingSelection, setSavingSelection] = useState(false);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const menuHref = useMemo(() => `/${locale}/menu`, [locale]);
  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) ?? locations[0] ?? pickupLocations[0],
    [locations, selectedLocationId]
  );
  const selectedDay = useMemo(() => getPickupDay(selectedDate, locale), [selectedDate, locale]);

  useEffect(() => {
    fetch("/api/locations")
      .then((response) => response.ok ? response.json() : [])
      .then((apiLocations: ApiLocation[]) => {
        if (apiLocations.length === 0) return;
        const nextLocations = apiLocations.map((location) => ({
          id: location.id,
          name: location.name,
          slug: location.slug,
          address: location.address,
          openFrom: location.openTime,
          openUntil: location.closeTime,
          imageSrc: locationImage(location.slug),
        }));
        setLocations(nextLocations);
        setSelectedLocationId((current) => {
          const currentLocation = nextLocations.find((location) => location.id === current || location.slug === current);
          return currentLocation?.id ?? nextLocations[0].id;
        });
      })
      .catch(() => {});
  }, []);

  const availableTimeSlots = useMemo(
    () => buildPickupTimeSlots(selectedLocation),
    [selectedLocation]
  );

  useEffect(() => {
    if (availableTimeSlots.length === 0) return;
    if (!availableTimeSlots.some((slot) => slot.time === selectedTime)) {
      setSelectedTime(availableTimeSlots[0].time);
    }
  }, [availableTimeSlots, selectedTime]);

  async function saveSelectionAndContinue() {
    if (!selectedLocation) return;
    setSavingSelection(true);
    try {
      const slots = await fetch(`/api/slots?locationId=${encodeURIComponent(selectedLocation.id)}&days=14`)
        .then((response) => response.ok ? response.json() : [])
        .catch(() => [] as ApiSlot[]);
      const slot = (slots as ApiSlot[]).find((candidate) => candidate.date === selectedDate && candidate.time === selectedTime);

      sessionStorage.setItem("order_locationId", selectedLocation.id);
      sessionStorage.setItem("order_locationSlug", selectedLocation.slug);
      sessionStorage.setItem("order_locationName", selectedLocation.name);
      sessionStorage.setItem("order_pickupDate", selectedDate);
      sessionStorage.setItem("order_pickupTime", selectedTime);
      if (slot?.id) {
        sessionStorage.setItem("order_slotId", slot.id);
      } else {
        sessionStorage.removeItem("order_slotId");
      }

      router.push(menuHref);
    } finally {
      setSavingSelection(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAF9F7] text-[#141414]">
      <main className="mx-auto max-w-[1440px] px-5 pb-28 pt-16 sm:px-8 lg:px-10 lg:py-8">
        <ProgressStepper steps={localizedSteps} ariaLabel={copy.checkoutProgress} />

        <div className="pt-8">
          <section className="mx-auto max-w-[980px] space-y-6 lg:space-y-7" aria-labelledby="pickup-page-title">
            <Hero copy={copy} />
            <LocationCard
              location={selectedLocation}
              locations={locations}
              copy={copy}
              onSelectLocation={setSelectedLocationId}
            />
            <TimeSlotSelector slots={availableTimeSlots} selectedTime={selectedTime} onSelect={setSelectedTime} copy={copy} />
            <AnotherDayCard
              selectedDay={selectedDay}
              selectedDate={selectedDate}
              pickerOpen={dayPickerOpen}
              onPickerOpenChange={setDayPickerOpen}
              copy={copy}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setDayPickerOpen(false);
              }}
            />
            <ContinueToMenuCard onContinue={saveSelectionAndContinue} copy={copy} disabled={savingSelection} />
          </section>
        </div>
      </main>
      <ReassuranceBar items={copy.reassuranceItems} />
      <MobileContinueBar onContinue={saveSelectionAndContinue} copy={copy} disabled={savingSelection} />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Header() {
  return (
    <header className="hidden border-b border-[#E8E4DF] bg-white/82 backdrop-blur-md lg:block">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <Link
          href="/en"
          className="inline-flex items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E30613]"
          aria-label="Xin Chào home"
        >
          <Image
            src="/images/logo.png"
            alt="Xin Chào Vietnamese Street Food"
            width={152}
            height={58}
            className="h-auto w-[132px] sm:w-[152px]"
            priority
          />
        </Link>
        <div className="hidden items-center gap-2 rounded-full border border-[#E8E4DF] bg-white px-4 py-2 text-sm font-medium text-[#6B6B6B] shadow-[0_8px_26px_rgba(20,20,20,0.04)] sm:flex">
          <span className="h-2 w-2 rounded-full bg-[#1BA84A]" aria-hidden="true" />
          Utrecht open until 21:30
        </div>
      </div>
    </header>
  );
}

function ProgressStepper({ steps, ariaLabel }: { steps: Step[]; ariaLabel: string }) {
  return (
    <nav aria-label={ariaLabel} className="pb-1">
      <ol className="flex w-full items-center gap-2 sm:gap-3">
        {steps.map((step, index) => {
          const isComplete = step.status === "complete";
          const isActive = step.status === "active";

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors sm:h-8 sm:w-8",
                    isActive ? "border-[#E30613] bg-[#E30613] text-white" : "",
                    isComplete ? "border-[#E30613] bg-white text-[#E30613]" : "",
                    !isActive && !isComplete ? "border-[#E8E4DF] bg-white text-[#9C9690]" : "",
                  ].join(" ")}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isComplete ? <Check className="h-4 w-4" aria-hidden="true" /> : step.id}
                </span>
                <span
                  className={[
                    "truncate text-sm font-semibold",
                    !isActive && !isComplete ? "hidden sm:inline" : "",
                    isActive || isComplete ? "text-[#141414]" : "text-[#8B8580]",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="h-px min-w-5 flex-1 bg-[#E8E4DF]" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Hero({ copy }: { copy: OrderCopy }) {
  return (
    <section className="overflow-hidden rounded-[24px] bg-[#FAF9F7] py-2 lg:py-4">
      <div>
        <h1
          id="pickup-page-title"
          className="max-w-[760px] text-[26px] font-extrabold leading-[1.08] text-[#141414] min-[380px]:text-[30px] sm:text-[38px] lg:text-[46px] xl:text-[54px]"
        >
          <span className="block whitespace-nowrap">{copy.heroLine1}</span>
          <span className="block whitespace-nowrap">{copy.heroLine2}</span>
        </h1>
        <p className="mt-4 max-w-[520px] text-[15px] leading-7 text-[#6B6B6B] sm:text-base">
          {copy.heroSubtitle}
        </p>
      </div>
    </section>
  );
}

function LocationCard({
  location,
  locations,
  copy,
  onSelectLocation,
}: {
  location: PickupLocation;
  locations: PickupLocation[];
  copy: OrderCopy;
  onSelectLocation: (locationId: string) => void;
}) {
  return (
    <section className="space-y-3" aria-labelledby="pickup-location-heading">
      <h2 id="pickup-location-heading" className="sr-only">
        {copy.changeLocation}
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {locations.map((option) => {
          const selected = option.id === location.id;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectLocation(option.id)}
              className={[
                "group flex min-h-[152px] items-start gap-4 rounded-[24px] border bg-white p-5 text-left shadow-[0_18px_50px_rgba(20,20,20,0.06)] transition hover:-translate-y-0.5 hover:border-[#E30613]/45 hover:shadow-[0_22px_54px_rgba(20,20,20,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#E30613] sm:p-6",
                selected ? "border-[#E30613] ring-4 ring-[#E30613]/8" : "border-[#E8E4DF]",
              ].join(" ")}
            >
              <Image
                src={option.imageSrc}
                alt={`${option.name} exterior`}
                width={88}
                height={88}
                className="h-20 w-20 shrink-0 rounded-2xl object-cover sm:h-[88px] sm:w-[88px]"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-lg font-bold leading-tight text-[#141414]">{option.name}</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1BA84A]">
                    <span className="h-2 w-2 rounded-full bg-[#1BA84A]" aria-hidden="true" />
                    {copy.open}
                  </span>
                </span>
                <span className="mt-2 flex items-center gap-2 text-sm text-[#6B6B6B]">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {option.address}
                </span>
                <span className="mt-1.5 flex items-center gap-2 text-sm text-[#6B6B6B]">
                  <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {copy.openTodayUntil} {option.openUntil}
                </span>
              </span>
              <span
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition",
                  selected
                    ? "border-[#E30613] bg-[#E30613] text-white"
                    : "border-[#E8E4DF] bg-white text-transparent group-hover:border-[#E30613]/40",
                ].join(" ")}
                aria-hidden="true"
              >
                <Check className="h-4 w-4" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TimeSlotSelector({
  slots,
  selectedTime,
  onSelect,
  copy,
}: {
  slots: TimeSlot[];
  selectedTime: string;
  onSelect: (time: string) => void;
  copy: OrderCopy;
}) {
  return (
    <section aria-labelledby="time-slots-heading" className="space-y-3">
      <h2 id="time-slots-heading" className="text-xl font-extrabold text-[#141414]">
        {copy.choosePickupTime}
      </h2>
      <div className="-mx-5 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
        <div className="flex min-w-max items-stretch gap-3">
          {slots.map((slot) => {
            const selected = selectedTime === slot.time;

            return (
              <button
                key={slot.time}
                type="button"
                disabled={slot.disabled}
                aria-pressed={selected}
                onClick={() => onSelect(slot.time)}
                className={[
                  "relative min-h-12 min-w-[86px] rounded-2xl border px-4 py-2 text-center text-[15px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#E30613] disabled:cursor-not-allowed disabled:border-[#E8E4DF] disabled:bg-[#F4F1ED] disabled:text-[#B8B0A8]",
                  selected
                    ? "border-[#E30613] bg-[#E30613] text-white shadow-[0_14px_34px_rgba(227,6,19,0.24)]"
                    : "border-[#E8E4DF] bg-white text-[#141414] hover:border-[#E30613]/45 hover:bg-[#FFF6F6]",
                ].join(" ")}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {slot.time}
                  {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                </span>
                {selected && slot.recommended && (
                  <span className="mt-0.5 block text-[10px] font-semibold leading-none text-white/85">
                    {copy.recommended}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AnotherDayCard({
  selectedDay,
  selectedDate,
  pickerOpen,
  onPickerOpenChange,
  copy,
  onSelectDate,
}: {
  selectedDay: PickupDay;
  selectedDate: string;
  pickerOpen: boolean;
  onPickerOpenChange: (open: boolean) => void;
  copy: OrderCopy;
  onSelectDate: (date: string) => void;
}) {
  return (
    <section className="rounded-[22px] border border-[#E8E4DF] bg-white p-5 shadow-[0_12px_34px_rgba(20,20,20,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E8E4DF] bg-white text-[#141414]">
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[17px] font-bold text-[#141414]">{copy.dayPickerTitle}</h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              {selectedDay.summaryLabel === "Today" || selectedDay.summaryLabel === "Vandaag"
                ? copy.viewHours
                : `${copy.pickupDay}: ${selectedDay.summaryLabel}.`}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={pickerOpen}
          aria-controls="pickup-day-picker"
          onClick={() => onPickerOpenChange(!pickerOpen)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#E8E4DF] bg-white px-4 py-3 text-sm font-semibold text-[#141414] transition hover:border-[#E30613]/35 hover:bg-[#FFF6F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#E30613]"
        >
          {copy.chooseAnotherDay}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {pickerOpen && (
        <div id="pickup-day-picker" className="mt-5 border-t border-[#E8E4DF] pt-5">
          <label className="block" htmlFor="pickup-date">
            <span className="text-sm font-bold text-[#141414]">{copy.pickupDate}</span>
            <span className="mt-1 block text-sm text-[#6B6B6B]">{selectedDay.helper}</span>
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#E30613]" aria-hidden="true" />
              <input
                id="pickup-date"
                type="date"
                min={todayInputValue}
                value={selectedDate}
                onChange={(event) => onSelectDate(event.target.value)}
                onInput={(event) => onSelectDate(event.currentTarget.value)}
                className="min-h-14 w-full rounded-2xl border border-[#E8E4DF] bg-white px-12 py-3 text-base font-semibold text-[#141414] transition hover:border-[#E30613]/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#E30613]"
              />
            </div>
            <p className="rounded-2xl bg-[#FAF9F7] px-4 py-3 text-sm font-medium text-[#6B6B6B]">
              {copy.weShowSlots}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ContinueToMenuCard({ onContinue, copy, disabled }: { onContinue: () => void; copy: OrderCopy; disabled: boolean }) {
  return (
    <section className="hidden rounded-[24px] border border-[#E8E4DF] bg-white p-5 shadow-[0_12px_34px_rgba(20,20,20,0.04)] md:block">
      <button
        type="button"
        onClick={onContinue}
        disabled={disabled}
        className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#E30613] px-5 py-4 text-base font-bold text-white shadow-[0_16px_34px_rgba(227,6,19,0.22)] transition hover:bg-[#C90511] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#E30613] disabled:cursor-wait disabled:opacity-70"
      >
        {copy.continueToMenu}
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </section>
  );
}

function ReassuranceBar({ items }: { items: ReassuranceItem[] }) {
  return (
    <footer className="border-t border-[#E8E4DF] bg-white/70 px-5 py-5 sm:px-8 lg:px-10">
      <ul className="mx-auto grid max-w-[1440px] gap-3 text-sm text-[#6B6B6B] sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-[#E30613]" aria-hidden="true" />
              <span>{item.label}</span>
            </li>
          );
        })}
      </ul>
    </footer>
  );
}

function MobileContinueBar({ onContinue, copy, disabled }: { onContinue: () => void; copy: OrderCopy; disabled: boolean }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E8E4DF] bg-white/95 p-4 pb-safe shadow-[0_-12px_34px_rgba(20,20,20,0.08)] backdrop-blur-md md:hidden">
      <button
        type="button"
        onClick={onContinue}
        disabled={disabled}
        className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#E30613] px-5 py-4 text-base font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#E30613] disabled:cursor-wait disabled:opacity-70"
      >
        {copy.continueToMenu}
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
