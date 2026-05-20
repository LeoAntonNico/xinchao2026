type CartChoiceInput = {
  variantName?: string;
  modifierNames?: string[];
  exclusionNames?: string[];
};

function isGlutenFreeLabel(label: string) {
  const normalized = label.toLowerCase().replace(/[\s_-]/g, "");
  return normalized === "glutenfree" || normalized === "glutenvrij" || normalized === "glutenvrije";
}

export function cleanExclusionLabel(label: string) {
  const trimmed = label.trim();
  const withoutPrefix = trimmed.replace(/^(no|geen)\s+/i, "");
  return isGlutenFreeLabel(withoutPrefix) ? withoutPrefix : trimmed;
}

export function formatCartChoices(item: CartChoiceInput) {
  return [
    item.variantName,
    ...(item.modifierNames || []),
    ...(item.exclusionNames || []).map(cleanExclusionLabel),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function formatExclusionForReceipt(label: string) {
  const cleaned = cleanExclusionLabel(label);
  if (isGlutenFreeLabel(cleaned) || /^(no|geen)\s+/i.test(cleaned)) return cleaned;
  return `NO ${cleaned}`;
}
