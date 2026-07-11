// Remounts on every navigation — gives each page a soft rise-in.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-rise">{children}</div>;
}
