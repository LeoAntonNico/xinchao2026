export interface Category { id: string; name: string; }
export interface DietaryOption { id: string; slug: string; nameEn: string; nameNl: string; iconUrl: string | null; sortOrder: number; }
export interface Location { id: string; name: string; }
export interface Variant { id: string; name: string; nameNl: string | null; price: number; sortOrder: number; }
export interface Modifier { id: string; name: string; nameNl: string | null; price: number; sortOrder: number; }
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
  sortOrder: number;
  locations: Location[];
  categories: Category[];
  dietaryTags: string[];
  isSpicy: boolean;
  variants: Variant[];
  modifiers: Modifier[];
}
