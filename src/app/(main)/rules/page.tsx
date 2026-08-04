"use client";

import { useEffect, useRef, useState } from "react";

import { BookOpen, Compass, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { RulesCoreSections } from "./_components/rules-core-sections";
import { RulesExtendedSections } from "./_components/rules-extended-sections";
import { RulesHowToSections } from "./_components/rules-howto-sections";

const sectionGroups = [
  {
    label: "Hiểu hệ thống",
    icon: Compass,
    sections: [
      { id: "overview", label: "Tổng quan hệ thống" },
      { id: "map", label: "Bản đồ chức năng" },
      { id: "principles", label: "Nguyên tắc vận hành" },
      { id: "permissions", label: "Phân quyền" },
    ],
  },
  {
    label: "Cách sử dụng",
    icon: BookOpen,
    sections: [
      { id: "howto-content", label: "Nội dung & tin tức" },
      { id: "howto-shop", label: "Bán hàng trên website" },
      { id: "howto-affiliate", label: "Affiliate" },
      { id: "howto-ladipage", label: "Ladipage sự kiện" },
      { id: "howto-connections", label: "Kết nối & API key" },
    ],
  },
  {
    label: "Vận hành an toàn",
    icon: ShieldCheck,
    sections: [
      { id: "data", label: "Nguồn dữ liệu & đối soát" },
      { id: "troubleshooting", label: "Sự cố thường gặp" },
      { id: "security", label: "Bảo mật & nhật ký" },
      { id: "faq", label: "Câu hỏi thường gặp" },
    ],
  },
];

const allSections = sectionGroups.flatMap((group) => group.sections);

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
      { rootMargin: "-30% 0px -60% 0px" },
    );

    for (const section of allSections) {
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
    <div className="mx-auto w-full max-w-[1500px] px-4 py-8 lg:px-8">
      <header className="border-border bg-muted/20 mb-10 rounded-2xl border p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-primary text-xs font-semibold tracking-[0.24em] uppercase">Sổ tay vận hành</p>
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Quy tắc & Hướng dẫn sử dụng CRM</h1>
            <p className="text-muted-foreground max-w-3xl leading-7">
              Tài liệu mô tả toàn bộ chức năng đang có, cách thao tác từng nghiệp vụ và những quy tắc bắt buộc khi làm
              việc trên dữ liệu EAC và website SRX Việt Nam.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge variant="outline">Studio CRM v2.1</Badge>
            <Badge variant="outline">Cập nhật 08.2026</Badge>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-10 xl:flex-row xl:gap-12">
        <aside className="xl:sticky xl:top-20 xl:h-fit xl:w-[280px] xl:shrink-0">
          <nav className="space-y-5 rounded-xl border p-4">
            {sectionGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <div className="text-muted-foreground flex items-center gap-2 px-2 text-xs font-semibold tracking-wide uppercase">
                  <group.icon className="size-3.5" />
                  {group.label}
                </div>
                <ul className="space-y-0.5 text-sm">
                  {group.sections.map((section) => (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => scrollTo(section.id)}
                        className={`w-full rounded-md px-3 py-2 text-left transition ${
                          active === section.id
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        {section.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-20">
          <RulesCoreSections />
          <RulesHowToSections />
          <RulesExtendedSections />
        </main>
      </div>
    </div>
  );
}
