import { Calendar, User, Mail, Award, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { LookupResult } from "../types";

interface StudentResultProps {
  data: LookupResult;
  onBack: () => void;
}

export default function StudentResult({ data, onBack }: StudentResultProps) {
  const { student } = data;

  const getInitials = (name: string) => {
    const parts = (name || "").trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (name ? name.slice(0, 2) : "TS").toUpperCase();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-2">
      {/* Back to search */}
      <div className="flex justify-start">
        <button
          onClick={onBack}
          id="back-to-search-btn"
          className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
        >
          &larr; Quay lại Tìm kiếm
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        {/* Card Header matching theme */}
        <div className="bg-blue-900 text-white px-6 py-6 border-b border-blue-950 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-sm font-bold uppercase tracking-widest text-blue-200">KẾT QUẢ TRA CỨU</h2>
            <p className="text-xl font-bold mt-1 text-white">Phiếu Điểm Thí Sinh</p>
          </div>
          {/* Decorative subtle background circle */}
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-800 rounded-full opacity-30"></div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Candidate Profile Details Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-900 font-bold text-2xl border-2 border-white shadow-sm shrink-0">
              {getInitials(student.name)}
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h3 className="text-xl font-bold text-slate-800 leading-snug">{student.name}</h3>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Cổng khảo thí trực tuyến</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Detailed Student Information */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin chi tiết</h4>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-700">
                  <Mail size={16} className="text-slate-400 shrink-0" />
                  <div className="text-sm">
                    <p className="text-xs text-slate-400 font-medium">Địa chỉ Email</p>
                    <p className="font-semibold text-slate-800 truncate max-w-[220px]" title={student.email}>
                      {student.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700">
                  <Calendar size={16} className="text-slate-400 shrink-0" />
                  <div className="text-sm">
                    <p className="text-xs text-slate-400 font-medium">Thời gian hoàn thành</p>
                    <p className="font-semibold text-slate-800">
                      {student.timestamp || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700">
                  <Award size={16} className="text-slate-400 shrink-0" />
                  <div className="text-sm">
                    <p className="text-xs text-slate-400 font-medium">Trạng thái kết quả</p>
                    <p className="font-semibold text-emerald-600 flex items-center gap-1 text-xs uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Đã xác thực dữ liệu
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Display Card (Strictly shows only the score, matches requested theme styling) */}
            <div className="bg-blue-900 text-white rounded-xl p-6 relative overflow-hidden border border-blue-950 flex flex-col justify-center items-center text-center shadow-lg">
              <div className="relative z-10 space-y-2">
                <h4 className="text-blue-300 text-xs font-bold uppercase tracking-widest">ĐIỂM SỐ CHÍNH THỨC</h4>
                <div className="py-2">
                  <span className="text-6xl font-black tracking-tight">{student.score}</span>
                </div>
                <div className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-emerald-500/30">
                  <CheckCircle2 size={12} />
                  Cập nhật thời gian thực
                </div>
              </div>
              {/* Decorative design circle matching theme */}
              <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-blue-800 rounded-full opacity-30"></div>
            </div>
          </div>
        </div>

        {/* Visual card footer without right/wrong references */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
          <span>Hệ thống quản lý khảo thí trực tuyến</span>
          <span>Bảo mật tuyệt đối</span>
        </div>
      </motion.div>
    </div>
  );
}
