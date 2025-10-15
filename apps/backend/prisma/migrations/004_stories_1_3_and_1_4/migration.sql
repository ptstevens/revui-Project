-- Story 1.3: User Invitation & Role Assignment
-- Story 1.4: Recording Storage Infrastructure

-- Create InvitationStatus enum
CREATE TYPE "invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- Create UploadStatus enum
CREATE TYPE "upload_status" AS ENUM ('PENDING', 'UPLOADING', 'COMPLETE', 'FAILED');

-- Add SUPER_ADMIN to UserRole enum
ALTER TYPE "user_role" ADD VALUE 'SUPER_ADMIN';

-- Story 1.3: Add invitation tracking and soft delete columns to users table
ALTER TABLE "users" ADD COLUMN "invited_by" UUID;
ALTER TABLE "users" ADD COLUMN "invitation_status" "invitation_status" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "users" ADD COLUMN "deactivated_at" TIMESTAMP(6);

-- Story 1.3: Create indexes for new user columns
CREATE INDEX "users_invited_by_idx" ON "users"("invited_by");
CREATE INDEX "users_deactivated_at_idx" ON "users"("deactivated_at");

-- Story 1.4: Create recordings table
CREATE TABLE "recordings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "s3_key" VARCHAR(500) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "duration" INTEGER,
    "mime_type" VARCHAR(50) NOT NULL DEFAULT 'video/webm',
    "upload_status" "upload_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "recordings_pkey" PRIMARY KEY ("id")
);

-- Story 1.4: Create indexes for recordings table
CREATE INDEX "recordings_tenant_id_idx" ON "recordings"("tenant_id");
CREATE INDEX "recordings_task_id_idx" ON "recordings"("task_id");
CREATE INDEX "recordings_user_id_idx" ON "recordings"("user_id");
CREATE INDEX "recordings_upload_status_idx" ON "recordings"("upload_status");
CREATE INDEX "recordings_created_at_idx" ON "recordings"("created_at");
