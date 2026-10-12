interface CurrencyIconProps {
  size?: number;
  className?: string;
}

export default function CurrencyIcon({ size = 16, className = '' }: CurrencyIconProps) {
  return (
    <img
      src="/currency-vnc.png"
      alt="VNC"
      width={size}
      height={size}
      className={`inline-block align-middle shrink-0 select-none object-contain ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      loading="eager"
      draggable={false}
    />
  );
}
