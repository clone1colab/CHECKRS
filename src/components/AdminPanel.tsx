import React, { useState, useEffect } from "react";
import { Settings, Users, BarChart3, Shield, Key, Link2, FileSpreadsheet, Play, CheckCircle2, AlertTriangle, Eye, HelpCircle, Save, Check, Clipboard, Database, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { AppConfig, AdminStats, Student } from "../types";

interface AdminPanelProps {
  onBackToStudent: () => void;
  onPreviewStudent: (email: string) => void;
}

export default function AdminPanel({ onBackToStudent, onPreviewStudent }: AdminPanelProps) {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Configuration forms
  const [sheet1Url, setSheet1Url] = useState("");
  const [sheet2Url, setSheet2Url] = useState("");
  const [directSheet1Data, setDirectSheet1Data] = useState("");
  const [directSheet2Data, setDirectSheet2Data] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");

  const [activeTab, setActiveTab] = useState<"settings" | "students" | "stats">("settings");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Loaded stats
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    // Attempt automatic login if password is in session storage
    const savedPass = sessionStorage.getItem("admin_password");
    if (savedPass) {
      handleLoginWithPass(savedPass);
    }
  }, []);

  const handleLoginWithPass = async (pass: string) => {
    setIsVerifying(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass })
      });

      if (!res.ok) {
        throw new Error("Mật khẩu không chính xác hoặc lỗi hệ thống.");
      }

      const data = await res.json();
      if (data.success) {
        setIsAuthorized(true);
        setPassword(pass);
        sessionStorage.setItem("admin_password", pass);
        
        // Load configurations
        setSheet1Url(data.config.sheet1Url || "");
        setSheet2Url(data.config.sheet2Url || "");
        setDirectSheet1Data(data.config.hasDirectSheet1 ? "[Đã lưu dữ liệu CSV trực tiếp]" : "");
        setDirectSheet2Data(data.config.hasDirectSheet2 ? "[Đã lưu dữ liệu CSV trực tiếp]" : "");
        setStats(data.stats);
        setStudentsList(data.students || []);
      } else {
        throw new Error(data.error || "Mật khẩu không chính xác.");
      }
    } catch (err: any) {
      setLoginError(err.message);
      sessionStorage.removeItem("admin_password");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    handleLoginWithPass(password);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      // Determine what to save (skip placeholder if not changed)
      const payload: any = {
        password,
        sheet1Url,
        sheet2Url,
        adminPassword: newAdminPassword.trim() || undefined
      };

      if (directSheet1Data && directSheet1Data !== "[Đã lưu dữ liệu CSV trực tiếp]") {
        payload.directSheet1Data = directSheet1Data;
      }
      if (directSheet2Data && directSheet2Data !== "[Đã lưu dữ liệu CSV trực tiếp]") {
        payload.directSheet2Data = directSheet2Data;
      }

      const res = await fetch("/api/admin/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Lỗi lưu cấu hình.");
      }

      const data = await res.json();
      if (data.success) {
        setSaveSuccess("Đã cập nhật cấu hình và lưu thành công!");
        if (newAdminPassword.trim()) {
          setPassword(newAdminPassword.trim());
          sessionStorage.setItem("admin_password", newAdminPassword.trim());
          setNewAdminPassword("");
        }
        
        // Refresh data after saving
        handleLoginWithPass(password);
      }
    } catch (err: any) {
      setSaveError(err.message || "Không thể kết nối lưu trữ.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncData = () => {
    handleLoginWithPass(password);
  };

  const [isDbSyncing, setIsDbSyncing] = useState(false);
  const [dbSyncSuccess, setDbSyncSuccess] = useState<string | null>(null);
  const [dbSyncError, setDbSyncError] = useState<string | null>(null);

  const handleSyncDatabase = async () => {
    setIsDbSyncing(true);
    setDbSyncSuccess(null);
    setDbSyncError(null);
    try {
      const res = await fetch("/api/admin/sync-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Lỗi đồng bộ dữ liệu.");
      }

      const data = await res.json();
      if (data.success) {
        setDbSyncSuccess(data.message || "Đồng bộ cơ sở dữ liệu thành công!");
        handleLoginWithPass(password);
      }
    } catch (err: any) {
      setDbSyncError(err.message || "Không thể đồng bộ cơ sở dữ liệu.");
    } finally {
      setIsDbSyncing(false);
    }
  };

  const filteredStudents = studentsList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthorized) {
    return (
      <div className="mx-auto max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl"
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4">
              <Shield size={28} />
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-800">Quản Trị Viên</h2>
            <p className="mt-2 text-sm text-slate-500">
              Nhập mã PIN hoặc mật khẩu quản trị để cấu hình đường dẫn tài liệu Google Sheets.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="admin-pin" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Mật khẩu hoặc Mã PIN (Mặc định: admin)
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Key size={16} />
                </div>
                <input
                  type="password"
                  id="admin-pin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  required
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                />
              </div>
            </div>

            {loginError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {loginError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onBackToStudent}
                className="flex-1 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-medium text-slate-600 py-2.5 px-4 text-sm transition-all cursor-pointer"
              >
                Học sinh
              </button>
            <button
              type="submit"
              id="login-admin-btn"
              disabled={isVerifying}
              className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold py-2.5 px-4 text-sm shadow-md transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
                {isVerifying ? "Đang xác thực..." : "Xác nhận PIN"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Admin Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-slate-900">Bảng điều khiển Giáo viên</h2>
          <p className="text-sm text-slate-500">Cấu hình kết nối Google Sheets, theo dõi phổ điểm, và giám sát thí sinh</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncData}
            id="sync-data-btn"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-xs transition-all cursor-pointer"
          >
            <Play size={14} className="text-emerald-500 fill-emerald-500" />
            Đồng bộ/Tải lại Sheets
          </button>
          <button
            onClick={onBackToStudent}
            className="rounded-lg bg-blue-900 hover:bg-blue-800 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-all cursor-pointer border border-blue-950"
          >
            Trang học sinh &rarr;
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "settings"
              ? "border-blue-900 text-blue-900 bg-blue-50/30"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Settings size={16} />
          Cấu hình Dữ liệu (Google Sheets)
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "students"
              ? "border-blue-900 text-blue-900 bg-blue-50/30"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users size={16} />
          Bảng Điểm Thí Sinh ({studentsList.length})
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "stats"
              ? "border-blue-900 text-blue-900 bg-blue-50/30"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BarChart3 size={16} />
          Phân Tích Phổ Điểm
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Settings Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSaveConfig} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
              <h3 className="font-display text-lg font-bold text-slate-800 pb-3 border-b border-slate-100">
                Cấu Hình Nguồn Kết Nối
              </h3>

              {/* Sheet 1: Scores and choices */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-green-600" />
                  Liên kết Google Sheet 1: Danh sách Điểm thi & Câu trả lời của Học sinh
                </label>
                <input
                  type="url"
                  value={sheet1Url}
                  onChange={(e) => setSheet1Url(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
                <p className="text-xs text-slate-400">
                  Nhập link Google Sheets chứa câu trả lời Form. Đảm bảo cột Email, Điểm số, Họ tên đã được chia sẻ ở chế độ "Bất kỳ ai có liên kết đều có thể xem".
                </p>
              </div>

              {/* Sheet 2: Correct answer keys */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Link2 size={16} className="text-blue-600" />
                  Liên kết Google Sheet 2: Danh sách Đáp án đúng (Mẫu đáp án)
                </label>
                <input
                  type="url"
                  value={sheet2Url}
                  onChange={(e) => setSheet2Url(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
                <p className="text-xs text-slate-400">
                  Nhập link Google Sheets mẫu chứa 2 cột chính: Cột "Câu hỏi/STT" và Cột "Đáp án đúng".
                </p>
              </div>

              {/* Direct CSV copy/paste for backup */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h4 className="text-sm font-bold text-amber-800 flex items-center gap-1 bg-amber-50 rounded-lg p-2 border border-amber-200/50">
                  <AlertTriangle size={15} /> Nhập liệu dự phòng trực tiếp (Không dùng Google Sheets)
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                      CSV Danh sách điểm học sinh
                    </label>
                    <textarea
                      value={directSheet1Data}
                      onChange={(e) => setDirectSheet1Data(e.target.value)}
                      placeholder="Dán mã CSV hoặc nội dung Excel copy vào đây..."
                      className="block h-32 w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-xs font-mono focus:border-blue-500 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                      CSV Danh sách Đáp án chuẩn
                    </label>
                    <textarea
                      value={directSheet2Data}
                      onChange={(e) => setDirectSheet2Data(e.target.value)}
                      placeholder="Câu,Đáp án&#10;Câu 1,A&#10;Câu 2,C..."
                      className="block h-32 w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-xs font-mono focus:border-blue-500 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Change admin password */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Thay đổi Mật khẩu Quản trị (PIN)
                </label>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới (bỏ trống nếu giữ nguyên)"
                  className="block w-full max-w-sm rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Status messages */}
              {saveSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{saveSuccess}</span>
                </div>
              )}
              {saveError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
                  {saveError}
                </div>
              )}

              {/* Submit btn */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  id="save-config-btn"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-6 text-sm shadow-md transition-all duration-200 cursor-pointer"
                >
                  <Save size={16} />
                  {isSaving ? "Đang lưu cấu hình..." : "Lưu tất cả thay đổi"}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Connection Status Info Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
              <h3 className="font-display text-md font-bold text-slate-800 border-b border-slate-100 pb-2">
                Trạng thái Kết nối
              </h3>

              {stats ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Sheet 1 (Học sinh)</span>
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                      stats.s1Source === "google" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {stats.s1Source === "google" ? "Google Sheets" : "Direct CSV"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Sheet 2 (Đáp án)</span>
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                      stats.s2Source === "google" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {stats.s2Source === "google" ? "Google Sheets" : "Direct CSV"}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cột Email:</span>
                      <span className="font-semibold text-slate-700">{stats.emailColumnFound}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cột Điểm số:</span>
                      <span className="font-semibold text-slate-700">{stats.scoreColumnFound}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cột Họ tên:</span>
                      <span className="font-semibold text-slate-700">{stats.nameColumnFound}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tổng số thí sinh:</span>
                      <span className="font-bold text-slate-900">{stats.totalStudents} thí sinh</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số câu có đáp án:</span>
                      <span className="font-bold text-slate-900">{stats.totalAnswerKeys} câu hỏi</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <AlertTriangle size={24} className="mx-auto text-amber-500 mb-2" />
                  <span>Chưa tải được thông tin trạng thái dữ liệu. Hãy tải lại trang hoặc đổi lại liên kết.</span>
                </div>
              )}
            </div>

            {/* Sync Database Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
              <h3 className="font-display text-md font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Database size={18} className="text-blue-600" />
                Đồng bộ Cơ sở Dữ liệu
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Đồng bộ hóa danh sách điểm thi và đáp án mẫu lên Firestore Cloud. Giúp người dùng ở các thiết bị khác truy cập tìm kiếm siêu tốc, ổn định và không bị phụ thuộc vào tốc độ tải Google Sheets.
              </p>

              {dbSyncSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{dbSyncSuccess}</span>
                </div>
              )}

              {dbSyncError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                  {dbSyncError}
                </div>
              )}

              <button
                type="button"
                id="sync-db-cloud-btn"
                onClick={handleSyncDatabase}
                disabled={isDbSyncing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold py-2.5 px-4 text-xs shadow-sm hover:shadow-md disabled:opacity-60 transition-all cursor-pointer"
              >
                {isDbSyncing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Đang đồng bộ Firestore...</span>
                  </>
                ) : (
                  <>
                    <Database size={14} />
                    <span>Đồng bộ Cơ sở dữ liệu Cloud</span>
                  </>
                )}
              </button>
            </div>

            {/* Instruction Panel */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-3">
              <h4 className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <HelpCircle size={16} className="text-blue-500" />
                Hướng dẫn định dạng
              </h4>
              <ul className="list-disc list-inside space-y-2 text-xs text-slate-600 leading-relaxed">
                <li>
                  <strong className="text-slate-800">Sheet điểm học sinh:</strong> Có thể tải trực tiếp từ file xuất Google Forms. Phải chứa tối thiểu cột <code className="bg-slate-200 px-1 rounded">Email</code>, cột điểm và cột tên.
                </li>
                <li>
                  <strong className="text-slate-800">Sheet đáp án đúng:</strong> Chứa danh sách câu hỏi và đáp án mẫu. Cột 1 là mã câu hỏi (ví dụ: <code className="bg-slate-200 px-1 rounded">Câu 1</code> hoặc <code className="bg-slate-200 px-1 rounded">1</code>), cột 2 là đáp án đúng tương ứng (ví dụ: <code className="bg-slate-200 px-1 rounded">A</code>).
                </li>
                <li>
                  Nếu liên kết Google Sheets của bạn không tải được, đảm bảo bạn chọn <strong className="text-slate-800">"Anyone with the link can view"</strong> (Bất kỳ ai có link đều xem được) khi Share.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Students Gradebook */}
      {activeTab === "students" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-display text-lg font-bold text-slate-800">
              Danh Sách Kết Quả Học Sinh
            </h3>

            {/* Filter Search */}
            <div className="w-full max-w-sm">
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc email học sinh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-500">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-4">Họ và tên</th>
                  <th scope="col" className="px-6 py-4">Địa chỉ Email</th>
                  <th scope="col" className="px-6 py-4">Điểm số gốc</th>
                  <th scope="col" className="px-6 py-4">Thời gian nộp</th>
                  <th scope="col" className="px-6 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Không tìm thấy thí sinh nào khớp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">{s.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                          {s.score || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">{s.timestamp}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => onPreviewStudent(s.email)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 px-3 py-1.5 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                          <Eye size={13} />
                          Xem bài làm
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Stats & Distribution */}
      {activeTab === "stats" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Main Distribution Info */}
          <div className="md:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-md text-center flex flex-col justify-center items-center">
            <h3 className="font-display text-md font-bold text-slate-500 uppercase tracking-wide">Điểm số cao nhất</h3>
            <span className="text-5xl font-extrabold text-indigo-600 my-4">
              {studentsList.length > 0 
                ? (() => {
                    const scores = studentsList.map(s => {
                      const num = s.score.match(/^(\d+)/);
                      return num ? parseInt(num[1]) : 0;
                    });
                    return Math.max(...scores);
                  })()
                : "0"}
            </span>
            <p className="text-xs text-slate-400">Thang điểm tuyệt đối dựa trên câu trả lời học sinh nộp</p>
          </div>

          <div className="md:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-md text-center flex flex-col justify-center items-center">
            <h3 className="font-display text-md font-bold text-slate-500 uppercase tracking-wide">Điểm trung bình</h3>
            <span className="text-5xl font-extrabold text-emerald-600 my-4">
              {studentsList.length > 0 
                ? (() => {
                    const scores = studentsList.map(s => {
                      const num = s.score.match(/^(\d+)/);
                      return num ? parseInt(num[1]) : 0;
                    }).filter(s => !isNaN(s));
                    if (scores.length === 0) return 0;
                    const sum = scores.reduce((a, b) => a + b, 0);
                    return (sum / scores.length).toFixed(1);
                  })()
                : "0.0"}
            </span>
            <p className="text-xs text-slate-400">Kết quả tính trung bình từ tổng bài thi</p>
          </div>

          <div className="md:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-md text-center flex flex-col justify-center items-center">
            <h3 className="font-display text-md font-bold text-slate-500 uppercase tracking-wide">Tổng số bài nộp</h3>
            <span className="text-5xl font-extrabold text-blue-600 my-4">
              {studentsList.length}
            </span>
            <p className="text-xs text-slate-400">Thí sinh đã hoàn tất nộp đáp án</p>
          </div>

          {/* Graphical representation (Mock charts using pure CSS/div for perfect styling and 0 bundle size) */}
          <div className="md:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-md space-y-6">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-800">Biểu đồ phổ điểm bài thi</h3>
              <p className="text-xs text-slate-400">Thống kê mật độ học sinh phân bổ theo thang điểm</p>
            </div>

            {studentsList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Chưa có thông tin phổ điểm</div>
            ) : (
              <div className="space-y-4">
                {/* Score buckets */}
                {(() => {
                  const buckets: { [key: string]: number } = {
                    "0-2 điểm": 0,
                    "3-4 điểm": 0,
                    "5-6 điểm": 0,
                    "7-8 điểm": 0,
                    "9-10 điểm": 0,
                  };

                  studentsList.forEach(s => {
                    let val = 0;
                    const match = s.score.match(/^(\d+)/);
                    if (match) {
                      val = parseInt(match[1]);
                    } else if (s.score.includes("/")) {
                      const split = s.score.split("/");
                      val = (parseFloat(split[0]) / parseFloat(split[1])) * 10;
                    }

                    if (val <= 2) buckets["0-2 điểm"]++;
                    else if (val <= 4) buckets["3-4 điểm"]++;
                    else if (val <= 6) buckets["5-6 điểm"]++;
                    else if (val <= 8) buckets["7-8 điểm"]++;
                    else buckets["9-10 điểm"]++;
                  });

                  const maxCount = Math.max(...Object.values(buckets));

                  return (
                    <div className="space-y-3">
                      {Object.entries(buckets).map(([bucketName, count]) => {
                        const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        return (
                          <div key={bucketName} className="flex items-center gap-4 text-xs sm:text-sm">
                            <span className="w-20 font-semibold text-slate-600">{bucketName}</span>
                            <div className="flex-1 bg-slate-100 rounded-lg h-6 overflow-hidden relative border border-slate-200/50">
                              <div 
                                style={{ width: `${widthPct}%` }}
                                className="bg-linear-to-r from-blue-500 to-indigo-600 h-full transition-all duration-500"
                              />
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-700">
                                {count} học sinh
                              </span>
                            </div>
                            <span className="w-12 text-right font-bold text-slate-500">
                              {studentsList.length > 0 ? Math.round((count / studentsList.length) * 100) : 0}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
