CREATE TYPE "MarketingCampaignStatus" AS ENUM ('RASCUNHO','PLANEJADA','EM_ANDAMENTO','PAUSADA','CONCLUIDA','CANCELADA');
CREATE TYPE "MarketingChannel" AS ENUM ('INSTAGRAM','FACEBOOK','GOOGLE_ADS','EMAIL','WHATSAPP','SITE','EVENTO','INDICACAO','OUTRO');

CREATE TABLE "marketing_campaigns" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "channel" "MarketingChannel" NOT NULL,
  "status" "MarketingCampaignStatus" NOT NULL DEFAULT 'RASCUNHO',
  "budget" DECIMAL(14,2),
  "spent" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "start_date" DATE,
  "end_date" DATE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "marketing_campaigns_tenant_id_status_idx" ON "marketing_campaigns"("tenant_id","status");
CREATE INDEX "marketing_campaigns_tenant_id_channel_idx" ON "marketing_campaigns"("tenant_id","channel");
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_tenant_id_fkey"
 FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_budget_nonnegative" CHECK ("budget" IS NULL OR "budget" >= 0);
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_spent_nonnegative" CHECK ("spent" >= 0);
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_dates_order" CHECK ("start_date" IS NULL OR "end_date" IS NULL OR "end_date" >= "start_date");

CREATE TABLE "marketing_campaign_contacts" (
 "id" TEXT NOT NULL,
 "tenant_id" TEXT NOT NULL,
 "campaign_id" TEXT NOT NULL,
 "contact_id" TEXT NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "marketing_campaign_contacts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "marketing_campaign_contacts_campaign_id_contact_id_key" ON "marketing_campaign_contacts"("campaign_id","contact_id");
CREATE INDEX "marketing_campaign_contacts_tenant_id_campaign_id_idx" ON "marketing_campaign_contacts"("tenant_id","campaign_id");
CREATE INDEX "marketing_campaign_contacts_tenant_id_contact_id_idx" ON "marketing_campaign_contacts"("tenant_id","contact_id");
ALTER TABLE "marketing_campaign_contacts" ADD CONSTRAINT "marketing_campaign_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketing_campaign_contacts" ADD CONSTRAINT "marketing_campaign_contacts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketing_campaign_contacts" ADD CONSTRAINT "marketing_campaign_contacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
