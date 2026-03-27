export function Card({ children, className = "" }) {
  return (
    <div className={`bg-surface-container-lowest rounded-xl p-6 shadow-[0_12px_32px_rgba(25,28,30,0.06)] ${className}`}>
      {children}
    </div>
  );
}
