import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark';
}

export const LogoIcon: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-xs shrink-0 ${className}`}>
      {/* 
        The Supabase image contains the logo icon in the top portion and "WEEL TECH" text at the bottom.
        We scale and position the image with object-top to focus exactly on the gorgeous blue organic icon symbol,
        excluding the text.
      */}
      <img 
        src="https://ytomhshtszrjhcvrqztv.supabase.co/storage/v1/object/public/images_systeme/Logo%20WEEL%20TECH.png" 
        alt="Weel-Tech Icon"
        referrerPolicy="no-referrer"
        className="w-[140%] h-[140%] max-w-none object-cover object-top -mt-[5%]"
      />
    </div>
  );
};

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  iconOnly = false, 
  size = 'md', 
  theme = 'light' 
}) => {
  const iconSizeClass = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  }[size];

  const textSizeClass = {
    sm: 'text-base tracking-normal',
    md: 'text-xl tracking-wide',
    lg: 'text-3xl tracking-wider'
  }[size];

  const textCol = theme === 'dark' ? 'text-white' : 'text-[#0e1e43]';

  // For large login pages, we display the complete, original stacked logo image
  if (size === 'lg' && !iconOnly) {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <img 
          src="https://ytomhshtszrjhcvrqztv.supabase.co/storage/v1/object/public/images_systeme/Logo%20WEEL%20TECH.png" 
          alt="Weel-Tech Logo"
          referrerPolicy="no-referrer"
          className="w-48 h-auto object-contain transition-transform duration-300 hover:scale-105"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoIcon className={iconSizeClass} />
      
      {!iconOnly && (
        <span className={`font-serif font-bold text-slate-950 uppercase select-none flex items-center ${textSizeClass} ${textCol}`}>
          {/* Custom vector 'W' with flourish curl, matching the original serif logo design in the image */}
          <span className="inline-flex items-center mr-0.5" style={{ height: '1em' }}>
            <svg viewBox="0 0 100 100" className="h-[1.1em] w-auto inline-block -mt-[0.08em]" fill="currentColor">
              <path d="M 15 15 C 10 15, 2 20, 2 30 C 2 40, 10 40, 15 40 C 22 40, 25 30, 25 22 L 40 85 L 58 22 L 72 85 L 90 15 C 80 15, 78 22, 75 22 L 65 70 L 53 15 C 45 15, 43 22, 40 22 L 30 70 L 22 22 C 22 18, 18 15, 15 15 Z" />
            </svg>
          </span>
          <span className="font-serif tracking-wide -ml-1">EEL TECH</span>
        </span>
      )}
    </div>
  );
};
