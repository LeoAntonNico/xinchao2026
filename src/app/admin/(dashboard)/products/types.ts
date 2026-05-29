export interface Category { id: string; name: string; slug: string; sortOrder: number; }
export interface DietaryOption { id: string; slug: string; nameEn: string; nameNl: string; iconUrl: string | null; sortOrder: number; }
export interface Location { id: string; name: string; }
export interface Variant { id: string; name: string; nameNl: string | null; price: number; sortOrder: number; }
export interface Modifier { id: string; name: string; nameNl: string | null; price: number; sortOrder: number; }
export interface Exclusion { id: string; name: string; nameNl: string | null; sortOrder: number; }
export interface PlasticSurcharge { id?: string; locationId: string; amount: number; isActive: boolean; }
export interface MenuItem {
  id: string;
  name: string;
  nameNl: string | null;
  description: string | null;
  descriptionNl: string | null;
  shortDescription: string | null;
  shortDescriptionNl: string | null;
  price: number;
  salePrice: number | null;
  taxClass: string;
  imageUrl: string | null;
  imageUrls: string[];
  isAvailable: boolean;
  isDineInOnly: boolean;
  sortOrder: number;
  locations: Location[];
  categories: Category[];
  dietaryTags: string[];
  isSpicy: boolean;
  variants: Variant[];
  modifiers: Modifier[];
  exclusions: Exclusion[];
  plasticSurcharges?: PlasticSurcharge[];
}
