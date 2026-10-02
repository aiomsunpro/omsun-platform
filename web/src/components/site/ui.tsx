"use client";

// Small stand-ins for the shadcn/ui pieces the public website was built with,
// so the site needs no extra packages. Classes match the originals.
import { ChevronDown } from "lucide-react";
import {
  Children, cloneElement, createContext, isValidElement, useContext, useEffect, useState,
  type ButtonHTMLAttributes, type ComponentProps, type HTMLAttributes, type ReactElement, type ReactNode,
} from "react";

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const TEXT_SIZE = /^text-(xs|sm|base|lg|[2-9]?xl)$/;
const SHADOW_SIZE = /^shadow(-(sm|md|lg|xl|2xl|none))?$/;
const BORDER_WIDTH = /^border(-[0-8])?$/;
const PADDING = /^p([xytrbl])?-/;

// The class "group" a utility belongs to, so a later class can replace an
// earlier one (what tailwind-merge does for the original shadcn components).
function group(token: string): string | null {
  const i = token.lastIndexOf(":");
  const variant = token.slice(0, i + 1);
  const u = token.slice(i + 1);
  if (TEXT_SIZE.test(u)) return variant + "text-size";
  if (u.startsWith("text-")) return variant + "text-color";
  if (SHADOW_SIZE.test(u)) return variant + "shadow";
  if (BORDER_WIDTH.test(u)) return variant + "border-width";
  if (u.startsWith("border-")) return variant + "border-color";
  const pad = u.match(PADDING);
  if (pad) return variant + "p" + (pad[1] ?? "");
  const m = u.match(/^(bg|h|w|rounded)(-|$)/);
  return m ? variant + m[1] : null;
}

/** Base classes, minus any that `extra` overrides, followed by `extra`. */
function merge(base: string, extra?: string) {
  if (!extra) return base;
  const taken = new Set(extra.split(/\s+/).map(group).filter(Boolean) as string[]);
  const overridden = (g: string | null) => {
    if (!g) return false;
    if (taken.has(g)) return true;
    // p-8 replaces px-/py-/pt-… too; px-8 replaces pl-/pr-, py-8 replaces pt-/pb-.
    const v = g.slice(0, g.lastIndexOf(":") + 1);
    const k = g.slice(v.length);
    if (!k.startsWith("p")) return false;
    if (k.length > 1 && taken.has(v + "p")) return true;
    if ("lr".includes(k[1]) && taken.has(v + "px")) return true;
    if ("tb".includes(k[1]) && taken.has(v + "py")) return true;
    return false;
  };
  return cn(base.split(/\s+/).filter((t) => !overridden(group(t))).join(" "), extra);
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-site-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";
const BUTTON_VARIANT = {
  default: "bg-site-primary text-white shadow hover:bg-site-primary/90",
  outline: "border border-site-border bg-white shadow-sm hover:bg-site-accent",
};
const BUTTON_SIZE = { default: "h-9 px-4 py-2", lg: "h-10 rounded-md px-8" };

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: keyof typeof BUTTON_VARIANT;
  size?: keyof typeof BUTTON_SIZE;
};

export function Button({ asChild, variant = "default", size = "default", className, children, ...props }: ButtonProps) {
  const classes = merge(cn(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size]), className);
  if (asChild && isValidElement(children)) {
    const child = Children.only(children) as ReactElement<{ className?: string }>;
    return cloneElement(child, { className: merge(classes, child.props.className) });
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

const FIELD =
  "flex w-full rounded-md border border-site-border bg-transparent text-base shadow-sm placeholder:text-site-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-site-primary disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={merge(cn(FIELD, "h-9 px-3 py-1 transition-colors"), className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={merge(cn(FIELD, "min-h-[60px] px-3 py-2"), className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium leading-none", className)} {...props} />;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={merge("rounded-xl border border-site-border bg-white text-site-ink shadow", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={merge("p-6 pt-0", className)} {...props} />;
}

// Accordion: single item open at a time, click again to close.
const AccordionCtx = createContext<{ open: string | null; toggle: (v: string) => void }>({ open: null, toggle: () => {} });
const ItemCtx = createContext("");

export function Accordion({ className, children }: { type?: "single"; collapsible?: boolean; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <AccordionCtx.Provider value={{ open, toggle: (v) => setOpen((o) => (o === v ? null : v)) }}>
      <div className={className}>{children}</div>
    </AccordionCtx.Provider>
  );
}

export function AccordionItem({ value, className, children }: { value: string; className?: string; children: ReactNode }) {
  return (
    <ItemCtx.Provider value={value}>
      <div className={cn("border-b border-site-border", className)}>{children}</div>
    </ItemCtx.Provider>
  );
}

export function AccordionTrigger({ className, children }: { className?: string; children: ReactNode }) {
  const { open, toggle } = useContext(AccordionCtx);
  const value = useContext(ItemCtx);
  const isOpen = open === value;
  return (
    <h3 className="flex">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => toggle(value)}
        className={cn(
          "flex flex-1 cursor-pointer items-center justify-between py-4 text-left text-sm font-medium transition-all hover:underline",
          className,
        )}
      >
        {children}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-site-muted transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
    </h3>
  );
}

export function AccordionContent({ className, children }: { className?: string; children: ReactNode }) {
  const { open } = useContext(AccordionCtx);
  if (open !== useContext(ItemCtx)) return null;
  return (
    <div className="overflow-hidden text-sm">
      <div className={cn("pb-4 pt-0", className)}>{children}</div>
    </div>
  );
}

// Toasts: toast.success("…") / toast.error("…"), shown by <Toaster />.
type ToastItem = { id: number; kind: "success" | "error"; text: string };
let listeners: ((t: ToastItem) => void)[] = [];
let nextId = 1;
const push = (kind: ToastItem["kind"]) => (text: string) => listeners.forEach((l) => l({ id: nextId++, kind, text }));
export const toast = { success: push("success"), error: push("error") };

export function Toaster({ position = "top-center" }: { richColors?: boolean; position?: "top-center" }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const add = (t: ToastItem) => {
      setItems((s) => [...s, t]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), 4000);
    };
    listeners.push(add);
    return () => {
      listeners = listeners.filter((l) => l !== add);
    };
  }, []);
  return (
    <div
      aria-live="polite"
      className={cn("pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4", position === "top-center" && "top-4")}
    >
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "rounded-lg border px-4 py-3 text-sm font-medium shadow-lg",
            t.kind === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800",
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
