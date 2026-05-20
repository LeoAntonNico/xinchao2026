"use client";

import { useState, useEffect, useRef } from "react";
import { useCart } from "@/components/CartContext";
import { useLocale } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  CreditCard,
  Landmark,
  Lock,
  ShoppingBag,
  Check,
  Eye,
  EyeOff,
  Pencil,
  CheckCircle,
  Minus,
  Plus,
  Trash2,
  ChevronDown,
  MapPin,
  Clock3,
  AlertCircle,
} from "lucide-react";
import { formatCartChoices } from "@/lib/cart-display";

function fmtPrice(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function cartLineKey(item: {
  cartItemKey?: string;
  menuItemId: string;
  variantId?: string;
  modifierIds?: string[];
  exclusionIds?: string[];
}) {
  if (item.cartItemKey) return item.cartItemKey;
  const modifiers = [...(item.modifierIds || [])].sort().join(",");
  const exclusions = [...(item.exclusionIds || [])].sort().join(",");
  return `${item.menuItemId}:${item.variantId || ""}:${modifiers}:${exclusions}`;
}

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

type SummaryItem = {
  cartItemKey?: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  variantId?: string;
  variantName?: string;
  modifierIds?: string[];
  modifierNames?: string[];
  exclusionIds?: string[];
  exclusionNames?: string[];
};

type CheckoutLocation = {
  id: string;
  slug?: string;
  name?: string;
  openTime?: string;
  closeTime?: string;
};

function resolveLocationId(locations: CheckoutLocation[], storedLocationId: string, storedLocationSlug: string, storedLocationName: string) {
  const selectedLocation =
    locations.find((location) => location.id === storedLocationId) ??
    locations.find((location) => location.slug === storedLocationId || location.slug === storedLocationSlug) ??
    locations.find((location) => location.name === storedLocationName) ??
    locations[0];

  return selectedLocation;
}

export default function CheckoutPage() {
  const locale = useLocale();
  const isNl = locale === "nl";
  const { items, total, clearCart, decreaseItem, removeItem, updateQuantity } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saveDetails, setSaveDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summaryEditing, setSummaryEditing] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationStatusMessage, setLocationStatusMessage] = useState("");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [editMode, setEditMode] = useState(false);

  const [signInOpen, setSignInOpen] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      const rawPickupDate = sessionStorage.getItem("order_pickupDate");
      const rawPickupTime = sessionStorage.getItem("order_pickupTime");
      const storedLocationId = sessionStorage.getItem("order_locationId") || "";
      const storedLocationSlug = sessionStorage.getItem("order_locationSlug") || "";
      const storedSlotId = sessionStorage.getItem("order_slotId") || "";
      const storedPickupDate = rawPickupDate || getTodayInputValue();
      const storedPickupTime = rawPickupTime || "18:15";
      const storedLocationName = sessionStorage.getItem("order_locationName") || "";

      setLocationId(storedLocationId);
      setSlotId(storedSlotId);
      setPickupDate(storedPickupDate);
      setPickupTime(storedPickupTime);
      setLocationName(storedLocationName);

      if (!rawPickupDate) sessionStorage.setItem("order_pickupDate", storedPickupDate);
      if (!rawPickupTime) sessionStorage.setItem("order_pickupTime", storedPickupTime);
      fetch("/api/locations")
        .then((response) => response.ok ? response.json() : [])
        .then((locations: CheckoutLocation[]) => {
          const selectedLocation = resolveLocationId(locations, storedLocationId, storedLocationSlug, storedLocationName);
          if (!selectedLocation?.id) return;
          sessionStorage.setItem("order_locationId", selectedLocation.id);
          if (selectedLocation.slug) sessionStorage.setItem("order_locationSlug", selectedLocation.slug);
          if (selectedLocation.name) sessionStorage.setItem("order_locationName", selectedLocation.name);
          setLocationId(selectedLocation.id);
          setLocationName(selectedLocation.name || "");
          if (
            (selectedLocation.openTime && storedPickupTime < selectedLocation.openTime) ||
            (selectedLocation.closeTime && storedPickupTime > selectedLocation.closeTime)
          ) {
            setLocationStatusMessage(
              isNl
                ? "Deze afhaaltijd lijkt buiten de openingstijd te vallen. Kies een andere tijd als bestellen niet lukt."
                : "This pickup time appears to be outside opening hours. Choose another time if ordering is unavailable."
            );
          } else {
            setLocationStatusMessage("");
          }
        })
        .catch(() => {});
    });

    const token = localStorage.getItem("xinchao_token");
    if (token) {
      fetch("/api/customer/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) {
            setCustomer(data);
            setName(data.name || "");
            setEmail(data.email || "");
            setPhone(data.phone || "");
          }
        })
        .catch(() => {})
        .finally(() => {});
    } else {
      queueMicrotask(() => {
        const saved = localStorage.getItem("xinchao_customer");
        if (saved) {
          try {
            const data = JSON.parse(saved);
            if (data.name) setName(data.name);
            if (data.phone) setPhone(data.phone);
            if (data.email) setEmail(data.email);
            setSaveDetails(true);
          } catch {}
        }
      });
    }
  }, [isNl]);

  const subtotal = Math.round((total * 100) / 109);
  const tax = total - subtotal;
  const contextReady = !!locationId && !!pickupDate && !!pickupTime;

  function showError(message: string, focusTarget?: "name" | "phone" | "error") {
    setError(message);
    requestAnimationFrame(() => {
      if (focusTarget === "name") nameInputRef.current?.focus();
      else if (focusTarget === "phone") phoneInputRef.current?.focus();
      else errorRef.current?.focus();
    });
  }

  function customerSafeOrderError(message?: string) {
    if (!message) {
      return isNl
        ? "We konden je bestelling niet plaatsen. Controleer je gegevens en probeer opnieuw."
        : "We couldn't place your order. Please check your details and try again.";
    }
    if (/authorization header|mollie|payment|api key|checkout url/i.test(message)) {
      return isNl
        ? "De betaling kan nu niet worden gestart. Controleer de betaalinstellingen en probeer opnieuw."
        : "Payment cannot be started right now. Please check the payment settings and try again.";
    }
    if (/missing location|pickup time|foreign key|prisma|unknown|internal|database/i.test(message)) {
      return isNl
        ? "Controleer je afhaallocatie en afhaaltijd en probeer opnieuw."
        : "Please check your pickup location and time, then try again.";
    }
    return message;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError(isNl ? "Vul je naam in." : "Please enter your name.", "name");
      return;
    }
    if (!phone.trim()) {
      showError(isNl ? "Vul je telefoonnummer in." : "Please enter your phone number.", "phone");
      return;
    }
    if (items.length === 0) {
      showError(isNl ? "Je winkelwagen is leeg." : "Your cart is empty.", "error");
      return;
    }

    let checkoutLocationId = locationId;
    let checkoutLocationSlug = typeof window !== "undefined" ? sessionStorage.getItem("order_locationSlug") || "" : "";
    const checkoutSlotId = slotId;
    const checkoutPickupDate = pickupDate || getTodayInputValue();
    const checkoutPickupTime = pickupTime || "18:15";
    const locations = await fetch("/api/locations")
      .then((response) => response.ok ? response.json() : [])
      .catch(() => [] as CheckoutLocation[]);
    const selectedLocation = resolveLocationId(
      locations,
      checkoutLocationId,
      checkoutLocationSlug,
      typeof window !== "undefined" ? sessionStorage.getItem("order_locationName") || locationName : locationName
    );
    if (selectedLocation?.id) {
      checkoutLocationId = selectedLocation.id;
      checkoutLocationSlug = selectedLocation.slug || checkoutLocationSlug;
      sessionStorage.setItem("order_locationId", selectedLocation.id);
      if (selectedLocation.slug) sessionStorage.setItem("order_locationSlug", selectedLocation.slug);
      if (selectedLocation.name) sessionStorage.setItem("order_locationName", selectedLocation.name);
      setLocationId(selectedLocation.id);
      setLocationName(selectedLocation.name || locationName);
    }
    if (!checkoutLocationId || (!checkoutSlotId && (!checkoutPickupDate || !checkoutPickupTime))) {
      showError(isNl ? "Kies eerst een afhaallocatie en afhaaltijd." : "Please choose a pickup location and time first.", "error");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (!customer && email && password) {
        await fetch("/api/customer/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, phone, password }),
        }).catch(() => {});
      }
      if (!customer && saveDetails && typeof window !== "undefined") {
        localStorage.setItem("xinchao_customer", JSON.stringify({ name, phone, email }));
      }
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            price: i.price,
            variantId: i.variantId,
            variantName: i.variantName,
            modifierIds: i.modifierIds,
            modifierNames: i.modifierNames,
            exclusionIds: i.exclusionIds,
            exclusionNames: i.exclusionNames,
          })),
          locationId: checkoutLocationId,
          locationSlug: checkoutLocationSlug,
          slot: checkoutSlotId,
          pickupDate: checkoutPickupDate,
          pickupTime: checkoutPickupTime,
          name,
          phone,
          email,
          notes: "",
          customerId: customer?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || (isNl ? "Bestelling mislukt. Probeer opnieuw." : "Order could not be placed.")
        );
      }
      if (!data.paymentUrl) throw new Error(isNl ? "Bestelling mislukt. Probeer opnieuw." : "Order could not be placed.");
      clearCart();
      window.location.href = data.paymentUrl;
    } catch (err: unknown) {
      showError(customerSafeOrderError(err instanceof Error ? err.message : undefined), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError("");
    setSignInLoading(true);
    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signInEmail.toLowerCase(), password: signInPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isNl ? "Ongeldige inloggegevens" : "Invalid credentials"));
      if (data.token) localStorage.setItem("xinchao_token", data.token);
      if (data.customer) {
        setCustomer(data.customer);
        setName(data.customer.name || "");
        setEmail(data.customer.email || "");
        setPhone(data.customer.phone || "");
        setSignInOpen(false);
      }
    } catch (err: unknown) {
      setSignInError(err instanceof Error ? err.message : isNl ? "Inloggen mislukt" : "Sign in failed");
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("xinchao_token");
    localStorage.removeItem("xinchao_customer");
    setCustomer(null);
    setName("");
    setEmail("");
    setPhone("");
    setEditMode(false);
  };

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh] bg-background">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-logo-red-soft rounded-full flex items-center justify-center">
            <ShoppingBag className="w-7 h-7 text-brand-red" />
          </div>
          <p className="text-on-surface-variant text-sm tracking-wide uppercase font-medium">
            {isNl ? "Je winkelwagen is leeg" : "Your cart is empty"}
          </p>
          <Link href={`/${locale}/order`} className="inline-block px-8 py-3 bg-brand-red text-white text-xs font-bold tracking-widest uppercase hover:bg-logo-red-hover transition-colors">
            {isNl ? "Terug naar menu" : "Back to menu"}
          </Link>
        </div>
      </div>
    );
  }

  const isSignedIn = !!customer;
  const fieldsDisabled = isSignedIn && !editMode;

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-0">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-8">

        <Link href={`/${locale}/order`} className="inline-flex items-center gap-2 text-brand-red text-sm font-medium hover:text-logo-red-hover transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          {isNl ? "Terug naar menu" : "Back to menu"}
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl uppercase text-foreground tracking-tight">
            <span className="text-[#737373]">{isNl ? "AFHALEN " : "PICKUP "}</span>
            <span className="text-brand-red font-bold">{isNl ? "AFREKENEN" : "CHECKOUT"}</span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-2">
            {isNl ? "Bijna klaar! Controleer je gegevens en rond je bestelling af." : "Almost there! Please review your details and complete your order."}
          </p>
          {error && (
            <p ref={errorRef} tabIndex={-1} role="alert" className="sr-only focus:not-sr-only focus:mt-3 focus:block focus:text-sm focus:text-brand-red">
              {error}
            </p>
          )}
        </div>

        <div className="mb-8 lg:hidden">
          <OrderSummaryCard
            items={items}
            total={total}
            subtotal={subtotal}
            tax={tax}
            isNl={isNl}
            locale={locale}
            compact
            expanded={mobileSummaryOpen}
            onExpandedChange={setMobileSummaryOpen}
            summaryEditing={summaryEditing}
            onEditingChange={setSummaryEditing}
            decreaseItem={decreaseItem}
            removeItem={removeItem}
            updateQuantity={updateQuantity}
            loading={loading}
            error={error}
            locationName={locationName}
            pickupDate={pickupDate}
            pickupTime={pickupTime}
            contextReady={contextReady}
            locationStatusMessage={locationStatusMessage}
          />
        </div>

        {isSignedIn ? (
          <div className="flex items-center gap-4 p-4 border border-[#159947]/20 rounded-xl bg-[#159947]/5 mb-8">
            <div className="w-10 h-10 bg-[#159947]/15 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-[#159947]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#171717]">
                {isNl ? `Ingelogd als ${customer.name}` : `Signed in as ${customer.name}`}
              </p>
              <p className="text-xs text-[#737373] mt-0.5">{customer.email}</p>
            </div>
            <button onClick={handleSignOut} className="px-4 py-2 border border-[#E5E5E5] text-[#737373] text-xs font-bold uppercase tracking-wider rounded-xl hover:text-[#E31B23] hover:border-[#E31B23] transition-colors shrink-0">
              {isNl ? "Uitloggen" : "SIGN OUT"}
            </button>
          </div>
        ) : !signInOpen ? (
          <div className="flex items-center gap-4 p-4 border border-default rounded-xl bg-surface mb-8">
            <div className="w-10 h-10 bg-logo-red-soft rounded-full flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-brand-red" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">
                {isNl ? "Al eerder besteld?" : "Already ordered before?"}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {isNl ? "Log in voor een snellere afrekening." : "Sign in for faster checkout."}
              </p>
            </div>
            <button onClick={() => setSignInOpen(true)} className="px-4 py-2 border border-brand-red text-brand-red text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-brand-red hover:text-white transition-colors shrink-0">
              {isNl ? "INLOGGEN" : "SIGN IN"}
            </button>
          </div>
        ) : (
          <div className="border border-default rounded-xl bg-surface p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg uppercase text-foreground tracking-tight">{isNl ? "Inloggen" : "Sign In"}</h3>
              <button onClick={() => setSignInOpen(false)} className="text-on-surface-variant hover:text-foreground">✕</button>
            </div>
            {signInError && <p className="text-sm text-brand-red mb-3">{signInError}</p>}
            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <label className="text-xs text-on-surface-variant uppercase tracking-wider font-medium">Email</label>
                <input type="email" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-3 bg-surface-container border border-default text-foreground text-sm placeholder:text-stone-gray focus:border-brand-red focus:outline-none transition-colors rounded-xl" required />
              </div>
              <div>
                <label className="text-xs text-on-surface-variant uppercase tracking-wider font-medium">{isNl ? "Wachtwoord" : "Password"}</label>
                <input type="password" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} placeholder={isNl ? "Wachtwoord" : "Password"} className="w-full px-4 py-3 bg-surface-container border border-default text-foreground text-sm placeholder:text-stone-gray focus:border-brand-red focus:outline-none transition-colors rounded-xl" required />
              </div>
              <button type="submit" disabled={signInLoading} className="w-full py-3 bg-brand-red text-white font-bold text-sm tracking-widest uppercase hover:bg-logo-red-hover transition-colors disabled:opacity-50 rounded-xl">
                {signInLoading ? (isNl ? "Bezig..." : "Signing in...") : isNl ? "Inloggen →" : "Sign In →"}
              </button>
            </form>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0 space-y-8">

            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-brand-red rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm">1</div>
                <h2 className="font-display text-xl uppercase text-foreground tracking-tight">
                  {isNl ? "Contactgegevens" : "Contact Information"}
                </h2>
                {isSignedIn && (
                  <button type="button" onClick={() => setEditMode(!editMode)} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E5E5] rounded-lg text-xs font-medium text-[#737373] hover:text-[#171717] hover:border-[#171717] transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                    {editMode ? (isNl ? "Annuleren" : "Cancel") : (isNl ? "Bewerk" : "EDIT")}
                  </button>
                )}
              </div>

              <form className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-on-surface-variant uppercase tracking-wider font-medium">{isNl ? "Volledige naam" : "Full Name"}</label>
                    <input ref={nameInputRef} required value={name} onChange={(e) => setName(e.target.value)} disabled={fieldsDisabled} placeholder={isNl ? "Je naam" : "Your name"} aria-invalid={!!error && !name.trim()} className="w-full px-4 py-3 bg-surface-container border border-default text-foreground text-sm placeholder:text-stone-gray focus:border-brand-red focus:outline-none transition-colors rounded-xl disabled:bg-[#F0EDE6] disabled:text-[#737373]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-on-surface-variant uppercase tracking-wider font-medium">{isNl ? "E-mailadres" : "Email Address"}</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={fieldsDisabled} placeholder={isNl ? "Je e-mail" : "Your email"} className="w-full px-4 py-3 bg-surface-container border border-default text-foreground text-sm placeholder:text-stone-gray focus:border-brand-red focus:outline-none transition-colors rounded-xl disabled:bg-[#F0EDE6] disabled:text-[#737373]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-on-surface-variant uppercase tracking-wider font-medium">{isNl ? "Telefoonnummer" : "Phone Number"}</label>
                  <div className="flex">
                    <div className="shrink-0 inline-flex items-center gap-2 px-3 py-3 bg-surface border border-r-0 border-default rounded-l-xl text-sm text-foreground">
                      <span className="text-base">NL</span>
                      <span className="text-xs text-[#737373]">+31</span>
                      <svg className="w-3 h-3 text-[#737373]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                    <input ref={phoneInputRef} required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={fieldsDisabled} placeholder={isNl ? "Je telefoonnummer" : "Your phone number"} aria-invalid={!!error && !phone.trim()} className="flex-1 min-w-0 px-4 py-3 bg-surface-container border border-default text-foreground text-sm placeholder:text-stone-gray focus:border-brand-red focus:outline-none transition-colors rounded-r-xl disabled:bg-[#F0EDE6] disabled:text-[#737373]" />
                  </div>
                </div>

                {isSignedIn && (
                  <div className="flex items-center gap-2 text-xs text-[#159947]">
                    <CheckCircle className="w-4 h-4" />
                    {isNl ? "Je gegevens zijn opgeslagen op je account." : "Your details are saved to your account."}
                  </div>
                )}

                {!isSignedIn && (
                  <>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div onClick={() => setSaveDetails(!saveDetails)} className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-colors cursor-pointer ${saveDetails ? "bg-brand-red border-brand-red" : "border-default group-hover:border-brand-red"}`}>
                        {saveDetails && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-sm text-foreground">
                        {isNl ? "Onthoud mijn gegevens voor een snellere afrekening volgende keer." : "Save my details for faster checkout next time."}
                      </span>
                    </label>

                    <div className="space-y-1.5">
                      <label className="text-xs text-on-surface-variant uppercase tracking-wider font-medium">
                        {isNl ? "Wachtwoord (optioneel)" : "Password (optional)"}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-gray" />
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isNl ? "Maak wachtwoord aan" : "Create password"} className="w-full pl-10 pr-10 py-3 bg-surface-container border border-default text-foreground text-sm placeholder:text-stone-gray focus:border-brand-red focus:outline-none transition-colors rounded-xl" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-gray hover:text-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        {isNl ? "Maak een account aan en volg je bestellingen eenvoudig." : "Create an account and easily track your orders."}
                      </p>
                    </div>
                  </>
                )}
              </form>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-brand-red rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm">2</div>
                <h2 className="font-display text-xl uppercase text-foreground tracking-tight">
                  {isNl ? "Betaalmethode" : "Payment Method"}
                </h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 border-2 border-brand-red bg-surface rounded-xl cursor-pointer">
                  <Landmark className="w-6 h-6 text-brand-red shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">iDEAL</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {isNl ? "Betaal veilig en eenvoudig met je eigen bank." : "Pay safely and easily with your own bank."}
                    </p>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-brand-red flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 border border-default bg-surface rounded-xl opacity-60">
                  <CreditCard className="w-6 h-6 text-stone-gray shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">Credit / Debit Card</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">Visa, Mastercard &amp; Maestro</p>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 border-default shrink-0" />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 text-[11px] text-[#737373]">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                {isNl ? "Jouw betaling is veilig en versleuteld." : "Your payment is secure and encrypted."}
              </div>
            </section>

          </div>

          <div className="hidden w-full shrink-0 lg:block lg:w-[380px]">
            <div className="border border-default rounded-xl bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="w-8 h-8 bg-logo-red-soft rounded-full flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-brand-red" />
                </div>
                <h2 className="font-display text-base uppercase text-foreground tracking-tight">{isNl ? "Besteloverzicht" : "Order Summary"}</h2>
                <button
                  type="button"
                  onClick={() => setSummaryEditing((editing) => !editing)}
                  className="ml-auto text-xs font-bold uppercase tracking-wider text-brand-red underline-offset-4 transition-colors hover:text-logo-red-hover hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red"
                >
                  {summaryEditing ? (isNl ? "Klaar" : "Done") : (isNl ? "Bewerk" : "Edit")}
                </button>
              </div>

              <div className="space-y-4 mb-5">
                {items.map((item) => {
                  const lineKey = cartLineKey(item);
                  const choices = formatCartChoices(item);
                  const imageSrc = item.imageUrl || "/images/hero-pho.jpg";

                  return (
                    <div key={lineKey} className="flex justify-between items-start gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#EFEAE3]">
                        <Image src={imageSrc} alt="" fill className="object-cover" sizes="48px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm text-[#737373] shrink-0">{item.quantity}x</span>
                          <span className="text-sm font-bold text-foreground uppercase">{item.name}</span>
                        </div>
                        {choices && <p className="text-[11px] text-[#737373] uppercase tracking-wide mt-0.5">{choices}</p>}
                        {summaryEditing && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="inline-flex h-10 items-center rounded-lg border border-default bg-white">
                              <button
                                type="button"
                                onClick={() => decreaseItem(lineKey)}
                                className="flex h-10 w-10 items-center justify-center text-[#737373] transition hover:text-brand-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                                aria-label={isNl ? `${item.name} aantal verlagen` : `Decrease ${item.name} quantity`}
                              >
                                <Minus className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(event) => {
                                  const nextQuantity = Number(event.target.value);
                                  if (Number.isFinite(nextQuantity)) updateQuantity(lineKey, nextQuantity);
                                }}
                                className="h-10 w-11 border-x border-default text-center text-sm font-bold text-foreground [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                aria-label={isNl ? `${item.name} aantal` : `${item.name} quantity`}
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(lineKey, item.quantity + 1)}
                                className="flex h-10 w-10 items-center justify-center text-[#737373] transition hover:text-brand-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                                aria-label={isNl ? `${item.name} aantal verhogen` : `Increase ${item.name} quantity`}
                              >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(lineKey)}
                              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#F0C7CA] text-brand-red transition hover:bg-[#FFF4F4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                              aria-label={isNl ? `${item.name} verwijderen` : `Remove ${item.name}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-bold text-foreground shrink-0">{fmtPrice(item.price * item.quantity)}</span>
                    </div>
                  );
                })}
                <Link
                  href={`/${locale}/menu`}
                  className="inline-flex text-xs font-bold uppercase tracking-wider text-brand-red underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red"
                >
                  {isNl ? "Meer items toevoegen" : "Add more items"}
                </Link>
              </div>

              <div className="border-t border-default pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">{isNl ? "Subtotaal" : "Subtotal"}</span>
                  <span className="text-foreground font-medium">{fmtPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">{isNl ? "BTW (9%)" : "Tax (9%)"}</span>
                  <span className="text-foreground font-medium">{fmtPrice(tax)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-default">
                  <span className="font-bold text-foreground uppercase text-sm">{isNl ? "Totaal" : "TOTAL"}</span>
                  <span className="font-bold text-brand-red text-xl">{fmtPrice(total)}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <input placeholder={isNl ? "Promocode" : "Promo code"} className="flex-1 px-3 py-2.5 bg-surface border border-default text-sm rounded-lg focus:border-brand-red focus:outline-none" />
                <button className="px-4 py-2.5 border border-[#E5E5E5] text-[#737373] text-xs font-bold uppercase rounded-lg hover:border-[#171717] hover:text-[#171717] transition-colors">
                  {isNl ? "TOEPASSEN" : "APPLY"}
                </button>
              </div>

              <button onClick={handleSubmit} disabled={loading} className="w-full mt-5 py-4 bg-brand-red text-white font-bold text-sm tracking-widest uppercase hover:bg-logo-red-hover transition-colors disabled:opacity-50 rounded-xl">
                {loading ? (isNl ? "Bezig..." : "Placing order...") : (isNl ? "PLAATS BESTELLING →" : "PLACE ORDER →")}
              </button>

              {error && <p className="text-sm text-brand-red mt-3">{error}</p>}

              <div className="mt-4 flex items-start gap-2 text-[11px] text-[#737373]">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {isNl ? "Jouw betaling is veilig en versleuteld." : "Your payment is secure and encrypted."}
              </div>
            </div>
          </div>

        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E8E4DF] bg-white/95 px-4 py-3 shadow-[0_-12px_34px_rgba(20,20,20,0.10)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#737373]">{isNl ? "Totaal" : "Total"}</p>
            <p className="text-lg font-extrabold text-brand-red">{fmtPrice(total)}</p>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex min-h-12 min-w-[170px] items-center justify-center rounded-xl bg-brand-red px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-white transition hover:bg-logo-red-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? (isNl ? "Bezig..." : "Placing...") : (isNl ? "Bestel" : "Place order")}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderSummaryCard({
  items,
  total,
  subtotal,
  tax,
  isNl,
  locale,
  compact,
  expanded,
  onExpandedChange,
  summaryEditing,
  onEditingChange,
  decreaseItem,
  removeItem,
  updateQuantity,
  loading,
  error,
  locationName,
  pickupDate,
  pickupTime,
  contextReady,
  locationStatusMessage,
}: {
  items: SummaryItem[];
  total: number;
  subtotal: number;
  tax: number;
  isNl: boolean;
  locale: string;
  compact: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  summaryEditing: boolean;
  onEditingChange: (editing: boolean) => void;
  decreaseItem: (id: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  loading: boolean;
  error: string;
  locationName: string;
  pickupDate: string;
  pickupTime: string;
  contextReady: boolean;
  locationStatusMessage: string;
}) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const visibleItems = compact && !expanded ? items.slice(0, 2) : items;
  const pickupLabel = pickupDate && pickupTime ? `${pickupDate} · ${pickupTime}` : (isNl ? "Nog niet gekozen" : "Not selected yet");

  return (
    <div className="rounded-xl border border-default bg-white p-5 shadow-[0_12px_34px_rgba(20,20,20,0.04)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-logo-red-soft">
          <CreditCard className="h-4 w-4 text-brand-red" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base uppercase tracking-tight text-foreground">
            {isNl ? "Besteloverzicht" : "Order Summary"}
          </h2>
          <p className="mt-0.5 text-xs text-[#737373]">
            {itemCount} {itemCount === 1 ? "item" : "items"} · iDEAL · {fmtPrice(total)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-default text-[#737373] transition hover:border-brand-red hover:text-brand-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
          aria-expanded={expanded}
          aria-controls="mobile-order-summary-details"
          aria-label={expanded ? (isNl ? "Verberg besteloverzicht" : "Collapse order summary") : (isNl ? "Toon besteloverzicht" : "Expand order summary")}
        >
          <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>

      <div className="mb-4 grid gap-2 rounded-xl bg-[#FAF9F7] p-3 text-xs text-[#6B6B6B]">
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-brand-red" aria-hidden="true" />
          <span>{locationName || (isNl ? "Afhaallocatie wordt geladen" : "Pickup location loading")}</span>
        </p>
        <p className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 shrink-0 text-brand-red" aria-hidden="true" />
          <span>{pickupLabel}</span>
        </p>
      </div>

      {!contextReady && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#F0C7CA] bg-[#FFF4F4] p-3 text-sm text-brand-red">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">{isNl ? "Afhaalgegevens ontbreken" : "Pickup details missing"}</p>
            <Link href={`/${locale}/order`} className="mt-1 inline-flex underline underline-offset-2">
              {isNl ? "Kies locatie en tijd" : "Choose location and time"}
            </Link>
          </div>
        </div>
      )}

      {locationStatusMessage && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#F1D8A8] bg-[#FFFAED] p-3 text-sm text-[#8B6914]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{locationStatusMessage}</p>
        </div>
      )}

      <div id="mobile-order-summary-details" className="space-y-4">
        {visibleItems.map((item) => {
          const lineKey = cartLineKey(item);
          const choices = formatCartChoices(item);
          const imageSrc = item.imageUrl || "/images/hero-pho.jpg";

          return (
            <div key={lineKey} className="flex items-start gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#EFEAE3]">
                <Image src={imageSrc} alt="" fill className="object-cover" sizes="48px" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0 text-sm text-[#737373]">{item.quantity}x</span>
                  <span className="truncate text-sm font-bold uppercase text-foreground">{item.name}</span>
                </div>
                {choices && <p className="mt-0.5 line-clamp-2 text-[11px] uppercase tracking-wide text-[#737373]">{choices}</p>}
                {summaryEditing && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="inline-flex h-10 items-center rounded-lg border border-default bg-white">
                      <button
                        type="button"
                        onClick={() => decreaseItem(lineKey)}
                        className="flex h-10 w-10 items-center justify-center text-[#737373] hover:text-brand-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                        aria-label={isNl ? `${item.name} aantal verlagen` : `Decrease ${item.name} quantity`}
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="w-9 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(lineKey, item.quantity + 1)}
                        className="flex h-10 w-10 items-center justify-center text-[#737373] hover:text-brand-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                        aria-label={isNl ? `${item.name} aantal verhogen` : `Increase ${item.name} quantity`}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(lineKey)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#F0C7CA] text-brand-red hover:bg-[#FFF4F4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                      aria-label={isNl ? `${item.name} verwijderen` : `Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
              <span className="shrink-0 text-sm font-bold text-foreground">{fmtPrice(item.price * item.quantity)}</span>
            </div>
          );
        })}
      </div>

      {compact && !expanded && items.length > visibleItems.length && (
        <button
          type="button"
          onClick={() => onExpandedChange(true)}
          className="mt-3 text-xs font-bold uppercase tracking-wider text-brand-red"
        >
          {isNl ? `Toon alle ${items.length} regels` : `Show all ${items.length} lines`}
        </button>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-default pt-4">
        <button
          type="button"
          onClick={() => onEditingChange(!summaryEditing)}
          className="text-xs font-bold uppercase tracking-wider text-brand-red underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red"
        >
          {summaryEditing ? (isNl ? "Klaar" : "Done") : (isNl ? "Bewerk" : "Edit")}
        </button>
        <Link
          href={`/${locale}/menu`}
          className="text-xs font-bold uppercase tracking-wider text-brand-red underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red"
        >
          {isNl ? "Meer items" : "Add more"}
        </Link>
      </div>

      {expanded && (
        <div className="mt-4 space-y-2 border-t border-default pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">{isNl ? "Subtotaal" : "Subtotal"}</span>
            <span className="font-medium text-foreground">{fmtPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">{isNl ? "BTW (9%)" : "Tax (9%)"}</span>
            <span className="font-medium text-foreground">{fmtPrice(tax)}</span>
          </div>
          <div className="flex justify-between border-t border-default pt-3">
            <span className="text-sm font-bold uppercase text-foreground">{isNl ? "Totaal" : "Total"}</span>
            <span className="text-xl font-bold text-brand-red">{fmtPrice(total)}</span>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-brand-red">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-start gap-2 text-[11px] text-[#737373]">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {isNl ? "Jouw betaling is veilig en versleuteld." : "Your payment is secure and encrypted."}
      </div>
      <span className="sr-only" aria-live="polite">
        {loading ? (isNl ? "Bestelling wordt geplaatst" : "Placing order") : ""}
      </span>
    </div>
  );
}
