-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerk_user_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_clerk_user_id_key" ON "users"("clerk_user_id");
