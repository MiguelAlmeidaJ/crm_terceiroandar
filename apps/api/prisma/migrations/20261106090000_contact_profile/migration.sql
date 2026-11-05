CREATE TYPE "ContactChannel" AS ENUM ('LIGACAO','WHATSAPP','EMAIL','REUNIAO','NOTA');
ALTER TABLE "contacts" ADD COLUMN "source" TEXT;
ALTER TABLE "contacts" ADD COLUMN "job_title" TEXT;
ALTER TABLE "contacts" ADD COLUMN "website" TEXT;
ALTER TABLE "contacts" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE TABLE "contact_interactions" (
  "id" TEXT NOT NULL,
  "contact_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "channel" "ContactChannel" NOT NULL,
  "description" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_interactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "contact_interactions_tenant_id_contact_id_occurred_at_idx" ON "contact_interactions"("tenant_id","contact_id","occurred_at");
ALTER TABLE "contact_interactions" ADD CONSTRAINT "contact_interactions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contact_interactions" ADD CONSTRAINT "contact_interactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contact_interactions" ADD CONSTRAINT "contact_interactions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
