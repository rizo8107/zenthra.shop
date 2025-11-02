# ⚡ Quick Start Guide

Get your unified e-commerce project running in 5 minutes!

## 🚀 Prerequisites

- [Node.js](https://nodejs.org/) v16+ installed
- [PocketBase](https://pocketbase.io/docs/) downloaded

## 📋 Quick Setup Checklist

### 1️⃣ Install Dependencies (2 minutes)

```bash
# Install root dependencies
npm install

# Install all project dependencies
npm run install:all
```

### 2️⃣ Setup PocketBase (1 minute)

```bash
# Create PocketBase folder
mkdir PocketBase
cd PocketBase

# Download and extract PocketBase here
# Get it from: https://pocketbase.io/docs/

# Start PocketBase
./pocketbase serve
# Windows: .\pocketbase.exe serve
```

**In your browser:**
1. Go to http://127.0.0.1:8090/_/
2. Create admin account
3. Remember the credentials!

### 3️⃣ Configure Environment (1 minute)

**Create `.env` in the ROOT directory:**
```bash
# Copy the example file
cp .env.example .env

# Then edit .env with your values
```

**Edit `.env`:**
```env
VITE_POCKETBASE_URL=http://127.0.0.1:8090
VITE_POCKETBASE_ADMIN_EMAIL=your-admin@email.com
VITE_POCKETBASE_ADMIN_PASSWORD=your-password
VITE_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY
RAZORPAY_KEY_SECRET=your_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

✅ **Simplified:** Both Frontend and Backend CMS automatically use this single root .env file!

### 4️⃣ Initialize Database (30 seconds)

```bash
cd Frontend
npm run init:pocketbase
cd ..
```

### 5️⃣ Verify Setup (30 seconds)

```bash
npm run verify
```

Fix any issues shown before proceeding.

### 6️⃣ Start Development Servers (30 seconds)

```bash
npm run dev
```

This starts:
- 🎨 Frontend: http://localhost:5173
- 🛠️ Backend CMS: http://localhost:5174

## ✅ Test Your Setup

### Test Backend CMS
1. Open http://localhost:5174
2. Login with your PocketBase credentials
3. Add a test product:
   ```
   Name: Test Tote Bag
   Price: 25.99
   Colors: [{"name":"Red","value":"red","hex":"#FF0000"}]
   ```

### Test Frontend
1. Open http://localhost:5173
2. Your test product should appear!
3. Try adding it to cart

## 🎉 Success!

Your unified e-commerce project is now running!

## 📚 Next Steps

1. **Add More Products:** Use Backend CMS to populate your store
2. **Customize Theme:** Configure colors and styles
3. **Setup Payments:** Configure Razorpay for real payments
4. **Setup Emails:** Configure SMTP for order notifications

## 🆘 Common Issues

### "Cannot connect to PocketBase"
```bash
# Ensure PocketBase is running
cd PocketBase
./pocketbase serve
```

### "Port already in use"
Stop the conflicting process or change ports in `vite.config.ts`

### "Products not syncing"
Verify the root `.env` file exists and has `VITE_POCKETBASE_URL` configured

## 📖 Full Documentation

- [Complete Setup Guide](./SETUP.md)
- [Product Variants Guide](./PRODUCT-VARIANTS-GUIDE.md)
- [Project Overview](./README.md)

## 🎯 Quick Commands Reference

```bash
npm run dev                 # Start Frontend + CMS
npm run dev:with-servers   # Start everything including backend servers
npm run verify             # Check setup status
npm run build              # Build for production
npm run install:all        # Install all dependencies
```

---

**Ready to build your store! 🚀**
