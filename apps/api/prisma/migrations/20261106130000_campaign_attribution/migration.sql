ALTER TABLE "opportunities" ADD COLUMN "campaign_id" TEXT;
CREATE INDEX "opportunities_tenant_id_campaign_id_idx" ON "opportunities"("tenant_id","campaign_id");
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
