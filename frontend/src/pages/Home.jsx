export default function Home() {
  return (
    <section className="mx-auto max-w-3xl">
      <p className="eyebrow">Good days start close to home</p>
      <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
        Make a day of it.<br />
        <span className="text-brand">Together.</span>
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
        A first date, a family afternoon, or a little time for yourself.
        Find local places and community experiences that fit your day.
      </p>
      <div className="panel mt-10 p-6 sm:p-8">
        <p className="eyebrow">Plan your day</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">What would you like to do?</h2>
        <p className="mt-3 leading-relaxed text-muted">
          The planning form is coming next. You'll be able to choose your group,
          interests, time, and budget here.
        </p>
        <span className="mt-6 inline-flex rounded-full bg-brand-soft px-4 py-2 text-sm font-medium text-brand">
          Coming soon
        </span>
      </div>
    </section>
  );
}
