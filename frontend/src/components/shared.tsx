import type { ReactNode } from "react";

export function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <>
      {children} <span className="required-mark">*</span>
    </>
  );
}

export function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}

export function ActionList({ items, emptyMessage }: { items: string[]; emptyMessage: string }) {
  if (!items.length) {
    return <EmptyState title="All clear" message={emptyMessage} />;
  }

  return (
    <div className="action-list">
      {items.map((item) => (
        <div className="action-item" key={item}>
          {item}
        </div>
      ))}
    </div>
  );
}

export function LoadingWorkspace({ title, lines }: { title: string; lines: number }) {
  return (
    <main className="workspace">
      <section className="panel">
        <span className="eyebrow">ATTENDIFY</span>
        <h2>{title}</h2>
        <div className="loading-stack">
          {Array.from({ length: lines }, (_, index) => (
            <div className="loading-skeleton" key={index} />
          ))}
        </div>
      </section>
    </main>
  );
}
