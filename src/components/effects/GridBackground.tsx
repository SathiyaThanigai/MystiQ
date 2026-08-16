export default function GridBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100" />
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#0a0a0c_70%)]" />
      {/* Top-left red volumetric glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-mystiq-crimson/5 rounded-full blur-[120px]" />
      {/* Bottom-right subtle glow */}
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-mystiq-crimson/3 rounded-full blur-[150px]" />
    </div>
  )
}
