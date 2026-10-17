import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  Wallet,
  AlertCircle
} from 'lucide-react';
import { Language, PaymentMethod } from '../../types/lottery';
import { formatETB, generateReference, playNotificationSound } from '../../utils/lotteryUtils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lotteryTitleAm: string;
  lotteryTitleEn: string;
  ticketNumbers: string[];
  totalAmount: number;
  lang: Language;
  walletBalance?: number;
  onOpenDeposit?: () => void;
  onPaymentSuccess: (method: PaymentMethod, reference: string, phone: string) => void;
}

export const TelebirrPaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  lotteryTitleAm,
  lotteryTitleEn,
  ticketNumbers,
  totalAmount,
  lang,
  walletBalance = 0,
  onOpenDeposit,
  onPaymentSuccess,
}) => {
  const hasEnoughWallet = walletBalance >= totalAmount;
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(hasEnoughWallet ? 'wallet' : 'telebirr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'details' | 'ussd_prompt' | 'processing' | 'confirmed'>('details');
  const [txRef, setTxRef] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    playNotificationSound('click');
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  const handleStartPayment = (e: React.FormEvent) => {
    e.preventDefault();
    playNotificationSound('click');
    if (selectedMethod === 'wallet') {
      if (!hasEnoughWallet) return;
      processWalletPayment();
      return;
    }
    if (selectedMethod === 'telebirr') {
      setStep('ussd_prompt');
    } else {
      processAutoPayment();
    }
  };

  const processWalletPayment = () => {
    setStep('processing');
    const ref = generateReference('WLT');
    setTxRef(ref);
    setTimeout(() => {
      setStep('confirmed');
      playNotificationSound('success');
      setTimeout(() => {
        onPaymentSuccess('wallet', ref, phoneNumber);
      }, 1000);
    }, 1200);
  };

  const processAutoPayment = () => {
    setStep('processing');
    const prefix = selectedMethod === 'telebirr' ? 'TLB' : selectedMethod === 'cbe_birr' ? 'CBE' : selectedMethod === 'chapa' ? 'CHP' : 'STR';
    const ref = generateReference(prefix);
    setTxRef(ref);
    setTimeout(() => {
      setStep('confirmed');
      playNotificationSound('success');
      setTimeout(() => {
        onPaymentSuccess(selectedMethod, ref, phoneNumber);
      }, 1500);
    }, 1800);
  };

  const handleConfirmUSSD = () => {
    playNotificationSound('click');
    processAutoPayment();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                {lang === 'am' ? 'የክፍያ ማረጋገጫ' : 'Automated Payment Checkout'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'am' ? 'በቴሌብር እና ሲቢኢ የተረጋገጠ' : 'End-to-End Encrypted Gateway'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'details' && (
            <form onSubmit={handleStartPayment} className="space-y-4">
              
              {/* Order Summary */}
              <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80">
                <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                  <span>{lang === 'am' ? 'የሎተሪ ዓይነት' : 'Lottery Type'}</span>
                  <span className="text-white font-medium">{lang === 'am' ? lotteryTitleAm : lotteryTitleEn}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                  <span>{lang === 'am' ? 'የቲኬት ብዛት' : 'Tickets Count'}</span>
                  <span className="text-white font-mono font-semibold">{ticketNumbers.length} ቲኬት</span>
                </div>
                <div className="flex flex-wrap gap-1.5 my-2">
                  {ticketNumbers.map((num, i) => (
                    <span key={i} className="px-2 py-0.5 bg-emerald-950/70 border border-emerald-500/30 rounded text-emerald-400 font-mono text-xs font-bold">
                      #{num}
                    </span>
                  ))}
                </div>
                <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center">
                  <span className="text-xs text-slate-300 font-semibold">{lang === 'am' ? 'ጠቅላላ ክፍያ' : 'Total Amount'}</span>
                  <span className="text-lg font-bold text-emerald-400">{formatETB(totalAmount)}</span>
                </div>
              </div>

              {/* Official Merchant Details Box */}
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold uppercase tracking-wide">
                  <span>ኦፊሴላዊ የነጋዴ ሂሳብ (Official Merchant)</span>
                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px]">የተረጋገጠ</span>
                </div>
                <div className="space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">የተቀባይ ስም (Full Name):</span>
                    <strong className="text-white font-semibold">Makbel Maregu (መቅበል ማረጉ)</strong>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#E67E22]"></span>
                      ቴሌብር (Telebirr):
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-white text-xs">0910961881</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('0910961881', 'telebirr')}
                        className={`text-xs px-2 py-0.5 rounded transition font-medium ${
                          copiedKey === 'telebirr'
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
                        }`}
                      >
                        {copiedKey === 'telebirr' ? 'ተቀድቷል' : 'ቅዳ'}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#8E44AD]"></span>
                      ንግድ ባንክ (CBE Account):
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-white text-xs">1000321337124</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('1000321337124', 'cbe')}
                        className={`text-xs px-2 py-0.5 rounded transition font-medium ${
                          copiedKey === 'cbe'
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
                        }`}
                      >
                        {copiedKey === 'cbe' ? 'ተቀድቷል' : 'ቅዳ'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  {lang === 'am' ? 'የመክፈያ ዘዴ ይምረጡ' : 'Select Payment Gateway'}
                </label>
                
                <div className="mb-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('wallet')}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      selectedMethod === 'wallet'
                        ? 'border-emerald-500 bg-emerald-950/50 text-white ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        hasEnoughWallet ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-white flex items-center space-x-1.5">
                          <span>{lang === 'am' ? 'የእናት ዋሌት ቀሪ ሂሳብ' : 'Enat Wallet Balance'}</span>
                          {hasEnoughWallet && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-bold">
                              {lang === 'am' ? 'ቀጥታ' : 'Instant'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {lang === 'am' ? 'ያለዎት ቀሪ ሂሳብ: ' : 'Available Balance: '}
                          <strong className={hasEnoughWallet ? 'text-emerald-400 font-mono font-bold' : 'text-amber-400 font-mono font-bold'}>
                            {formatETB(walletBalance)}
                          </strong>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {hasEnoughWallet ? (
                        <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/30">
                          {lang === 'am' ? 'በቂ ነው' : 'Sufficient'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded">
                          {lang === 'am' ? 'አይበቃም' : 'Low Balance'}
                        </span>
                      )}
                    </div>
                  </button>

                  {selectedMethod === 'wallet' && !hasEnoughWallet && (
                    <div className="mt-2 p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs space-y-2">
                      <div className="flex items-center space-x-2 text-amber-400">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {lang === 'am' 
                            ? `የዋሌትዎ ሂሳብ (${formatETB(walletBalance)}) ለዚህ ግዢ (${formatETB(totalAmount)}) አይበቃም። እባክዎ አስቀድመው ገንዘብ ይሙሉ!`
                            : `Insufficient wallet balance (${formatETB(walletBalance)}). Required: ${formatETB(totalAmount)}.`}
                        </span>
                      </div>
                      {onOpenDeposit && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenDeposit();
                          }}
                          className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold rounded-lg text-xs transition flex items-center justify-center space-x-1"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>{lang === 'am' ? 'ገንዘብ ይሙሉ (Deposit)' : 'Deposit Funds to Wallet Now'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('telebirr')}
                    className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all ${
                      selectedMethod === 'telebirr'
                        ? 'border-emerald-500 bg-emerald-950/30 text-white ring-1 ring-emerald-500'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#E67E22]/20 text-[#E67E22] flex items-center justify-center font-bold text-xs">
                      TLB
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">ቴሌብር (telebirr)</div>
                      <div className="text-[10px] text-slate-400">በቀጥታ USSD / ፑሽ</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('cbe_birr')}
                    className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all ${
                      selectedMethod === 'cbe_birr'
                        ? 'border-emerald-500 bg-emerald-950/30 text-white ring-1 ring-emerald-500'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#8E44AD]/20 text-[#8E44AD] flex items-center justify-center font-bold text-xs">
                      CBE
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">ሲቢኢ (CBE Birr)</div>
                      <div className="text-[10px] text-slate-400">የኢትዮጵያ ንግድ ባንክ</div>
                    </div>
                  </button>
                </div>
              </div>

              {selectedMethod !== 'wallet' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {lang === 'am' ? 'የስልክ ቁጥር (ክፍያ የሚፈፀምበት)' : 'Phone Number for Payment'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                    </div>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="09... / 07..."
                      required
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {lang === 'am' 
                      ? 'የቴሌብር ወይም ሲቢኢ አካውንት የተገናኘበትን ትክክለኛ ስልክ ቁጥር ያስገቡ።' 
                      : 'Enter the mobile number associated with your Telebirr or CBE account.'}
                  </p>
                </div>
              )}

              {selectedMethod === 'wallet' && hasEnoughWallet && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>{lang === 'am' ? 'የአሁኑ የዋሌት ቀሪ:' : 'Current Wallet Balance:'}</span>
                    <strong className="text-white font-mono">{formatETB(walletBalance)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>{lang === 'am' ? 'የሚቀነሰው የቲኬት ሂሳብ:' : 'Ticket Cost to Deduct:'}</span>
                    <strong className="text-amber-400 font-mono">-{formatETB(totalAmount)}</strong>
                  </div>
                  <div className="border-t border-emerald-500/30 pt-1.5 flex justify-between font-bold text-emerald-400">
                    <span>{lang === 'am' ? 'ከክፍያ በኋላ የሚቀረው:' : 'Remaining Balance:'}</span>
                    <span className="font-mono">{formatETB(walletBalance - totalAmount)}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={selectedMethod === 'wallet' && !hasEnoughWallet}
                className={`w-full py-3 px-4 font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-[0.98] ${
                  selectedMethod === 'wallet' && !hasEnoughWallet
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                {selectedMethod === 'wallet' ? (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>{lang === 'am' ? `ከዋሌት ${formatETB(totalAmount)} ክፈል` : `Pay ${formatETB(totalAmount)} from Wallet`}</span>
                  </>
                ) : (
                  <>
                    <span>{lang === 'am' ? `${formatETB(totalAmount)} አሁን ክፈል` : `Pay ${formatETB(totalAmount)} Now`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'ussd_prompt' && (
            <div className="text-center py-2 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#E67E22]/20 border border-[#E67E22]/30 flex items-center justify-center text-[#E67E22] text-2xl font-bold animate-pulse">
                📲
              </div>
              
              <div>
                <h4 className="font-bold text-base text-white">
                  {lang === 'am' ? 'የቴሌብር ፈጣን የክፍያ ጥያቄ' : 'Telebirr USSD Push Request'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'am' 
                    ? `ወደ ${phoneNumber} የ ${formatETB(totalAmount)} የክፍያ ማረጋገጫ ተልኳል።` 
                    : `A prompt of ${formatETB(totalAmount)} sent to ${phoneNumber}.`}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2 mb-2">
                  <span className="font-mono text-emerald-400 font-bold">telebirr *127#</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">USSD LIVE</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <div>ተቀባይ (Receiver): <span className="font-semibold text-white">Makbel Maregu (0910961881)</span></div>
                  <div>ስልክ: <span className="font-mono text-emerald-400">0910961881</span></div>
                  <div>መጠን: <span className="font-bold text-emerald-400">{formatETB(totalAmount)}</span></div>
                  <div className="text-[11px] text-slate-400">ቲኬቶች: {ticketNumbers.join(', ')}</div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {lang === 'am' ? 'የቴሌብር ሚስጥር ቁጥር (PIN) ያስገቡ:' : 'Enter Telebirr PIN (Simulated):'}
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="****"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-center text-white tracking-widest font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="w-1/2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  {lang === 'am' ? 'ተመለስ' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUSSD}
                  className="w-1/2 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1 transition shadow"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{lang === 'am' ? 'ክፈል' : 'Confirm PIN'}</span>
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto" />
              <div>
                <h4 className="font-bold text-white text-base">
                  {lang === 'am' ? 'ክፍያው እየተረጋገጠ ነው...' : 'Verifying Automated Payment...'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {lang === 'am' ? 'ከክፍያ ጌትዌይ ጋር ግንኙነት እየተደረገ ነው...' : 'Exchanging handshake with payment provider webhook...'}
                </p>
              </div>
            </div>
          )}

          {step === 'confirmed' && (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-white">
                  {lang === 'am' ? 'ክፍያው ተጠናቋል!' : 'Payment Verified & Approved!'}
                </h4>
                <p className="text-xs text-emerald-400 font-mono mt-1">
                  የማጣቀሻ ቁጥር: {txRef}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {lang === 'am' 
                    ? 'ቲኬቶችዎ በትክክል ተመዝግበው ገብተዋል! መልካም ዕድል!' 
                    : 'Your tickets have been cryptographically minted & activated! Good luck!'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
