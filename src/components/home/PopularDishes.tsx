"use client";

import { useLocale } from "next-intl";
import { useCart } from "@/components/CartContext";
import { Plus, Flame } from "lucide-react";
import { track } from "@/lib/analytics";

interface Dish {
  id: string;
  name: string;
  nameNl?: string;
  description: string;
  descriptionNl?: string;
  price: number;
  isSpicy?: boolean;
  isPopular?: boolean;
  emoji: string;
}

const DISHES: Dish[] = [
  {
    id: "pho-bo",
    name: "Phở Bò",
    nameNl: "Phở Bò",
    description: "Traditionele rundvleesnoedelsoep met kruiden",
    descriptionNl: "Traditional beef noodle soup with herbs",
    price: 1295,
    isPopular: true,
    emoji: "🍜",
  },
  {
    id: "bun-cha",
    name: "Bún Chả",
    nameNl: "Bún Chả",
    description: "Gegrild varkensvlees met vermicelli en kruiden",
    descriptionNl: "Grilled pork with vermicelli and herbs",
    price: 1450,
    isSpicy: true,
    emoji: "🍖",
  },
  {
    id: "banh-mi",
    name: "Bánh Mì Chicken",
    nameNl: "Bánh Mì Kip",
    description: "Krokant stokbrood met gemarineerde kip",
    descriptionNl: "Crispy baguette with marinated chicken",
    price: 895,
    isPopular: true,
    emoji: "🥖",
  },
  {
    id: "spring-rolls",
    name: "Fresh Spring Rolls",
    nameNl: "Verse Loempia's",
    description: "Rijstpapier rolletjes met garnalen en kruiden",
    descriptionNl: "Rice paper rolls with shrimp and herbs",
    price: 750,
    emoji: "🌯",
  },
];

function fmtPrice(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export default function PopularDishes() {
  const locale = useLocale();
  const isNl = locale === "nl";
  const { addItem, setIsOpen } = useCart();

  const handleAdd = (dish: Dish) => {
    addItem({
      menuItemId: dish.id,
      name: isNl && dish.nameNl ? dish.nameNl : dish.name,
      price: dish.price,
    });
    setIsOpen(true);
    track({ event: "dish_added", dishId: dish.id, dishName: dish.name, locale });
  };

  return (
    <section className="px-4 sm:px-6 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
          {isNl ? "Populair" : "Popular"}
        </h2>
        <p className="text-[13px] text-on-surface-variant mb-4">
          {isNl ? "Waarom gasten deze gerechten het meest bestellen." : "Why guests order these dishes the most."}
        </p>

        <div className="space-y-2">
          {DISHES.map((dish) => (
            <div
              key={dish.id}
              className="flex items-center gap-3 bg-surface rounded-xl border border-outline-variant px-3 py-2.5 shadow-sm"
            >
              {/* Emoji avatar instead of repeated image */}
              <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-surface-container rounded-lg text-xl">
                {dish.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h3 className="text-[14px] font-bold text-foreground truncate">
                    {isNl && dish.nameNl ? dish.nameNl : dish.name}
                  </h3>
                  {dish.isPopular && (
                    <span className="shrink-0 text-[9px] font-bold font-mono uppercase tracking-wider bg-logo-red/10 text-logo-red px-1 py-0.5 rounded">
                      {isNl ? "Populair" : "Popular"}
                    </span>
                  )}
                  {dish.isSpicy && (
                    <Flame className="shrink-0 w-3 h-3 text-warning" />
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant leading-snug truncate">
                  {isNl ? dish.description : (dish.descriptionNl || dish.description)}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className="text-[14px] font-bold text-foreground">{fmtPrice(dish.price)}</span>
                <button
                  onClick={() => handleAdd(dish)}
                  className="p-2 bg-logo-red text-white rounded-lg hover:bg-logo-red-hover transition-colors"
                  aria-label={`Add ${dish.name} to cart`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
