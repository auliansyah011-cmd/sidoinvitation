ALTER TABLE "User"
ADD COLUMN "paymentCode" INTEGER;

CREATE UNIQUE INDEX "User_paymentCode_key" ON "User"("paymentCode");

ALTER TABLE "Payment"
ADD COLUMN "paymentCode" INTEGER;
