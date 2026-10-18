/**
 * Re-mounted on every navigation between auth pages, so
 * each form eases in.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out motion-reduce:animate-none">
      {children}
    </div>
  );
}
