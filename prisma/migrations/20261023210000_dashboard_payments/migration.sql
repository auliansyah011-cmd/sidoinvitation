CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');
CREATE TYPE "ActivityType" AS ENUM (
    'REGISTER',
    'LOGIN',
    'ADMIN_LOGIN',
    'INVITATION_CREATED',
    'PAYMENT_CREATED',
    'PAYMENT_PAID',
    'USER_DISABLED',
    'USER_ENABLED'
);

ALTER TABLE "User"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "disabledAt" TIMESTAMP(3),
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

UPDATE "User" SET "isActive" = true WHERE "role" = 'ADMIN';
CREATE INDEX "User_disabledAt_idx" ON "User"("disabledAt");

ALTER TABLE "Invitation"
ADD COLUMN "templateId" TEXT NOT NULL DEFAULT 'senja-di-ubud';

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "bank" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "vaNumber" TEXT,
    "billKey" TEXT,
    "billerCode" TEXT,
    "gatewayTransactionId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "userId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX "Payment_invitationId_status_idx" ON "Payment"("invitationId", "status");
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");
CREATE INDEX "ActivityLog_type_createdAt_idx" ON "ActivityLog"("type", "createdAt");

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_invitationId_fkey"
FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityLog"
ADD CONSTRAINT "ActivityLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
