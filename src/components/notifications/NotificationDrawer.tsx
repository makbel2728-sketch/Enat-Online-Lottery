import React from 'react';
import { X, Bell, Trophy, CheckCheck, Trash2 } from 'lucide-react';
import { Language, WinnerNotification } from '../../types/lottery';
import { formatETB, formatEthiopianDate } from '../../utils/lotteryUtils';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: WinnerNotification[];
  lang: Language;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  lang,
  onMarkAllAsRead,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                {lang === 'am' ? 'የአሸናፊዎች ማሳወቂያ' : 'Winner Notifications'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {notifications.length} {lang === 'am' ? 'መልዕክቶች' : 'alerts'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={onMarkAllAsRead}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition"
                  title={lang === 'am' ? 'ሁሉንም አንብብ' : 'Mark all read'}
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={onClearAll}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                  title={lang === 'am' ? 'ሁሉንም አጽዳ' : 'Clear all'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-xs space-y-2">
              <Bell className="w-10 h-10 mx-auto text-slate-600" />
              <div>{lang === 'am' ? 'ምንም ማሳወቂያ የለም' : 'No notifications yet'}</div>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  item.isRead
                    ? 'bg-slate-950/40 border-slate-800 text-slate-300'
                    : 'bg-emerald-950/30 border-emerald-500/40 text-white shadow-md'
                }`}
              >
                <div className="flex items-start space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">
                        {lang === 'am' ? 'እንኳን ደስ አሎት!' : 'Lottery Winner!'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        {formatEthiopianDate(item.timestamp, true)}
                      </span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed">
                      {lang === 'am' ? item.messageAm : item.messageEn}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">የቲኬት ቁጥር: <strong className="text-white font-mono">{item.ticketNumber}</strong></span>
                      <span className="text-emerald-400 font-bold font-mono">+{formatETB(item.amountWon)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
