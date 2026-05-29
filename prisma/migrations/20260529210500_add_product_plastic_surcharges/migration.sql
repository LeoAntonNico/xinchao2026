-- CreateTable
CREATE TABLE "ProductPlasticSurcharge" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "ProductPlasticSurcharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPlasticSurcharge_menuItemId_locationId_key" ON "ProductPlasticSurcharge"("menuItemId", "locationId");

-- AddForeignKey
ALTER TABLE "ProductPlasticSurcharge" ADD CONSTRAINT "ProductPlasticSurcharge_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPlasticSurcharge" ADD CONSTRAINT "ProductPlasticSurcharge_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
