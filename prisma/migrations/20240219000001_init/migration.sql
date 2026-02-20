-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CSA', 'ADMIN');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "VisibilityStatus" AS ENUM ('PRIVATE', 'GLOBAL_POOL');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ClassificationTier" AS ENUM ('S', 'A', 'B', 'C');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "team_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "sub_industry" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "seniority_score" INTEGER NOT NULL,
    "years_experience" INTEGER NOT NULL,
    "predicted_rate" DOUBLE PRECISION NOT NULL,
    "owner_id" TEXT NOT NULL,
    "visibility_status" "VisibilityStatus" NOT NULL DEFAULT 'PRIVATE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_vectors" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "embedding" vector(1536),

    CONSTRAINT "expert_vectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_contacts" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "value" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,

    CONSTRAINT "expert_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_projects" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PENDING',
    "filter_criteria" JSONB,
    "deadline" TIMESTAMP(3),

    CONSTRAINT "research_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_results" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "match_score" DOUBLE PRECISION NOT NULL,
    "classification_tier" "ClassificationTier" NOT NULL,

    CONSTRAINT "research_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "experts_industry_idx" ON "experts"("industry");

-- CreateIndex
CREATE INDEX "experts_owner_id_idx" ON "experts"("owner_id");

-- CreateIndex
CREATE INDEX "experts_visibility_status_idx" ON "experts"("visibility_status");

-- CreateIndex
CREATE UNIQUE INDEX "expert_vectors_expert_id_key" ON "expert_vectors"("expert_id");

-- CreateIndex
CREATE UNIQUE INDEX "research_results_project_id_expert_id_key" ON "research_results"("project_id", "expert_id");

-- AddForeignKey
ALTER TABLE "experts" ADD CONSTRAINT "experts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_vectors" ADD CONSTRAINT "expert_vectors_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "experts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_contacts" ADD CONSTRAINT "expert_contacts_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "experts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_projects" ADD CONSTRAINT "research_projects_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_results" ADD CONSTRAINT "research_results_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_results" ADD CONSTRAINT "research_results_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "experts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "experts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
