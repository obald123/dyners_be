ALTER TABLE "Admin" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'admin';

CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "address" TEXT NOT NULL DEFAULT 'Kigali, Rwanda',
    "email" TEXT NOT NULL DEFAULT 'dyners@gmail.com',
    "phone" TEXT NOT NULL DEFAULT '+250 788 123 456',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
