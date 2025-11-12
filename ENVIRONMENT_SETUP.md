# Environment Setup Instructions

## Issue Resolution: PocketBase Connection & Authentication

The Backend CMS is having trouble connecting to PocketBase due to environment variable configuration issues. Follow these steps to resolve:

### 1. Create Root .env File

Copy the `.env.example` file to `.env` in the **ROOT** directory (not in Frontend or Backend folders):

```bash
# From the root directory (zenthra.shop/)
cp .env.example .env
```

### 2. Configure PocketBase URL

Edit the `.env` file and set the correct PocketBase URL:

```env
# For local development (default)
VITE_POCKETBASE_URL=http://127.0.0.1:8090

# OR for production (if using remote PocketBase)
VITE_POCKETBASE_URL=https://your-pocketbase-url.com
```

### 3. Start PocketBase Server

Make sure PocketBase is running on the configured URL:

```bash
# If using local PocketBase
./pocketbase serve --http=127.0.0.1:8090

# OR if you have it installed globally
pocketbase serve --http=127.0.0.1:8090
```

### 4. Create Admin User in PocketBase

1. Open PocketBase admin UI: http://127.0.0.1:8090/_/
2. Create an admin account
3. Create a user in the `users` collection with the email/password you want to use for login

### 5. Configure CORS in PocketBase

In PocketBase settings, make sure CORS is configured to allow your Backend CMS origin:

- Allowed Origins: `http://localhost:8080` (or your Backend CMS URL)
- Allowed Methods: `GET, POST, PUT, DELETE, OPTIONS`
- Allowed Headers: `Content-Type, Authorization`

### 6. Restart Backend CMS

After making these changes:

```bash
cd Backend
npm run dev
```

### 7. Test Login

1. Open Backend CMS: http://localhost:8080
2. Try logging in with the credentials you created in PocketBase
3. Check browser console for debug information

## Troubleshooting

### Common Issues:

1. **"Cannot connect to PocketBase server"**
   - Check if PocketBase is running
   - Verify the URL in `.env` file
   - Check firewall/network settings

2. **CORS errors**
   - Configure CORS settings in PocketBase admin
   - Make sure the Backend CMS URL is in allowed origins

3. **"Invalid email or password"**
   - Verify user exists in PocketBase `users` collection
   - Check email/password are correct

4. **Environment variables not loading**
   - Ensure `.env` file is in the ROOT directory
   - Restart the Backend CMS after changing `.env`
   - Check console for environment debug information

### Debug Information

The login page now includes environment debugging. Check the browser console for:
- Current PocketBase URL being used
- Available environment variables
- Connection attempts and errors

## File Structure

```
zenthra.shop/
├── .env                 # ← Root environment file (create this)
├── .env.example         # ← Template file
├── Frontend/
├── Backend/             # ← Backend CMS
└── ...
```

## Next Steps

Once login is working:
1. Test the automation flows at `/admin/automation`
2. Create the PocketBase collections for automation (flows, runs, run_steps, connections, events)
3. Configure any additional integrations needed
