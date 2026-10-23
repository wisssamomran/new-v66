import React from 'react';

interface DalaniLogoProps {
  variant?: 'full' | 'icon' | 'horizontal';
  theme?: 'dark' | 'light' | 'white';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const DalaniLogo: React.FC<DalaniLogoProps> = ({
  variant = 'horizontal',
  theme = 'light',
  className = '',
  size = 'md'
}) => {
  // Brand colors
  const navyColor = theme === 'white' ? '#FFFFFF' : '#16324F';
  const tealColor = '#12A889';
  const textColor = theme === 'white' ? '#FFFFFF' : theme === 'dark' ? '#F8FAFC' : '#16324F';

  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
    xl: 'h-20'
  };

  const iconSizes = {
    sm: 30,
    md: 40,
    lg: 56,
    xl: 76
  };

  const currentIconSize = iconSizes[size];

  // SVG of the official Dalani icon matching the uploaded logo (Stylized 'D' + Roof Gable + Twin Towers + Curving Emerald Road + Geolocation Pin)
  const IconSVG = (
    <svg
      width={currentIconSize}
      height={currentIconSize}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 transition-transform duration-300 hover:scale-105 drop-shadow-xs"
    >
      {/* 1. Outer Dark Navy 'D' Frame with Top Roof Peak and Sweeping Loop */}
      <path
        d="M 24 162 L 24 72 L 95 14 L 140 44 C 172 70 192 100 192 130 C 192 165 166 186 112 186 C 142 180 170 156 170 128 C 170 102 152 76 128 58 L 95 34 L 44 74 L 44 156 Z"
        fill={navyColor}
      />

      {/* 2. Inner Navy Roof Beam (Gable contour framing the towers) */}
      <path
        d="M 52 76 L 88 46 L 134 78 L 124 86 L 88 56 L 60 84 Z"
        fill={navyColor}
      />

      {/* 3. Left Skyscraper Tower (Medium height with angled slope top) */}
      <polygon
        points="63,90 81,78 81,146 63,146"
        fill={navyColor}
      />

      {/* 4. Right Skyscraper Tower (Taller architectural tower) */}
      <polygon
        points="88,64 108,78 108,136 88,136"
        fill={navyColor}
      />

      {/* 5. Bottom-Right Navy Crescent (Loop of the capital 'D' sweeping underneath) */}
      <path
        d="M 108 186 C 146 186 182 162 186 124 C 188 100 174 74 152 56 C 170 76 174 102 172 124 C 168 152 140 176 108 186 Z"
        fill={navyColor}
      />

      {/* 6. Emerald Green Curving Highway / Pathway (Guiding to the location) */}
      <path
        d="M 40 186 C 65 182 86 168 110 150 C 130 136 141 125 144 122 C 137 127 120 144 96 162 C 73 178 56 184 40 186 Z"
        fill={tealColor}
      />

      {/* 7. Emerald Green Geolocation Pin Marker at Pathway Destination */}
      <path
        d="M 144 97 C 138.5 97 134 101.5 134 107 C 134 113.5 141.5 122 144 125 C 146.5 122 154 113.5 154 107 C 154 101.5 149.5 97 144 97 Z"
        fill={tealColor}
      />
      {/* Pin Inner Eye */}
      <circle cx="144" cy="107" r="3.2" fill={theme === 'dark' ? '#0F172A' : theme === 'white' ? navyColor : '#FFFFFF'} />
    </svg>
  );

  // If icon-only
  if (variant === 'icon') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{IconSVG}</div>;
  }

  // Horizontal or Full Logo with Arabic Wordmark «دلنّي»
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {IconSVG}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span
            className="font-black tracking-tight leading-none"
            style={{
              color: textColor,
              fontSize: size === 'sm' ? '1.35rem' : size === 'md' ? '1.75rem' : size === 'lg' ? '2.4rem' : '3.2rem',
              fontFamily: "'Tajawal', sans-serif"
            }}
          >
            دلنّـي
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] md:text-xs font-bold text-white bg-[#12A889] shadow-xs"
          >
            اليمن
          </span>
        </div>
        {variant === 'full' && (
          <span
            className="text-[10px] md:text-xs font-medium tracking-wide mt-0.5"
            style={{ color: theme === 'white' ? 'rgba(255,255,255,0.85)' : '#64748b' }}
          >
            المنصة العقارية اليمنية المعتمدة
          </span>
        )}
      </div>
    </div>
  );
};
