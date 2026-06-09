-- CreateIndex
CREATE UNIQUE INDEX "ShippingMethod_zoneId_serviceCode_requiresPickupPoint_key" ON "ShippingMethod"("zoneId", "serviceCode", "requiresPickupPoint");
