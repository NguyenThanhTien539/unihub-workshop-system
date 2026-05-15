"use client";

import Link from "next/link";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  className?: string;
  children: React.ReactNode;
};

export default function Button({ href, children, className = "", ...props }: ButtonProps) {
  const base = "block rounded-lg bg-slate-900 py-2 text-center text-sm font-semibold text-white hover:bg-black";
  const combined = `${base} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={combined}>
        {children}
      </Link>
    );
  }

  return (
    <button {...props} className={combined}>
      {children}
    </button>
  );
}
