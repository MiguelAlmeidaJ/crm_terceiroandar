-- Preserve all historical CRM records in a dedicated legacy tenant.
CREATE TABLE "tenants" (
 "id" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "slug" TEXT NOT NULL,
 "active" BOOLEAN NOT NULL DEFAULT true,
 "is_legacy" BOOLEAN NOT NULL DEFAULT false,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
INSERT INTO "tenants" ("id","name","slug","active","is_legacy","created_at","updated_at")
VALUES ('00000000-0000-4000-8000-000000000001','Dados existentes (legado)','legado',true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

ALTER TABLE "users" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "contacts" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "opportunities" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "opportunity_activities" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "commercial_tasks" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "tenant_id" TEXT;

-- The first existing active administrator becomes platform-level SYSTEM.
-- All other existing accounts and business records remain in the legacy tenant.
UPDATE "users" SET "role" = 'SYSTEM', "session_version" = "session_version" + 1
WHERE "id" = (
 SELECT "id" FROM "users" WHERE "role" = 'ADMIN' AND "active" = true
 ORDER BY "created_at", "id" LIMIT 1
);
UPDATE "users" SET "tenant_id"='00000000-0000-4000-8000-000000000001' WHERE "role" <> 'SYSTEM';
UPDATE "contacts" SET "tenant_id"='00000000-0000-4000-8000-000000000001';
UPDATE "opportunities" SET "tenant_id"='00000000-0000-4000-8000-000000000001';
UPDATE "opportunity_activities" SET "tenant_id"='00000000-0000-4000-8000-000000000001';
UPDATE "commercial_tasks" SET "tenant_id"='00000000-0000-4000-8000-000000000001';
UPDATE "audit_logs" SET "tenant_id"='00000000-0000-4000-8000-000000000001';

ALTER TABLE "contacts" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "opportunities" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "opportunity_activities" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "commercial_tasks" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commercial_tasks" ADD CONSTRAINT "commercial_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "users_tenant_id_role_idx" ON "users"("tenant_id","role");
CREATE INDEX "contacts_tenant_id_idx" ON "contacts"("tenant_id");
CREATE INDEX "opportunities_tenant_id_idx" ON "opportunities"("tenant_id");
CREATE INDEX "opportunity_activities_tenant_id_idx" ON "opportunity_activities"("tenant_id");
CREATE INDEX "commercial_tasks_tenant_id_idx" ON "commercial_tasks"("tenant_id");
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

ALTER TABLE "users" ADD CONSTRAINT "users_role_tenant_consistency" CHECK (
 ("role"='SYSTEM' AND "tenant_id" IS NULL) OR ("role"<>'SYSTEM' AND "tenant_id" IS NOT NULL)
);
