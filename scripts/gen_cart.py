import os

# CartDrawer
components_dir = "/Users/openmac/restaurant/src/components"

# We need to generate TSX files with angle brackets via Python
# Using chr() for angle brackets to avoid tool stripping

cart_drawer_content = '"use client";\n\nimport { useState } from "react";\nimport { useCart } from "@/context/CartContext";\nimport { useTranslations } from "next-intl";\n\nexport default function CartDrawer() {\n  const { items, updateQuantity, removeItem, total, count } = useCart();\n  const [open, setOpen] = useState(false);\n  const t = useTranslations();\n\n  const formatPrice = (cents: number) =>\n    `\u20ac${(cents / 100).toFixed(2).replace(".", ",")}`;\n\n  return (\n    ' + chr(60) + '>' + chr(60) + 'div className="fixed bottom-6 right-6 z-50"' + chr(62) + '>' + chr(60) + 'button\n        onClick={() => setOpen(!open)}\n        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-red text-white shadow-lg hover:bg-red-700 transition-colors"\n      ' + chr(62) + '>' + chr(60) + 'span className="text-lg"' + chr(62) + '\ud83d\uded2' + chr(60) + '/span' + chr(62) + '>' + chr(60) + 'span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-gold text-[10px] font-bold text-black"' + chr(62) + '{count}' + chr(60) + '/span' + chr(62) + '>' + chr(60) + '/button' + chr(62) + '>' + chr(60) + 'hr' + chr(62) + '>' + chr(60) + 'button\n                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}\n                  className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-xs hover:bg-white/20"' + chr(62) + '>{' + chr(60) + '/button' + chr(62) + '>' + chr(60) + 'button\n                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}\n                  className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-xs hover:bg-white/20"' + chr(62) + '>-{' + chr(60) + '/button' + chr(62) + '>' + chr(60) + 'a\n                href="/order"\n                className="block w-full rounded-lg bg-brand-red py-3 text-center text-sm font-semibold text-white hover:bg-red-700 transition-colors"' + chr(62) + '>' + chr(60) + '/a' + chr(62) + '>' + chr(60) + '/div' + chr(62) + '>' + chr(60) + '/div' + chr(62) + '>' + chr(60) + '/div' + chr(62) + '>' + chr(60) + '/div' + chr(62) + '>' + chr(60) + ')' + '\n}\n'

with open(f"{components_dir}/CartDrawer.tsx", "w") as f:
    f.write(cart_drawer_content)

print("Generated CartDrawer.tsx")
