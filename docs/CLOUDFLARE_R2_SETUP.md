# Cloudflare R2 Setup Guide for Recording Storage (Story 1.4)

This guide walks through setting up Cloudflare R2 for secure, cost-effective recording storage with multi-tenant isolation and **zero egress fees**.

## Why Cloudflare R2?

✅ **Zero egress costs** - Unlimited free downloads (vs $0.09/GB on AWS S3)
✅ **35% cheaper storage** - $0.015/GB vs $0.023/GB on S3
✅ **S3-compatible API** - Drop-in replacement, same SDK
✅ **Better for video** - Download-heavy workloads save massively
✅ **Free tier** - 10 GB storage + 1M operations/month free forever

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Creating an R2 Bucket](#creating-an-r2-bucket)
3. [Generating API Tokens](#generating-api-tokens)
4. [Configuring CORS](#configuring-cors)
5. [Environment Configuration](#environment-configuration)
6. [Testing the Configuration](#testing-the-configuration)
7. [Production Considerations](#production-considerations)

## Prerequisites

- Cloudflare account (free tier available)
- R2 enabled on your account
- Access to Cloudflare Dashboard

## Creating an R2 Bucket

### Step 1: Enable R2

1. Log in to your Cloudflare Dashboard
2. Navigate to **R2** in the left sidebar
3. If prompted, click **Purchase R2** (free tier available - no credit card required for free tier)
4. Accept the terms and conditions

### Step 2: Create Bucket

1. Click **Create bucket**
2. **Configure the bucket:**
   - **Bucket name:** `revui-recordings` (or your preferred name)
   - **Location:** Choose your preferred location hint
     - **Automatic** (recommended) - Cloudflare chooses optimal location
     - **WNAM** - Western North America
     - **ENAM** - Eastern North America
     - **WEUR** - Western Europe
     - **EEUR** - Eastern Europe
     - **APAC** - Asia-Pacific
3. Click **Create bucket**

### Step 3: Get Account ID

You'll need your R2 Account ID:

1. In the R2 dashboard, look at the URL or top-right corner
2. Your Account ID is displayed (format: `abc123def456...`)
3. **Save this** - you'll need it for environment variables

Example URL: `https://dash.cloudflare.com/abc123def456/r2/overview`
Your Account ID: `abc123def456`

## Generating API Tokens

### Step 1: Navigate to API Tokens

1. In R2 dashboard, click **Manage R2 API Tokens**
2. Or go to: Account Home → R2 → Overview → Manage R2 API Tokens

### Step 2: Create API Token

1. Click **Create API token**
2. **Configure the token:**
   - **Token name:** `revui-backend-api`
   - **Permissions:**
     - ✅ **Object Read & Write** (required for pre-signed URLs)
   - **TTL (Time to Live):** Leave as default or set custom expiration
   - **Specific bucket (optional):** Select `revui-recordings` for security
3. Click **Create API Token**

### Step 3: Save Credentials

You'll see two values - **save these immediately** (you won't see them again):

```
Access Key ID: abc123...xyz789
Secret Access Key: def456...uvw012
```

⚠️ **Security Warning:** Store these securely - never commit to version control!

## Configuring CORS

CORS is essential for direct browser uploads using pre-signed URLs.

### Via Dashboard:

1. Go to your bucket in R2 dashboard
2. Click the **Settings** tab
3. Scroll to **CORS Policy**
4. Click **Add CORS policy** or **Edit**
5. Add the following configuration:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://revui.app",
      "https://www.revui.app"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "Content-Length",
      "Content-Type",
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

**Important:**
- `PUT` method is **required** for pre-signed URL uploads
- `POST` is not needed (we use PUT for S3-compatible uploads)
- Keep localhost for development testing

### Via API (Advanced):

```bash
curl -X PUT \
  https://api.cloudflare.com/client/v4/accounts/{account_id}/r2/buckets/{bucket_name}/cors \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  -d '[{
    "AllowedOrigins": ["http://localhost:5173", "https://revui.app", "https://www.revui.app"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["Content-Length", "Content-Type", "ETag"],
    "MaxAgeSeconds": 3600
  }]'
```

## Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_BUCKET_NAME=revui-recordings
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
```

### Environment Variable Descriptions:

- **R2_ACCOUNT_ID**: Your Cloudflare account ID (from R2 dashboard URL)
- **R2_BUCKET_NAME**: Your R2 bucket name
- **R2_ACCESS_KEY_ID**: API token Access Key ID
- **R2_SECRET_ACCESS_KEY**: API token Secret Access Key

### Example `.env` file:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/revui

# Frontend
CORS_ORIGIN=http://localhost:5173

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Cloudflare R2
R2_ACCOUNT_ID=abc123def456
R2_BUCKET_NAME=revui-recordings
R2_ACCESS_KEY_ID=abc123xyz789
R2_SECRET_ACCESS_KEY=def456uvw012

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Testing the Configuration

### 1. Backend Health Check

Verify R2 configuration in your backend:

```bash
# Start your backend
cd apps/backend
npm run dev

# Test configuration endpoint (if implemented)
curl http://localhost:3000/api/recordings/health
```

Expected response:
```json
{
  "r2": {
    "configured": true,
    "message": "R2 service configured successfully"
  }
}
```

### 2. Test Upload Flow

Test the complete upload workflow:

```bash
# Step 1: Initiate upload
curl -X POST http://localhost:3000/api/recordings/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "taskId": "task-uuid",
    "filename": "test-recording.webm",
    "contentType": "video/webm"
  }'

# Response contains uploadUrl and recordingId
{
  "recordingId": "...",
  "uploadUrl": "https://...r2.cloudflarestorage.com/...",
  "s3Key": "tenant/task/user/timestamp_filename.webm",
  "expiresIn": 3600,
  "uploadStatus": "PENDING"
}

# Step 2: Upload file to R2 (use the uploadUrl from step 1)
curl -X PUT "PRESIGNED_UPLOAD_URL" \
  -H "Content-Type: video/webm" \
  --data-binary @test-recording.webm

# Step 3: Complete upload
curl -X POST http://localhost:3000/api/recordings/{recordingId}/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "s3Key": "tenant/task/user/timestamp_filename.webm",
    "fileSize": 1024000,
    "duration": 120
  }'

# Step 4: Get recording with download URL
curl http://localhost:3000/api/recordings/{recordingId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Verify in R2 Dashboard

1. Go to your R2 bucket
2. Browse objects
3. You should see the uploaded file at: `tenant/task/user/timestamp_filename.webm`

## Production Considerations

### 1. Custom Domains (Optional)

Connect a custom domain for public downloads:

1. In R2 dashboard, go to your bucket
2. Click **Settings** tab
3. Under **Public Access**, click **Connect domain**
4. Enter your domain: `cdn.yourdomain.com`
5. Add the provided DNS record to your Cloudflare DNS

Benefits:
- Branded URLs instead of `*.r2.cloudflarestorage.com`
- Can enable Cloudflare's CDN caching
- Better for public/shared recordings

### 2. Lifecycle Policies

Set up automatic deletion of old recordings:

1. Go to your bucket → **Settings** tab
2. Under **Object Lifecycle**, click **Add rule**
3. Configure rule:
   - **Rule name:** Delete old recordings
   - **Filter by prefix:** (optional) specific tenant/task
   - **Action:** Delete objects
   - **Days after upload:** 90 (or your retention period)

Example rule:
```json
{
  "id": "delete-old-recordings",
  "status": "Enabled",
  "filter": {
    "prefix": ""
  },
  "expiration": {
    "days": 90
  }
}
```

### 3. Monitoring and Analytics

Monitor your R2 usage:

1. Go to **R2** → **Overview** in Cloudflare Dashboard
2. View metrics:
   - Storage used
   - Class A operations (writes)
   - Class B operations (reads)
   - Egress (always free!)

Set up alerts:
1. Go to **Notifications** in Cloudflare
2. Create alert for R2 storage threshold
3. Get notified when approaching limits

### 4. Cost Optimization

R2 pricing (as of 2024):

| Item | Price | Free Tier |
|------|-------|-----------|
| Storage | $0.015/GB/month | 10 GB |
| Class A Operations (writes) | $4.50/million | 1 million/month |
| Class B Operations (reads) | $0.36/million | 10 million/month |
| Egress | **FREE** | Unlimited |

**Storage optimization tips:**
- Use lifecycle policies to delete old recordings
- Consider video compression before upload
- Monitor storage growth in dashboard

**Cost calculator example (100 users):**
- 50 GB storage: 50 × $0.015 = **$0.75/month**
- 10,000 uploads: 0.01 × $4.50 = **$0.045/month**
- 100,000 downloads: FREE!
- **Total: ~$0.80/month**

Compare to S3: **~$225/month** for same usage!

### 5. Security Best Practices

✅ **Bucket access:**
- Keep bucket private (default)
- Use pre-signed URLs for uploads/downloads
- Never make bucket publicly readable

✅ **API tokens:**
- Create separate tokens for different environments
- Use least-privilege permissions
- Set token expiration dates
- Rotate tokens regularly
- Store in environment variables, never in code

✅ **CORS configuration:**
- Only whitelist your actual frontend domains
- Don't use `*` for AllowedOrigins in production
- Regularly review and update origins

✅ **Monitoring:**
- Enable R2 notifications for unusual activity
- Monitor Class A operations for abuse
- Set up budget alerts

### 6. Backup and Disaster Recovery

**S3-compatible backup:**
R2 is S3-compatible, so you can use standard S3 tools:

```bash
# Backup R2 to local storage using rclone
rclone sync r2:revui-recordings ./backups/recordings

# Or use AWS CLI with R2 endpoint
aws s3 sync s3://revui-recordings ./backups \
  --endpoint-url https://{account_id}.r2.cloudflarestorage.com
```

**Cross-region replication:**
- R2 automatically replicates across Cloudflare's network
- For additional redundancy, consider periodic backups to another provider

### 7. Multi-Tenant Isolation

The application uses path-based tenant isolation:
```
{tenantId}/{taskId}/{userId}/{timestamp}_{filename}
```

Additional R2-specific security:
- API tokens can be scoped to specific buckets
- Use separate buckets per major tenant (enterprise customers)
- Leverage R2's built-in encryption at rest

### 8. Public Access (Optional)

If you want some recordings publicly accessible:

1. **Custom domain approach** (recommended):
   - Connect custom domain to R2 bucket
   - Enable public access for specific paths
   - Use Cloudflare Access for authentication

2. **Public bucket approach** (not recommended):
   - Only make specific prefixes public
   - Use R2's public bucket feature sparingly

## Troubleshooting

### Common Issues:

1. **403 Forbidden on Upload**
   - Verify API token has "Object Read & Write" permission
   - Check token hasn't expired
   - Ensure pre-signed URL hasn't expired (default 1 hour)
   - Verify Account ID is correct in environment variables

2. **CORS Errors**
   - Verify CORS policy includes your frontend origin (https://revui.app, https://www.revui.app)
   - **Check that `AllowedMethods` includes `PUT`** (required for direct uploads)
   - Ensure `ExposeHeaders` includes `Content-Length`, `Content-Type`, and `ETag`
   - Do NOT include `POST` in AllowedMethods (we use PUT for S3-compatible uploads)
   - Clear browser cache and try again

3. **Connection Errors**
   - Verify R2 is enabled on your account
   - Check Account ID format is correct
   - Ensure bucket name matches exactly
   - Verify network connectivity

4. **Upload URL Expired**
   - Default expiration is 1 hour (3600 seconds)
   - Increase `urlExpiresIn` parameter if needed
   - Maximum expiration is 7 days

5. **Cannot find bucket**
   - Verify bucket name in `R2_BUCKET_NAME` matches exactly
   - Check bucket exists in R2 dashboard
   - Ensure API token has access to the bucket

### Verification Commands:

Test R2 connection using AWS CLI (S3-compatible):

```bash
# Configure AWS CLI for R2
aws configure --profile r2
# Enter:
# - Access Key ID: Your R2_ACCESS_KEY_ID
# - Secret Access Key: Your R2_SECRET_ACCESS_KEY
# - Region: auto

# List buckets
aws s3 ls --profile r2 \
  --endpoint-url https://{account_id}.r2.cloudflarestorage.com

# List bucket contents
aws s3 ls s3://revui-recordings --profile r2 \
  --endpoint-url https://{account_id}.r2.cloudflarestorage.com

# Upload test file
echo "test" > test.txt
aws s3 cp test.txt s3://revui-recordings/test.txt --profile r2 \
  --endpoint-url https://{account_id}.r2.cloudflarestorage.com
```

### Debug Logging:

Enable debug logging in your backend:

```typescript
// In s3.service.ts constructor, add:
console.log('R2 Configuration:', {
  accountId: this.configService.get('R2_ACCOUNT_ID'),
  bucketName: this.bucketName,
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  hasAccessKey: !!this.configService.get('R2_ACCESS_KEY_ID'),
  hasSecretKey: !!this.configService.get('R2_SECRET_ACCESS_KEY'),
});
```

## Migrating from AWS S3 to R2

If you were previously using S3:

### 1. Update Environment Variables

Replace AWS variables:
```bash
# Old (AWS S3)
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=revui-recordings
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# New (Cloudflare R2)
R2_ACCOUNT_ID=abc123def456
R2_BUCKET_NAME=revui-recordings
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

### 2. Migrate Existing Data (if any)

Use `rclone` to migrate from S3 to R2:

```bash
# Install rclone
brew install rclone  # macOS
# or: apt-get install rclone  # Linux

# Configure S3 source
rclone config

# Configure R2 destination (S3-compatible)
rclone config

# Sync data
rclone sync s3:old-bucket r2:revui-recordings --progress
```

### 3. Update Database

If your database has S3-specific references, no changes needed - R2 uses same path structure!

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [R2 API Documentation](https://developers.cloudflare.com/r2/api/)
- [S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3-compatibility/)
- [R2 Best Practices](https://developers.cloudflare.com/r2/best-practices/)

## Support

For issues related to this setup:
- Check Cloudflare R2 Status: https://www.cloudflarestatus.com/
- Cloudflare Community: https://community.cloudflare.com/
- Project issue tracker: [Your project GitHub/GitLab]

---

## Quick Setup Checklist

- [ ] Enable R2 in Cloudflare account
- [ ] Create R2 bucket: `revui-recordings`
- [ ] Note your Account ID
- [ ] Generate API token with Read & Write permissions
- [ ] Configure CORS policy
- [ ] Add environment variables to `.env`
- [ ] Test upload flow
- [ ] Set up lifecycle policies (optional)
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring alerts

**Estimated setup time:** 10-15 minutes

🎉 Enjoy zero egress fees and massive cost savings with Cloudflare R2!
