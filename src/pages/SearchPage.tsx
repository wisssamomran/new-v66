import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Listing, PropertyType, ListingPurpose, Currency } from '../types';
import { ListingCard } from '../components/ListingCard';
import { DalaniMap } from '../components/DalaniMap';
import { YEMEN_GOVERNORATES } from '../data/yemenData';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Compass,
  LayoutGrid,
  Map,
  X,
  RotateCcw,
  Sun,
  Layers,
  ArrowUpDown
} from 'lucide-react';

interface SearchPageProps {
  initialParams?: {
    purpose?: ListingPurpose;
    propertyType?: PropertyType;
    governorate?: string;
    keyword?: string;
  };
  onSelectListing: (listing: Listing) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ initialParams = {}, onSelectListing }) => {
  const { listings } = useApp();

  // Filters state
  const [keyword, setKeyword] = useState<string>(initialParams.keyword || '');
  const [governorate, setGovernorate] = useState<string>(initialParams.governorate || 'all');
  const [propertyType, setPropertyType] = useState<string>(initialParams.propertyType || 'all');
  const [purpose, setPurpose] = useState<string>(initialParams.purpose || 'all');
  const [currency, setCurrency] = useState<Currency | 'all'>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [hasSolarOnly, setHasSolarOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'area_desc'>('newest');

  // View Layout: split | grid | map
  const [viewLayout, setViewLayout] = useState<'split' | 'grid' | 'map'>('split');
  const [showFiltersDrawer, setShowFiltersDrawer] = useState<boolean>(false);

  // STRICT RULE: Only published active listings appear in public search!
  const filteredListings = useMemo(() => {
    return listings
      .filter(listing => {
        // Must be published and active, and not reserved (قاعدة حصرية العقار المحجوز)
        if (listing.status !== 'published' || listing.isReserved) return false;

        // Keyword filter
        if (keyword.trim()) {
          const q = keyword.toLowerCase().trim();
          const matchTitle = listing.title.toLowerCase().includes(q);
          const matchDesc = listing.description.toLowerCase().includes(q);
          const matchDistrict = listing.location.district.toLowerCase().includes(q);
          const matchCity = listing.location.city.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchDistrict && !matchCity) return false;
        }

        // Governorate filter
        if (governorate !== 'all' && listing.location.governorate !== governorate) {
          return false;
        }

        // Property type
        if (propertyType !== 'all' && listing.propertyType !== propertyType) {
          return false;
        }

        // Purpose
        if (purpose !== 'all' && listing.purpose !== purpose) {
          return false;
        }

        // Currency
        if (currency !== 'all' && listing.currency !== currency) {
          return false;
        }

        // Price min/max
        if (minPrice && listing.price < Number(minPrice)) {
          return false;
        }
        if (maxPrice && listing.price > Number(maxPrice)) {
          return false;
        }

        // Solar system filter
        if (hasSolarOnly && !listing.attributes.hasSolarSystem) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'price_asc') {
          return a.price - b.price;
        }
        if (sortBy === 'price_desc') {
          return b.price - a.price;
        }
        if (sortBy === 'area_desc') {
          return b.area - a.area;
        }
        return 0;
      });
  }, [listings, keyword, governorate, propertyType, purpose, currency, minPrice, maxPrice, hasSolarOnly, sortBy]);

  const handleResetFilters = () => {
    setKeyword('');
    setGovernorate('all');
    setPropertyType('all');
    setPurpose('all');
    setCurrency('all');
    setMinPrice('');
    setMaxPrice('');
    setHasSolarOnly(false);
    setSortBy('newest');
  };

  const hasActiveFilters =
    keyword ||
    governorate !== 'all' ||
    propertyType !== 'all' ||
    purpose !== 'all' ||
    currency !== 'all' ||
    minPrice ||
    maxPrice ||
    hasSolarOnly;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="ابحث بالحي، المدينة، أو الكلمات (مثال: شقة في حدة، أرض بيت بوس...)"
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs md:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#12A889]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Selectors & View Layout Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Purpose Selector */}
            <select
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="all">كل الأغراض</option>
              <option value="sale">للبيع</option>
              <option value="rent">للإيجار</option>
              <option value="investment">استثمار</option>
            </select>

            {/* Governorate Selector */}
            <select
              value={governorate}
              onChange={e => setGovernorate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="all">جميع المحافظات</option>
              {YEMEN_GOVERNORATES.map(gov => (
                <option key={gov.name} value={gov.name}>
                  {gov.name}
                </option>
              ))}
            </select>

            {/* Property Type Selector */}
            <select
              value={propertyType}
              onChange={e => setPropertyType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="all">كل الأنواع</option>
              <option value="apartment">شقة</option>
              <option value="villa">فيلا</option>
              <option value="land">أرض</option>
              <option value="building">عمارة</option>
              <option value="commercial">محل تجاري</option>
              <option value="office">مكتب</option>
            </select>

            {/* Filter Drawer Toggle Button */}
            <button
              onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                hasActiveFilters
                  ? 'bg-[#12A889]/10 text-[#12A889] border-[#12A889]'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>فلاتر تفصيلية</span>
            </button>

            {/* View Mode (Split, Grid, Map) */}
            <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 hidden sm:flex items-center">
              <button
                onClick={() => setViewLayout('split')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                  viewLayout === 'split' ? 'bg-[#16324F] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="عرض مقسم: قائمة وخريطة"
              >
                <div className="flex items-center gap-1 px-1">
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>+</span>
                  <Map className="w-3.5 h-3.5" />
                </div>
              </button>
              <button
                onClick={() => setViewLayout('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                  viewLayout === 'grid' ? 'bg-[#16324F] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="شبكة العقارات فقط"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewLayout('map')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                  viewLayout === 'map' ? 'bg-[#16324F] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="الخريطة الكاملة"
              >
                <Map className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Filters Drawer */}
        {showFiltersDrawer && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-in slide-in-from-top-2 duration-150">
            <div>
              <label className="block font-bold text-slate-700 mb-1">العملة:</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="all">كل العملات (YER / USD / SAR)</option>
                <option value="USD">دولار أمريكي ($ USD)</option>
                <option value="YER">ريال يمني (YER)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">السعر (من - إلى):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  placeholder="الحد الأدنى"
                  className="w-1/2 px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
                <input
                  type="number"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  placeholder="الحد الأقصى"
                  className="w-1/2 px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ترتيب النتائج:</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
              >
                <option value="newest">الأحدث نشرًا</option>
                <option value="price_asc">السعر: من الأقل للأعلى</option>
                <option value="price_desc">السعر: من الأعلى للأقل</option>
                <option value="area_desc">المساحة: من الأكبر للأصغر</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasSolarOnly}
                  onChange={e => setHasSolarOnly(e.target.checked)}
                  className="w-4 h-4 text-[#12A889] rounded border-slate-300 focus:ring-[#12A889]"
                />
                <span className="font-bold text-amber-700 flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5" /> مزود بمنظومة طاقة شمسية
                </span>
              </label>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="text-slate-500 hover:text-rose-600 font-bold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>تفريغ الفلاتر</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-slate-800 text-sm md:text-base">
            النتائج المعروضة: <span className="text-[#12A889] font-black">{filteredListings.length}</span> عقاراً نشطاً
          </h2>
          {governorate !== 'all' && (
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
              في {governorate}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Layout based on viewLayout */}
      {filteredListings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700">لم يتم العثور على عقارات مطابقة لمعايير البحث الحالية</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            جرّب توسيع نطاق السعر، أو اختيار محافظة أخرى، أو تفريغ الفلاتر لاستعراض جميع العقارات المنشورة.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 bg-[#16324F] text-white text-xs font-bold rounded-xl hover:bg-[#12A889] transition-colors"
          >
            إعادة تعيين خيارات البحث
          </button>
        </div>
      ) : viewLayout === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Listings Column (Left/Right depending on RTL) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredListings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onSelect={onSelectListing}
              />
            ))}
          </div>

          {/* Sticky Interactive Map Column */}
          <div className="lg:col-span-5 sticky top-24">
            <DalaniMap
              listings={filteredListings}
              onSelectListing={onSelectListing}
              height="620px"
            />
          </div>
        </div>
      ) : viewLayout === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onSelect={onSelectListing}
            />
          ))}
        </div>
      ) : (
        /* Fullscreen Map */
        <div className="w-full">
          <DalaniMap
            listings={filteredListings}
            onSelectListing={onSelectListing}
            height="700px"
          />
        </div>
      )}
    </div>
  );
};
