"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Cpu,
  Upload,
  CheckCircle2,
  Clock,
  Archive,
} from "lucide-react";
import { useAuth, authFetch } from "@/lib/auth-context";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

interface Firmware {
  _id: string;
  version: string;
  channel: "stable" | "beta" | "dev";
  releaseNotes: { zh: string; en: string };
  binaryUrl: string;
  binarySize: number;
  binaryHash: string;
  hardwareVersions: string[];
  rolloutPercent: number;
  status: "draft" | "published" | "archived";
  publishedAt?: string;
  createdAt: string;
}

const STATUS_TONE: Record<Firmware["status"], "primary" | "success" | "neutral"> = {
  draft: "neutral",
  published: "success",
  archived: "neutral",
};

const STATUS_ICON: Record<Firmware["status"], typeof Clock> = {
  draft: Clock,
  published: CheckCircle2,
  archived: Archive,
};

export default function AdminFirmwarePage() {
  const router = useRouter();
  const { user, accessToken, loading, refresh } = useAuth();
  const [items, setItems] = useState<Firmware[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/admin/login");
  }, [loading, user, router]);

  async function load() {
    if (!user) return;
    setItemsLoading(true);
    try {
      const data = await authFetch<Firmware[]>(
        "/api/admin/firmware",
        {},
        { accessToken, refresh },
      );
      setItems(data);
    } finally {
      setItemsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const fd = new FormData(e.currentTarget);
    try {
      await authFetch(
        "/api/admin/firmware",
        {
          method: "POST",
          body: JSON.stringify({
            version: String(fd.get("version") || ""),
            channel: String(fd.get("channel") || "stable"),
            releaseNotes: {
              zh: String(fd.get("notesZh") || ""),
              en: String(fd.get("notesEn") || ""),
            },
            binaryUrl: String(fd.get("binaryUrl") || ""),
            binarySize: Number(fd.get("binarySize") || 0),
            binaryHash: String(fd.get("binaryHash") || ""),
            hardwareVersions: String(fd.get("hardwareVersions") || "v1.0")
              .split(",")
              .map((s) => s.trim()),
            rolloutPercent: Number(fd.get("rolloutPercent") || 100),
            status: "draft",
          }),
        },
        { accessToken, refresh },
      );
      setShowCreate(false);
      void load();
    } catch (err) {
      console.error(err);
      alert("Failed to create firmware");
    } finally {
      setCreating(false);
    }
  }

  async function publish(id: string) {
    if (!confirm("Publish this firmware? Devices in the rollout will start receiving it.")) return;
    try {
      await authFetch(
        `/api/admin/firmware/${id}/publish`,
        { method: "POST" },
        { accessToken, refresh },
      );
      void load();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-dark-900">
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-semibold flex-1">固件管理</h1>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-3.5 h-3.5" />
            新版本
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showCreate && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCreate}
            className="glass-card p-5 mb-6 space-y-3"
          >
            <h2 className="text-sm font-semibold mb-2">创建新固件</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input name="version" placeholder="版本号 (1.2.0)" required />
              <select
                name="channel"
                defaultValue="stable"
                className="px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/50"
              >
                <option value="stable">stable</option>
                <option value="beta">beta</option>
                <option value="dev">dev</option>
              </select>
            </div>
            <Input name="binaryUrl" type="url" placeholder="二进制下载 URL (R2/CDN)" required />
            <div className="grid sm:grid-cols-2 gap-3">
              <Input name="binarySize" type="number" placeholder="字节数" required />
              <Input name="binaryHash" placeholder="SHA256 (64 hex chars)" required pattern="[a-fA-F0-9]{64}" />
            </div>
            <Input
              name="hardwareVersions"
              defaultValue="v1.0"
              placeholder="兼容硬件 (逗号分隔)"
              required
            />
            <Input name="rolloutPercent" type="number" min="0" max="100" defaultValue="100" />
            <Textarea name="notesZh" rows={3} placeholder="中文更新说明" required />
            <Textarea name="notesEn" rows={3} placeholder="English release notes" required />
            <div className="flex gap-2">
              <Button type="submit" isLoading={creating} disabled={creating}>
                创建草稿
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreate(false)}
              >
                取消
              </Button>
            </div>
          </motion.form>
        )}

        {itemsLoading ? (
          <div className="glass-card p-12 text-center text-gray-500">加载中…</div>
        ) : items.length === 0 ? (
          <div className="glass-card p-12 text-center text-gray-500">
            <Cpu className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无固件</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((fw) => {
              const Icon = STATUS_ICON[fw.status];
              return (
                <li key={fw._id} className="glass-card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-primary">v{fw.version}</span>
                      <span className="text-xs text-gray-500">{fw.channel}</span>
                      <Badge tone={STATUS_TONE[fw.status]}>
                        <Icon className="w-2.5 h-2.5" />
                        {fw.status}
                      </Badge>
                      {fw.rolloutPercent < 100 && (
                        <span className="text-[10px] text-amber-400">
                          {fw.rolloutPercent}% rollout
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{fw.releaseNotes.zh}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {fw.hardwareVersions.join(", ")} ·{" "}
                      {fw.publishedAt
                        ? new Date(fw.publishedAt).toLocaleDateString()
                        : "draft"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {fw.status === "draft" && (
                      <Button size="sm" onClick={() => publish(fw._id)}>
                        <Upload className="w-3.5 h-3.5" />
                        发布
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
