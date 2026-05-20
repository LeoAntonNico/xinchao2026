"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Check, ChevronRight, Clock3, Filter, Info, MapPin, Minus, Plus, ShoppingCart, Store, X } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { cleanExclusionLabel } from "@/lib/cart-display";

type ProductOption = {
  id: string;
  name: string;
  price: number;
};

type ProductExclusionOption = {
  id: string;
  name: string;
};

export type MenuItemView = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isDineInOnly: boolean;
  dietaryTags: string[];
  variants: ProductOption[];
  modifiers: ProductOption[];
  exclusions: ProductExclusionOption[];
};

export type MenuCategoryView = {
  id: string;
  name: string;
  slug: string;
  items: MenuItemView[];
};

export type MenuDietaryOptionView = {
  slug: string;
  label: string;
};

type MenuOrderClientProps = {
  categories: MenuCategoryView[];
  dietaryOptions: MenuDietaryOptionView[];
  locale: string;
};

function getCopy(locale: string) {
  const isNl = locale === "nl";
  return {
    all: isNl ? "Alles" : "All",
    addToOrder: isNl ? "Toevoegen" : "Add to order",
    addExtras: isNl ? "Extra's toevoegen" : "Add extras",
    addProduct: isNl ? "Voeg toe" : "Add",
    asManyAsYouLike: isNl ? "Kies zoveel als je wilt" : "Choose as many as you like",
    checkout: isNl ? "Afrekenen" : "Checkout",
    closeProductOptions: isNl ? "Sluit productopties" : "Close product options",
    customize: isNl ? "Aanpassen" : "Customize",
    customizeDish: isNl ? "Pas je gerecht aan" : "Customize your dish",
    decreaseQuantity: isNl ? "Aantal verlagen" : "Decrease quantity",
    dineInOnly: isNl ? "Alleen beschikbaar voor dine-in" : "Available as Dine-In only",
    dietaryGlutenFree: isNl ? "Glutenvrij" : "Gluten-free",
    dietaryHalal: "Halal",
    emptyCart: isNl ? "Je winkelwagen is leeg" : "Your cart is empty",
    filter: "Filter",
    included: isNl ? "Inbegrepen" : "Included",
    increaseQuantity: isNl ? "Aantal verhogen" : "Increase quantity",
    menuSubtitle: isNl ? "Authentieke streetfood smaken / elke dag vers" : "Authentic street food flavours / fresh daily",
    myOrder: isNl ? "Mijn bestelling" : "My order",
    noChoices: isNl ? "Geen aanpassingen nodig voor dit gerecht." : "No custom choices needed for this dish.",
    orderNote: isNl
      ? "Controleer je keuze hierboven. Zo kunnen we je bestelling goed voorbereiden."
      : "Please double-check your choice above. This helps us prepare your order accurately.",
    remove: isNl ? "Verwijderen" : "Remove",
    selectOne: isNl ? "Kies één optie" : "Select one",
    showLaterTimes: isNl ? "Toon latere afhaaltijden" : "Show later pickup times",
    takeOut: isNl ? "Afhalen" : "Take Out",
    tapDish: isNl ? "Tik op een gerecht om het toe te voegen" : "Tap a dish to add it",
    total: "Totaal",
    yourChoice: isNl ? "Jouw keuze" : "Your choice",
    change: isNl ? "Wijzigen" : "Change",
    chooseOption: isNl ? "Kies je optie" : "Choose your option",
    specialRequests: isNl ? "Pas ingrediënten en speciale wensen aan." : "Adjust ingredients and special requests.",
  };
}

function formatPrice(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function formatPickupDateLabel(date: string, locale: string) {
  if (!date) return locale === "nl" ? "Nog geen dag gekozen" : "No day selected";

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : "en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function slugId(slug: string) {
  return `category-${slug.replace(/[^a-z0-9_-]/gi, "-")}`;
}

function formatCartChoices(item: {
  variantName?: string;
  modifierNames?: string[];
  exclusionNames?: string[];
}) {
  return [item.variantName, ...(item.modifierNames || []), ...(item.exclusionNames || []).map(cleanExclusionLabel)]
    .filter(Boolean)
    .join(" · ");
}

export default function MenuOrderClient({ categories, dietaryOptions, locale }: MenuOrderClientProps) {
  const { items, addItem, decreaseItem, updateQuantity, total } = useCart();
  const copy = getCopy(locale);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<MenuItemView | null>(null);
  const [pickupChoice, setPickupChoice] = useState({
    locationName: "Xin Chào Utrecht",
    pickupDate: "",
    pickupTime: "",
  });
  const dietaryMap = useMemo(() => new Map(dietaryOptions.map((option) => [option.slug, option.label])), [dietaryOptions]);
  const cartQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const readPickupChoice = () => {
      setPickupChoice({
        locationName: sessionStorage.getItem("order_locationName") || "Xin Chào Utrecht",
        pickupDate: sessionStorage.getItem("order_pickupDate") || "",
        pickupTime: sessionStorage.getItem("order_pickupTime") || "",
      });
    };

    readPickupChoice();
    window.addEventListener("storage", readPickupChoice);
    window.addEventListener("focus", readPickupChoice);
    return () => {
      window.removeEventListener("storage", readPickupChoice);
      window.removeEventListener("focus", readPickupChoice);
    };
  }, []);

  const visibleCategories = activeCategory === "all"
    ? categories
    : categories.filter((category) => category.slug === activeCategory);

  function addConfiguredItem(
    item: MenuItemView,
    variant: ProductOption | null,
    modifiers: ProductOption[],
    exclusions: ProductExclusionOption[],
    quantity: number
  ) {
    if (item.isDineInOnly) return;

    const unitPrice = (variant && variant.price > 0 ? variant.price : item.price) + modifiers.reduce((sum, modifier) => sum + modifier.price, 0);
    const payload = {
      menuItemId: item.id,
      name: item.name,
      price: unitPrice,
      imageUrl: item.image,
      variantId: variant?.id,
      variantName: variant?.name,
      modifierIds: modifiers.map((modifier) => modifier.id),
      modifierNames: modifiers.map((modifier) => modifier.name),
      exclusionIds: exclusions.map((exclusion) => exclusion.id),
      exclusionNames: exclusions.map((exclusion) => exclusion.name),
    };

    for (let count = 0; count < quantity; count += 1) {
      addItem(payload);
    }
    setSelectedProduct(null);
  }

  function handleAdd(item: MenuItemView) {
    if (item.isDineInOnly) return;
    setSelectedProduct(item);
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#141414]">
      <div className="grid min-h-screen lg:h-screen lg:overflow-hidden lg:grid-cols-[minmax(0,1fr)_356px]">
        <section className="min-w-0 border-r border-[#E8E4DF] lg:h-screen lg:overflow-y-auto">
          <ChoiceBar locale={locale} choice={pickupChoice} />

          <div className="border-b border-[#E8E4DF] bg-[#F3F0EA] px-5 py-3 text-xs text-[#9A938A] sm:px-8 lg:px-6 xl:px-8">
            <p className="flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
              {copy.orderNote}
            </p>
          </div>

          <div className="px-5 py-7 sm:px-8 lg:px-6 xl:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="font-sans text-[76px] font-light leading-none tracking-normal text-[#E30613] sm:text-[88px] lg:text-[92px]">
                  MENU
                </h1>
                <p className="mt-1 text-[12px] font-medium uppercase tracking-[0.28em] text-[#8B6914]">
                  {copy.menuSubtitle}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="border border-[#E8E4DF] bg-white px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-[#8B8580]">
                    {copy.dietaryGlutenFree}
                  </span>
                  <span className="border border-[#E8E4DF] bg-white px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-[#8B8580]">
                    Halal
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-3 border border-[#E8E4DF] bg-white px-5 py-3 text-[12px] font-medium uppercase tracking-[0.16em] text-[#6B6B6B] transition hover:border-[#E30613]/50 hover:text-[#E30613] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613]"
              >
                <Filter className="h-4 w-4" aria-hidden="true" />
                {copy.filter}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#7E7770]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {pickupChoice.locationName}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                {[formatPickupDateLabel(pickupChoice.pickupDate, locale), pickupChoice.pickupTime].filter(Boolean).join(" ")}
              </span>
              <button type="button" className="ml-auto text-[#E30613] underline underline-offset-2">
                {copy.change}
              </button>
            </div>

            <CategoryTabs categories={categories} activeCategory={activeCategory} onChange={setActiveCategory} locale={locale} />

            <div className="mt-9 space-y-14">
              {visibleCategories.map((category, index) => (
                <MenuSection
                  key={category.id}
                  category={category}
                  index={index}
                  dietaryMap={dietaryMap}
                  locale={locale}
                  onOpen={setSelectedProduct}
                  onAdd={handleAdd}
                />
              ))}
            </div>
          </div>
        </section>

        <OrderPanel
          items={items}
          total={total}
          cartQuantity={cartQuantity}
          onDecrease={decreaseItem}
          onIncrease={(id) => {
            const item = items.find((cartItem) => (cartItem.cartItemKey || cartItem.menuItemId) === id);
            if (item) updateQuantity(id, item.quantity + 1);
          }}
          onRemove={(id) => updateQuantity(id, 0)}
          locale={locale}
        />
        <MobileCartBar total={total} cartQuantity={cartQuantity} locale={locale} />
        {selectedProduct && (
          <ProductOptionsModal
            item={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAdd={addConfiguredItem}
            locale={locale}
          />
        )}
      </div>
    </div>
  );
}

function ChoiceBar({
  locale,
  choice,
}: {
  locale: string;
  choice: { locationName: string; pickupDate: string; pickupTime: string };
}) {
  const copy = getCopy(locale);
  const dateLabel = formatPickupDateLabel(choice.pickupDate, locale);
  const timeLabel = choice.pickupTime || (locale === "nl" ? "Geen tijd gekozen" : "No time selected");

  return (
    <div className="sticky top-0 z-30 border-b border-[#E8E4DF] bg-white/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-6 xl:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 md:flex md:flex-wrap md:items-center md:gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#E30613] text-white">
            <Store className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#E30613]">{copy.yourChoice}</p>
            <p className="truncate font-bold leading-tight">{choice.locationName}</p>
          </div>
          <span className="hidden h-8 w-px bg-[#E8E4DF] md:block" aria-hidden="true" />
          <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 pl-14 text-sm text-[#6B6B6B] md:col-auto md:pl-0">
            <span className="inline-flex min-w-0 items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{dateLabel}</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
              {timeLabel}
            </span>
          </div>
        </div>
        <Link
          href={`/${locale}/order`}
          className="inline-flex min-h-11 w-full items-center justify-center border border-[#E30613] px-6 py-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[#E30613] transition hover:bg-[#E30613] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613] md:w-auto"
        >
          {copy.change}
        </Link>
      </div>
    </div>
  );
}

function CategoryTabs({
  categories,
  activeCategory,
  onChange,
  locale,
}: {
  categories: MenuCategoryView[];
  activeCategory: string;
  onChange: (slug: string) => void;
  locale: string;
}) {
  const copy = getCopy(locale);
  const tabs = [{ slug: "all", name: copy.all }, ...categories.map((category) => ({ slug: category.slug, name: category.name }))];

  return (
    <div className="mt-6 overflow-x-auto pb-3">
      <div className="flex min-w-max items-center gap-2">
        {tabs.map((tab) => {
          const active = tab.slug === activeCategory;
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => onChange(tab.slug)}
              className={[
                "min-h-11 border px-5 py-3 text-[12px] font-extrabold uppercase tracking-[0.12em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613]",
                active
                  ? "border-[#E30613] bg-[#E30613] text-white"
                  : "border-[#E8E4DF] bg-white text-[#141414] hover:border-[#E30613]/50 hover:text-[#E30613]",
              ].join(" ")}
            >
              {tab.name}
            </button>
          );
        })}
        <ChevronRight className="h-4 w-4 shrink-0 text-[#AAA29B]" aria-hidden="true" />
      </div>
    </div>
  );
}

function MenuSection({
  category,
  index,
  dietaryMap,
  locale,
  onOpen,
  onAdd,
}: {
  category: MenuCategoryView;
  index: number;
  dietaryMap: Map<string, string>;
  locale: string;
  onOpen: (item: MenuItemView) => void;
  onAdd: (item: MenuItemView) => void;
}) {
  const copy = getCopy(locale);

  return (
    <section id={slugId(category.slug)} aria-labelledby={`${slugId(category.slug)}-title`}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id={`${slugId(category.slug)}-title`} className="flex items-center gap-4 text-[28px] font-light uppercase leading-none">
          <span className="h-8 w-1.5 bg-[#E30613]" aria-hidden="true" />
          <span className={index % 2 === 0 ? "text-[#141414]" : "text-[#8B6914]"}>{category.name}</span>
        </h2>
        <span className="text-[13px] font-medium text-[#E30613]">{String(index + 1).padStart(2, "0")}</span>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2">
        {category.items.map((item) => (
          <article key={item.id} className="group relative">
            <button
              type="button"
              onClick={() => {
                if (!item.isDineInOnly) onOpen(item);
              }}
              aria-disabled={item.isDineInOnly}
              className={[
                "block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E30613]",
                item.isDineInOnly ? "cursor-default" : "",
              ].join(" ")}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#EFEAE3]">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 42vw, 330px"
                />
              </div>
              <div className="mt-4 pr-14">
                <h3 className="text-base font-extrabold uppercase tracking-normal">{item.name}</h3>
                {item.description && (
                  <p className="mt-2 line-clamp-2 text-[14px] leading-6 text-[#6B7280]">{item.description}</p>
                )}
                <p className="mt-4 text-base font-extrabold">{formatPrice(item.price)}</p>
                {item.isDineInOnly && (
                  <span className="mt-3 inline-flex rounded-full border border-[#8B6914]/25 bg-[#FFF7E6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8B6914]">
                    {copy.dineInOnly}
                  </span>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.dietaryTags.map((slug) => {
                    const label = dietaryMap.get(slug);
                    if (!label) return null;
                    return (
                      <span key={slug} className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#A8A1A0]">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </button>
            {!item.isDineInOnly && (
              <button
                type="button"
                onClick={() => onAdd(item)}
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center border border-[#E30613] bg-white text-[#E30613] transition hover:bg-[#E30613] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613]"
                aria-label={`Add ${item.name} to cart`}
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductOptionsModal({
  item,
  onClose,
  onAdd,
  locale,
}: {
  item: MenuItemView;
  onClose: () => void;
  onAdd: (item: MenuItemView, variant: ProductOption | null, modifiers: ProductOption[], exclusions: ProductExclusionOption[], quantity: number) => void;
  locale: string;
}) {
  const copy = getCopy(locale);
  const [selectedVariantId, setSelectedVariantId] = useState(item.variants[0]?.id ?? "");
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);
  const [selectedExclusionIds, setSelectedExclusionIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const selectedVariant = item.variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const selectedModifiers = item.modifiers.filter((modifier) => selectedModifierIds.includes(modifier.id));
  const selectedExclusions = item.exclusions.filter((exclusion) => selectedExclusionIds.includes(exclusion.id));
  const unitPrice = (selectedVariant && selectedVariant.price > 0 ? selectedVariant.price : item.price) +
    selectedModifiers.reduce((sum, modifier) => sum + modifier.price, 0);
  const total = unitPrice * quantity;

  function toggleModifier(id: string) {
    setSelectedModifierIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  }

  function toggleExclusion(id: string) {
    setSelectedExclusionIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-end bg-black/45 sm:items-center sm:justify-center sm:p-6" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-options-title"
        className="max-h-[92vh] w-full overflow-hidden bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:max-w-[720px]"
      >
        <div className="flex max-h-[92vh] flex-col">
          <div className="flex items-center justify-between border-b border-[#E8E4DF] px-5 py-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#E30613]">{copy.customize}</p>
              <h2 id="product-options-title" className="text-xl font-extrabold uppercase">{item.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center border border-[#E8E4DF] text-[#141414] transition hover:border-[#E30613] hover:text-[#E30613] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613]"
              aria-label={copy.closeProductOptions}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="overflow-y-auto">
            <div className="grid md:grid-cols-[280px_minmax(0,1fr)]">
              <div className="relative aspect-[4/3] bg-[#EFEAE3] md:aspect-auto md:min-h-[360px]">
                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 280px" />
              </div>
              <div className="space-y-6 p-5 sm:p-6">
                {item.description && <p className="text-sm leading-6 text-[#6B7280]">{item.description}</p>}

                {item.variants.length > 0 && (
                  <OptionGroup title={copy.chooseOption} helper={copy.selectOne}>
                    <div className="space-y-2">
                      {item.variants.map((variant) => {
                        const selected = selectedVariantId === variant.id;
                        const price = variant.price > 0 ? variant.price : item.price;
                        return (
                          <label
                            key={variant.id}
                            className={[
                              "flex min-h-12 cursor-pointer items-center justify-between gap-3 border p-3 transition",
                              selected ? "border-[#E30613] bg-[#FFF6F6]" : "border-[#E8E4DF] hover:border-[#E30613]/45",
                            ].join(" ")}
                          >
                            <span className="flex items-center gap-3">
                              <input
                                type="radio"
                                name={`variant-${item.id}`}
                                checked={selected}
                                onChange={() => setSelectedVariantId(variant.id)}
                                className="h-4 w-4 accent-[#E30613]"
                              />
                              <span className="font-semibold">{variant.name}</span>
                            </span>
                            <span className="text-sm font-bold">{formatPrice(price)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </OptionGroup>
                )}

                {item.modifiers.length > 0 && (
                  <OptionGroup title={copy.addExtras} helper={copy.asManyAsYouLike}>
                    <div className="space-y-2">
                      {item.modifiers.map((modifier) => {
                        const selected = selectedModifierIds.includes(modifier.id);
                        return (
                          <label
                            key={modifier.id}
                            className={[
                              "flex min-h-12 cursor-pointer items-center justify-between gap-3 border p-3 transition",
                              selected ? "border-[#E30613] bg-[#FFF6F6]" : "border-[#E8E4DF] hover:border-[#E30613]/45",
                            ].join(" ")}
                          >
                            <span className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleModifier(modifier.id)}
                                className="h-4 w-4 accent-[#E30613]"
                              />
                              <span className="font-semibold">{modifier.name}</span>
                            </span>
                            <span className="text-sm font-bold">{modifier.price > 0 ? `+${formatPrice(modifier.price)}` : copy.included}</span>
                          </label>
                        );
                      })}
                    </div>
                  </OptionGroup>
                )}

                {item.exclusions.length > 0 && (
                  <OptionGroup title={copy.customizeDish} helper={copy.specialRequests}>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {item.exclusions.map((exclusion) => {
                        const selected = selectedExclusionIds.includes(exclusion.id);
                        return (
                          <button
                            key={exclusion.id}
                            type="button"
                            onClick={() => toggleExclusion(exclusion.id)}
                            aria-pressed={selected}
                            className={[
                              "flex min-h-11 items-center justify-between border px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613]",
                              selected ? "border-[#E30613] bg-[#FFF6F6] text-[#E30613]" : "border-[#E8E4DF] text-[#141414] hover:border-[#E30613]/45",
                            ].join(" ")}
                          >
                            {exclusion.name}
                            {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>
                  </OptionGroup>
                )}

                {item.variants.length === 0 && item.modifiers.length === 0 && item.exclusions.length === 0 && (
                  <div className="border border-[#E8E4DF] bg-[#FAF9F7] p-4 text-sm text-[#6B6B6B]">
                    {copy.noChoices}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-[#E8E4DF] bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex w-max items-center border border-[#E8E4DF]">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  className="flex h-12 w-12 items-center justify-center text-[#6B6B6B] hover:text-[#E30613]"
                  aria-label={copy.decreaseQuantity}
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="w-12 text-center font-bold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => current + 1)}
                  className="flex h-12 w-12 items-center justify-center text-[#6B6B6B] hover:text-[#E30613]"
                  aria-label={copy.increaseQuantity}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => onAdd(item, selectedVariant, selectedModifiers, selectedExclusions, quantity)}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 bg-[#E30613] px-5 py-3 font-extrabold text-white transition hover:bg-[#C90511] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613] sm:flex-none sm:min-w-[240px]"
              >
                {copy.addToOrder}
                <span>{formatPrice(total)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionGroup({ title, helper, children }: { title: string; helper: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="font-extrabold uppercase">{title}</h3>
        <p className="mt-1 text-sm text-[#7E7770]">{helper}</p>
      </div>
      {children}
    </section>
  );
}

function OrderPanel({
  items,
  total,
  cartQuantity,
  onDecrease,
  onIncrease,
  onRemove,
  locale,
}: {
  items: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    cartItemKey?: string;
    variantId?: string;
    variantName?: string;
    modifierIds?: string[];
    modifierNames?: string[];
    exclusionIds?: string[];
    exclusionNames?: string[];
  }>;
  total: number;
  cartQuantity: number;
  onDecrease: (id: string) => void;
  onIncrease: (id: string) => void;
  onRemove: (id: string) => void;
  locale: string;
}) {
  const copy = getCopy(locale);
  return (
    <aside className="hidden min-h-screen bg-white lg:sticky lg:top-0 lg:block lg:h-screen">
      <div className="flex h-screen flex-col border-l border-[#E8E4DF]">
        <header className="border-b border-[#E8E4DF] px-6 py-7">
          <h2 className="text-2xl font-light uppercase">{copy.myOrder}</h2>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-[#7E7770]">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.takeOut} · Xin Chào Utrecht
          </p>
        </header>

        <div className="flex-1 overflow-auto px-6 py-7">
          {items.length === 0 ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center text-[#9AA1AE]">
              <ShoppingCart className="h-16 w-16 stroke-[1.6]" aria-hidden="true" />
              <p className="mt-6 text-base text-[#6B7280]">{copy.emptyCart}</p>
              <p className="mt-2 text-sm">{copy.tapDish}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.cartItemKey || `${item.menuItemId}-${item.variantId || "base"}-${(item.modifierIds || []).join("-")}-${(item.exclusionIds || []).join("-")}`} className="border-b border-[#E8E4DF] pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#EFEAE3]">
                        <Image
                          src={item.imageUrl || "/images/hero-pho.jpg"}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold">{item.name}</p>
                        {(item.variantName || item.modifierNames?.length || item.exclusionNames?.length) && (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#7E7770]">{formatCartChoices(item)}</p>
                        )}
                        <p className="mt-1 text-sm text-[#6B6B6B]">{formatPrice(item.price)} / item</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-extrabold">{formatPrice(item.price * item.quantity)}</p>
                      <button type="button" onClick={() => onRemove(item.cartItemKey || item.menuItemId)} className="mt-1 text-xs text-[#E30613]">
                        {copy.remove}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 inline-flex items-center border border-[#E8E4DF] bg-white">
                    <button
                      type="button"
                      onClick={() => onDecrease(item.cartItemKey || item.menuItemId)}
                      className="flex h-9 w-9 items-center justify-center text-[#6B6B6B] hover:text-[#E30613]"
                      aria-label={`${copy.decreaseQuantity}: ${item.name}`}
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="w-9 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onIncrease(item.cartItemKey || item.menuItemId)}
                      className="flex h-9 w-9 items-center justify-center text-[#6B6B6B] hover:text-[#E30613]"
                      aria-label={`${copy.increaseQuantity}: ${item.name}`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-[#E8E4DF] p-6">
            <div className="mb-4 flex items-center justify-between text-base">
              <span className="font-semibold">{copy.total} · {cartQuantity} {locale === "nl" ? (cartQuantity === 1 ? "item" : "items") : `item${cartQuantity === 1 ? "" : "s"}`}</span>
              <span className="font-extrabold">{formatPrice(total)}</span>
            </div>
            <Link
              href={`/${locale}/checkout`}
              className="flex min-h-12 w-full items-center justify-center bg-[#E30613] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#C90511] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613]"
            >
              {copy.checkout}
            </Link>
          </footer>
        )}
      </div>
    </aside>
  );
}

function MobileCartBar({ total, cartQuantity, locale }: { total: number; cartQuantity: number; locale: string }) {
  const copy = getCopy(locale);
  if (cartQuantity === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E8E4DF] bg-white/95 p-4 shadow-[0_-12px_34px_rgba(20,20,20,0.10)] backdrop-blur lg:hidden">
      <Link
        href={`/${locale}/checkout`}
        className="flex min-h-14 items-center justify-between bg-[#E30613] px-5 py-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613]"
      >
        <span className="font-bold">
          {cartQuantity} {locale === "nl" ? (cartQuantity === 1 ? "item" : "items") : `item${cartQuantity === 1 ? "" : "s"}`}
        </span>
        <span className="font-extrabold">{copy.checkout} · {formatPrice(total)}</span>
      </Link>
    </div>
  );
}
