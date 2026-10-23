import React from 'react';
import { Listing } from '../types';
import { useApp } from '../context/AppContext';
import {
  Heart,
  MapPin,
  Phone,
  MessageCircle,
  ShieldCheck,
  Maximize2,
  Calendar,
  Layers,
  Sun
} from 'lucide-react';

interface ListingCardProps {
  listing: Listing;
  onSelect?: (listing: Listing) => void;
  showStatusBadge?: boolean;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onSelect,
  showStatusBadge = false
}) => {
  const { toggleFavorite, isFavorite } = useApp();
  const favorited = isFavorite(listing.id);

  // Currency Formatter
  const formattedPrice = () => {
    if (listing.currency === 'USD') {
      return `$${listing.price.toLocaleString()}`;
    }
    if (listing.currency === 'SAR') {
      return `${listing.price.toLocaleString()} ر.س`;
    }
    // YER
    if (listing.price >= 1000000) {
      return `${(listing.price / 1000000).toLocaleString('ar-YE', { maximumFractionDigits: 1 })} مليون ر.ي`;
    }
    return `${listing.price.toLocaleString()} ر.ي`;
  };

  const propertyTypeLabels: Record<string, string> = {
    apartment: 'شقة سكنية',
    villa: 'فيلا فاخرة',
    land: 'أرض / لبن',
    building: 'عمارة سكنية/تجارية',
    commercial: 'محل / معرض',
    office: 'مكتب تجاري',
    chalet: 'استراحة / مزرعة'
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    published: { label: 'منشور ونشط', color: 'bg-emerald-100 text-emerald-800' },
    draft: { label: 'مسودة', color: 'bg-slate-100 text-slate-700' },
    under_review: { label: 'قيد المراجعة', color: 'bg-amber-100 text-amber-800' },
    needs_changes: { label: 'مطلوب تعديله', color: 'bg-orange-100 text-orange-800' },
    suspended: { label: 'موقوف مؤقتاً', color: 'bg-rose-100 text-rose-800' },
    rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800' }
  };

  const statusInfo = statusLabels[listing.status] || { label: listing.status, color: 'bg-slate-100 text-slate-700' };

  return (
    <div
      onClick={() => onSelect && onSelect(listing)}
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Image Thumbnail & Badges */}
      <div className="relative h-52 w-full overflow-hidden bg-slate-100">
        <img
          src={(listing.images && listing.images[0]) || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80'}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Purpose Badge (Top Right) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-[#12A889] shadow-sm">
            {listing.purpose === 'sale' ? 'للبيع' : listing.purpose === 'rent' ? 'للإيجار' : 'استثمار'}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#16324F] bg-white/95 backdrop-blur-xs shadow-sm">
            {propertyTypeLabels[listing.propertyType] || listing.propertyType}
          </span>
        </div>

        {/* Reserved Badge if listing is reserved */}
        {listing.isReserved && (
          <div className="absolute top-3 left-12 flex items-center gap-1 z-10">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-black text-amber-950 bg-amber-300 border border-amber-400 shadow-xs flex items-center gap-1.5 backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-amber-800 animate-pulse" />
              <span>محجوز مؤقتاً</span>
            </span>
          </div>
        )}

        {/* Status Badge (if enabled and not reserved) */}
        {showStatusBadge && !listing.isReserved && (
          <div className="absolute top-3 left-12">
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        )}

        {/* Favorite Heart Button (Top Left) */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            toggleFavorite(listing.id);
          }}
          className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            favorited
              ? 'bg-rose-500 text-white shadow-md'
              : 'bg-white/90 text-slate-700 hover:bg-white hover:text-rose-500 shadow-sm'
          }`}
          title={favorited ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
        >
          <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
        </button>

        {/* Bottom Image Overlay with Price */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent p-3 pt-8 flex items-baseline justify-between text-white">
          <div>
            <span className="font-black text-lg md:text-xl drop-shadow-xs">{formattedPrice()}</span>
            {listing.isNegotiable && (
              <span className="text-[11px] text-emerald-300 font-bold mr-1.5">(قابل للتفاوض)</span>
            )}
          </div>
          <span className="text-xs text-slate-200 font-medium">
            {listing.area} {listing.areaUnit}
          </span>
        </div>
      </div>

      {/* Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5 font-medium">
            <MapPin className="w-3.5 h-3.5 text-[#12A889] flex-shrink-0" />
            <span className="truncate">
              {listing.location?.governorate || 'اليمن'} • {listing.location?.city || ''} • {listing.location?.district || ''}
            </span>
          </div>

          <h3 className="font-bold text-sm md:text-base text-[#16324F] line-clamp-2 leading-snug mb-3 group-hover:text-[#12A889] transition-colors">
            {listing.title}
          </h3>

          {/* Quick Specifications */}
          <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-100 text-xs text-slate-600 mb-3 text-center">
            {listing.attributes?.rooms ? (
              <div className="flex flex-col">
                <span className="text-slate-400 text-[10px]">الغرف</span>
                <span className="font-bold text-slate-800">{listing.attributes.rooms} غرف</span>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-slate-400 text-[10px]">المساحة</span>
                <span className="font-bold text-slate-800">{listing.area || 0} {listing.areaUnit || 'م²'}</span>
              </div>
            )}

            {listing.attributes?.bathrooms ? (
              <div className="flex flex-col">
                <span className="text-slate-400 text-[10px]">الحمامات</span>
                <span className="font-bold text-slate-800">{listing.attributes.bathrooms} حمام</span>
              </div>
            ) : listing.attributes?.streetWidthMeters ? (
              <div className="flex flex-col">
                <span className="text-slate-400 text-[10px]">الشارع</span>
                <span className="font-bold text-slate-800">{listing.attributes.streetWidthMeters} م</span>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-slate-400 text-[10px]">الموقع</span>
                <span className="font-bold text-slate-800">{listing.location?.district || 'اليمن'}</span>
              </div>
            )}

            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px]">المنظومة</span>
              <span className="font-bold text-slate-800 flex items-center justify-center gap-0.5">
                {listing.attributes?.hasSolarSystem ? (
                  <span className="text-amber-600 font-bold flex items-center gap-0.5">
                    <Sun className="w-3 h-3" /> طاقة
                  </span>
                ) : (
                  <span>عادي</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Footer: Verification Badge & Contact Action */}
        <div className="flex items-center justify-between pt-1">
          {/* Verification Badge */}
          <div className="flex items-center gap-1 text-[11px]">
            {listing.verificationBadges && listing.verificationBadges.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{listing.verificationBadges[0].label}</span>
              </span>
            ) : (
              <span className="text-slate-400 text-[11px]">معلن فردي</span>
            )}
          </div>

          {/* Quick Communication (only if advertiser allows) */}
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            {listing.advertiser?.allowWhatsapp && listing.advertiser?.phone && (
              <a
                href={`https://wa.me/967${listing.advertiser.phone.replace(/^0+/, '')}?text=مرحباً، أستفسر عن إعلان ${listing.listingNumber} على منصة دلنّي`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white flex items-center justify-center transition-colors border border-emerald-200 shadow-2xs"
                title="مراسلة عبر واتساب"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            )}
            {listing.advertiser?.allowCall && listing.advertiser?.phone && (
              <a
                href={`tel:${listing.advertiser.phone}`}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-[#16324F] text-slate-700 hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                title="اتصال هاتفي مباشر"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
