import { Link } from 'react-router';

export default function PagePlaceholder({ eyebrow, title, description }) {
  return (
    <section className="panel mx-auto max-w-2xl p-8 sm:p-12">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-4 max-w-lg leading-relaxed text-muted">{description}</p>
      <Link to="/" className="button-primary mt-8">Back to planning</Link>
    </section>
  );
}
