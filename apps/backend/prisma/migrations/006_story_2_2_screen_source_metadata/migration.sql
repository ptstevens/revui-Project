-- Story 2.2: Screen/Window Selection Interface with Preview
-- Add screen source metadata to recordings table

-- Create ScreenType enum
CREATE TYPE "screen_type" AS ENUM ('SCREEN', 'WINDOW', 'TAB');

-- Add screen source metadata columns to recordings table
ALTER TABLE "recordings" ADD COLUMN "screen_type" "screen_type";
ALTER TABLE "recordings" ADD COLUMN "source_name" VARCHAR(255);

-- Add index for screen_type for potential filtering queries
CREATE INDEX "recordings_screen_type_idx" ON "recordings"("screen_type");
