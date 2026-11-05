ALTER TABLE "marketing_campaigns" ADD COLUMN "capture_token" TEXT;
ALTER TABLE "marketing_campaigns" ADD COLUMN "capture_enabled" BOOLEAN NOT NULL DEFAULT false;
UPDATE "marketing_campaigns" SET "capture_token" = gen_random_uuid()::text;
ALTER TABLE "marketing_campaigns" ALTER COLUMN "capture_token" SET NOT NULL;
CREATE UNIQUE INDEX "marketing_campaigns_capture_token_key" ON "marketing_campaigns"("capture_token");

CREATE TABLE "marketing_lead_captures" (
 "id" TEXT NOT NULL,
 "tenant_id" TEXT NOT NULL,
 "campaign_id" TEXT NOT NULL,
 "contact_id" TEXT NOT NULL,
 "utm_source" TEXT,
 "utm_medium" TEXT,
 "utm_campaign" TEXT,
 "utm_content" TEXT,
 "utm_term" TEXT,
 "consent_at" TIMESTAMP(3) NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "marketing_lead_captures_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "marketing_lead_captures_campaign_id_contact_id_key" ON "marketing_lead_captures"("campaign_id","contact_id");
CREATE INDEX "marketing_lead_captures_tenant_id_created_at_idx" ON "marketing_lead_captures"("tenant_id","created_at");
CREATE INDEX "marketing_lead_captures_tenant_id_campaign_id_idx" ON "marketing_lead_captures"("tenant_id","campaign_id");
ALTER TABLE "marketing_lead_captures" ADD CONSTRAINT "marketing_lead_captures_tenant_id_fkey"
 FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketing_lead_captures" ADD CONSTRAINT "marketing_lead_captures_campaign_id_fkey"
 FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketing_lead_captures" ADD CONSTRAINT "marketing_lead_captures_contact_id_fkey"
 FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
