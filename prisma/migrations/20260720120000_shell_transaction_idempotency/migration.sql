-- Prevent a reward or payment callback from crediting the same operation twice.
ALTER TABLE "ShellTransaction" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "ShellTransaction_idempotencyKey_key" ON "ShellTransaction"("idempotencyKey");
