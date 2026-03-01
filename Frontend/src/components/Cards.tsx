import { ReactNode } from "react";

export const MetricCard = ({
  value,
  label,
  sublabel,
  highlight = false,
}: {
  value: string;
  label: string;
  sublabel?: string;
  highlight?: boolean;
}) => (
  <div
    className={`p-6 rounded-sm transition-all duration-200 ${highlight ? "glass-card-gold hover:border-gold/25" : "glass-card hover:border-border"} hover:shadow-lg hover:shadow-black/10`}
  >
    <p className={`font-serif text-3xl md:text-4xl font-bold mb-2 stat-glow ${highlight ? "gold-text" : "text-foreground"}`}>
      {value}
    </p>
    <p className="text-sm text-foreground/60 font-medium">{label}</p>
    {sublabel && (
      <p className="font-mono text-[10px] text-foreground/30 mt-1 tracking-wider">{sublabel}</p>
    )}
  </div>
);

export const InsightRow = ({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) => (
  <div className="flex gap-6 py-6 border-b border-border/40 group transition-colors hover:border-gold/20">
    <span className="font-serif text-2xl text-gold/20 font-bold shrink-0 group-hover:text-gold/50 transition-colors">
      {number}
    </span>
    <div>
      <h4 className="font-sans text-base font-semibold mb-1 text-foreground/90">{title}</h4>
      <p className="text-sm text-foreground/45 leading-relaxed">{description}</p>
    </div>
  </div>
);

export const DataPanel = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="glass-card rounded-sm overflow-hidden transition-shadow duration-200 hover:shadow-lg hover:shadow-black/10">
    <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3 bg-muted/20">
      <div className="w-1.5 h-1.5 rounded-full bg-gold/60 shrink-0" />
      <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-foreground/50">
        {title}
      </p>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

export const AlertBanner = ({
  type,
  title,
  description,
}: {
  type: "shock" | "directive";
  title: string;
  description: string;
}) => {
  const isShock = type === "shock";
  return (
    <div
      className={`rounded-sm p-6 md:p-8 border-l-2 ${
        isShock
          ? "bg-destructive/5 border-l-destructive/60"
          : "bg-gold/5 border-l-gold/60"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-2 h-2 rounded-full ${isShock ? "bg-destructive" : "bg-gold"}`} />
        <h4 className={`font-serif text-lg font-semibold ${isShock ? "text-destructive" : "text-gold"}`}>
          {title}
        </h4>
      </div>
      <p className="text-sm text-foreground/45 leading-relaxed ml-5">{description}</p>
    </div>
  );
};

export const ComparisonTable = ({
  rows,
}: {
  rows: { metric: string; before: string; after: string; delta: string; positive?: boolean }[];
}) => (
  <div className="glass-card rounded-sm overflow-hidden">
    <table className="w-full">
      <thead>
        <tr className="border-b border-border/40">
          <th className="text-left px-6 py-3 font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/30">
            Metric
          </th>
          <th className="text-right px-6 py-3 font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/30">
            Pre-Shock
          </th>
          <th className="text-right px-6 py-3 font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/30">
            Post-Shock
          </th>
          <th className="text-right px-6 py-3 font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/30">
            Delta
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-gold/[0.02] transition-colors">
            <td className="px-6 py-4 text-sm text-foreground/70 font-medium">{row.metric}</td>
            <td className="px-6 py-4 text-right font-mono text-sm text-foreground/50">{row.before}</td>
            <td className="px-6 py-4 text-right font-mono text-sm text-foreground/70">{row.after}</td>
            <td className={`px-6 py-4 text-right font-mono text-sm font-medium ${row.positive ? "text-green-400" : "text-destructive/80"}`}>
              {row.delta}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
