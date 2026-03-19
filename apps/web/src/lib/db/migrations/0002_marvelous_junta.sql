ALTER TABLE "tasks" ADD COLUMN "files_changed_details" jsonb DEFAULT '[]'::jsonb NOT NULL;
