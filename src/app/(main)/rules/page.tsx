"use client";

import { useEffect, useRef, useState } from "react";

import { RulesCoreSections } from "./_components/rules-core-sections";
import { RulesExtendedSections } from "./_components/rules-extended-sections";

const sections = [
  { id: "overview", label: "Tổng quan hệ thống" },
  { id: "modules", label: "Cấu trúc module" },
  { id: "principles", label: "Nguyên tắc sử dụng" },
  { id: "dashboards", label: "Dashboard & báo cáo" },
  { id: "eac-data", label: "Dữ liệu EAC" },
  { id: "srx-admin", label: "Quản trị Website SRX" },
  { id: "sync", label: "Đồng bộ & đối soát" },
  { id: "permissions", label: "Phân quyền & trách nhiệm" },
  { id: "security", label: "Bảo mật & nhật ký" },
  { id: "faq", label: "Câu hỏi thường gặp" },
];

export default function Page() {
  const [active, setActive] = useState("overview");
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );

    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) {
        observer.current.observe(element);
      }
    }

    return () => observer.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-[1500px] px-10 py-12">
      <header className="mb-16 space-y-4 text-center">
        <p className="text-primary text-sm font-semibold tracking-[0.24em] uppercase">Studio CRM v2.0</p>
        <h1 className="text-4xl font-bold uppercase">Quy tắc & Hướng dẫn sử dụng</h1>
        <p className="text-muted-foreground mx-auto max-w-4xl">
          Tài liệu này mô tả phạm vi sử dụng, nguyên tắc vận hành và cách khai thác phiên bản CRM hiện tại của EAC, bao
          gồm dữ liệu kinh doanh nội bộ và khối quản trị Website SRX Việt Nam trên cùng một hệ thống.
        </p>
      </header>

      <div className="flex gap-12">
        <aside className="sticky top-20 h-fit w-[300px] shrink-0 space-y-6">
          <div className="rounded-xl border p-5">
            <h3 className="mb-3 font-semibold">Nội dung</h3>
            <ul className="space-y-1 text-sm">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => scrollTo(section.id)}
                    className={`w-full rounded-md px-3 py-2 text-left transition ${
                      active === section.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {section.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 rounded-xl border p-5 text-sm">
            <div>
              <b>Hệ thống:</b> Studio CRM
            </div>
            <div>
              <b>Khách hàng:</b> EAC
            </div>
            <div>
              <b>Cập nhật:</b> 04.05.2026
            </div>
            <div>
              <b>Phiên bản:</b> v2.0
            </div>
          </div>
        </aside>

        <main className="flex-1 space-y-28">
          <RulesCoreSections />
          <RulesExtendedSections />
        </main>
      </div>
    </div>
  );
}
