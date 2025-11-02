# Complete Setup Guide

This guide will help you set up the unified e-commerce project from scratch.

## Step-by-Step Setup

### 1. Install Node.js and npm
Ensure you have Node.js v16 or higher installed:
```bash
node --version
npm --version
```

### 2. Install Root Dependencies
```bash
npm install
```

### 3. Install Project Dependencies
```bash
npm run install:all
```

This will install dependencies for both Frontend and Backend CMS.

### 4. Setup PocketBase

#### Download PocketBase
1. Go to https://pocketbase.io/docs/
2. Download the appropriate version for your OS
3. Create a `PocketBase` folder in the root directory
4. Extract the PocketBase executable there

#### Start PocketBase
```bash
cd PocketBase
./pocketbase serve
```

On Windows:
```powershell
cd PocketBase
.\pocketbase.exe serve
```

PocketBase will start on http://127.0.0.1:8090

#### Create Admin Account
1. Open http://127.0.0.1:8090/_/ in your browser
2. Create an admin account:
   - Email: admin@example.com (or your preferred email)
   - Password: Choose a strong password
3. **Write down these credentials** - you'll need them!

### 5. Initialize Database Collections

From the Frontend directory:
```bash
cd Frontend
npm run init:pocketbase
```

This creates all necessary collections:
- users
- products
- orders
- addresses
- slider_images
- theme_settings
- reviews
- etc.

### 6. Configure Environment Variables

#### Create Root .env File

**From the root directory:**
```bash
# Copy the example file
cp .env.example .env
```

**Edit the `.env` file with your values:**
```env
# PocketBase Configuration (REQUIRED)
VITE_POCKETBASE_URL=http://127.0.0.1:8090
VITE_POCKETBASE_ADMIN_EMAIL=admin@example.com
VITE_POCKETBASE_ADMIN_PASSWORD=your-password-here

# Frontend - Payment Gateway (REQUIRED)
VITE_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Backend CMS - Email Configuration (OPTIONAL)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourstore.com
```

**✅ SIMPLIFIED**: Both Frontend and Backend CMS automatically read from this single root `.env` file. No need to maintain separate files!

### 7. Setup Email (Optional)

For the Backend CMS email notifications:

#### Gmail Setup
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated password
3. Use this password in `EMAIL_PASSWORD` in Backend CMS/.env

### 8. Setup Razorpay (Optional)

For payment processing:

1. Sign up at https://razorpay.com/
2. Get your test API keys from the dashboard
3. Add them to Frontend/.env:
   ```env
   VITE_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY
   RAZORPAY_KEY_SECRET=YOUR_SECRET
   ```

### 9. Start the Application

#### Option A: Basic Development (Recommended for beginners)
```bash
# From root directory
npm run dev
```

This starts:
- Frontend: http://localhost:5173
- Backend CMS: http://localhost:5174

#### Option B: Full Development (with backend servers)
```bash
# From root directory
npm run dev:with-servers
```

This starts:
- Frontend: http://localhost:5173
- Backend CMS: http://localhost:5174
- Razorpay Server: http://localhost:3001
- Email Server: http://localhost:3000

### 10. Test the Setup

#### Test Backend CMS
1. Go to http://localhost:5174
2. Login with your PocketBase admin credentials
3. Try adding a test product

#### Test Frontend
1. Go to http://localhost:5173
2. The product you added should appear
3. Try browsing and adding items to cart

## Verification Checklist

- [ ] PocketBase is running on http://127.0.0.1:8090
- [ ] Root `.env` file created with correct values
- [ ] Both Frontend and Backend CMS configured to use root .env
- [ ] Collections are initialized in PocketBase
- [ ] Frontend is running on http://localhost:5173
- [ ] Backend CMS is running on http://localhost:5174
- [ ] Can login to Backend CMS
- [ ] Products added in CMS appear in Frontend

## Common Issues and Solutions

### Issue: "Cannot connect to PocketBase"
**Solution**: 
- Ensure PocketBase is running: `cd PocketBase && ./pocketbase serve`
- Check root `.env` file has correct `VITE_POCKETBASE_URL`

### Issue: "Products not syncing between Frontend and CMS"
**Solution**:
- Verify root `.env` file exists with correct `VITE_POCKETBASE_URL`
- Check PocketBase is running
- Refresh both applications
- Remove any old Frontend/.env or Backend CMS/.env files

### Issue: "Port already in use"
**Solution**:
- Frontend: Change port in `Frontend/vite.config.ts`
- Backend CMS: Change port in `Backend CMS/vite.config.ts`
- PocketBase: Start with `./pocketbase serve --http=127.0.0.1:8091`

### Issue: "Email not sending"
**Solution**:
- Verify Gmail App Password is correct
- Check EMAIL_* variables in root .env file
- Ensure 2FA is enabled on Gmail

### Issue: "Collections not found"
**Solution**:
- Run `cd Frontend && npm run init:pocketbase`
- Check PocketBase admin panel at http://127.0.0.1:8090/_/
- Verify admin credentials are correct

## Next Steps

1. **Add Sample Products**: Use Backend CMS to add products
2. **Configure Theme**: Customize colors and appearance
3. **Test Orders**: Place test orders from Frontend
4. **Setup Email**: Configure email notifications
5. **Setup Razorpay**: Configure payment gateway

## Production Deployment

See [README.md](./README.md#-production-deployment) for production deployment instructions.

## Getting Help

If you encounter issues:
1. Check the error messages in browser console
2. Check PocketBase logs
3. Verify all environment variables are set correctly
4. Ensure all services are running

---

**Happy coding! 🚀**
