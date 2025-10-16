# Migration: Add User Preferences Column

## Story 2.3: 10-Second Preview Video Tutorial

### Overview
This migration adds a `preferences` JSONB column to the `users` table to store user-specific UI preferences.

### Changes Made

1. **Added Column**: `preferences JSONB DEFAULT '{}'` to `users` table
   - Stores user UI preferences as JSON
   - Defaults to empty object for backwards compatibility
   - Nullable to support existing records

2. **Added Index**: GIN index on `preferences` column
   - Enables efficient queries on JSON properties
   - Supports queries like `preferences->>'tutorialSkipped' = 'true'`

3. **Updated Prisma Schema**:
   - Added `preferences Json? @default("{}") @db.JsonB` field to User model
   - Added GIN index configuration

### Example Data Structure

```json
{
  "tutorialSkipped": true,
  "theme": "dark",
  "notifications": {
    "email": true,
    "inApp": false
  },
  "features": {
    "betaFeatures": false,
    "advancedMode": true
  }
}
```

### Usage Examples

```sql
-- Check if user skipped tutorial
SELECT * FROM users
WHERE tenant_id = '...'
AND preferences->>'tutorialSkipped' = 'true';

-- Update user preferences
UPDATE users
SET preferences = jsonb_set(preferences, '{tutorialSkipped}', 'true')
WHERE id = '...';

-- Add new preference key
UPDATE users
SET preferences = preferences || '{"theme": "dark"}'
WHERE id = '...';
```

### TypeScript/Prisma Usage

```typescript
// Find users who skipped tutorial
const users = await prisma.user.findMany({
  where: {
    tenantId: tenantId,
    preferences: {
      path: ['tutorialSkipped'],
      equals: true
    }
  }
});

// Update user preferences
await prisma.user.update({
  where: { id: userId },
  data: {
    preferences: {
      tutorialSkipped: true,
      theme: 'dark'
    }
  }
});
```

### Rollback

To rollback this migration:
1. Drop the GIN index: `DROP INDEX users_preferences_idx;`
2. Drop the column: `ALTER TABLE users DROP COLUMN preferences;`

### Testing

1. Run migration: `npx prisma migrate dev`
2. Verify column exists: `\d users` in psql
3. Test CRUD operations on preferences field
4. Verify GIN index performance for JSON queries

### Multi-Tenant Considerations

- Preferences are tenant-isolated through existing RLS policies
- Each user's preferences are specific to their tenant context
- No cross-tenant preference leakage possible due to RLS