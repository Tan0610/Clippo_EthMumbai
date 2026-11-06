-- World IdP step-up: link one (iss, sub) to one account.
ALTER TABLE "User" ADD COLUMN "worldIdpIdentity" TEXT;
CREATE UNIQUE INDEX "User_worldIdpIdentity_key" ON "User"("worldIdpIdentity");
