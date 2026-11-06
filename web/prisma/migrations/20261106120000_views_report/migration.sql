-- Views confirmed on-chain: one row per ViewsReported event (written by the chain indexer only).
CREATE TABLE "ViewsReport" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "cumulativeViews" INTEGER NOT NULL,
    "deltaViews" INTEGER NOT NULL,
    "credited" DOUBLE PRECISION NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewsReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ViewsReport_campaignId_creatorId_cumulativeViews_idx" ON "ViewsReport"("campaignId", "creatorId", "cumulativeViews");

CREATE UNIQUE INDEX "ViewsReport_txHash_logIndex_key" ON "ViewsReport"("txHash", "logIndex");

ALTER TABLE "ViewsReport" ADD CONSTRAINT "ViewsReport_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ViewsReport" ADD CONSTRAINT "ViewsReport_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
