ALTER TABLE "Project"
ADD COLUMN "activeProjectVersionId" UUID;

ALTER TABLE "ProjectVersion"
ADD COLUMN "parentProjectVersionId" UUID,
ADD COLUMN "branchName" TEXT;

UPDATE "Project" AS p
SET "activeProjectVersionId" = (
  SELECT pv."id"
  FROM "ProjectVersion" AS pv
  WHERE pv."projectId" = p."id"
  ORDER BY pv."versionNumber" DESC
  LIMIT 1
);

CREATE UNIQUE INDEX "Project_activeProjectVersionId_key"
ON "Project"("activeProjectVersionId");

CREATE INDEX "ProjectVersion_projectId_branchName_idx"
ON "ProjectVersion"("projectId", "branchName");

CREATE INDEX "ProjectVersion_parentProjectVersionId_idx"
ON "ProjectVersion"("parentProjectVersionId");

ALTER TABLE "Project"
ADD CONSTRAINT "Project_activeProjectVersionId_fkey"
FOREIGN KEY ("activeProjectVersionId")
REFERENCES "ProjectVersion"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "ProjectVersion"
ADD CONSTRAINT "ProjectVersion_parentProjectVersionId_fkey"
FOREIGN KEY ("parentProjectVersionId")
REFERENCES "ProjectVersion"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
