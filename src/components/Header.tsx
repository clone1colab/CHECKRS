import { Award, ShieldAlert, GraduationCap } from "lucide-react";

interface HeaderProps {
  isAdmin: boolean;
  onToggleAdmin: () => void;
}

export default function Header({ isAdmin, onToggleAdmin }: HeaderProps) {
  return (
    <header className="bg-blue-900 text-white shadow-md border-b border-blue-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-900 shadow-xs">
            <GraduationCap size={24} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">
              Hệ thống Tra cứu Điểm thi
            </h1>
            <p className="text-[10px] sm:text-xs text-blue-200 uppercase tracking-widest font-semibold">
              CỔNG THÔNG TIN KHẢO THÍ TRỰC TUYẾN
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right text-xs text-blue-200 border-r border-blue-800 pr-4 mr-1">
            <p className="font-medium">Kỳ thi Đánh Giá Năng Lực</p>
            <p className="text-[10px] text-blue-300">Đồng bộ dữ liệu thời gian thực</p>
          </div>
          <button
            onClick={onToggleAdmin}
            id="toggle-admin-btn"
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 sm:px-4 sm:py-2 ${
              isAdmin
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm"
                : "bg-blue-800 hover:bg-blue-750 text-blue-100 border border-blue-700 hover:text-white"
            }`}
          >
            {isAdmin ? (
              <>
                <Award size={14} />
                <span>Về trang Học sinh</span>
              </>
            ) : (
              <>
                <ShieldAlert size={14} />
                <span>Giáo viên / Quản trị</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
