import { useState } from "react";
import Header from "./components/Header";
import StudentSearch from "./components/StudentSearch";
import StudentResult from "./components/StudentResult";
import AdminPanel from "./components/AdminPanel";
import { LookupResult } from "./types";
import { GraduationCap, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleStudentSearch = async (email: string) => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/student-lookup?email=${encodeURIComponent(email)}`);
      
      const responseText = await res.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("Failed to parse response as JSON:", responseText);
        throw new Error("Không thể kết nối đến máy chủ hoặc máy chủ phản hồi không đúng định dạng. Vui lòng tải lại trang hoặc thử lại sau.");
      }

      if (!res.ok) {
        throw new Error(data?.error || "Không thể tìm thấy kết quả cho email này.");
      }

      if (data.success) {
        setLookupResult(data);
        setActiveEmail(email);
      } else {
        throw new Error(data.error || "Tìm kiếm không thành công.");
      }
    } catch (err: any) {
      setSearchError(err.message || "Đã xảy ra lỗi trong quá trình tra cứu.");
      setLookupResult(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePreviewStudentFromAdmin = (email: string) => {
    setIsAdmin(false);
    handleStudentSearch(email);
  };

  const handleBackToSearch = () => {
    setLookupResult(null);
    setActiveEmail(null);
    setSearchError(null);
  };

  const handleToggleAdmin = () => {
    setIsAdmin(!isAdmin);
    // When toggling, reset any search results to prevent overlay confusion
    setLookupResult(null);
    setActiveEmail(null);
    setSearchError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header Navigation */}
      <Header isAdmin={isAdmin} onToggleAdmin={handleToggleAdmin} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {isAdmin ? (
            <motion.div
              key="admin-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AdminPanel
                onBackToStudent={() => setIsAdmin(false)}
                onPreviewStudent={handlePreviewStudentFromAdmin}
              />
            </motion.div>
          ) : lookupResult ? (
            <motion.div
              key="student-result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <StudentResult data={lookupResult} onBack={handleBackToSearch} />
            </motion.div>
          ) : (
            <motion.div
              key="student-search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="py-6 sm:py-12"
            >
              <StudentSearch
                onSearch={handleStudentSearch}
                isLoading={searchLoading}
                error={searchError}
              />

              {/* Decorative Trust Badge for design rhythm */}
              <div className="mt-12 text-center flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Dữ liệu bảo mật & đồng bộ thời gian thực</span>
                </div>
                <p className="text-[10px] text-slate-400/80 max-w-md">
                  Kết quả được truy xuất trực tiếp từ biểu mẫu điểm thi của giáo viên chủ nhiệm. Điểm số của bạn luôn được bảo vệ an toàn.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Banner */}
      <footer className="bg-slate-100 border-t border-slate-200 py-5 text-slate-500 text-center text-[10px] md:text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <div>© 2026 Trung Tâm Khảo Thí Quốc Gia. Mọi quyền được bảo lưu.</div>
          <div className="flex gap-4">
            <span>Hỗ trợ kỹ thuật: 1900 1234</span>
            <span className="hidden md:inline">|</span>
            <span>Chính sách bảo mật thông tin</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
