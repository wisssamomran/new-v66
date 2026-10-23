import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PropertyType, ListingPurpose, Currency, AreaUnit, PrivateDocument } from '../types';
import { YEMEN_GOVERNORATES } from '../data/yemenData';
import { DalaniMap } from '../components/DalaniMap';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Home,
  Building,
  Layers,
  Store,
  Briefcase,
  MapPin,
  FileText,
  DollarSign,
  Sun,
  ShieldCheck,
  Eye,
  Send,
  Save,
  AlertCircle
} from 'lucide-react';

interface AdWizardPageProps {
  onFinish: (listingId: string) => void;
  onCancel: () => void;
}

export const AdWizardPage: React.FC<AdWizardPageProps> = ({ onFinish, onCancel }) => {
  const { currentUser, createListing, showToast } = useApp();

  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment');
  const [purpose, setPurpose] = useState<ListingPurpose>('sale');

  // Location
  const [governorate, setGovernorate] = useState(YEMEN_GOVERNORATES[0].name);
  const [city, setCity] = useState(YEMEN_GOVERNORATES[0].cities[0].name);
  const [district, setDistrict] = useState(YEMEN_GOVERNORATES[0].cities[0].districts[0]);
  const [street, setStreet] = useState('');
  const [lat, setLat] = useState(YEMEN_GOVERNORATES[0].lat);
  const [lng, setLng] = useState(YEMEN_GOVERNORATES[0].lng);
  const [isApproximate, setIsApproximate] = useState(false);

  // Basic Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Attributes
  const [area, setArea] = useState<number>(120);
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('م²');
  const [rooms, setRooms] = useState<number>(3);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [livingRooms, setLivingRooms] = useState<number>(1);
  const [floorNumber, setFloorNumber] = useState<number>(2);
  const [totalFloors, setTotalFloors] = useState<number>(4);
  const [streetWidthMeters, setStreetWidthMeters] = useState<number>(14);
  const [streetDirection, setStreetDirection] = useState<'شمالي' | 'جنوبي' | 'شرقي' | 'غربي' | 'رأسي على شارعين'>('شمالي');

  // Facilities & Solar
  const [hasSolarSystem, setHasSolarSystem] = useState<boolean>(true);
  const [hasWaterNetwork, setHasWaterNetwork] = useState<boolean>(true);
  const [hasElectricity, setHasElectricity] = useState<boolean>(true);
  const [hasElevator, setHasElevator] = useState<boolean>(false);
  const [isFurnished, setIsFurnished] = useState<boolean>(false);

  // Pricing
  const [price, setPrice] = useState<number>(45000);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [isNegotiable, setIsNegotiable] = useState<boolean>(true);

  // Images (URLs)
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80'
  ]);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Contact & Advertiser Info
  const [advertiserName, setAdvertiserName] = useState(currentUser.name || 'المعلن');
  const [advertiserPhone, setAdvertiserPhone] = useState(currentUser.phone || '777000000');
  const [allowWhatsapp, setAllowWhatsapp] = useState(true);
  const [allowCall, setAllowCall] = useState(true);

  // Verification Documents (Private)
  const [privateDocs, setPrivateDocs] = useState<PrivateDocument[]>([]);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<PrivateDocument['type']>('ownership');

  // Handle Governorate change to auto-update cities & districts
  const handleGovernorateChange = (govName: string) => {
    setGovernorate(govName);
    const govObj = YEMEN_GOVERNORATES.find(g => g.name === govName);
    if (govObj) {
      setCity(govObj.cities[0].name);
      setDistrict(govObj.cities[0].districts[0]);
      setLat(govObj.lat);
      setLng(govObj.lng);
    }
  };

  const handleAddImage = () => {
    if (imageUrlInput.trim()) {
      setImages(prev => [...prev, imageUrlInput.trim()]);
      setImageUrlInput('');
      showToast('تمت إضافة رابط الصورة', 'info');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddDoc = () => {
    if (!docTitle.trim()) return;
    const newDoc: PrivateDocument = {
      id: 'doc-' + Date.now(),
      title: docTitle.trim(),
      type: docType,
      url: '/private-vault/sample-doc.pdf',
      uploadedAt: new Date().toISOString().split('T')[0],
      sizeMb: 1.5
    };
    setPrivateDocs(prev => [...prev, newDoc]);
    setDocTitle('');
    showToast('تم إرفاق المستند في الخزانة الخاصة بالمشرفين', 'success');
  };

  const handleSubmit = async (asDraft: boolean = false) => {
    if (!title.trim() || !description.trim() || price <= 0) {
      showToast('يرجى ملء عنوان الإعلان ووصفه وتحديد السعر بشكل سليم', 'error');
      return;
    }

    if (!lat || !lng || lat < 11 || lat > 20 || lng < 41 || lng > 55) {
      showToast('يرجى تحديد موقع جغرافي صحيح للعقار ضمن الجمهورية اليمنية', 'error');
      return;
    }

    const created = await createListing({
      title: title.trim(),
      description: description.trim(),
      propertyType,
      purpose,
      status: asDraft ? 'draft' : 'under_review',
      price: Number(price),
      currency,
      isNegotiable,
      area: Number(area),
      areaUnit,
      location: {
        governorate,
        city,
        district,
        street: street.trim() || undefined,
        lat: Number(lat),
        lng: Number(lng),
        isApproximate
      },
      attributes: {
        rooms: propertyType !== 'land' ? Number(rooms) : undefined,
        bathrooms: propertyType !== 'land' ? Number(bathrooms) : undefined,
        livingRooms: propertyType !== 'land' ? Number(livingRooms) : undefined,
        floorNumber: ['apartment', 'office'].includes(propertyType) ? Number(floorNumber) : undefined,
        totalFloors: ['building', 'villa'].includes(propertyType) ? Number(totalFloors) : undefined,
        streetWidthMeters: Number(streetWidthMeters),
        streetDirection,
        hasSolarSystem,
        hasWaterNetwork,
        hasElectricity,
        hasElevator: ['apartment', 'building', 'office'].includes(propertyType) ? hasElevator : undefined,
        isFurnished: ['apartment', 'villa'].includes(propertyType) ? isFurnished : undefined,
        zoningType: propertyType === 'commercial' ? 'تجاري' : 'سكني'
      },
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'],
      privateDocuments: privateDocs,
      advertiser: {
        id: currentUser.id,
        name: advertiserName,
        type: currentUser.role === 'org_manager' || currentUser.role === 'org_agent' ? 'organization' : 'individual',
        phone: advertiserPhone,
        phoneVerified: true,
        allowWhatsapp,
        allowCall,
        orgId: currentUser.orgId,
        orgName: currentUser.orgName
      },
      verificationBadges: [
        {
          type: 'phone_verified',
          label: 'هاتف المعلن مؤكد',
          description: 'تم تثبيت وتأكيد رقم التواصل الخاص بالمعلن.',
          verifiedAt: new Date().toISOString().split('T')[0],
          verifiedBy: 'نظام دلنّي',
          validityNote: 'سارٍ',
          disclaimer: 'تأكيد الهاتف هو وسيلة اتصال فقط ولا يعني التحقق من ملكية العقار.'
        }
      ]
    });

    if (created) {
      onFinish(created.id);
    }
  };

  const stepsList = [
    { num: 1, title: 'نوع العقار والغرض' },
    { num: 2, title: 'الموقع في اليمن' },
    { num: 3, title: 'المواصفات والخدمات' },
    { num: 4, title: 'السعر والصور' },
    { num: 5, title: 'التواصل والتحقق' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#16324F]">معالج إضافة إعلان عقاري جديد</h1>
          <p className="text-xs text-slate-500 mt-1">
            خطوات مخصصة للسوق اليمني، تحفظ مسودتك وتُرسل الإعلان للتدقيق والمراجعة دون رسوم ترويج وهمية
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
        >
          إلغاء والعودة
        </button>
      </div>

      {/* Progress Steps Header */}
      <div className="grid grid-cols-5 gap-2">
        {stepsList.map(step => {
          const isActive = currentStep === step.num;
          const isPassed = currentStep > step.num;
          return (
            <div
              key={step.num}
              onClick={() => setCurrentStep(step.num)}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#16324F] text-white border-[#16324F] shadow-sm'
                  : isPassed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              <div className="text-[11px] font-bold">الخطوة {step.num}</div>
              <div className="text-xs font-black truncate">{step.title}</div>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {/* STEP 1: Type & Purpose */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="font-bold text-base text-[#16324F] mb-1">حدد نوع العقار المراد الإعلان عنه:</h3>
              <p className="text-xs text-slate-500 mb-4">ستتغير الخصائص والمواصفات لاحقاً بناءً على اختيارك</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { type: 'apartment', label: 'شقة سكنية', icon: <Home className="w-5 h-5" /> },
                  { type: 'villa', label: 'فيلا فاخرة', icon: <Building className="w-5 h-5" /> },
                  { type: 'land', label: 'أرض / لبن', icon: <Layers className="w-5 h-5" /> },
                  { type: 'building', label: 'عمارة سكنية/تجارية', icon: <Building className="w-5 h-5" /> },
                  { type: 'commercial', label: 'محل / معرض', icon: <Store className="w-5 h-5" /> },
                  { type: 'office', label: 'مكتب تجاري', icon: <Briefcase className="w-5 h-5" /> }
                ].map(item => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      setPropertyType(item.type as PropertyType);
                      // Auto-switch unit for land to Libnah
                      if (item.type === 'land') setAreaUnit('لبنة عشاري');
                      else setAreaUnit('م²');
                    }}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      propertyType === item.type
                        ? 'border-[#12A889] bg-[#12A889]/10 text-[#16324F] font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className={propertyType === item.type ? 'text-[#12A889]' : 'text-slate-500'}>
                      {item.icon}
                    </div>
                    <span className="text-xs md:text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-base text-[#16324F] mb-3">ما هو غرض الإعلان؟</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { p: 'sale', label: 'للبيع' },
                  { p: 'rent', label: 'للإيجار' },
                  { p: 'investment', label: 'فرصة استثمارية' }
                ].map(item => (
                  <button
                    key={item.p}
                    type="button"
                    onClick={() => setPurpose(item.p as ListingPurpose)}
                    className={`py-3 rounded-xl border-2 text-xs md:text-sm font-bold transition-all ${
                      purpose === item.p
                        ? 'border-[#16324F] bg-[#16324F] text-white shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Location */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="font-bold text-base text-[#16324F] mb-1">حدد موقع العقار بدقة في اليمن:</h3>
              <p className="text-xs text-slate-500">
                يمكنك النقر المباشر على الخريطة لتثبيت العلامة أو سحبها، أو اختيار المحافظة والمدينة للتركيز التلقائي.
              </p>
            </div>

            {/* Interactive Leaflet/Google Hybrid Map for Pin Placement */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
              <DalaniMap
                showFilters={false}
                height="320px"
                enableLocationPicker={true}
                selectedCoords={{ lat, lng }}
                selectedGovernorate={governorate}
                onLocationSelected={coords => {
                  setLat(coords.lat);
                  setLng(coords.lng);
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">المحافظة:</label>
                <select
                  value={governorate}
                  onChange={e => handleGovernorateChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#12A889]"
                >
                  {YEMEN_GOVERNORATES.map(gov => (
                    <option key={gov.name} value={gov.name}>
                      {gov.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المدينة:</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#12A889]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الحي / المنطقة:</label>
                <input
                  type="text"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  placeholder="مثال: حدة، خورمكسر، بيت بوس..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#12A889]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشارع أو المعلم القريب (اختياري):</label>
              <input
                type="text"
                value={street}
                onChange={e => setStreet(e.target.value)}
                placeholder="مثال: شارع الخمسين أمام فندق..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#12A889]"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#16324F]">إحداثيات الخريطة (GPS):</span>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={isApproximate}
                    onChange={e => setIsApproximate(e.target.checked)}
                    className="w-4 h-4 text-[#12A889] rounded"
                  />
                  <span>عرض موقع تقريبي للعامة لحماية الخصوصية</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <label className="block text-slate-500 mb-1">خط العرض (Latitude):</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={e => setLat(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">خط الطول (Longitude):</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={e => setLng(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Attributes & Facilities */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الإعلان العقاري:</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: فيلا سوبر ديلوكس دورين في حدة حوش ومسبح..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs md:text-sm font-bold focus:ring-2 focus:ring-[#12A889]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الوصف التفصيلي للعقار:</label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="اكتب وصفاً شاملاً للموقع، المميزات، التراخيص، والخدمات المتاحة..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#12A889]"
              />
            </div>

            {/* Dynamic Attributes based on property type */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-4 border-t border-slate-100">
              <div>
                <label className="block font-bold text-slate-700 mb-1">المساحة:</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={area}
                    onChange={e => setArea(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                  <select
                    value={areaUnit}
                    onChange={e => setAreaUnit(e.target.value as any)}
                    className="px-2 py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="م²">م²</option>
                    <option value="لبنة عشاري">لبنة</option>
                    <option value="قصبة">قصبة</option>
                  </select>
                </div>
              </div>

              {propertyType !== 'land' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">عدد الغرف:</label>
                    <input
                      type="number"
                      value={rooms}
                      onChange={e => setRooms(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">دورات المياه:</label>
                    <input
                      type="number"
                      value={bathrooms}
                      onChange={e => setBathrooms(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">عرض الشارع (متر):</label>
                <input
                  type="number"
                  value={streetWidthMeters}
                  onChange={e => setStreetWidthMeters(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            {/* Yemeni Facilities & Solar checkboxes */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
              <span className="font-bold text-[#16324F] block">الخدمات الأساسية والمنظومات:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasSolarSystem}
                    onChange={e => setHasSolarSystem(e.target.checked)}
                    className="w-4 h-4 text-[#12A889] rounded"
                  />
                  <span className="text-amber-700 font-bold">منظومة طاقة شمسية كاملة</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasWaterNetwork}
                    onChange={e => setHasWaterNetwork(e.target.checked)}
                    className="w-4 h-4 text-[#12A889] rounded"
                  />
                  <span>شبكة مياه / خزان أرضي</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasElectricity}
                    onChange={e => setHasElectricity(e.target.checked)}
                    className="w-4 h-4 text-[#12A889] rounded"
                  />
                  <span>شبكة كهرباء عمومية/تجارية</span>
                </label>
                {['apartment', 'building'].includes(propertyType) && (
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={hasElevator}
                      onChange={e => setHasElevator(e.target.checked)}
                      className="w-4 h-4 text-[#12A889] rounded"
                    />
                    <span>يوجد مصعد كهربائي</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Price & Images */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Price & Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">السعر المطلوب:</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(Number(e.target.value))}
                  placeholder="المبلغ بالأرقام"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-[#12A889]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">العملة:</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="USD">دولار أمريكي ($ USD)</option>
                  <option value="YER">ريال يمني (YER)</option>
                  <option value="SAR">ريال سعودي (SAR)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={isNegotiable}
                onChange={e => setIsNegotiable(e.target.checked)}
                className="w-4 h-4 text-[#12A889] rounded"
              />
              <span>السعر قابل للتفاوض في حدود المعقول</span>
            </label>

            {/* Images */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-700">معرض صور العقار (روابط مباشرة):</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={e => setImageUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="px-4 py-2 bg-[#16324F] hover:bg-[#12A889] text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
                >
                  إضافة صورة
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((img, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden h-24 border border-slate-200 group">
                    <img src={img} alt={`عقار ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute top-1 left-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-90 hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Contact & Verification Docs */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Contact details */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-sm text-[#16324F]">بيانات التواصل التي ستظهر للمشترين المصرح لهم:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم المعلن / المكتب:</label>
                  <input
                    type="text"
                    value={advertiserName}
                    onChange={e => setAdvertiserName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الهاتف للتواصل:</label>
                  <input
                    type="text"
                    value={advertiserPhone}
                    onChange={e => setAdvertiserPhone(e.target.value)}
                    dir="ltr"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-left font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-800">
                  <input
                    type="checkbox"
                    checked={allowWhatsapp}
                    onChange={e => setAllowWhatsapp(e.target.checked)}
                    className="w-4 h-4 text-[#12A889] rounded"
                  />
                  <span>تفعيل التواصل عبر واتساب</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={allowCall}
                    onChange={e => setAllowCall(e.target.checked)}
                    className="w-4 h-4 text-[#12A889] rounded"
                  />
                  <span>تفعيل الاتصال الهاتفي المباشر</span>
                </label>
              </div>
            </div>

            {/* Private Verification Docs (Private Vault) */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>إرفاق وثائق التحقق الخاصة (اختياري - سرية تامة):</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                يمكنك إرفاق صورة البصيرة الشرعية أو الهوية. تُحفظ هذه الملفات في خزانة خاصة ولا تظهر للعامة أبداً؛ بل يطّلع
                عليها مسؤول التحقق حصراً لمنحك شارة «وثيقة البصيرة راجعها الفريق».
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <input
                  type="text"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  placeholder="عنوان الوثيقة (بصيرة، وكالة...)"
                  className="px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-xl"
                >
                  <option value="ownership">بصيرة شرعية / عقد ملكية</option>
                  <option value="identity">بطاقة شخصية / جواز سفر</option>
                  <option value="authorization">وكالة شرعية معتمدة</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddDoc}
                  className="px-4 py-2 bg-[#12A889] hover:bg-[#0f8d73] text-white font-bold rounded-xl transition-colors"
                >
                  إرفاق للخزانة الخاصة
                </button>
              </div>

              {privateDocs.length > 0 && (
                <div className="pt-2 space-y-1">
                  {privateDocs.map(doc => (
                    <div key={doc.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-slate-800">🔒 {doc.title} ({doc.type})</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">محمية وسرية</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submission Notice */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">سياسة النشر في دلنّي: </span>
                عند الإرسال، سينتقل الإعلان إلى حالة <strong>«قيد المراجعة»</strong> لتدقيق الصور والموقع والسعر من قبل
                المشرف، ولن يظهر للعامة إلا بعد اعتماده رسمياً.
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                <span>الخطوة السابقة</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-6 py-2.5 bg-[#16324F] hover:bg-[#12A889] text-white text-xs md:text-sm font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                <span>متابعة</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4 text-slate-500" />
                  <span>حفظ كمسودة</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  className="px-6 py-2.5 bg-[#12A889] hover:bg-[#0f8d73] text-white text-xs md:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال الإعلان للمراجعة</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
