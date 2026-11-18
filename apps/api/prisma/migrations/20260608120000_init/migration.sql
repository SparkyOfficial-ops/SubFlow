-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "displayCurrency" TEXT NOT NULL DEFAULT 'USD',
    "notifyDays" INTEGER[] DEFAULT ARRAY[7, 3, 1]::INTEGER[],
    "walletAddress" TEXT,
    "plusUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "customDays" INTEGER,
    "nextChargeAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "note" TEXT,
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "templateId" TEXT,
    "chainNonce" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "cycleKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "chatId" TEXT,
    "chainNonce" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "inviteLink" TEXT,
    "kickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "txHash" TEXT,
    "messageHash" TEXT,
    "boc" TEXT,
    "provider" TEXT NOT NULL,
    "userId" TEXT,
    "planId" TEXT,
    "comment" TEXT,
    "chainNonce" BIGINT,
    "amount" DECIMAL(18,6),
    "currency" TEXT,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextCheckAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitPool" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "organizerAddress" TEXT,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SplitPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitMember" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "share" DECIMAL(18,6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "isSelf" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SplitMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_chainNonce_key" ON "Subscription"("chainNonce");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE INDEX "Subscription_nextChargeAt_idx" ON "Subscription"("nextChargeAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_subscriptionId_daysBefore_cycleKey_key" ON "Reminder"("subscriptionId", "daysBefore", "cycleKey");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_chainNonce_key" ON "Plan"("chainNonce");

-- CreateIndex
CREATE INDEX "Plan_ownerId_idx" ON "Plan"("ownerId");

-- CreateIndex
CREATE INDEX "Membership_status_expiresAt_idx" ON "Membership"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_txHash_key" ON "Payment"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_messageHash_key" ON "Payment"("messageHash");

-- CreateIndex
CREATE INDEX "Payment_status_nextCheckAt_idx" ON "Payment"("status", "nextCheckAt");

-- CreateIndex
CREATE INDEX "SplitPool_ownerId_idx" ON "SplitPool"("ownerId");

-- CreateIndex
CREATE INDEX "SplitMember_poolId_idx" ON "SplitMember"("poolId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantKey_userId_key" ON "MerchantKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantKey_apiKey_key" ON "MerchantKey"("apiKey");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitPool" ADD CONSTRAINT "SplitPool_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitPool" ADD CONSTRAINT "SplitPool_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitMember" ADD CONSTRAINT "SplitMember_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "SplitPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantKey" ADD CONSTRAINT "MerchantKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
