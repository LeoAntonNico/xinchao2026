-- CreateTable
CREATE TABLE "ReservationDaySetting" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reservationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "ReservationDaySetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReservationDaySetting_locationId_date_key" ON "ReservationDaySetting"("locationId", "date");

-- AddForeignKey
ALTER TABLE "ReservationDaySetting" ADD CONSTRAINT "ReservationDaySetting_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
