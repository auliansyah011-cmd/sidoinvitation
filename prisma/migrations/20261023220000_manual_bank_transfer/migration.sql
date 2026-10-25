ALTER TYPE "PaymentStatus" ADD VALUE 'AWAITING_REVIEW';
ALTER TYPE "PaymentStatus" ADD VALUE 'REJECTED';
ALTER TYPE "ActivityType" ADD VALUE 'PAYMENT_PROOF_SUBMITTED';
ALTER TYPE "ActivityType" ADD VALUE 'PAYMENT_REJECTED';

ALTER TABLE "Payment"
ADD COLUMN "proofPath" TEXT,
ADD COLUMN "proofMimeType" TEXT,
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" TEXT;

CREATE INDEX "Payment_status_submittedAt_idx" ON "Payment"("status", "submittedAt");

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
