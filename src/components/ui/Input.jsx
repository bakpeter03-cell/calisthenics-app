export function Input({ label, error, className = "", containerClassName = "", onDecrement, onIncrement, ...props }) {
  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
          {label}
        </label>
      )}
      <div className="relative flex items-center group">
        {onDecrement && (
          <button
            type="button"
            onClick={onDecrement}
            className="absolute left-1 w-9 h-9 flex items-center justify-center bg-surface-container-high hover:bg-surface-variant rounded-lg font-black text-on-surface-variant hover:text-primary z-10"
          >
            -
          </button>
        )}
        <input
          className={`w-full bg-surface-container-low border-0 border-l-2 border-transparent focus:border-primary rounded-xl py-3 focus:ring-0 text-on-surface font-black ${onDecrement ? 'text-center px-12' : 'px-4'} ${error ? "border-error text-error" : ""} ${className}`}
          {...props}
        />
        {onIncrement && (
          <button
            type="button"
            onClick={onIncrement}
            className="absolute right-1 w-9 h-9 flex items-center justify-center bg-surface-container-high hover:bg-surface-variant rounded-lg font-black text-on-surface-variant hover:text-primary z-10"
          >
            +
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-error font-medium ml-1">{error}</p>}
    </div>
  );
}
