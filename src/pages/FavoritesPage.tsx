import React from 'react';
import { useApp } from '../context/AppContext';
import { Listing } from '../types';
import { ListingCard } from '../components/ListingCard';
import { Heart, Search, AlertCircle } from 'lucide-react';

interface FavoritesPageProps {
  onSelectListing: (listing: Listing) => void;
  onNavigateToSearch: () => void;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ onSelectListing, onNavigateToSearch }) => {
  const { listings, favorites } = useApp();

  const favoriteListings = listings.filter(l => favorites.includes(l.id));

  // Separate active available vs inactive/reserved listings in favorites
  const activeFavorites = favoriteListings.filter(l => l.status === 'published' && !l.isReserved);
  const inactiveFavorites = favoriteListings.filter(l => l.status !== 'published' || l.isReserved);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold mb-1 border border-rose-200">
            <Heart className="w-3.5 h-3.5 fill-current text-rose-600" />
            <span>قائمة العقارات المحفوظة في المفضلة</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#16324F]">عقاراتي المفضلة</h1>
          <p className="text-xs text-slate-500 mt-1">
            تابع أسعار وتحديثات العقارات التي قمت بحفظها أثناء التصفح والبحث
          </p>
        </div>

        <button
          onClick={onNavigateToSearch}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
        >
          تصفح المزيد من العقارات
        </button>
      </div>

      {favoriteListings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-400 mx-auto flex items-center justify-center">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700">لم تقم بحفظ أي عقارات في المفضلة بعد</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            اضغط على علامة القلب (المفضلة) على أي إعلان أثناء التصفح لحفظه والرجوع إليه بسرعة لاحقاً.
          </p>
          <button
            onClick={onNavigateToSearch}
            className="px-5 py-2.5 bg-[#12A889] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#0f8d73] transition-colors"
          >
            استكشاف العقارات الآن
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Published Favorites */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-[#16324F] flex items-center gap-2">
              <span>العقارات المتاحة والنشطة حالياً</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                {activeFavorites.length}
              </span>
            </h3>

            {activeFavorites.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500">
                لا توجد عقارات نشطة حالياً في مفضلتك.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeFavorites.map(listing => (
                  <ListingCard key={listing.id} listing={listing} onSelect={onSelectListing} />
                ))}
              </div>
            )}
          </div>

          {/* Inactive or Changed Status Favorites (As specified in requirement 7) */}
          {inactiveFavorites.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-[#16324F]">
                  عقارات تغيرت حالتها ولم تعد متاحة للعامة ({inactiveFavorites.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                تم حفظ هذه العقارات سابقاً، لكن حالتها تغيرت من قبل المعلن أو المشرف (مثل: موقوف مؤقتاً، أو قيد التعديل،
                أو ملغى)، ولذلك لا تظهر في نتائج البحث العامة.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {inactiveFavorites.map(listing => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onSelect={onSelectListing}
                    showStatusBadge={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
