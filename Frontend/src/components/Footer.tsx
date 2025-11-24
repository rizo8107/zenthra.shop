import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const Footer = () => {
  const { settings } = useSiteSettings();

  const siteTitle =
    settings?.siteTitle ||
    import.meta.env.VITE_SITE_TITLE ||
    'Karigai';

  const aboutText =
    settings?.aboutText ||
    "Karigai was founded with a simple mission to create beautiful, nourishing handmade soaps that don't compromise on quality or sustainability.";

  const copyright =
    settings?.footerCopyright ||
    `© ${new Date().getFullYear()} ${siteTitle}. All rights reserved.`;

  return (
    <footer className="bg-[#0F6B35] text-white">
      <div className="karigai-container py-8 px-6 lg:px-30 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Logo + about + socials */}
          <div className="md:col-span-4">
            <Link to="/" className="inline-block mb-4">
              <Logo variant="light" className="h-8" />
            </Link>
            <p className="text-white/80 mb-4 text-sm leading-relaxed">
              {aboutText}
            </p>
            <div className="flex space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-white/80 hover:bg-white/10"
              >
                <Facebook className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-white/80 hover:bg:white/10"
              >
                <Instagram className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text:white hover:text-white/80 hover:bg-white/10"
              >
                <Twitter className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Shop */}
          <div className="md:col-span-2">
            <h3 className="font-semibold mb-4 text-[18px] leading-[24px]">Shop</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/shop"
                  className="text-white/80 hover:text-white transition-colors text-sm"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  to="/bestsellers"
                  className="text-white/80 hover:text-white transition-colors text-sm"
                >
                  Bestsellers
                </Link>
              </li>
              <li>
                <Link
                  to="/new-arrivals"
                  className="text-white/80 hover:text-white transition-colors text-sm"
                >
                  New Arrivals
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div className="md:col-span-3">
            <h3 className="font-semibold mb-4 text-[18px] leading-[24px]">Policies</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/privacy-policy"
                  className="text-white/80 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-and-conditions"
                  className="text-white/80 hover:text-white transition-colors text-sm"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  to="/shipping-policy"
                  className="text-white/80 hover:text-white transition-colors text-sm"
                >
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/cancellations-refunds"
                  className="text-white/80 hover:text-white transition-colors text-sm"
                >
                  Cancellations & Refunds
                </Link>
              </li>
              <li>
                <Link
                  to="/contact-us"
                  className="text-white/80 hover:text-white transition-colors text-sm"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Stay Connected / newsletter */}
          <div className="md:col-span-3">
            <h3 className="font-semibold mb-4 text-[18px] leading-[24px]">
              Stay Connected
            </h3>
            <p className="text-white/80 text-sm mb-3">
              Subscribe to our newsletter for exclusive offers and updates.
            </p>
            <form className="flex items-center gap-2 max-w-xs">
              <div className="flex items-center bg-white/10 rounded-full px-4 py-2 w-full">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-transparent placeholder:text-white/70 text-white outline-none w-full text-sm"
                  aria-label="Email"
                />
              </div>
              <Button
                type="submit"
                size="icon"
                className="rounded-full bg-white/20 hover:bg-white/30 text-white"
                aria-label="Subscribe"
              >
                
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/20 mt-6">
          <div className="py-3 flex justify-center items-center text-white/80 text-xs text-center">
            <p>{copyright}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
