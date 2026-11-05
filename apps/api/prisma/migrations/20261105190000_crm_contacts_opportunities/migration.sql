CREATE TYPE "OpportunityStage" AS ENUM ('NOVO', 'QUALIFICACAO', 'PROPOSTA', 'NEGOCIACAO', 'GANHO', 'PERDIDO');

CREATE TABLE "contacts" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "company" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "contacts_name_idx" ON "contacts"("name");

CREATE TABLE "opportunities" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "value" DECIMAL(14,2),
  "stage" "OpportunityStage" NOT NULL DEFAULT 'NOVO',
  "contact_id" TEXT NOT NULL,
  "owner_id" TEXT,
  "expected_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "opportunities_stage_idx" ON "opportunities"("stage");
CREATE INDEX "opportunities_contact_id_idx" ON "opportunities"("contact_id");
CREATE INDEX "opportunities_owner_id_idx" ON "opportunities"("owner_id");
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "opportunity_activities" (
  "id" TEXT NOT NULL,
  "opportunity_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "opportunity_activities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "opportunity_activities_opportunity_id_created_at_idx" ON "opportunity_activities"("opportunity_id", "created_at");
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
