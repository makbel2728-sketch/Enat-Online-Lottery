import React, { useState, useEffect } from 'react';
import { 
  Ticket as TicketIcon, 
  Sparkles, 
  CheckCircle2, 
  Trophy, 
  ShieldCheck, 
  Wallet, 
  Search, 
  Copy, 
  Check, 
  AlertCircle, 
  ArrowUpRight, 
  X, 
  Camera, 
  Upload, 
  Plus,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Smartphone,
  FileText,
  Image as ImageIcon,
  Trash2,
  Users
} from 'lucide-react';
import { Language, LotteryDraw, PaymentMethod, Ticket, Transaction, UserProfile, WinnerNotification } from '../../types/lottery';
import { 
  formatETB, 
  generateLuckyNumber, 
  playNotificationSound, 
  formatEthiopianDate,
  triggerConfetti 
} from '../../utils/lotteryUtils';
import { triggerHaptic } from '../../utils/telegram';
import { 
  lottery1000BannerImage, 
  lottery5000BannerImage, 
  lottery10000BannerImage, 
  lottery20000BannerImage, 
  getBanknoteForLottery 
} from '../../assets/banknotes';
import { WinnersHistoryView } from './WinnersHistoryView';
import { WalletView } from './WalletView';
import { TelebirrLogo } from '../common/TelebirrLogo';

const CANONICAL_LOTTERIES_CONFIG: Array<{
  id: string;
  titleAm: string;
  titleEn: string;
  code: string;
  category: 'instant' | 'digital' | 'national';
  bannerUrl: string;
  ticketPrice: number;
  jackpotAmount: number;
}> = [
  {
    id: 'lot_derash_1000',
    titleAm: 'ባለ 1,000 ብር ደራሽ',
    titleEn: 'Bale 1,000 ETB Derash',
    code: 'DERASH-1K',
    category: 'instant',
    bannerUrl: lottery1000BannerImage,
    ticketPrice: 10,
    jackpotAmount: 1000,
  },
  {
    id: 'lot_derash_5000',
    titleAm: 'ባለ 5,000 ብር ደራሽ',
    titleEn: 'Bale 5,000 ETB Derash',
    code: 'DERASH-5K',
    category: 'digital',
    bannerUrl: lottery5000BannerImage,
    ticketPrice: 50,
    jackpotAmount: 5000,
  },
  {
    id: 'lot_derash_10000',
    titleAm: 'ባለ 10,000 ብር ደራሽ',
    titleEn: 'Bale 10,000 ETB Derash',
    code: 'DERASH-10K',
    category: 'national',
    bannerUrl: lottery10000BannerImage,
    ticketPrice: 100,
    jackpotAmount: 10000,
  },
  {
    id: 'lot_derash_20000',
    titleAm: 'ባለ 20,000 ብር ደራሽ',
    titleEn: 'Bale 20,000 ETB Derash',
    code: 'DERASH-20K',
    category: 'national',
    bannerUrl: lottery20000BannerImage,
    ticketPrice: 200,
    jackpotAmount: 20000,
  },
];

interface LotteryHomeProps {
  lang: Language;
  lotteries: LotteryDraw[];
  tickets: Ticket[];
  transactions?: Transaction[];
  user: UserProfile;
  pendingApprovalsCount?: number;
  notifications?: WinnerNotification[];
  onClearNotification?: (id: string) => void;
  onBuyTickets: (lottery: LotteryDraw, ticketNumbers: string[], method: PaymentMethod, reference: string, phone: string, fullName?: string) => void;
  onDepositRequest?: (amount: number, method: PaymentMethod, reference: string, phone: string, fullName?: string, screenshotUrl?: string) => void;
  onWithdrawRequest?: (amount: number, phone: string) => void;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void;
  onAuthSuccess?: (user: UserProfile, tickets?: Ticket[], transactions?: Transaction[]) => void;
  onLogout?: () => void;
  onNavigateToAdmin: () => void;
}

export const LotteryHome: React.FC<LotteryHomeProps> = ({
  lang,
  lotteries,
  tickets,
  transactions = [],
  user,
  pendingApprovalsCount: _pendingApprovalsCount = 0,
  notifications = [],
  onClearNotification,
  onBuyTickets,
  onDepositRequest,
  onWithdrawRequest,
  onUpdateProfile: _onUpdateProfile,
  onAuthSuccess: _onAuthSuccess,
  onLogout: _onLogout,
  onNavigateToAdmin,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'active' | 'drawn' | 'wallet'>('active');




  const [selectedLottery, setSelectedLottery] = useState<LotteryDraw | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [customNumbers, setCustomNumbers] = useState<string[]>([generateLuckyNumber()]);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState(50);
  const [depositMethod, setDepositMethod] = useState<'telebirr' | 'cbe_birr'>('telebirr');
  const [depositRef, setDepositRef] = useState('');
  const [depositScreenshot, setDepositScreenshot] = useState<string | null>(null);
  const [depositScreenshotName, setDepositScreenshotName] = useState('');
  const [depositScreenshotError, setDepositScreenshotError] = useState<string | null>(null);
  const [previewScreenshotModalUrl, setPreviewScreenshotModalUrl] = useState<string | null>(null);
  const [depositPhone, setDepositPhone] = useState(user.phone || '0910961881');
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user.phone) {
      setDepositPhone(user.phone);
      setWithdrawAccountNumber(user.phone);
    }
  }, [user.phone]);

  const [withdrawAmount, setWithdrawAmount] = useState(50);
  const [withdrawAccountType, setWithdrawAccountType] = useState<'telebirr' | 'cbe'>('telebirr');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState(user.phone || '0910961881');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [, setHeaderClicks] = useState(0);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [lockedLotteryModalOpen, setLockedLotteryModalOpen] = useState(false);



  const [purchasedSuccess, setPurchasedSuccess] = useState<{
    lotteryTitle: string;
    ticketNumbers: string[];
    reference: string;
    totalAmount: number;
    phone: string;
  } | null>(null);

  const handleScreenshotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setDepositScreenshotError(lang === 'am' ? 'የፎቶው መጠን ከ8MB መብለጥ የለበትም' : 'Image size must be under 8MB');
      return;
    }
    setDepositScreenshotError(null);
    setDepositScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setDepositScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePerformDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositRef.trim() && !depositScreenshot) return;
    if (depositAmount < 10) return;

    setDepositSubmitting(true);
    const finalRef = depositRef.trim() || (`${depositMethod === 'telebirr' ? 'TLB' : 'CBE'}-` + Math.floor(100000000 + Math.random() * 900000000));

    if (onDepositRequest) {
      onDepositRequest(
        depositAmount,
        depositMethod,
        finalRef,
        depositPhone.trim() || '0910961881',
        user.fullName || 'ደንበኛ',
        depositScreenshot || undefined
      );
    }

    triggerHaptic('medium');
    playNotificationSound('win');
    triggerConfetti();

    setDepositSuccessMsg(
      lang === 'am'
        ? `የ ${depositAmount.toLocaleString()} ብር የ${depositMethod === 'telebirr' ? 'ቴሌብር' : 'ንግድ ባንክ (CBE)'} ሙሌት ጥያቄዎ በተሳካ ሁኔታ ተከናውኗል! ወዲያውኑ ወደ ዋሌትዎ ገቢ ተደርጓል።`
        : `Your ${depositAmount.toLocaleString()} ETB ${depositMethod === 'telebirr' ? 'Telebirr' : 'CBE'} deposit was successful and credited to your wallet!`
    );

    setDepositSubmitting(false);
    setTimeout(() => {
      setDepositSuccessMsg(null);
      setIsDepositModalOpen(false);
      setDepositRef('');
      setDepositScreenshot(null);
      setDepositScreenshotName('');
    }, 2400);
  };

  const handlePerformWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount < 50 || withdrawAmount > user.walletBalance || !withdrawAccountNumber.trim()) return;
    setWithdrawSubmitting(true);
    if (onWithdrawRequest) {
      onWithdrawRequest(withdrawAmount, `${withdrawAccountType.toUpperCase()}: ${withdrawAccountNumber.trim()}`);
    }
    triggerHaptic('medium');
    playNotificationSound('click');
    setWithdrawSuccessMsg(
      lang === 'am' 
        ? `የ ${withdrawAmount.toLocaleString()} ብር የወጪ ጥያቄዎ ለአስተዳዳሪው ተልኳል! ወደ ሂሳብዎ (${withdrawAccountType === 'telebirr' ? 'ቴሌብር' : 'ንግድ ባንክ'}: ${withdrawAccountNumber.trim()}) ይላካል።`
        : `Withdrawal request sent to admin! Funds will be transferred to your account (${withdrawAccountType.toUpperCase()}: ${withdrawAccountNumber.trim()}).`
    );
    setWithdrawSubmitting(false);
    setTimeout(() => {
      setWithdrawSuccessMsg(null);
      setIsWithdrawModalOpen(false);
    }, 2200);
  };

  const activeLotteries: LotteryDraw[] = CANONICAL_LOTTERIES_CONFIG.map((config) => {
    const foundActive = lotteries.find(
      l => (l.status === 'active' || l.status === 'upcoming') && (l.id === config.id || l.ticketPrice === config.ticketPrice)
    );
    const roundTicketsCount = tickets.filter(
      t => (t.lotteryId === config.id || t.pricePaid === config.ticketPrice) && (t.status === 'active' || t.status === 'won') && (!t.round || t.round === (foundActive?.round || 1))
    ).length;
    const soldCount = Math.max(foundActive?.ticketsSold || 0, roundTicketsCount);

    if (foundActive) {
      return {
        ...foundActive,
        bannerUrl: foundActive.bannerUrl || getBanknoteForLottery(config.ticketPrice),
        totalInventory: 200,
        ticketsSold: soldCount,
        round: foundActive.round || 1,
      };
    }
    const completedList = lotteries.filter(
      l => (l.id.includes(config.id) || l.ticketPrice === config.ticketPrice) && (l.status === 'completed' || !!l.winningNumbers)
    );
    const maxCompletedRound = completedList.reduce((max, l) => Math.max(max, l.round || 1), 0);
    const nextRound = maxCompletedRound > 0 ? maxCompletedRound + 1 : 1;

    return {
      id: config.id,
      titleAm: config.titleAm,
      titleEn: config.titleEn,
      code: config.code,
      category: config.category,
      bannerUrl: getBanknoteForLottery(config.ticketPrice),
      ticketPrice: config.ticketPrice,
      totalInventory: 200,
      ticketsSold: soldCount,
      round: nextRound,
      jackpotAmount: config.jackpotAmount,
      drawDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      status: 'active' as const,
      prizes: [
        { rank: 1, titleAm: '1ኛ ዕጣ (ጃክፖት)', titleEn: 'Jackpot Prize', amount: config.jackpotAmount, winnersCount: 1 },
      ],
    };
  });

  const drawnLotteries = lotteries.filter(l => l.status === 'completed' || !!l.winningNumbers);

  const handleOpenPurchase = (lottery: LotteryDraw) => {
    // 20,000 ETB Derash is locked / loading / coming soon
    if (lottery.ticketPrice === 200 || lottery.id === 'lot_derash_20000' || lottery.jackpotAmount === 20000) {
      setLockedLotteryModalOpen(true);
      triggerHaptic('error');
      playNotificationSound('alert');
      return;
    }
    setSelectedLottery(lottery);
    setPurchaseQuantity(1);
    setCustomNumbers([generateLuckyNumber()]);
    playNotificationSound('click');
  };

  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1 || newQty > 20) return;
    setPurchaseQuantity(newQty);
    
    setCustomNumbers(prev => {
      if (newQty > prev.length) {
        const added: string[] = [];
        for (let i = prev.length; i < newQty; i++) {
          added.push(generateLuckyNumber());
        }
        return [...prev, ...added];
      } else {
        return prev.slice(0, newQty);
      }
    });
  };

  const handleCutTicketWithWallet = () => {
    if (!selectedLottery) return;
    const totalCost = selectedLottery.ticketPrice * customNumbers.length;
    if (user.walletBalance < totalCost) {
      triggerHaptic('heavy');
      playNotificationSound('alert');
      return;
    }
    const reference = 'WLT-' + Math.floor(100000 + Math.random() * 900000);
    onBuyTickets(selectedLottery, customNumbers, 'wallet', reference, user.phone, user.fullName);
    setPurchasedSuccess({
      lotteryTitle: lang === 'am' ? selectedLottery.titleAm : selectedLottery.titleEn,
      ticketNumbers: [...customNumbers],
      reference,
      totalAmount: totalCost,
      phone: user.phone,
    });
    setSelectedLottery(null);
    triggerConfetti();
    playNotificationSound('success');
    triggerHaptic('medium');
  };

  const handleVerifyAdminPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (enteredPin.trim() === '2728') {
      setIsAdminPinModalOpen(false);
      setEnteredPin('');
      setPinError(null);
      triggerHaptic('medium');
      playNotificationSound('success');
      onNavigateToAdmin();
    } else {
      setPinError(lang === 'am' ? 'የተሳሳተ ሚስጥር ቁጥር! እባክዎ ደግመው ይሞክሩ።' : 'Incorrect PIN! Please try again.');
      setEnteredPin('');
      triggerHaptic('error');
      playNotificationSound('alert');
    }
  };

  const handleVerifyTicket = (queryNum?: string) => {
    const rawTarget = (queryNum || verifySearchQuery).trim().replace('#', '');
    if (!rawTarget) return;
    if (queryNum) setVerifySearchQuery(rawTarget);

    const matchedUserTicket = tickets.find(t => 
      t.ticketNumber === rawTarget || t.id.toLowerCase() === rawTarget.toLowerCase() || t.securityHash.includes(rawTarget)
    );
    const matchedDraw = drawnLotteries.find(d => 
      d.winningNumbers?.firstPrize === rawTarget ||
      d.winningNumbers?.secondPrize === rawTarget ||
      d.winningNumbers?.thirdPrize === rawTarget
    );

    if (matchedDraw) {
      const isFirst = matchedDraw.winningNumbers?.firstPrize === rawTarget;
      const isSecond = matchedDraw.winningNumbers?.secondPrize === rawTarget;
      const prizeAmount = isFirst 
        ? matchedDraw.jackpotAmount 
        : isSecond 
        ? Math.round(matchedDraw.jackpotAmount * 0.1) 
        : Math.round(matchedDraw.jackpotAmount * 0.04);
      const prizeRank = '1ኛ ታላቅ ዕጣ (Jackpot)';

      setVerifyActiveResult({
        found: true,
        ticketNumber: rawTarget,
        lotteryTitle: lang === 'am' ? matchedDraw.titleAm : matchedDraw.titleEn,
        round: matchedDraw.round || 1,
        status: 'won',
        prizeAmount,
        prizeTitle: `${prizeRank} (${prizeAmount.toLocaleString()} ብር)`,
        drawDate: matchedDraw.drawDate,
        securityHash: matchedDraw.provablyFairSeed || 'ETH-SEC-HASH-VERIFIED',
      });
      playNotificationSound('win');
      return;
    }

    if (matchedUserTicket) {
      setVerifyActiveResult({
        found: true,
        ticketNumber: matchedUserTicket.ticketNumber,
        lotteryTitle: matchedUserTicket.lotteryTitleAm,
        round: matchedUserTicket.round || 1,
        status: 'active',
        prizeAmount: 0,
        prizeTitle: lang === 'am' ? 'ንቁ ይፋዊ ቲኬት (ዕጣ ያልወጣለት)' : 'Active Ticket (Not Drawn)',
        purchasedAt: matchedUserTicket.purchasedAt,
        pricePaid: matchedUserTicket.pricePaid,
        paymentRef: matchedUserTicket.paymentReference,
        securityHash: matchedUserTicket.securityHash,
      });
      playNotificationSound('click');
      return;
    }

    setVerifyActiveResult({
      found: false,
      ticketNumber: rawTarget,
      lotteryTitle: '',
      status: 'not_found',
    });
    playNotificationSound('click');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header with secret 5-clicks Admin trigger & User Auth Status */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 pt-[env(safe-area-inset-top,0px)]">
        <div className="w-full px-4 py-2.5 flex items-center justify-between">
          <div className="w-10" />

          <div 
            onClick={() => {
              setHeaderClicks(prev => {
                const next = prev + 1;
                if (next >= 5) {
                  setEnteredPin('');
                  setPinError(null);
                  setIsAdminPinModalOpen(true);
                  return 0;
                }
                return next;
              });
            }}
            className="flex flex-col items-center justify-center text-center cursor-pointer select-none"
          >
            <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-yellow-400 drop-shadow-[0_2px_14px_rgba(250,204,21,0.65)] uppercase select-none leading-none">
              ENAT
            </h1>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-300 tracking-wide mt-0.5">
              (Enate Online Lottery)
            </span>
          </div>

          <div className="w-10" />
        </div>
      </header>

      {/* Push Notification Bar */}
      {notifications.length > 0 && !notifications[0].isRead && (
        <div className="mx-3 mt-2 bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border border-emerald-500/50 rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 text-base">
              🎉
            </span>
            <div className="min-w-0">
              <h5 className="text-xs font-black text-emerald-300">
                {lang === 'am' ? 'ገንዘብ ወደ ዋሌትዎ ገቢ ሆኗል!' : 'Funds Deposited to Wallet!'}
              </h5>
              <p className="text-[11px] text-slate-200 truncate">
                {lang === 'am' ? notifications[0].messageAm : notifications[0].messageEn}
              </p>
            </div>
          </div>
          {onClearNotification && (
            <button
              onClick={() => onClearNotification(notifications[0].id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full px-3 py-3.5 pb-24 sm:pb-28 space-y-4">
        {activeMainTab === 'active' && (
          <div className="space-y-4">
            <div className="flex flex-col space-y-4">
              {activeLotteries.map((draw) => {
                const is20kLocked = draw.ticketPrice === 200 || draw.id === 'lot_derash_20000' || draw.jackpotAmount === 20000;
                const soldCount = draw.ticketsSold || 0;
                const totalSpots = 200;
                const fillPercent = Math.min(100, Math.round((soldCount / totalSpots) * 100));
                const remainingSpots = Math.max(0, totalSpots - soldCount);

                return (
                  <div 
                    key={draw.id}
                    className={`bg-slate-900 border rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col group ${
                      is20kLocked 
                        ? 'border-amber-500/40 hover:border-amber-500/60' 
                        : 'border-slate-800 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="relative h-40 sm:h-48 overflow-hidden bg-slate-950">
                      <img 
                        src={draw.bannerUrl || getBanknoteForLottery(draw.ticketPrice)} 
                        alt={lang === 'am' ? draw.titleAm : draw.titleEn} 
                        referrerPolicy="no-referrer"
                        className={`w-full h-full object-cover transition-transform duration-500 opacity-98 ${
                          is20kLocked ? 'blur-[1.5px] scale-100' : 'group-hover:scale-105'
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                      
                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 bg-slate-950/90 backdrop-blur-md text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-lg text-[11px] font-black shadow-md flex items-center space-x-1">
                        <span>🏷️ {lang === 'am' ? `ዙር ${draw.round || 1}` : `Round ${draw.round || 1}`}</span>
                      </div>

                      {is20kLocked ? (
                        <div className="absolute top-2.5 right-2.5 bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-lg text-[11px] font-black shadow-md flex items-center gap-1 animate-pulse">
                          <Lock className="w-3 h-3 text-slate-950 stroke-[3]" />
                          <span>Loading... (በቅርብ ቀን)</span>
                        </div>
                      ) : (
                        <div className="absolute top-2.5 right-2.5 bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-lg text-[11px] font-black shadow-md">
                          {lang === 'am' ? `ዋጋ: ${draw.ticketPrice} ብር` : `${draw.ticketPrice} ETB`}
                        </div>
                      )}

                      {/* 20k Locked Frosted Overlay with Loading text */}
                      {is20kLocked && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-3 z-10">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400 mb-2 shadow-lg animate-pulse">
                            <Lock className="w-6 h-6 text-amber-400" />
                          </div>
                          <span className="text-sm sm:text-base font-black text-white tracking-wide drop-shadow">
                            ባለ 20,000 ብር ደራሽ
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/40 text-[11px] font-bold shadow">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            <span>Loading... (በቅርብ ቀን ይከፈታል)</span>
                          </div>
                        </div>
                      )}

                      <div className="absolute bottom-2.5 left-3 right-3 z-10">
                        <h4 className="text-lg font-black text-white drop-shadow-md">
                          {lang === 'am' ? draw.titleAm : draw.titleEn}
                        </h4>
                      </div>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      {/* Jackpot Prize Display */}
                      <div className={`border rounded-xl p-3 text-center ${
                        is20kLocked 
                          ? 'bg-slate-950/90 border-amber-500/30' 
                          : 'bg-slate-950 border-slate-800/80'
                      }`}>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                          {lang === 'am' ? 'የጃክፖት ሽልማት' : 'Jackpot Prize'}
                        </span>
                        <div className={`text-2xl font-black font-sans tabular-nums mt-0.5 ${
                          is20kLocked ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {formatETB(draw.jackpotAmount)}
                        </div>
                      </div>

                      {/* Participant / Ticket Volume Meter (የሰው ብዛት መቁጠሪያ) */}
                      {is20kLocked ? (
                        <div className="space-y-1.5 bg-slate-950/90 border border-amber-500/30 rounded-xl p-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                              <Lock className="w-3.5 h-3.5" />
                              <span>{lang === 'am' ? 'የተሳታፊዎች ምዝገባ:' : 'Registration Volume:'}</span>
                            </div>
                            <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                              <span>Loading...</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2.5 p-0.5 border border-slate-800 overflow-hidden">
                            <div className="bg-amber-500/40 h-full rounded-full w-1/3 animate-pulse" />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>🔒 በቅርብ ቀን ይከፈታል</span>
                            <span className="text-amber-400/90 font-medium">በዝግጅት ላይ (Locked)</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-950/90 border border-emerald-500/30 rounded-xl py-2.5 px-4 flex items-center justify-between font-mono">
                          <span className="text-emerald-400 font-black text-sm">{soldCount}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 text-xs">/</span>
                            <span className="text-white font-black text-sm">200</span>
                          </div>
                        </div>
                      )}

                      {/* Action Button */}
                      {is20kLocked ? (
                        <button
                          type="button"
                          onClick={() => {
                            setLockedLotteryModalOpen(true);
                            triggerHaptic('error');
                            playNotificationSound('alert');
                          }}
                          className="w-full h-12 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-amber-300 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 transition border border-amber-500/40 shadow-lg cursor-pointer"
                        >
                          <Lock className="w-4 h-4 text-amber-400" />
                          <span>
                            {lang === 'am' 
                              ? '🔒 በቅርብ ቀን ይከፈታል (Loading...)' 
                              : '🔒 Coming Soon (Loading...)'}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenPurchase(draw)}
                          className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black rounded-xl text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-500/20"
                        >
                          <TicketIcon className="w-4 h-4" />
                          <span>
                            {lang === 'am' 
                              ? `ቲኬት ቁረጥ (${draw.ticketPrice} ብር)` 
                              : `Cut Ticket for ${draw.ticketPrice} ETB`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeMainTab === 'drawn' && (
          <WinnersHistoryView
            drawnLotteries={drawnLotteries}
            tickets={tickets}
            lang={lang}
            onVerifyTicket={(num) => {
              setVerifySearchQuery(num);
              handleVerifyTicket(num);
              triggerHaptic('medium');
              playNotificationSound('click');
            }}
            triggerHaptic={triggerHaptic}
            playNotificationSound={playNotificationSound}
          />
        )}

        {activeMainTab === 'wallet' && (
          <WalletView
            user={user}
            transactions={transactions}
            lang={lang}
            onOpenDeposit={() => {
              setIsDepositModalOpen(true);
              triggerHaptic('medium');
              playNotificationSound('click');
            }}
            onOpenWithdraw={() => {
              setIsWithdrawModalOpen(true);
              triggerHaptic('medium');
              playNotificationSound('click');
            }}
            triggerHaptic={triggerHaptic}
            playNotificationSound={playNotificationSound}
          />
        )}


      </main>

      {/* Ticket Selection & Purchase Modal */}
      {selectedLottery && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-base">
                    {lang === 'am' ? selectedLottery.titleAm : selectedLottery.titleEn}
                  </h4>
                  <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                    {lang === 'am' ? `ዙር ${(selectedLottery.ticketsSold || 0) >= 200 ? (selectedLottery.round || 1) + 1 : selectedLottery.round || 1}` : `Round ${(selectedLottery.ticketsSold || 0) >= 200 ? (selectedLottery.round || 1) + 1 : selectedLottery.round || 1}`}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLottery(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {(selectedLottery.ticketsSold || 0) >= 200 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-300">
                {lang === 'am' 
                  ? `ማስታወሻ: የዙር ${selectedLottery.round || 1} 200 ቲኬቶች ስለተሞሉ ቲኬትዎ ለቀጣዩ (ዙር ${(selectedLottery.round || 1) + 1}) ይመዘገባል።`
                  : `Note: Round ${selectedLottery.round || 1} 200 tickets are full. Your tickets will register for Round ${(selectedLottery.round || 1) + 1}.`}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                {lang === 'am' ? 'የቲኬት ብዛት ይምረጡ:' : 'Select Quantity:'}
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(purchaseQuantity - 1)}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg"
                >
                  -
                </button>
                <div className="flex-1 text-center font-mono font-bold text-xl text-white bg-slate-950 py-2 rounded-xl border border-slate-800">
                  {purchaseQuantity}
                </div>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(purchaseQuantity + 1)}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg"
                >
                  +
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                {[1, 3, 5, 10].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleQuantityChange(n)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold border transition ${
                      purchaseQuantity === n 
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">
                  {lang === 'am' ? 'የዕድል ቁጥሮችዎ:' : 'Generated Lucky Numbers:'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const regenerated = Array.from({ length: purchaseQuantity }, () => generateLuckyNumber());
                    setCustomNumbers(regenerated);
                    playNotificationSound('click');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'am' ? 'ቀይር' : 'Reroll'}</span>
                </button>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800">
                {customNumbers.map((num, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs px-2 py-1 bg-slate-900 rounded-lg">
                    <span className="text-slate-400">ቲኬት {idx + 1}</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">#{num}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-400 block">{lang === 'am' ? 'ጠቅላላ ክፍያ' : 'Total Amount'}</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    {formatETB(selectedLottery.ticketPrice * purchaseQuantity)}
                  </span>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <span>{purchaseQuantity} × {selectedLottery.ticketPrice} ብር</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'am' ? 'ያለዎት ዋሌት:' : 'Wallet:'}</span>
                </span>
                <span className={`font-mono font-bold ${user.walletBalance >= selectedLottery.ticketPrice * purchaseQuantity ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {user.walletBalance.toLocaleString()} ብር
                </span>
              </div>

              {user.walletBalance < selectedLottery.ticketPrice * purchaseQuantity && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-rose-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{lang === 'am' ? 'በቂ የዋሌት ሂሳብ የለዎትም!' : 'Insufficient Wallet Balance!'}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {lang === 'am' 
                      ? `የሚያስፈልገው ${(selectedLottery.ticketPrice * purchaseQuantity).toLocaleString()} ብር ሲሆን በእርስዎ ዋሌት ያለው ${user.walletBalance.toLocaleString()} ብር ነው። እባክዎ አስቀድመው ገንዘብ ይሙሉ (Deposit)።`
                      : `Required: ${(selectedLottery.ticketPrice * purchaseQuantity).toLocaleString()} ETB, but your wallet has ${user.walletBalance.toLocaleString()} ETB. Please make a deposit first.`}
                  </p>
                </div>
              )}

              <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-white text-xs font-sans">
                    {user.fullName && user.fullName.trim() ? user.fullName : (user.phone || '')}
                  </span>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="font-bold text-teal-400 font-sans tabular-nums text-xs">
                    {user.phone || '0910961881'}
                  </span>
                </div>
              </div>
            </div>

            {user.walletBalance < selectedLottery.ticketPrice * purchaseQuantity ? (
              <button
                disabled
                className="w-full py-3.5 bg-slate-800/80 text-slate-500 font-bold rounded-xl text-xs cursor-not-allowed border border-slate-700/50 flex items-center justify-center space-x-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-400/60" />
                <span>{lang === 'am' ? 'በቂ ቀሪ ሂሳብ የለም' : 'Insufficient Balance'}</span>
              </button>
            ) : (
              <button
                onClick={handleCutTicketWithWallet}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 active:scale-95 text-slate-950 font-black rounded-xl text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2"
              >
                <TicketIcon className="w-4 h-4" />
                <span>
                  {lang === 'am' 
                    ? `ቲኬት ቁረጥ (${(selectedLottery.ticketPrice * purchaseQuantity).toLocaleString()} ብር ከዋሌት)` 
                    : `Cut Ticket (${(selectedLottery.ticketPrice * purchaseQuantity).toLocaleString()} ETB from Wallet)`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ticket Purchased Success Modal */}
      {purchasedSuccess && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl w-full max-w-md p-6 space-y-5 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">
                {lang === 'am' ? 'ቲኬትዎ በትክክል ተቆርጧል!' : 'Tickets Purchased Successfully!'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'am' ? 'ቲኬቶችዎ በሲስተሙ ተመዝግበዋል' : 'Your tickets have been issued and enrolled.'}
              </p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="text-slate-400">{lang === 'am' ? 'የሎተሪ ዓይነት:' : 'Lottery:'}</span>
                <span className="font-bold text-white">{purchasedSuccess.lotteryTitle}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span className="text-slate-400">{lang === 'am' ? 'ማጣቀሻ ቁጥር:' : 'Reference:'}</span>
                <span className="font-mono text-emerald-400 font-bold">{purchasedSuccess.reference}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span className="text-slate-400">{lang === 'am' ? 'የተከፈለው መጠን:' : 'Amount Paid:'}</span>
                <span className="font-mono text-white font-bold">{formatETB(purchasedSuccess.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span className="text-slate-400">{lang === 'am' ? 'የዋሌት ቀሪ ሂሳብ:' : 'Remaining Balance:'}</span>
                <span className="font-mono text-emerald-400 font-bold">{formatETB(user.walletBalance)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span className="text-slate-400">{lang === 'am' ? 'የተቆረጠበት ቀን:' : 'Purchase Date:'}</span>
                <span className="font-sans text-amber-300 font-semibold">{formatEthiopianDate(new Date(), true)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1.5">{lang === 'am' ? 'የዕድል ቁጥሮችዎ:' : 'Your Lucky Numbers:'}</span>
                <div className="flex flex-wrap gap-1.5">
                  {purchasedSuccess.ticketNumbers.map((num, i) => (
                    <span key={i} className="px-3 py-1 bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-mono font-black text-sm rounded-lg">
                      #{num}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setPurchasedSuccess(null)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm transition"
            >
              {lang === 'am' ? 'ተጠናቋል (Done)' : 'Done'}
            </button>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.7)] pb-[max(env(safe-area-inset-bottom,0px),10px)]">
        <div className="max-w-md sm:max-w-lg mx-auto px-2 py-1 grid grid-cols-3 gap-2 text-center">
          <button
            onClick={() => {
              setActiveMainTab('active');
              triggerHaptic('light');
              playNotificationSound('click');
            }}
            aria-label={lang === 'am' ? 'ዕጣዎች' : 'Lotteries'}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition min-h-[48px] active:scale-95 ${
              activeMainTab === 'active'
                ? 'text-emerald-400 bg-emerald-500/15 font-black ring-1 ring-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <div className="relative">
              <TicketIcon className="w-5 h-5 mx-auto" />
              <span className="absolute -top-1 -right-2 px-1 min-w-[12px] h-3 bg-emerald-500 text-slate-950 text-[8px] font-black rounded-full flex items-center justify-center">
                {activeLotteries.length}
              </span>
            </div>
            <span className="text-[11px] mt-0.5 font-bold leading-none tracking-tight">
              {lang === 'am' ? 'ዕጣዎች' : 'Draws'}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveMainTab('drawn');
              triggerHaptic('light');
              playNotificationSound('click');
            }}
            aria-label={lang === 'am' ? 'አሸናፊዎች' : 'Winners'}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition min-h-[48px] active:scale-95 ${
              activeMainTab === 'drawn'
                ? 'text-amber-400 bg-amber-500/15 font-black ring-1 ring-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <div className="relative">
              <Trophy className="w-5 h-5 mx-auto" />
              {drawnLotteries.length > 0 && (
                <span className="absolute -top-1 -right-2 px-1 min-w-[12px] h-3 bg-amber-500 text-slate-950 text-[8px] font-black rounded-full flex items-center justify-center">
                  {drawnLotteries.length}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-0.5 font-bold leading-none tracking-tight">
              {lang === 'am' ? 'አሸናፊዎች' : 'Winners'}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveMainTab('wallet');
              triggerHaptic('light');
              playNotificationSound('click');
            }}
            aria-label={lang === 'am' ? 'ዋሌት' : 'Wallet'}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition min-h-[48px] active:scale-95 ${
              activeMainTab === 'wallet'
                ? 'text-emerald-400 bg-emerald-500/15 font-black ring-1 ring-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <div className="relative">
              <Wallet className="w-5 h-5 mx-auto" />
            </div>
            <span className="text-[11px] mt-0.5 font-bold leading-none tracking-tight">
              {lang === 'am' ? 'ዋሌት' : 'Wallet'}
            </span>
          </button>
        </div>
      </nav>

      {/* Secret Admin PIN Modal (PIN: 2728 strictly secret) */}
      {isAdminPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xs p-6 space-y-4 shadow-2xl relative text-center">
            <button
              type="button"
              onClick={() => {
                setIsAdminPinModalOpen(false);
                setEnteredPin('');
                setPinError(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center mx-auto text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wider text-white">
                ADMIN LOGIN
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                የአድሚን ሚስጥር ቁጥር ያስገቡ
              </p>
            </div>
            {pinError && (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs py-2 px-3 rounded-xl font-medium animate-in shake">
                {pinError}
              </div>
            )}
            <form onSubmit={handleVerifyAdminPin} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError(null);
                }}
                placeholder="••••"
                className="w-full text-center tracking-[0.5em] text-2xl font-bold bg-slate-950 border border-slate-700 rounded-2xl py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminPinModalOpen(false);
                    setEnteredPin('');
                    setPinError(null);
                  }}
                  className="py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
                >
                  {lang === 'am' ? 'ተመለስ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={enteredPin.length === 0}
                  className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition disabled:opacity-50"
                >
                  {lang === 'am' ? 'ግባ' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 p-5 sm:p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">
                    {lang === 'am' ? 'ገንዘብ ሙላ (Deposit)' : 'Deposit Funds to Wallet'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'am' ? 'በቴሌብር ወይም በንግድ ባንክ በቀላሉ ይሙሉ' : 'Instant deposit via Telebirr or CBE'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDepositModalOpen(false);
                  setDepositSuccessMsg(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {depositSuccessMsg ? (
              <div className="p-5 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl border border-emerald-500/40">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-xs text-emerald-200 font-bold leading-relaxed">
                  {depositSuccessMsg}
                </p>
              </div>
            ) : (
              <form onSubmit={handlePerformDeposit} className="space-y-4">

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {lang === 'am' ? 'የሚሞሉት መጠን (ብር):' : 'Deposit Amount (ETB):'}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDepositAmount(amt)}
                        className={`py-2 rounded-xl font-mono text-xs font-bold transition border ${
                          depositAmount === amt 
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black' 
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={10}
                    max={100000}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Math.max(10, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="መጠን ያስገቡ..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {lang === 'am' ? 'የከፈሉበት ዘዴ:' : 'Payment Method:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDepositMethod('telebirr')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                        depositMethod === 'telebirr'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-black'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      ቴሌብር (Telebirr)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositMethod('cbe_birr')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                        depositMethod === 'cbe_birr'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/60 font-black'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      ንግድ ባንክ (CBE Account)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {lang === 'am' ? 'የገንዘብ መሙያ አካውንቶች:' : 'Deposit Accounts:'}
                  </label>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>ቴሌብር (Telebirr):</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 font-bold">0910961881</span>
                        <button
                          onClick={() => navigator.clipboard.writeText('0910961881')}
                          className="text-[10px] text-slate-500 hover:text-emerald-400"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>ንግድ ባንክ (CBE):</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sky-400 font-bold">1000321337124</span>
                        <button
                          onClick={() => navigator.clipboard.writeText('1000321337124')}
                          className="text-[10px] text-slate-500 hover:text-sky-400"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {lang === 'am' ? 'የክፍያ ማጣቀሻ ቁጥር (Transaction Ref / SMS):' : 'Transaction Reference:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={depositRef}
                    onChange={(e) => setDepositRef(e.target.value)}
                    placeholder={lang === 'am' ? 'ምሳሌ: TLB-889......' : 'e.g., TLB-889.....'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block flex items-center justify-between">
                    <span>{lang === 'am' ? 'የክፍያ ደረሰኝ (Screenshot - አማራጭ):' : 'Payment Screenshot (Optional):'}</span>
                    <span className="text-[10px] text-slate-400">Max 8MB</span>
                  </label>
                  <label className="flex items-center justify-center gap-2 p-3 bg-slate-950 border border-dashed border-slate-700 hover:border-emerald-500 rounded-xl cursor-pointer transition text-xs text-slate-300">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span className="truncate">{depositScreenshotName || (lang === 'am' ? 'የክፍያ ስክሪንሾት ፎቶ ይጫኑ...' : 'Upload screenshot image...')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotFileChange}
                      className="hidden"
                    />
                  </label>
                  {depositScreenshotError && (
                    <p className="text-[11px] text-rose-400 font-medium">{depositScreenshotError}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {lang === 'am' ? 'ስልክ ቁጥር:' : 'Phone Number:'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={depositPhone}
                    onChange={(e) => setDepositPhone(e.target.value)}
                    placeholder="0910961881"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={depositSubmitting || (!depositRef.trim() && !depositScreenshot)}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{depositSubmitting ? (lang === 'am' ? 'እየተላከ ነው...' : 'Sending...') : (lang === 'am' ? 'የሙሌት ጥያቄ ላክ (Submit)' : 'Submit Deposit Request')}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 p-5 sm:p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
                  <ArrowUpRight className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">
                    {lang === 'am' ? 'ገንዘብ ማውጣት (Withdrawal)' : 'Withdraw Funds'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'am' ? 'ያሸነፉትን ገንዘብ በቀጥታ ወደ ቴሌብር ወይም ሲቢኢ አካውንትዎ ያውጡ' : 'Direct payout to your Telebirr or CBE account'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWithdrawModalOpen(false);
                  setWithdrawSuccessMsg(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {withdrawSuccessMsg ? (
              <div className="p-5 bg-amber-950/60 border border-amber-500/50 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-xl border border-amber-500/40">
                  <Check className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-xs text-amber-200 font-bold leading-relaxed">
                  {withdrawSuccessMsg}
                </p>
              </div>
            ) : (
              <form onSubmit={handlePerformWithdraw} className="space-y-4">
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {lang === 'am' ? 'ያለዎት ቀሪ ሂሳብ:' : 'Available Balance:'}
                  </span>
                  <span className="font-mono font-black text-base text-emerald-400">
                    {user.walletBalance.toLocaleString()} ብር
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {lang === 'am' ? 'የሚወጣው መጠን (ቢያንስ 50 ብር):' : 'Withdraw Amount (Min 50 ETB):'}
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setWithdrawAmount(amt)}
                        className={`py-2 rounded-xl font-mono text-xs font-bold transition border ${
                          withdrawAmount === amt
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={50}
                    max={user.walletBalance || 100000}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="መጠን ያስገቡ..."
                  />
                  {user.walletBalance < withdrawAmount && (
                    <p className="text-[11px] text-rose-400 font-medium">
                      ያለዎት የዋሌት ቀሪ ሂሳብ አይበቃም
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {lang === 'am' ? 'የመቀበያ አካውንት ዓይነት (CBE ወይም ቴሌብር):' : 'Select Account Type (CBE / Telebirr):'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawAccountType('telebirr')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                        withdrawAccountType === 'telebirr'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-black'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      ቴሌብር (Telebirr)
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawAccountType('cbe')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                        withdrawAccountType === 'cbe'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/60 font-black'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      ንግድ ባንክ (CBE Account)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {lang === 'am' ? (withdrawAccountType === 'telebirr' ? 'የቴሌብር ስልክ ቁጥር:' : 'የንግድ ባንክ ሂሳብ ቁጥር:') : 'Account Number / Phone:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawAccountNumber}
                    onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                    placeholder={withdrawAccountType === 'telebirr' ? '0910961881' : '1000321337124'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    {lang === 'am' ? 'አስተዳዳሪው ክፍያውን ወደዚህ ሂሳብ በቀጥታ ይልካል' : 'Admin will transfer funds to this account'}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={withdrawSubmitting || withdrawAmount < 50 || withdrawAmount > user.walletBalance}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{withdrawSubmitting ? (lang === 'am' ? 'በማስኬድ ላይ...' : 'Processing...') : (lang === 'am' ? 'የማውጣት ጥያቄ ላክ (Withdraw)' : 'Request Withdrawal')}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}



      {/* Screenshot Preview Modal */}
      {previewScreenshotModalUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewScreenshotModalUrl(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-3 p-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'am' ? 'የክፍያ ደረሰኝ (Screenshot)' : 'Payment Screenshot Receipt'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setPreviewScreenshotModalUrl(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black max-h-[70vh] flex items-center justify-center border border-slate-800">
              <img
                src={previewScreenshotModalUrl}
                alt="Receipt Full Preview"
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewScreenshotModalUrl(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                {lang === 'am' ? 'ዝጋ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
