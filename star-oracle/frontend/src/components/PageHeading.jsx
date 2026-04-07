export function PageHeading({ title, subtitle }) {
  return (
    <header className="mb-6 md:mb-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-star-gold md:text-3xl">
        {title}
      </h1>
      {subtitle ? <p className="mt-1 max-w-2xl text-sm text-purple-200 md:text-base">{subtitle}</p> : null}
    </header>
  )
}
