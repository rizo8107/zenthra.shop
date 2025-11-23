# Changelog - Version 1.0 (Dynamic Branding)

## 🎯 Overview
This release implements a complete dynamic branding system, moving all site configuration from hardcoded values to a backend admin UI powered by PocketBase.

## ✨ Major Features

### 1. Backend Admin UI for Branding
- **New Branding Page** (`/admin/branding`) with three tabs:
  - **Branding**: Site title, logo, favicon, social share image
  - **Contact**: Contact information and social media links
  - **Policies**: Privacy Policy, Terms & Conditions, Shipping Policy, etc.

### 2. Rich Text Editor
- Integrated **TipTap** WYSIWYG editor for policy pages
- Supports formatting, lists, links, and more
- User-friendly interface for non-technical users

### 3. Image Upload System
- Upload logo, favicon, and social share images directly in admin UI
- Images stored in PocketBase `content` collection
- Automatic URL generation and storage in `site_settings`

### 4. Dynamic Frontend Metadata
- **BrandingHead** component dynamically injects:
  - Page title
  - Favicon
  - Open Graph tags (og:title, og:image, og:description)
  - Twitter Card tags
- **SessionStorage caching** prevents flash of old branding on page refresh

### 5. Removed Hardcoded Branding
- Removed all "Karigai" hardcoded references
- Changed default fallback to "Viruthi Gold"
- Frontend now fully depends on `site_settings` from PocketBase

## 📁 New Files

### Backend
- `Backend/src/pages/admin/BrandingPage.tsx` - Main branding admin page
- `Backend/src/components/ImageUpload.tsx` - Image upload component
- `Backend/src/components/RichTextEditor.tsx` - TipTap rich text editor wrapper

### Frontend
- `Frontend/src/contexts/SiteSettingsContext.tsx` - Global site settings context
- `Frontend/src/pages/SiteSettings.tsx` - Site settings page (unused, can be removed)

## 🔧 Modified Files

### Backend
- `Backend/src/lib/pocketbase.ts`
  - Added `getSiteSettingsRecord()`, `updateSiteSettingsRecord()`, `createSiteSettingsRecord()`
  - Fixed environment variable loading with debug logging
  - Added admin authentication helpers
  
- `Backend/vite.config.ts`
  - Fixed environment variable exposure with `envPrefix: ['VITE_']`
  - Added detailed logging for env variables
  - Configured to load `.env` from root directory

- `Backend/src/components/layout/Sidebar.tsx`
  - Added "Branding" menu item under Settings

- `Backend/package.json`
  - Added TipTap dependencies for rich text editing

### Frontend
- `Frontend/src/components/BrandingHead.tsx`
  - Added loading state check to prevent flash of old branding
  - Changed default fallback from "Karigai" to "Viruthi Gold"
  - Added `loading` to useEffect dependencies

- `Frontend/src/components/Logo.tsx`
  - Added loading state to wait for settings
  - Shows site title text when logo fails to load
  - Changed default fallback from "Karigai" to "Viruthi Gold"

- `Frontend/src/components/ui/logo.tsx`
  - Added loading state check
  - Gracefully handles missing/broken logo images
  - Changed default fallback from "Karigai" to "Viruthi Gold"

- `Frontend/src/contexts/SiteSettingsContext.tsx`
  - Implemented sessionStorage caching for instant page loads
  - Prevents flash of old branding on refresh

- `Frontend/index.html`
  - Removed all hardcoded branding metadata
  - Now relies solely on `BrandingHead` component

- Policy Pages (PrivacyPolicy, TermsAndConditions, ShippingPolicy, etc.)
  - Updated to fetch content from `site_settings` instead of hardcoded text

## 🐳 Docker & Environment

### `.env.example`
Added comprehensive environment variable documentation:
- **Branding Configuration** (VITE_SITE_TITLE, VITE_SITE_LOGO)
- **WhatsApp Integration** (VITE_WHATSAPP_API_URL, VITE_EVOLUTION_*)
- **Analytics & Tracking** (VITE_PUBLIC_POSTHOG_*, VITE_GEMINI_API_KEY)
- **Webhooks & CRM** (WEBHOOK_SERVER_URL, WEBHOOKS_*)
- **Docker Port Configuration** (FRONTEND_PORT, CMS_UI_PORT, CMS_API_PORT)

### `docker-compose.yml`
- Added `VITE_WHATSAPP_API_URL` to Backend build args and environment
- All environment variables properly passed to containers

### `.gitignore`
- Added `.history/` to exclude Local History extension files

## 🔄 Migration Guide

### For Existing Deployments

1. **Update Environment Variables**
   ```bash
   # Add to your .env file (at root)
   VITE_SITE_TITLE=Your Store Name
   VITE_SITE_LOGO=/logo.png
   VITE_WHATSAPP_API_URL=https://your-whatsapp-api.com
   # ... see .env.example for full list
   ```

2. **Configure Branding in Admin UI**
   - Go to Backend: `http://localhost:4000/admin/branding`
   - Upload your logo, favicon, and social share image
   - Set site title and description
   - Configure contact information
   - Update policy pages with your content
   - Click "Save Changes"

3. **Rebuild Docker Containers**
   ```bash
   docker compose down
   docker compose up --build -d
   ```

4. **Verify Changes**
   - Frontend: `http://localhost:8081`
   - Check browser tab title and favicon
   - Check logo in header
   - Verify policy pages load correctly
   - Test page refresh (should be instant, no flash)

## 🐛 Bug Fixes

1. **Fixed environment variable loading**
   - Backend now correctly loads `VITE_POCKETBASE_URL` from root `.env`
   - Added fallback and detailed logging for debugging

2. **Fixed authentication flow**
   - Backend admin login now tries admin collection first, then users

3. **Fixed logo loading issues**
   - Removed broken hardcoded logo paths
   - Added proper error handling for missing images
   - Shows site title text as fallback

4. **Fixed flash of old branding**
   - Implemented sessionStorage caching
   - Added loading states to components
   - Document head only updates after settings load

## 📊 Statistics

- **Files Changed**: 29 files
- **Lines Added**: ~2,621 lines
- **Lines Removed**: ~109 lines
- **New Components**: 5
- **Dependencies Added**: TipTap editor packages

## 🚀 Next Steps

### Recommended Actions
1. Remove unused `Frontend/src/pages/SiteSettings.tsx` if not needed
2. Add validation for required fields in BrandingPage
3. Add image size/format validation
4. Implement image optimization/compression
5. Add preview mode before saving changes

### Future Enhancements
- Multi-language support for branding
- Theme customization (colors, fonts)
- Email template editor
- SEO optimization tools
- Analytics dashboard integration

## 📝 Notes

- All branding is now managed through `/admin/branding` in the backend
- PocketBase `site_settings` collection is the single source of truth
- Frontend automatically updates when settings change
- SessionStorage caching provides instant page loads
- No more hardcoded "Karigai" references

## 🔗 Links

- **Pull Request**: https://github.com/rizo8107/zenthra.shop/pull/new/v1
- **Branch**: `v1`
- **Commit**: `1b82be1`

---

**Version**: 1.0  
**Date**: November 23, 2025  
**Author**: Cascade AI Assistant
