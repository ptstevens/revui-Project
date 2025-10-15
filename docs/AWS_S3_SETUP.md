# AWS S3 Setup Guide for Recording Storage (Story 1.4)

This guide walks through setting up an AWS S3 bucket for secure recording storage with multi-tenant isolation.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Creating the S3 Bucket](#creating-the-s3-bucket)
3. [Configuring Bucket Policies](#configuring-bucket-policies)
4. [Setting up CORS](#setting-up-cors)
5. [Creating IAM User and Access Keys](#creating-iam-user-and-access-keys)
6. [Environment Configuration](#environment-configuration)
7. [Testing the Configuration](#testing-the-configuration)
8. [Production Considerations](#production-considerations)

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed (optional but recommended)
- Access to AWS Console

## Creating the S3 Bucket

### Via AWS Console:

1. Navigate to S3 in the AWS Console
2. Click "Create bucket"
3. **Bucket Configuration:**
   - **Bucket name:** `revui-recordings` (or your preferred name)
   - **AWS Region:** Choose your preferred region (e.g., `us-east-1`)
   - **Object Ownership:** ACLs disabled (recommended)
   - **Block Public Access:** Keep all blocking enabled (we'll use pre-signed URLs)
   - **Bucket Versioning:** Optional (recommended for production)
   - **Default encryption:** Enable with SSE-S3 (AES-256)
   - **Object Lock:** Disabled (unless required for compliance)

4. Click "Create bucket"

### Via AWS CLI:

```bash
aws s3api create-bucket \
  --bucket revui-recordings \
  --region us-east-1 \
  --create-bucket-configuration LocationConstraint=us-east-1

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket revui-recordings \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

## Configuring Bucket Policies

### Bucket Policy for Pre-signed URLs

The S3Service uses pre-signed URLs, so the bucket policy should allow the IAM user to generate them:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPresignedURLAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/revui-backend"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::revui-recordings/*"
    }
  ]
}
```

**Apply via Console:**
1. Go to bucket → Permissions tab
2. Scroll to "Bucket policy"
3. Click "Edit" and paste the policy above
4. Replace `YOUR_ACCOUNT_ID` with your AWS account ID
5. Click "Save changes"

## Setting up CORS

CORS configuration is essential for direct browser uploads using pre-signed URLs.

### CORS Configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://your-production-domain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**Apply via Console:**
1. Go to bucket → Permissions tab
2. Scroll to "Cross-origin resource sharing (CORS)"
3. Click "Edit"
4. Paste the CORS configuration above
5. Update `AllowedOrigins` with your actual frontend URLs
6. Click "Save changes"

**Apply via CLI:**
```bash
aws s3api put-bucket-cors \
  --bucket revui-recordings \
  --cors-configuration file://cors-config.json
```

## Creating IAM User and Access Keys

### Step 1: Create IAM User

1. Navigate to IAM in AWS Console
2. Click "Users" → "Create user"
3. **User name:** `revui-backend`
4. **Access type:** Programmatic access
5. Click "Next"

### Step 2: Attach Permissions

Create a custom policy with minimal required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3RecordingsAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::revui-recordings",
        "arn:aws:s3:::revui-recordings/*"
      ]
    }
  ]
}
```

**Apply the policy:**
1. In IAM Users page, select the user
2. Click "Add permissions" → "Create inline policy"
3. Choose JSON tab and paste policy above
4. Name it `RevuiS3RecordingsPolicy`
5. Click "Create policy"

### Step 3: Create Access Keys

1. Select the IAM user
2. Go to "Security credentials" tab
3. Click "Create access key"
4. Choose "Application running outside AWS"
5. **Save the credentials securely:**
   - Access Key ID
   - Secret Access Key

⚠️ **Security Warning:** Never commit these keys to version control!

## Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=revui-recordings
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
```

### Environment Variable Descriptions:

- **AWS_REGION**: The AWS region where your bucket is located
- **AWS_S3_BUCKET_NAME**: Your S3 bucket name
- **AWS_ACCESS_KEY_ID**: IAM user access key ID
- **AWS_SECRET_ACCESS_KEY**: IAM user secret access key

## Testing the Configuration

### 1. Backend Health Check

Add a health check endpoint to verify S3 configuration:

```bash
curl http://localhost:3000/api/recordings/health
```

Expected response:
```json
{
  "s3": {
    "configured": true,
    "message": "S3 service configured successfully"
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

# Step 2: Upload file to S3 (use the uploadUrl from step 1)
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

## Production Considerations

### 1. Lifecycle Policies

Set up lifecycle policies to automatically delete or archive old recordings:

```json
{
  "Rules": [
    {
      "Id": "DeleteOldRecordings",
      "Status": "Enabled",
      "Prefix": "",
      "Expiration": {
        "Days": 90
      }
    },
    {
      "Id": "TransitionToInfrequentAccess",
      "Status": "Enabled",
      "Prefix": "",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        }
      ]
    }
  ]
}
```

**Apply via Console:**
1. Go to bucket → Management tab
2. Click "Create lifecycle rule"
3. Configure rules for your retention policy

### 2. Monitoring and Logging

Enable S3 server access logging:

```bash
aws s3api put-bucket-logging \
  --bucket revui-recordings \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "revui-logs",
      "TargetPrefix": "s3-access-logs/"
    }
  }'
```

### 3. CloudWatch Metrics

Monitor S3 bucket metrics:
- **Request metrics:** Track PUT/GET requests
- **Storage metrics:** Monitor storage growth
- **Data transfer:** Track bandwidth usage

### 4. Cost Optimization

- Use **S3 Intelligent-Tiering** for automatic cost optimization
- Set up **S3 Storage Lens** to analyze storage patterns
- Monitor **Data Transfer costs** (use CloudFront if serving globally)
- Consider **S3 Glacier** for long-term archival

### 5. Security Best Practices

- ✅ Keep Block Public Access enabled
- ✅ Use IAM roles instead of access keys for EC2/ECS deployments
- ✅ Enable MFA Delete for production buckets
- ✅ Use AWS Secrets Manager or Parameter Store for credentials
- ✅ Rotate access keys regularly
- ✅ Enable CloudTrail logging for S3 API calls
- ✅ Use VPC endpoints for private S3 access (if applicable)

### 6. Backup and Disaster Recovery

- Enable **S3 Versioning** to protect against accidental deletions
- Set up **Cross-Region Replication** for critical data
- Configure **S3 Object Lock** for compliance requirements
- Test restore procedures regularly

### 7. Multi-Tenant Isolation

The application uses path-based tenant isolation:
```
{tenantId}/{taskId}/{userId}/{timestamp}_{filename}
```

Additional security measures:
- IAM policies can be further restricted per tenant
- Consider using S3 Object Tags for advanced access control
- Use AWS Organizations for multi-account tenant isolation

## Troubleshooting

### Common Issues:

1. **403 Forbidden on Upload**
   - Check IAM user has `s3:PutObject` permission
   - Verify bucket policy allows the IAM user
   - Ensure pre-signed URL hasn't expired

2. **CORS Errors**
   - Verify CORS configuration includes your frontend origin
   - Check that `AllowedMethods` includes `PUT`
   - Ensure `ExposeHeaders` includes `ETag`

3. **Upload URL Expired**
   - Default expiration is 1 hour
   - Increase `urlExpiresIn` parameter if needed
   - Maximum expiration is 7 days

4. **Connection Refused/Timeout**
   - Verify AWS credentials are correct
   - Check network connectivity to AWS
   - Ensure security groups allow outbound HTTPS (443)

### Verification Commands:

```bash
# Test AWS credentials
aws sts get-caller-identity

# List bucket contents
aws s3 ls s3://revui-recordings/ --recursive

# Check bucket encryption
aws s3api get-bucket-encryption --bucket revui-recordings

# Verify CORS configuration
aws s3api get-bucket-cors --bucket revui-recordings
```

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [S3 Pre-signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/)

## Support

For issues related to this setup, contact the development team or refer to the project's issue tracker.
