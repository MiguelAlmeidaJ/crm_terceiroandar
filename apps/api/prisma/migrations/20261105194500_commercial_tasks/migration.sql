CREATE TYPE "TaskStatus" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');
CREATE TYPE "TaskPriority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA');

CREATE TABLE "commercial_tasks" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "TaskStatus" NOT NULL DEFAULT 'PENDENTE',
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIA',
  "due_date" DATE NOT NULL,
  "completed_at" TIMESTAMP(3),
  "opportunity_id" TEXT NOT NULL,
  "assignee_id" TEXT NOT NULL,
  "creator_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "commercial_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "commercial_tasks_assignee_id_status_due_date_idx" ON "commercial_tasks"("assignee_id", "status", "due_date");
CREATE INDEX "commercial_tasks_opportunity_id_idx" ON "commercial_tasks"("opportunity_id");
CREATE INDEX "commercial_tasks_status_due_date_idx" ON "commercial_tasks"("status", "due_date");

ALTER TABLE "commercial_tasks" ADD CONSTRAINT "commercial_tasks_opportunity_id_fkey"
  FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commercial_tasks" ADD CONSTRAINT "commercial_tasks_assignee_id_fkey"
  FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commercial_tasks" ADD CONSTRAINT "commercial_tasks_creator_id_fkey"
  FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
