-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('IDLE', 'RUNNING', 'DONE', 'ERROR');

-- CreateTable
CREATE TABLE "agent_task_state" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "candidate_label" TEXT,
    "expert_id" TEXT,
    "hunter_raw" JSONB,
    "scholar_structured" JSONB,
    "valuer_pricing" JSONB,
    "auditor_result" JSONB,
    "hunter_status" "AgentStatus" NOT NULL DEFAULT 'IDLE',
    "hunter_message" TEXT,
    "scholar_status" "AgentStatus" NOT NULL DEFAULT 'IDLE',
    "scholar_message" TEXT,
    "valuer_status" "AgentStatus" NOT NULL DEFAULT 'IDLE',
    "valuer_message" TEXT,
    "auditor_status" "AgentStatus" NOT NULL DEFAULT 'IDLE',
    "auditor_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_task_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_task_state_project_id_idx" ON "agent_task_state"("project_id");

-- CreateIndex
CREATE INDEX "agent_task_state_expert_id_idx" ON "agent_task_state"("expert_id");

-- AddForeignKey
ALTER TABLE "agent_task_state" ADD CONSTRAINT "agent_task_state_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
