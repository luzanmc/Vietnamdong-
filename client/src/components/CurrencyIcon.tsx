interface CurrencyIconProps {
  size?: number;
  className?: string;
}

export default function CurrencyIcon({ size = 16, className = '' }: CurrencyIconProps) {
  return (
    <img
      src="/currency-vnc.png"
      alt="VDX"
      width={size}
      height={size}
      className={`inline-block align-middle ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
