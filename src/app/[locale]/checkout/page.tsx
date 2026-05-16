"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/components/CartContext";
import { useLocale } from "next-intl";
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
} from "lucide-react";

function fmtPrice(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export default function CheckoutPage() {
  const locale = useLocale();
  const isNl = locale === "nl";
  const { items, total, clearCart } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saveDetails, setSaveDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const [signInOpen, setSignInOpen] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);

  const locationId = typeof window !== "undefined" ? sessionStorage.getItem("order_locationId") || "" : "";
  const slotId = typeof window !== "undefined" ? sessionStorage.getItem("order_slotId") || "" : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
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
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
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
    }
  }, []);

  const subtotal = Math.round((total * 100) / 109);
  const tax = total - subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      setError(isNl ? "Naam en telefoon zijn verplicht" : "Name and phone are required");
      return;
    }
    if (items.length === 0) {
      setError(isNl ? "Je winkelwagen is leeg" : "Cart is empty");
      return;
    }
    if (!locationId || !slotId) {
      setError(isNl ? "Selecteer eerst een locatie en afhaaltijd" : "Please select a location and pickup time first");
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
          locationId,
          slot: slotId,
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
      if (!data.paymentUrl) throw new Error(isNl ? "Geen betaal-URL ontvangen" : "No payment URL returned");
      clearCart();
      window.location.href = data.paymentUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment failed");
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
    <div className="min-h-screen bg-background">
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
                    <input required value={name} onChange={(e) => setName(e.target.value)} disabled={fieldsDisabled} placeholder={isNl ? "Je naam" : "Your name"} className="w-full px-4 py-3 bg-surface-container border border-default text-foreground text-sm placeholder:text-stone-gray focus:border-brand-red focus:outline-none transition-colors rounded-xl disabled:bg-[#F0EDE6] disabled:text-[#737373]" />
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
                    <input required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={fieldsDisabled} placeholder={isNl ? "Je telefoonnummer" : "Your phone number"} className="flex-1 min-w-0 px-4 py-3 bg-surface-container border border-default text-foreground text-sm placeholder:text-stone-gray focus:border-brand-red focus:outline-none transition-colors rounded-r-xl disabled:bg-[#F0EDE6] disabled:text-[#737373]" />
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

          <div className="w-full lg:w-[380px] shrink-0">
            <div className="border border-default rounded-xl bg-white p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-logo-red-soft rounded-full flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-brand-red" />
                </div>
                <h2 className="font-display text-base uppercase text-foreground tracking-tight">{isNl ? "Besteloverzicht" : "Order Summary"}</h2>
              </div>

              <div className="space-y-4 mb-5">
                {items.map((item) => (
                  <div key={item.menuItemId} className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-[#737373] shrink-0">{item.quantity}x</span>
                        <span className="text-sm font-bold text-foreground uppercase">{item.name}</span>
                      </div>
                      {item.variantName && <p className="text-[11px] text-[#B99516] uppercase tracking-wide mt-0.5">{item.variantName}</p>}
                      {item.modifierNames && item.modifierNames.length > 0 && <p className="text-[11px] text-[#737373] uppercase tracking-wide mt-0.5">{item.modifierNames.join(" + ")}</p>}
                      {item.exclusionNames && item.exclusionNames.length > 0 && (
                        <p className="text-[11px] text-[#E31B23]/70 uppercase tracking-wide mt-0.5">
                          {item.exclusionNames.map((e: string) => {
                            const label = e.trim().toUpperCase().startsWith("NO ") ? e.trim().substring(3) : e;
                            return `NO ${label}`;
                          }).join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-foreground shrink-0">{fmtPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
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
    </div>
  );
}
