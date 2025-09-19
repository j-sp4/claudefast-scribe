# GitHub App Setup Guide

## 🚀 **Step-by-Step GitHub App Creation**

### **Step 1: Create the GitHub App**

1. **Navigate to GitHub Settings**:
   - Go to: `https://github.com/settings/apps`
   - Click "**New GitHub App**"

### **Step 2: Fill Out App Configuration**

#### **Basic Information**
```
App name: PR Documentation Bot
Description: Automatically updates documentation when PRs are created
Homepage URL: https://github.com/j-sp4/claudefast-scribe
```

#### **Webhook Configuration**
```
Webhook URL: https://your-server.com/api/github/webhook
Webhook secret: a6889103c1fc706c7e9e1c78654cc5bea7611f5c0b3c1f7397e2012edf4d1348
```

**Note**: For local development, you'll need to use ngrok:
```bash
ngrok http 3000
# Then use: https://abc123.ngrok.io/api/github/webhook
```

#### **Repository Permissions**
Set these permissions for your app:

```
Contents: Read & Write
- Needed to read PR files and create/update documentation files

Pull requests: Read  
- Needed to access PR information and files

Metadata: Read
- Basic repository information
```

#### **Subscribe to Events**
Check these webhook events:
```
☑️ Pull requests
```

### **Step 3: Generate and Download Private Key**

1. After creating the app, scroll down to "**Private keys**"
2. Click "**Generate a private key**"
3. Download the `.pem` file (keep it secure!)

### **Step 4: Install the App**

1. Go to your app's page: `https://github.com/apps/your-app-name`
2. Click "**Install**"
3. Choose "**Selected repositories**" and select `j-sp4/claudefast-scribe`
4. Note the installation ID from the URL (e.g., `installations/12345678`)

### **Step 5: Configure Environment Variables**

Add these to your `.env.local` file:

```bash
# GitHub App Configuration
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA...your-private-key-content...
-----END RSA PRIVATE KEY-----"
GITHUB_APP_INSTALLATION_ID=12345678

# Keep existing webhook secret
GITHUB_WEBHOOK_SECRET=a6889103c1fc706c7e9e1c78654cc5bea7611f5c0b3c1f7397e2012edf4d1348

# Keep existing Anthropic API key
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Important Notes:**
- Replace `123456` with your actual App ID
- Replace the private key with your downloaded `.pem` file content
- Replace `12345678` with your installation ID
- Keep the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines

## 🧪 **Testing the GitHub App**

### **Step 1: Start Your Server**
```bash
cd server
npm run dev
```

### **Step 2: Expose with ngrok**
```bash
# In a new terminal
ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and update your GitHub App's webhook URL to:
```
https://abc123.ngrok.io/api/github/webhook
```

### **Step 3: Test with a Real PR**

1. **Create a test branch** in your repository:
   ```bash
   git checkout -b test-pr-docs
   echo "# Test Documentation" > test-doc.md
   git add test-doc.md
   git commit -m "Add test documentation"
   git push origin test-pr-docs
   ```

2. **Create a PR** on GitHub from `test-pr-docs` to `main`

3. **Watch the magic happen**:
   - Check your server logs for webhook processing
   - Visit `http://localhost:3000/admin/pr-docs` to see the results
   - Look for new documentation PRs in your repository

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **"Invalid signature" errors**:
   - Check that your webhook secret matches exactly
   - Ensure your ngrok URL is correct in the GitHub App settings

2. **"Authentication failed" errors**:
   - Verify your App ID is correct
   - Check that your private key is properly formatted (with newlines)
   - Ensure the app is installed on your repository

3. **"No configuration found" errors**:
   - Make sure your repository is configured in the admin panel
   - Visit `http://localhost:3000/admin/pr-docs` and add your repository

### **Debugging Steps:**

1. **Check webhook deliveries**:
   - Go to your GitHub App settings
   - Click on "Advanced" tab
   - View recent webhook deliveries

2. **Check server logs**:
   - Look for webhook processing messages
   - Check for any error messages

3. **Check database logs**:
   - Visit the admin panel to see PR processing logs
   - Look for webhook events in the database

## 🎯 **Verification Checklist**

- [ ] GitHub App created with correct permissions
- [ ] Private key downloaded and added to environment
- [ ] App installed on your repository  
- [ ] Webhook URL points to your ngrok/server
- [ ] Environment variables configured
- [ ] Repository configured in admin panel
- [ ] Test PR created and processed

## 🚀 **Production Deployment**

For production, instead of ngrok:

1. **Deploy your server** to Vercel, Railway, or similar
2. **Update webhook URL** to your production domain
3. **Set environment variables** in your deployment platform
4. **Test with a real PR** in production

## 📊 **Monitoring**

Once set up, you can monitor the system through:

- **Admin Panel**: `http://localhost:3000/admin/pr-docs`
- **GitHub App Settings**: View webhook deliveries
- **Server Logs**: Real-time processing information
- **Database**: All events and results are logged

## 🎉 **Success!**

When working correctly, you should see:
1. PR created → Webhook received → AI analysis → Documentation updates → New PR created
2. All events logged in the admin panel
3. Automatic documentation staying in sync with code changes

The GitHub App provides better security and token management compared to personal access tokens, making it the professional choice for production deployments.
