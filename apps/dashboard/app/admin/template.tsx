/**
 * Re-mounted on every navigation inside this layout (unlike layout.tsx), so
 * each page eases in while the header and sidebar stay put.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 flex min-h-0 flex-1 flex-col duration-300 ease-out motion-reduce:animate-none">
      {children}
    </div>
  );
}
