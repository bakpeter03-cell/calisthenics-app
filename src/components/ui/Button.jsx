export function Button({ children, variant = "primary", className = "", ...props }) {
  const baseClasses = "px-6 py-2 rounded-xl text-center flex items-center justify-center";
  
  const variants = {
    primary: "bg-primary-container text-on-primary-container font-black uppercase tracking-wider shadow-[0_12px_32px_rgba(25,28,30,0.06)]",
    secondary: "bg-surface-container-high text-on-surface font-bold shadow-sm",
    ghost: "bg-transparent text-on-surface-variant hover:bg-surface-container-low font-bold border border-outline-variant/30",
    danger: "bg-surface-container-lowest text-error font-bold shadow-sm",
  };

  return (
    <button className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
