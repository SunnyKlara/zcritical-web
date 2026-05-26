"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Download, Tag, Calendar, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Firmware {
  _id: string;
  version: string;
  channel: "stable" | "beta" | "dev";
  releaseNotes: { zh: string; en: string };
  binaryUrl: string;
  binarySize: number;
  hardwareVersions: string[];
  publishedAt: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string, locale: string) {
  return new Date(date).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function FirmwarePage() {
  const locale = useLocale() as "zh" | "en";
  const [items, setItems] = useState<Firmware[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    apiFetch<Firmware[]>("/api/firmware/list?channel=stable")
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message ?? "failed");
        setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  return (
    <main id="main-content" className="relative">
      <Navbar />

      <section className="pt-32 pb-24 lg:pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              {locale === "zh" ? (
                <>
                  固件<span className="text-gradient">更新日志</span>
                </>
              ) : (
                <>
                  Firmware <span className="text-gradient">Releases</span>
                </>
              )}
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              {locale === "zh"
                ? "查看 Critical 固件历史版本，下载固件进行手动升级。推荐通过 APP OTA 自动升级。"
                : "Critical firmware release history. Recommend in-app OTA upgrade for normal use."}
            </p>
          </motion.div>

          {loading && (
            <div className="text-center py-20" role="status">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">{locale === "zh" ? "加载中…" : "Loading…"}</p>
            </div>
          )}

          {error && (
            <div className="text-center py-20 text-red-400 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" aria-hidden />
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              {locale === "zh" ? "暂无发布版本" : "No releases yet"}
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="space-y-6">
              {items.map((fw, i) => (
                <motion.article
                  key={fw._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="glass-card p-6"
                >
                  <header className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Tag className="w-4 h-4" aria-hidden />
                      <span className="font-mono font-bold text-lg">v{fw.version}</span>
                    </div>
                    {i === 0 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/30">
                        {locale === "zh" ? "最新版本" : "Latest"}
                      </span>
                    )}
                    <span className="text-xs text-gray-600">
                      {fw.hardwareVersions.join(", ")}
                    </span>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 ml-auto">
                      <Calendar className="w-3.5 h-3.5" aria-hidden />
                      <time dateTime={fw.publishedAt}>{formatDate(fw.publishedAt, locale)}</time>
                    </div>
                  </header>

                  <div className="mb-4 text-sm text-gray-400 leading-relaxed whitespace-pre-line">
                    {fw.releaseNotes[locale]}
                  </div>

                  <a
                    href={fw.binaryUrl}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden />
                    <span>critical-fw-v{fw.version}.bin</span>
                    <span className="text-xs text-gray-500">({formatSize(fw.binarySize)})</span>
                  </a>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
