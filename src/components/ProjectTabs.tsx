"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "", label: "カンバン" },
  { href: "/gantt", label: "ガント" },
  { href: "/wbs", label: "WBS" },
  { href: "/milestones", label: "マイルストーン" },
  { href: "/settings", label: "設定" },
];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <nav className="mb-6 flex gap-1 border-b border-stone-200">
      {tabs.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.href}
            href={href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              active
                ? "border-amber-700 font-medium text-amber-800"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
