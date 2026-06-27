import React, { useState } from "react";
import { Search, Mail, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface StudentSearchProps {
  onSearch: (email: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function StudentSearch({ onSearch, isLoading, error }: StudentSearchProps) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    onSearch(cleanEmail);
  };

  return (
    <div className="mx-auto max-w-xl">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="bg-linear-to-r from-blue-900 to-slate-950 px-6 py-8 text-white text-center border-b border-blue-950">
          <h2 className="font-display text-2xl font-bold tracking-tight">TRA CỨU KẾT QUẢ</h2>
          <p className="mt-2 text-xs uppercase tracking-widest text-blue-200 font-semibold">
            CỔNG TRA CỨU ĐIỂM THI KHẢO THÍ TRỰC TUYẾN
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="student-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Địa chỉ Email của Thí sinh
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  id="student-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="viethocsinh@example.com"
                  required
                  disabled={isLoading}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-hidden disabled:opacity-60 transition-all text-base"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700"
              >
                <div className="flex gap-2">
                  <span className="font-bold">Lỗi:</span>
                  <span>{error}</span>
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              id="submit-lookup-btn"
              disabled={isLoading || !email.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3.5 px-4 shadow-md hover:shadow-lg focus:ring-4 focus:ring-blue-100 disabled:opacity-50 transition-all duration-200 text-base cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang tải dữ liệu...</span>
                </div>
              ) : (
                <>
                  <Search size={18} />
                  <span>Tra Cứu Điểm Số</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
