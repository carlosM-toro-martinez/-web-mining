CREATE TABLE "DeviceState" (
    "sn" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeviceState_pkey" PRIMARY KEY ("sn")
);
