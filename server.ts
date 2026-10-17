import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram Bot Configuration
// Bot token: 8878405360:AAHOArP6_q3_W96FpCWeK60lsWfZuMtdato (@Enat_Online_Lottery_bot)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8878405360:AAHOArP6_q3_W96FpCWeK60lsWfZuMtdato';
const BOT_USERNAME = 'Enat_Online_Lottery_bot';
const APP_URL = process.env.APP_URL || 'https://ais-pre-fogqneojs3pahfgo57jd7q-916349261335.europe-west2.run.app';

// Official Admin & Support Contact Details
const OFFICIAL_ADMIN = {
  phone: '0910961881',
  supportUsername: 'lij_makbel',
  fullName: 'Makbel Maregu',
  telebirr: '0910961881',
  cbeAccount: '1000321337124',
};

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Official Enat Online Lottery Merchant Details
const OFFICIAL_MERCHANT = {
  fullName: OFFICIAL_ADMIN.fullName,
  telebirr: OFFICIAL_ADMIN.telebirr,
  cbeAccount: OFFICIAL_ADMIN.cbeAccount,
  platform: 'Enat Online Lottery (እናት ኦንላይን ሎተሪ)',
  telegramBot: '@' + BOT_USERNAME,
  supportHandle: '@' + OFFICIAL_ADMIN.supportUsername,
  adminPhone: OFFICIAL_ADMIN.phone,
  status: 'active',
  lotteries: [
    { title: 'ባለ 1,000 ብር ደራሽ', price: 10, jackpot: 1000 },
    { title: 'ባለ 5,000 ብር ደራሽ', price: 50, jackpot: 5000 },
    { title: 'ባለ 10,000 ብር ደራሽ', price: 100, jackpot: 10000 },
    { title: 'ባለ 20,000 ብር ደራሽ', price: 200, jackpot: 20000 },
  ],
};

// ----------------------------------------------------
// Persistent Admin Chats Storage
// ----------------------------------------------------
const ADMIN_CHATS_FILE = path.join(__dirname, 'admin_chats.json');
let adminChatIds: number[] = [];

try {
  if (fs.existsSync(ADMIN_CHATS_FILE)) {
    const raw = fs.readFileSync(ADMIN_CHATS_FILE, 'utf-8');
    adminChatIds = JSON.parse(raw);
  }
} catch {
  adminChatIds = [];
}

function saveAdminChatIds() {
  try {
    fs.writeFileSync(ADMIN_CHATS_FILE, JSON.stringify(Array.from(new Set(adminChatIds)), null, 2));
  } catch (err) {
    console.error('[Save Admin Chats Error]', err);
  }
}

function addAdminChatId(chatId: number) {
  if (!adminChatIds.includes(chatId)) {
    adminChatIds.push(chatId);
    saveAdminChatIds();
    console.log(`[Admin Registered] Chat ID: ${chatId}. Total Admins: ${adminChatIds.length}`);
  }
}

// ----------------------------------------------------
// Persistent User Wallets Store (for Bot and Mini App)
// ----------------------------------------------------
export interface UserWallet {
  userId: string;
  phone: string;
  fullName: string;
  password?: string;
  username?: string;
  profileImage?: string;
  walletBalance: number;
  ticketsCount: number;
  totalWon: number;
  language: 'am' | 'en';
  registeredAt?: string;
  isAdmin?: boolean;
}

function safeWriteJsonSync(filePath: string, data: any) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const tmpFile = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, jsonStr, 'utf-8');
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, `${filePath}.bak`);
      } catch {}
    }
    fs.renameSync(tmpFile, filePath);
  } catch (err) {
    console.error(`[Atomic Save Error: ${filePath}]`, err);
  }
}

function safeReadJsonSync<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8').trim();
      if (content && content !== '{}' && content !== '[]') {
        return JSON.parse(content) as T;
      }
    }
  } catch (err) {
    console.warn(`[Read Primary JSON Failed: ${filePath}, trying backup]`, err);
  }
  try {
    const bakFile = `${filePath}.bak`;
    if (fs.existsSync(bakFile)) {
      const content = fs.readFileSync(bakFile, 'utf-8').trim();
      if (content && content !== '{}' && content !== '[]') {
        return JSON.parse(content) as T;
      }
    }
  } catch (bakErr) {
    console.error(`[Read Backup JSON Failed: ${filePath}]`, bakErr);
  }
  return fallback;
}

const WALLETS_FILE = path.join(__dirname, 'wallets_store.json');
let userWallets: Record<string, UserWallet> = safeReadJsonSync<Record<string, UserWallet>>(WALLETS_FILE, {});

function saveUserWallets() {
  if (Object.keys(userWallets).length === 0 && fs.existsSync(WALLETS_FILE)) {
    return;
  }
  safeWriteJsonSync(WALLETS_FILE, userWallets);
}

// ----------------------------------------------------
// Strict Ethiopian Phone Normalization & Deduplication
// ----------------------------------------------------
export function normalizeEthiopianPhone(raw?: string): string {
  if (!raw) return '';
  let clean = String(raw).replace(/\D/g, '');
  if (clean.startsWith('251')) {
    clean = '0' + clean.slice(3);
  } else if (!clean.startsWith('0') && (clean.startsWith('9') || clean.startsWith('7'))) {
    clean = '0' + clean;
  }
  return clean;
}

export function findWalletByPhone(phone?: string): UserWallet | undefined {
  if (!phone) return undefined;
  const clean = normalizeEthiopianPhone(phone);
  if (!clean || clean.length < 9) return undefined;
  const suffix = clean.slice(-9);

  for (const w of Object.values(userWallets)) {
    if (w.phone) {
      const wClean = normalizeEthiopianPhone(w.phone);
      if (wClean.length >= 9 && wClean.slice(-9) === suffix) {
        return w;
      }
    }
  }
  return undefined;
}

export function deduplicateWallets(): { removedCount: number; remainingCount: number } {
  const phoneMap = new Map<string, string>(); // canonical 9-digit suffix -> primary key
  const keysToDelete = new Set<string>();

  // Pass 1: detect duplicates and purge invalid dummy records
  for (const [key, wallet] of Object.entries(userWallets)) {
    const rawPhone = wallet.phone || (wallet.userId && wallet.userId.startsWith('0') ? wallet.userId : '');
    const clean = normalizeEthiopianPhone(rawPhone);

    // If wallet has no valid phone number, remove empty/dummy record
    if (!clean || clean.length < 9) {
      keysToDelete.add(key);
      continue;
    }

    // Standardize stored phone to 10-digit format
    wallet.phone = clean;
    const suffix = clean.slice(-9);

    if (phoneMap.has(suffix)) {
      // DUPLICATE DETECTED! Merge into primary and discard duplicate
      const primaryKey = phoneMap.get(suffix)!;
      const primary = userWallets[primaryKey];

      // Prioritize the entry that has a password
      if (!primary.password && wallet.password) {
        primary.password = wallet.password;
      }
      if ((!primary.fullName || primary.fullName === primary.phone) && wallet.fullName) {
        primary.fullName = wallet.fullName;
      }
      if (!primary.profileImage && wallet.profileImage) {
        primary.profileImage = wallet.profileImage;
      }
      if (!primary.username && wallet.username) {
        primary.username = wallet.username;
      }
      if (!primary.registeredAt && wallet.registeredAt) {
        primary.registeredAt = wallet.registeredAt;
      }
      primary.walletBalance = Math.max(primary.walletBalance || 0, wallet.walletBalance || 0);
      primary.ticketsCount = Math.max(primary.ticketsCount || 0, wallet.ticketsCount || 0);
      primary.totalWon = Math.max(primary.totalWon || 0, wallet.totalWon || 0);

      keysToDelete.add(key);
    } else {
      phoneMap.set(suffix, key);
    }
  }

  for (const k of keysToDelete) {
    delete userWallets[k];
  }

  // Ensure canonical keys in map use clean phone
  for (const [key, wallet] of Object.entries(userWallets)) {
    if (wallet.phone) {
      const clean = normalizeEthiopianPhone(wallet.phone);
      if (clean && clean.length === 10 && key !== clean) {
        userWallets[clean] = wallet;
        delete userWallets[key];
      }
    }
  }

  if (keysToDelete.size > 0) {
    saveUserWallets();
    console.log(`[Deduplicate] Cleaned up ${keysToDelete.size} duplicate/empty wallets. Remaining: ${Object.keys(userWallets).length}`);
  }

  return {
    removedCount: keysToDelete.size,
    remainingCount: Object.keys(userWallets).length,
  };
}

// Initial deduplication on startup
deduplicateWallets();

// ----------------------------------------------------
// Persistent Tickets Store
// ----------------------------------------------------
export interface SyncedTicket {
  id: string;
  lotteryId: string;
  lotteryTitleAm: string;
  lotteryTitleEn: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userPhone: string;
  userTelegram?: string;
  userAvatar?: string;
  pricePaid: number;
  purchasedAt: string;
  paymentMethod: string;
  paymentReference: string;
  round?: number;
  status: 'active' | 'won' | 'lost' | 'refunded';
  prizeWon?: number;
  prizeTitleAm?: string;
  prizeTitleEn?: string;
  securityHash: string;
}

const TICKETS_FILE = path.join(__dirname, 'tickets_store.json');
let syncedTickets: SyncedTicket[] = safeReadJsonSync<SyncedTicket[]>(TICKETS_FILE, []);

function saveTickets() {
  if (syncedTickets.length === 0 && fs.existsSync(TICKETS_FILE)) {
    const existing = safeReadJsonSync<SyncedTicket[]>(TICKETS_FILE, []);
    if (existing.length > 0) return;
  }
  safeWriteJsonSync(TICKETS_FILE, syncedTickets.slice(0, 5000));
}

export function findOrCreateWallet(params: { userId?: string; phone?: string; telegramId?: string; fullName?: string; username?: string; profileImage?: string }): UserWallet {
  const { userId, phone, telegramId, fullName, username, profileImage } = params;
  const cleanPhone = normalizeEthiopianPhone(phone);

  // 1. Direct match by phone first (phone is unique primary identity)
  if (cleanPhone && cleanPhone.length >= 9) {
    const existing = findWalletByPhone(cleanPhone);
    if (existing) {
      if (fullName && (!existing.fullName || existing.fullName === existing.phone)) existing.fullName = fullName;
      if (username && !existing.username) existing.username = username;
      if (profileImage && !existing.profileImage) existing.profileImage = profileImage;
      if (!existing.phone) existing.phone = cleanPhone;
      return existing;
    }
  }

  // 2. Direct match by userId or telegramId
  for (const [k, w] of Object.entries(userWallets)) {
    if (userId && (k === userId || w.userId === userId)) {
      if (cleanPhone && !w.phone) w.phone = cleanPhone;
      if (username && !w.username) w.username = username;
      if (profileImage && !w.profileImage) w.profileImage = profileImage;
      return w;
    }
    if (telegramId && (k === String(telegramId) || w.userId === String(telegramId))) {
      if (cleanPhone && !w.phone) w.phone = cleanPhone;
      if (username && !w.username) w.username = username;
      if (profileImage && !w.profileImage) w.profileImage = profileImage;
      return w;
    }
  }

  // If there is no phone, do not pollute persistent wallets with dummy guest records
  if (!cleanPhone && !telegramId) {
    return {
      userId: userId || `guest_${Date.now()}`,
      phone: '',
      fullName: fullName || '',
      username: username || '',
      profileImage: profileImage || '',
      walletBalance: 0,
      ticketsCount: 0,
      totalWon: 0,
      language: 'am',
    };
  }

  // 3. Create new wallet if not found
  const canonicalKey = cleanPhone && cleanPhone.length === 10 ? cleanPhone : (userId || (telegramId ? String(telegramId) : `usr_${Date.now()}`));
  userWallets[canonicalKey] = {
    userId: canonicalKey,
    phone: cleanPhone || '',
    fullName: (fullName && fullName.trim()) ? fullName.trim() : (cleanPhone || ''),
    username: username || '',
    profileImage: profileImage || '',
    walletBalance: 0,
    ticketsCount: 0,
    totalWon: 0,
    language: 'am',
    registeredAt: new Date().toISOString(),
  };
  saveUserWallets();
  return userWallets[canonicalKey];
}

function getOrCreateWallet(chatId: number, from?: any, phone?: string): UserWallet {
  const cleanPhone = phone || (from?.id === 8759844855 ? OFFICIAL_ADMIN.phone : '');
  const fullName = from?.first_name ? `${from.first_name} ${from.last_name || ''}`.trim() : (cleanPhone || '');
  const username = from?.username ? `@${from.username}` : '';
  return findOrCreateWallet({
    telegramId: String(chatId),
    userId: String(chatId),
    phone: cleanPhone,
    fullName,
    username,
  });
}

// ----------------------------------------------------
// Persistent Transaction Store & Sync
// ----------------------------------------------------
export interface SyncedTransaction {
  id: string;
  ticketId?: string;
  lotteryId?: string;
  lotteryTitleAm?: string;
  userId?: string;
  userName: string;
  userPhone: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'ticket_purchase' | 'prize_payout';
  paymentMethod: string;
  referenceNumber: string;
  screenshotUrl?: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  approvedBy?: string;
  approvedAt?: string;
  source?: 'bot' | 'mini_app';
}

const TX_FILE = path.join(__dirname, 'transactions_store.json');
let syncedTransactions: SyncedTransaction[] = safeReadJsonSync<SyncedTransaction[]>(TX_FILE, []);

function saveTransactions() {
  if (syncedTransactions.length === 0 && fs.existsSync(TX_FILE)) {
    const existing = safeReadJsonSync<SyncedTransaction[]>(TX_FILE, []);
    if (existing.length > 0) return;
  }
  safeWriteJsonSync(TX_FILE, syncedTransactions.slice(0, 2000));
}

// ----------------------------------------------------
// Persistent Support Messages Store
// ----------------------------------------------------
export interface SupportMessage {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  sender: 'user' | 'admin';
  text: string;
  timestamp: string;
  telegramMsgId?: number;
}

const SUPPORT_FILE = path.join(__dirname, 'support_messages.json');
let supportMessages: SupportMessage[] = safeReadJsonSync<SupportMessage[]>(SUPPORT_FILE, []);

function saveSupportMessages() {
  safeWriteJsonSync(SUPPORT_FILE, supportMessages.slice(0, 500));
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendTelegramResponse(chatId: number, text: string, replyMarkup?: any) {
  try {
    const body: any = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup !== undefined ? replyMarkup : { remove_keyboard: true },
    };

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = (await res.json()) as any;
    if (!result?.ok) {
      const desc = result?.description || '';
      if (desc.includes('chat not found') || desc.includes('blocked') || desc.includes('deactivated') || desc.includes('chat_id is empty')) {
        console.info(`[Telegram Notification Skipped: chat ${chatId} unavailable]`);
        if (adminChatIds.includes(chatId)) {
          adminChatIds = adminChatIds.filter(id => id !== chatId);
          saveAdminChatIds();
        }
        return result;
      }
      console.warn(`[Send Telegram Message HTML failed for chat ${chatId}]:`, desc);
      const plainText = text.replace(/<[^>]*>?/gm, '');
      const fallbackBody = {
        chat_id: chatId,
        text: plainText,
        reply_markup: body.reply_markup,
      };
      const fallbackRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackBody),
      });
      return await fallbackRes.json();
    }
    return result;
  } catch (err) {
    console.error('[Send Telegram Message Error]', err);
    return null;
  }
}

async function editTelegramMessage(chatId: number, messageId: number, text: string, inlineKeyboard?: any) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard ? inlineKeyboard : { inline_keyboard: [] },
      }),
    });
    const result = (await res.json()) as any;
    if (!result?.ok) {
      const desc = result?.description || '';
      if (desc.includes('chat not found') || desc.includes('message to edit not found')) {
        return;
      }
      const plainText = text.replace(/<[^>]*>?/gm, '');
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: plainText,
          reply_markup: inlineKeyboard ? inlineKeyboard : { inline_keyboard: [] },
        }),
      });
    }
  } catch (err) {
    console.error('[Edit Telegram Message Error]', err);
  }
}

async function answerTelegramCallback(callbackQueryId: string, text?: string, showAlert?: boolean) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert || false,
      }),
    });
  } catch (err) {
    console.error('[Answer Callback Error]', err);
  }
}

async function notifyAllAdmins(text: string, inlineKeyboard?: any) {
  if (adminChatIds.length === 0) {
    return [];
  }
  const results = [];
  const currentAdmins = [...adminChatIds];
  for (const chatId of currentAdmins) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard,
        }),
      });
      const data = (await res.json()) as any;
      if (data.ok) {
        results.push({ chatId, messageId: data.result.message_id });
      } else {
        const desc = data.description || '';
        if (desc.includes('chat not found') || desc.includes('blocked') || desc.includes('deactivated')) {
          console.info(`[Admin chat ${chatId} unavailable]: ${desc}`);
          adminChatIds = adminChatIds.filter(id => id !== chatId);
          saveAdminChatIds();
        }
      }
    } catch (err) {
      console.error(`[Notify Admin ${chatId} Error]`, err);
    }
  }
  return results;
}

function isAuthorizedAdmin(chatId: number, from?: any, phoneOrPass?: string): boolean {
  if (adminChatIds.includes(chatId)) return true;

  if (from?.id && (from.id === 5588110290 || String(from.id) === '5588110290' || from.id === 8759844855 || String(from.id) === '8759844855')) {
    addAdminChatId(chatId);
    return true;
  }
  if (from?.username && (
    from.username.toLowerCase() === 'lij_makbel' ||
    from.username.toLowerCase() === 'makbel_maregu'
  )) {
    addAdminChatId(chatId);
    return true;
  }
  const wallet = userWallets[String(chatId)];
  if (wallet?.phone && wallet.phone.replace(/\s+/g, '').includes('0910961881')) {
    addAdminChatId(chatId);
    return true;
  }
  if (phoneOrPass) {
    const clean = phoneOrPass.trim().toLowerCase().replace(/[\s-]/g, '');
    if (
      clean.includes('0910961881') ||
      clean.includes('251910961881') ||
      clean.includes('office_makbel_admin') ||
      clean.includes('2728')
    ) {
      addAdminChatId(chatId);
      return true;
    }
  }
  return false;
}

async function sendTransactionsOverview(chatId: number, filter: 'all' | 'deposit' | 'withdrawal' | 'pending' = 'all') {
  let list = syncedTransactions;
  let title = '📊 <b>የክፍያዎች ዝርዝር (All Transactions)</b>';
  if (filter === 'deposit') {
    list = syncedTransactions.filter(t => t.type === 'deposit');
    title = '📥 <b>የተሞሉ ክፍያዎች (Deposits)</b>';
  } else if (filter === 'withdrawal') {
    list = syncedTransactions.filter(t => t.type === 'withdrawal');
    title = '📤 <b>የወጡ ክፍያዎች (Withdrawals)</b>';
  } else if (filter === 'pending') {
    list = syncedTransactions.filter(t => t.status === 'pending');
    title = '⏳ <b>የሚጠበቁ ክፍያዎች (Pending Approvals)</b>';
  }

  const depSum = syncedTransactions.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((s, t) => s + t.amount, 0);
  const wthSum = syncedTransactions.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((s, t) => s + t.amount, 0);
  const pendingCount = syncedTransactions.filter(t => t.status === 'pending').length;

  let msg = `${title}\n\n` +
    `💵 <b>ጠቅላላ ገቢ:</b> <b>${depSum.toLocaleString()} ብር</b>\n` +
    `💸 <b>ጠቅላላ ወጪ:</b> <b>${wthSum.toLocaleString()} ብር</b>\n` +
    `⏳ <b>ይጠብቃሉ:</b> <b>${pendingCount}</b> | 📋 <b>ጠቅላላ:</b> <b>${syncedTransactions.length}</b>\n` +
    `────────────────────\n\n`;

  if (list.length === 0) {
    msg += `<i>ምንም የተገኘ መረጃ የለም</i>`;
  } else {
    for (const tx of list.slice(0, 10)) {
      const isDep = tx.type === 'deposit';
      const isWth = tx.type === 'withdrawal';
      const icon = isDep ? '📥' : (isWth ? '📤' : '🎟️');
      const stBadge = tx.status === 'completed' ? '✅' : (tx.status === 'pending' ? '⏳' : '❌');
      const timeStr = new Date(tx.timestamp).toLocaleString('am-ET', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      msg += `${icon} <b>${tx.amount.toLocaleString()} ብር</b> (${stBadge})\n` +
        `👤 <b>ደንበኛ:</b> ${escapeHtml(tx.userName)} (<code>${escapeHtml(tx.userPhone || '—')}</code>)\n` +
        `🔖 <b>ማጣቀሻ:</b> <code>${escapeHtml(tx.referenceNumber)}</code>\n` +
        `🕒 <b>ሰዓት:</b> ${timeStr}\n` +
        `────────────────────\n`;
    }
  }

  const ik = {
    inline_keyboard: [
      [
        { text: filter === 'all' ? '• ሁሉም •' : 'ሁሉም', callback_data: 'txfilter_all' },
        { text: filter === 'deposit' ? '• የተሞሉ •' : 'የተሞሉ', callback_data: 'txfilter_deposit' },
      ],
      [
        { text: filter === 'withdrawal' ? '• የወጡ •' : 'የወጡ', callback_data: 'txfilter_withdrawal' },
        { text: filter === 'pending' ? `• ይጠብቃሉ (${pendingCount}) •` : `ይጠብቃሉ (${pendingCount})`, callback_data: 'txfilter_pending' },
      ],
      [
        { text: '🌐 መተግበሪያ ክፈት (Open)', url: APP_URL },
      ],
    ],
  };

  await sendTelegramResponse(chatId, msg, ik);
}

async function handleTelegramMessage(message: any) {
  try {
    const chatId = message.chat?.id;
    if (!chatId) return;

    const from = message.from;
    const text = (message.text || '').trim();
    const contact = message.contact;

    // 1. Detect Phone Number (via contact share or typed phone number)
    let detectedPhone = contact?.phone_number ? contact.phone_number.replace(/\D/g, '') : null;
    if (!detectedPhone && text) {
      const cleanDigits = text.replace(/[\s-+]/g, '');
      const m = cleanDigits.match(/^(?:251|0)?([79]\d{8})$/);
      if (m) {
        detectedPhone = '0' + m[1];
      }
    }

    if (detectedPhone) {
      let cleanPhone = detectedPhone;
      if (cleanPhone.startsWith('251')) {
        cleanPhone = '0' + cleanPhone.slice(3);
      } else if (cleanPhone.startsWith('9') || cleanPhone.startsWith('7')) {
        cleanPhone = '0' + cleanPhone;
      }

      const wallet = getOrCreateWallet(chatId, from, cleanPhone);
      wallet.phone = cleanPhone;
      if (from?.username) wallet.username = `@${from.username}`;
      if (from?.first_name) {
        wallet.fullName = `${from.first_name} ${from.last_name || ''}`.trim();
      }
      saveUserWallets();

      if (cleanPhone.includes('910961881')) {
        addAdminChatId(chatId);
        await sendTelegramResponse(
          chatId,
          `ሰላም <b>አስተዳዳሪ (0910961881)!</b>\n\nእንኳን ወደ እናት ሎተሪ አስተዳዳሪ ፓነል በደህና መጡ::`,
          { remove_keyboard: true }
        );
        return;
      }

      const registeredMsg = 
        `እንኳን ደስ አሎት! <b>ስልክዎ (<code>${cleanPhone}</code>) ተመዝግቧል!</b>\n\n` +
        `የእናት ኦንላይን ሎተሪን ለመጫወት እና ዕድልዎን ለመሞከር ከታች ያለውን <b>OPEN</b> የሚለውን ይጫኑ::\n\n` +
        `መልካም ዕድል!`;

      const ik = {
        inline_keyboard: [
          [
            { text: '🚀 ሎተሪ ክፈት (OPEN)', web_app: { url: APP_URL } },
          ],
        ],
      };
      await sendTelegramResponse(chatId, registeredMsg, ik);
      return;
    }

    const isAdmin = isAuthorizedAdmin(chatId, from, text);

    // 2. /start command
    if (text === '/start' || text.startsWith('/start')) {
      const welcomeMsg = 
        `እንኳን ወደ እናት ኦንላይን ሎተሪ በደህና መጡ!\n\n` +
        `🎫 <b>የዕጣ ዓይነቶች:</b>\n` +
        `• ባለ 1,000 ብር ደራሽ - 10 ብር\n` +
        `• ባለ 5,000 ብር ደራሽ - 50 ብር\n` +
        `• ባለ 10,000 ብር ደራሽ - 100 ብር\n` +
        `• ባለ 20,000 ብር ደራሽ - 200 ብር\n\n` +
        `💳 በቴሌብር (<code>0910961881</code>) ወይም በሲቢኢ ክፍያ ይፈጽሙ!\n\n` +
        `መልካም ዕድል!\n\n` +
        `ለመጀመር ከታች <b>OPEN</b> የሚለውን ይጫኑ::`;

      await sendTelegramResponse(chatId, welcomeMsg, { remove_keyboard: true });
      if (isAdmin) {
        addAdminChatId(chatId);
      }
      return;
    }

    // 3. Admin management command
    if (isAdmin && (text === '/admin' || text === '2728' || text.includes('0910961881') || text.toLowerCase().includes('office_makbel_admin'))) {
      addAdminChatId(chatId);
      await sendTransactionsOverview(chatId, 'pending');
      return;
    }

    // 4. Return silently for unrecognized text
    return;
  } catch (e) {
    console.error('[Telegram Message Error]', e);
  }
}

async function handleTelegramCallback(callbackQuery: any) {
  try {
    const callbackId = callbackQuery.id;
    const chatId = callbackQuery.message?.chat?.id;
    const data = callbackQuery.data;
    const firstName = callbackQuery.from?.first_name || 'Admin';

    if (data.startsWith('appr:') || data.startsWith('rejc:')) {
      const isApprove = data.startsWith('appr:');
      const txId = data.replace(/^appr:|^rejc:/, '');
      const callerFrom = callbackQuery.from;

      if (!isAuthorizedAdmin(chatId, callerFrom)) {
        await answerTelegramCallback(
          callbackId,
          'ይህ ትዕዛዝ ለአስተዳዳሪ (0910961881) ብቻ የተፈቀደ ነው::',
          true
        );
        return;
      }

      const tx = syncedTransactions.find((t) => t.id === txId);
      if (tx) {
        tx.status = isApprove ? 'completed' : 'failed';
        tx.approvedBy = `${firstName} (0910961881)`;
        tx.approvedAt = new Date().toISOString();
        saveTransactions();

        const userWallet = findOrCreateWallet({ userId: tx.userId, phone: tx.userPhone, fullName: tx.userName });
        if (tx.type === 'deposit') {
          if (isApprove) {
            userWallet.walletBalance += Number(tx.amount);
          }
        } else if (tx.type === 'withdrawal') {
          if (!isApprove) {
            userWallet.walletBalance += Number(tx.amount);
          }
        }
        saveUserWallets();

        const customerChatId = Number(tx.userId);
        if (!isNaN(customerChatId) && customerChatId > 0 && customerChatId !== chatId) {
          const userNotif = isApprove
            ? (tx.type === 'deposit'
                ? `🎉 <b>የሙሌት ክፍያዎ ጸድቋል!</b>\n\nየ ${tx.amount.toLocaleString()} ብር ሙሌትዎ ጸድቆ የዋሌት ቀሪ ሂሳብዎ <b>${userWallet.walletBalance.toLocaleString()} ብር</b> ሆኗል!`
                : `💸 <b>የወጪ ጥያቄዎ ጸድቋል!</b>\n\nየ ${tx.amount.toLocaleString()} ብር ክፍያዎ ወደ ሂሳብዎ (<code>${tx.userPhone}</code>) ተላልፏል::`)
            : (tx.type === 'deposit'
                ? `❌ የ ${tx.amount.toLocaleString()} ብር የሙሌት ጥያቄዎ ውድቅ ተደርጓል። እባክዎ ድጋፍ ያነጋግሩ (@lij_makbel)`
                : `❌ የ ${tx.amount.toLocaleString()} ብር የወጪ ጥያቄዎ ውድቅ ተደርጓል:: ገንዘቡ ወደ ዋሌትዎ ተመልሷል።`);

          sendTelegramResponse(customerChatId, userNotif);
        }
      }

      const alertMsg = isApprove 
        ? `✅ ክፍያው ጸድቋል!` 
        : `❌ ክፍያው ውድቅ ተደርጓል!`;
      await answerTelegramCallback(callbackId, alertMsg, true);

      const originalText = callbackQuery.message?.text || '';
      const messageId = callbackQuery.message?.message_id;
      if (chatId && messageId) {
        const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const badge = isApprove
          ? `\n\n✅ <b>በአድሚን ጸድቋል (APPROVED BY ADMIN)</b>\n👤 <b>${firstName}</b>\n🕒 ${timeNow}`
          : `\n\n❌ <b>ውድቅ ተደርጓል (REJECTED)</b>\n👤 <b>${firstName}</b>\n🕒 ${timeNow}`;

        const updatedKeyboard = {
          inline_keyboard: [
            [
              {
                text: isApprove ? '✅ ጸድቋል (Approved)' : '❌ ውድቅ ሆኗል (Rejected)',
                callback_data: 'done',
              },
            ],
            [
              {
                text: '🌐 መተግበሪያ ክፈት (Open)',
                url: APP_URL,
              },
            ],
          ],
        };
        await editTelegramMessage(chatId, messageId, originalText + badge, updatedKeyboard);
      }
      return;
    }

    if (data.startsWith('txfilter_')) {
      const filter = data.replace('txfilter_', '') as 'all' | 'deposit' | 'withdrawal' | 'pending';
      await answerTelegramCallback(callbackId, 'እየተጫነ ነው...');
      await sendTransactionsOverview(chatId, filter);
      return;
    }

    if (data === 'done' || data === 'noop') {
      await answerTelegramCallback(callbackId, 'ተጠናቋል!');
      return;
    }

    await answerTelegramCallback(callbackId);
  } catch (err) {
    console.error('[Telegram Callback Error]', err);
  }
}

// REST API Endpoints
app.get('/api/merchant', (_req, res) => {
  res.json({
    ok: true,
    merchant: OFFICIAL_MERCHANT,
  });
});

app.get('/api/lottery/status', (_req, res) => {
  res.json({
    ok: true,
    platform: 'Enat Online Lottery (እናት ኦንላይን ሎተሪ)',
    merchant: OFFICIAL_MERCHANT,
  });
});

app.get('/api/telegram/status', async (_req, res) => {
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    const data = await tgRes.json();
    res.json({
      ok: true,
      bot: data.result,
      configuredUrl: APP_URL,
      adminCount: adminChatIds.length,
      adminChatIds: adminChatIds,
      botUsername: BOT_USERNAME,
      officialAdminPhone: OFFICIAL_ADMIN.phone,
      officialSupport: OFFICIAL_ADMIN.supportUsername,
    });
  } catch (err: any) {
    res.json({ ok: false, error: err.message, adminCount: adminChatIds.length });
  }
});

app.post('/api/telegram/test-alert', async (_req, res) => {
  try {
    const timeNow = new Date().toLocaleTimeString('en-US');
    const msg = 
      `🔔 <b>የሙከራ ማሳወቂያ (Test Alert)</b>\n\n` +
      `የእናት ኦንላይን ሎተሪ ቦት (@${BOT_USERNAME}) በትክክል እየሰራ ነው!\n` +
      `📞 ስልክ: <b>0910961881</b>\n` +
      `👤 ድጋፍ: <b>@${OFFICIAL_ADMIN.supportUsername}</b>\n` +
      `🕒 ሰዓት: ${timeNow}`;

    const results = await notifyAllAdmins(msg, {
      inline_keyboard: [
        [
          { text: '✅ ይሰራል (Working)', callback_data: 'done' },
          { text: '🌐 ወደ መተግበሪያ ሂድ', url: APP_URL },
        ],
      ],
    });
    res.json({ ok: true, sentCount: results.length, totalAdmins: adminChatIds.length });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/notify-admin', async (req, res) => {
  const { id, type, userName, userPhone, amount, paymentMethod, referenceNumber, timestamp, userId, telegramId, screenshotUrl } = req.body;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Transaction id is required' });
  }

  const finalUserId = userId || telegramId || '';
  findOrCreateWallet({ userId: finalUserId, phone: userPhone, telegramId, fullName: userName });

  const existingIndex = syncedTransactions.findIndex((t) => t.id === id);
  const txRecord: SyncedTransaction = {
    id,
    type: type || 'deposit',
    userId: finalUserId,
    userName: (userName && userName !== 'ተጠቃሚ') ? userName : (userPhone || ''),
    userPhone: userPhone || '',
    amount: Number(amount) || 0,
    paymentMethod: paymentMethod || 'telebirr',
    referenceNumber: referenceNumber || 'REF-' + Date.now(),
    screenshotUrl: screenshotUrl || undefined,
    timestamp: timestamp || new Date().toISOString(),
    status: 'pending',
    source: 'mini_app',
  };

  if (existingIndex >= 0) {
    syncedTransactions[existingIndex] = { ...syncedTransactions[existingIndex], ...txRecord };
  } else {
    syncedTransactions.unshift(txRecord);
  }
  saveTransactions();

  const isDeposit = type === 'deposit';
  let tgMessage = '';
  let inlineKeyboard = {};

  if (isDeposit) {
    tgMessage = 
      `📥 <b>አዲስ የገንዘብ ማስገቢያ ጥያቄ (New Deposit Request)</b>\n` +
      `────────────────────\n` +
      `👤 <b>ደንበኛ:</b> <b>${userName}</b>\n` +
      `📱 <b>ስልክ:</b> <code>${userPhone}</code>\n` +
      `💰 <b>መጠን:</b> <b>${Number(amount).toLocaleString()} ብር (ETB)</b>\n` +
      `💳 <b>ዘዴ:</b> <b>${String(paymentMethod).toUpperCase()}</b>\n` +
      `🔖 <b>ማጣቀሻ:</b> <code>${referenceNumber}</code>\n` +
      (screenshotUrl ? `📸 <b>ደረሰኝ:</b> ተያይዟል\n` : '') +
      `🕒 <b>ሰዓት:</b> ${new Date(timestamp || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n` +
      `────────────────────\n` +
      `<i>እባክዎ ሂሳብዎን (0910961881) አረጋግጠው ያጽድቁ::</i>`;

    inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '✅ አጽድቅ (Approve)', callback_data: `appr:${id}` },
          { text: '❌ ውድቅ አድርግ (Reject)', callback_data: `rejc:${id}` },
        ],
        [
          { text: '🌐 ወደ መተግበሪያ ሂድ', url: APP_URL },
        ],
      ],
    };
  } else if (type === 'withdrawal') {
    tgMessage = 
      `📤 <b>አዲስ የገንዘብ ማውጫ ጥያቄ (New Withdrawal Request)</b>\n` +
      `────────────────────\n` +
      `👤 <b>ደንበኛ:</b> <b>${userName}</b>\n` +
      `📱 <b>መላኪያ ስልክ:</b> <code>${userPhone}</code>\n` +
      `💰 <b>መጠን:</b> <b>${Number(amount).toLocaleString()} ብር (ETB)</b>\n` +
      `🕒 <b>ሰዓት:</b> ${new Date(timestamp || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n` +
      `────────────────────\n` +
      `<i>እባክዎ ${Number(amount).toLocaleString()} ብር ወደ <code>${userPhone}</code> ልከው ያጽድቁ::</i>`;

    inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '✅ አጽድቅ (Approve)', callback_data: `appr:${id}` },
          { text: '❌ ውድቅ አድርግ (Reject)', callback_data: `rejc:${id}` },
        ],
        [
          { text: '🌐 ወደ መተግበሪያ ሂድ', url: APP_URL },
        ],
      ],
    };
  } else {
    tgMessage = 
      `🎟️ <b>የቲኬት ግዢ</b>\n` +
      `────────────────────\n` +
      `👤 <b>ደንበኛ:</b> <b>${userName}</b> (${userPhone})\n` +
      `💰 <b>መጠን:</b> <b>${amount} ብር</b>\n` +
      `🔖 <b>ማጣቀሻ:</b> <code>${referenceNumber}</code>`;
  }

  const sent = await notifyAllAdmins(tgMessage, inlineKeyboard);
  res.json({
    ok: true,
    txId: id,
    deliveredToAdmins: sent.length,
    totalAdmins: adminChatIds.length,
  });
});

// ----------------------------------------------------
// Authentication API: Register & Login with Phone + Password
// ----------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  const { fullName, phone, password, telegramId, username, profileImage } = req.body;
  if (!phone || !phone.trim()) {
    return res.status(400).json({ ok: false, error: 'እባክዎ ስልክ ቁጥር ያስገቡ' });
  }
  if (!password || !password.trim()) {
    return res.status(400).json({ ok: false, error: 'እባክዎ የይለፍ ቃል ያስገቡ' });
  }

  const clean = normalizeEthiopianPhone(phone);
  if (clean.length < 10) {
    return res.status(400).json({ ok: false, error: 'የስልክ ቁጥር 10 ዲጂት መሆን አለበት (ምሳሌ: 09... ወይም 07...)' });
  }
  const trimmedPassword = password.trim();
  if (trimmedPassword.length < 4) {
    return res.status(400).json({ ok: false, error: 'የይለፍ ቃል ቢያንስ 4 ፊደል መሆን አለበት' });
  }

  // Deduplicate existing records before registration check
  deduplicateWallets();

  // STRICT DUPLICATE PREVENTION:
  // If this phone number is already registered, reject registration completely!
  const existingWallet = findWalletByPhone(clean);
  if (existingWallet) {
    return res.status(409).json({
      ok: false,
      error: 'ይህ ስልክ ቀደም ሲል ተመዝግቧል። "ግባ (Login)" የሚለውን ይጫኑ!',
      isExisting: true,
    });
  }

  const regDateIso = new Date().toISOString();
  const readableRegDate = new Date().toLocaleTimeString('am-ET', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('am-ET');
  const walletKey = clean;
  const newWallet: UserWallet = {
    userId: `usr_${clean}`,
    phone: clean,
    fullName: (fullName && typeof fullName === 'string' ? fullName.trim() : '') || '',
    password: trimmedPassword, // Strictly bound password to phone
    username: username || '',
    profileImage: (profileImage && typeof profileImage === 'string' ? profileImage.trim() : '') || '',
    walletBalance: 0,
    ticketsCount: 0,
    totalWon: 0,
    language: 'am',
    registeredAt: regDateIso,
  };

  userWallets[walletKey] = newWallet;
  saveUserWallets();

  // Send immediate Telegram alert to admin about this new registration
  const tgRegMessage = 
    `🎉 <b>አዲስ ተጠቃሚ ተመዘገበ! (New User Registered)</b>\n` +
    `────────────────────\n` +
    `👤 <b>ሙሉ ስም (Full Name):</b> <b>${newWallet.fullName || 'አልተጠቀሰም'}</b>\n` +
    `📱 <b>ስልክ ቁጥር (Phone):</b> <code>${clean}</code>\n` +
    (username ? `💬 <b>ቴሌግራም (Telegram):</b> @${username.replace('@', '')}\n` : '') +
    `🕒 <b>የተመዘገበበት ሰዓት:</b> ${readableRegDate}\n` +
    `────────────────────\n` +
    `<i>እናት ኦንላይን ሎተሪ (Enat Online Lottery)</i>`;

  notifyAllAdmins(tgRegMessage, {
    inline_keyboard: [
      [
        { text: '🌐 ወደ መተግበሪያ ሂድ (Admin)', url: APP_URL },
      ],
    ],
  }).catch(err => console.error('[Register Notify Error]', err));

  const userTickets = syncedTickets.filter(t => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));
  const userTxs = syncedTransactions.filter(t => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));

  res.json({
    ok: true,
    user: newWallet,
    tickets: userTickets,
    transactions: userTxs,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !phone.trim()) {
    return res.status(400).json({ ok: false, error: 'እባክዎ ስልክ ቁጥር ያስገቡ' });
  }
  if (!password || !password.trim()) {
    return res.status(400).json({ ok: false, error: 'እባክዎ የይለፍ ቃል ያስገቡ' });
  }

  const clean = normalizeEthiopianPhone(phone);
  if (clean.length < 9) {
    return res.status(400).json({ ok: false, error: 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ' });
  }

  deduplicateWallets();

  const matchedWallet = findWalletByPhone(clean);
  if (!matchedWallet) {
    return res.status(404).json({
      ok: false,
      error: 'ይህ ስልክ አልተመዘገበም። "ተመዝገብ (Register)" የሚለውን ይምረጡ!',
      notFound: true,
    });
  }

  // Strict Phone & Password Correlation:
  const trimmedPassword = password.trim();
  if (!matchedWallet.password || matchedWallet.password !== trimmedPassword) {
    return res.status(401).json({
      ok: false,
      error: 'የተሳሳተ የይለፍ ቃል (Password)! እባክዎ ደግመው ይሞክሩ።',
      invalidPassword: true,
    });
  }

  const isMakbelAdmin = clean.endsWith('910961881') || (matchedWallet.username && matchedWallet.username.toLowerCase().replace('@', '') === 'lij_makbel');
  if (isMakbelAdmin) {
    matchedWallet.isAdmin = true;
  }

  const userTickets = syncedTickets.filter(t => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));
  const userTxs = syncedTransactions.filter(t => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));

  res.json({
    ok: true,
    user: matchedWallet,
    tickets: userTickets,
    transactions: userTxs,
  });
});

app.post('/api/tickets/save', (req, res) => {
  const { newTickets, phone } = req.body;
  if (Array.isArray(newTickets)) {
    for (const tk of newTickets) {
      const idx = syncedTickets.findIndex(t => t.id === tk.id);
      if (idx >= 0) {
        syncedTickets[idx] = { ...syncedTickets[idx], ...tk };
      } else {
        syncedTickets.unshift(tk);
      }
    }
    saveTickets();
  }

  const clean = phone ? phone.replace(/\D/g, '') : '';
  if (clean) {
    for (const w of Object.values(userWallets)) {
      if (w.phone && w.phone.replace(/\D/g, '').endsWith(clean.slice(-9))) {
        w.ticketsCount = syncedTickets.filter(t => t.userPhone && t.userPhone.replace(/\D/g, '').endsWith(clean.slice(-9))).length;
        saveUserWallets();
        break;
      }
    }
  }

  const userTickets = clean 
    ? syncedTickets.filter(t => t.userPhone && t.userPhone.replace(/\D/g, '').endsWith(clean.slice(-9)))
    : syncedTickets;

  res.json({ ok: true, tickets: userTickets });
});

app.get('/api/transactions/sync', (req, res) => {
  const userId = req.query.userId as string;
  const phone = req.query.phone as string;
  const tgId = req.query.tgId as string;
  const isAdmin = req.query.isAdmin === 'true';

  let wallet = undefined;
  if (userId || phone || tgId) {
    wallet = findOrCreateWallet({ userId, phone, telegramId: tgId });
  }

  const clean = phone ? phone.replace(/\D/g, '') : '';
  const userTickets = clean
    ? syncedTickets.filter(t => t.userPhone && t.userPhone.replace(/\D/g, '').endsWith(clean.slice(-9)))
    : [];

  // Strictly isolate transactions by phone number - no user sees another user's financial transactions
  const userTransactions = clean
    ? syncedTransactions.filter(t => t.userPhone && t.userPhone.replace(/\D/g, '').endsWith(clean.slice(-9)))
    : [];

  const adminPhoneSuffix = OFFICIAL_ADMIN.phone.replace(/\D/g, '').slice(-9);
  const isVerifiedAdmin = Boolean(isAdmin) || Boolean(clean && clean.endsWith(adminPhoneSuffix)) || Boolean(wallet?.username && wallet.username.toLowerCase().replace('@', '') === 'lij_makbel');

  res.json({
    ok: true,
    transactions: isVerifiedAdmin ? syncedTransactions : userTransactions,
    tickets: userTickets,
    wallet: wallet ? {
      userId: wallet.userId,
      walletBalance: wallet.walletBalance,
      phone: wallet.phone,
      fullName: wallet.fullName,
      username: wallet.username,
      profileImage: wallet.profileImage,
      ticketsCount: wallet.ticketsCount,
      totalWon: wallet.totalWon,
      isAdmin: isVerifiedAdmin || Boolean(wallet.isAdmin),
    } : null,
  });
});

app.get('/api/admin/transactions', (_req, res) => {
  res.json({
    ok: true,
    transactions: syncedTransactions,
  });
});

app.get('/api/admin/users', (_req, res) => {
  // Automatically clean and deduplicate before listing
  deduplicateWallets();

  const usersList = Object.values(userWallets)
    .filter(w => {
      const clean = normalizeEthiopianPhone(w.phone);
      return clean.length >= 9; // Only display real registered users with valid phone numbers
    })
    .map(w => ({
      userId: w.userId,
      phone: normalizeEthiopianPhone(w.phone),
      fullName: w.fullName || 'ተጠቃሚ',
      username: w.username || '',
      profileImage: w.profileImage || '',
      registeredAt: w.registeredAt,
      password: w.password || '',
    }))
    .sort((a, b) => {
      const timeA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
      const timeB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
      return timeB - timeA;
    });

  res.json({
    ok: true,
    users: usersList,
    total: usersList.length,
  });
});

app.post('/api/admin/deduplicate', (_req, res) => {
  const result = deduplicateWallets();
  res.json({
    ok: true,
    ...result,
  });
});

app.post('/api/user/wallet/update', (req, res) => {
  const { userId, phone, telegramId, walletBalance, ticketsCount, totalWon, fullName, username, profileImage } = req.body;
  if (!userId && !phone && !telegramId) {
    return res.status(400).json({ ok: false, error: 'User identifier required' });
  }

  const wallet = findOrCreateWallet({ userId, phone, telegramId });
  if (typeof walletBalance === 'number') wallet.walletBalance = walletBalance;
  if (typeof ticketsCount === 'number') wallet.ticketsCount = ticketsCount;
  if (typeof totalWon === 'number') wallet.totalWon = totalWon;
  if (fullName) wallet.fullName = fullName;
  if (phone) wallet.phone = phone;
  if (username) wallet.username = username;
  if (profileImage) wallet.profileImage = profileImage;

  saveUserWallets();
  res.json({ ok: true, wallet });
});

app.post('/api/transactions/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, approvedBy } = req.body;
  const tx = syncedTransactions.find((t) => t.id === id);
  if (!tx) {
    return res.status(404).json({ ok: false, error: 'Transaction not found' });
  }

  tx.status = status;
  tx.approvedBy = approvedBy || 'Admin 0910961881';
  tx.approvedAt = new Date().toISOString();
  saveTransactions();

  const userWallet = findOrCreateWallet({ userId: tx.userId, phone: tx.userPhone, fullName: tx.userName });
  if (tx.type === 'deposit') {
    if (status === 'completed') {
      userWallet.walletBalance += Number(tx.amount);
    }
  } else if (tx.type === 'withdrawal') {
    if (status === 'completed') {
      userWallet.walletBalance = Math.max(0, userWallet.walletBalance - Number(tx.amount));
    } else if (status === 'failed') {
      userWallet.walletBalance += Number(tx.amount);
    }
  }
  saveUserWallets();

  res.json({ ok: true, transaction: tx });
});

app.get('/api/support/messages', (req, res) => {
  const userPhone = req.query.phone as string;
  if (!userPhone) {
    return res.json({ ok: true, messages: supportMessages.slice(-50) });
  }
  const cleanPhone = userPhone.replace(/\s+/g, '');
  const userFiltered = supportMessages.filter(
    (m) => m.userPhone.replace(/\s+/g, '').includes(cleanPhone) || cleanPhone.includes(m.userPhone.replace(/\s+/g, ''))
  );
  res.json({ ok: true, messages: userFiltered });
});

app.post('/api/support/send', async (req, res) => {
  const { userName, userPhone, text, userId } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ ok: false, error: 'Message text is required' });
  }

  const newMsg: SupportMessage = {
    id: 'sup_' + Date.now(),
    userId: userId || 'user',
    userName: (userName && userName !== 'ተጠቃሚ') ? userName : (userPhone || ''),
    userPhone: userPhone || '',
    sender: 'user',
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };

  supportMessages.push(newMsg);
  saveSupportMessages();

  const adminNotification = 
    `💬 <b>አዲስ የደንበኞች ድጋፍ ጥያቄ (Support Inquiry)</b>\n` +
    `────────────────────\n` +
    `👤 <b>ስም:</b> <b>${newMsg.userName}</b>\n` +
    `📱 <b>ስልክ:</b> <code>${newMsg.userPhone}</code>\n` +
    `💬 <b>መልዕክት:</b>\n` +
    `<i>"${newMsg.text}"</i>\n` +
    `────────────────────`;

  await notifyAllAdmins(adminNotification);
  res.json({ ok: true, message: newMsg });
});

app.post('/api/telegram/webhook', async (req, res) => {
  res.sendStatus(200);
  if (req.body?.message) {
    await handleTelegramMessage(req.body.message);
  } else if (req.body?.callback_query) {
    await handleTelegramCallback(req.body.callback_query);
  }
});

const UPDATE_ID_FILE = path.join(__dirname, 'last_update_id.txt');
let lastUpdateId = 0;
try {
  if (fs.existsSync(UPDATE_ID_FILE)) {
    lastUpdateId = parseInt(fs.readFileSync(UPDATE_ID_FILE, 'utf-8').trim(), 10) || 0;
  }
} catch {
  lastUpdateId = 0;
}

function saveLastUpdateId(id: number) {
  try {
    fs.writeFileSync(UPDATE_ID_FILE, String(id));
  } catch {}
}

async function startTelegramPolling() {
  console.log(`[Telegram Bot] Starting polling for @${BOT_USERNAME}...`);
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'ቦቱን ጀምር / Start Bot' },
        ],
      }),
    });

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'OPEN',
          web_app: { url: APP_URL },
        },
      }),
    });
  } catch (err) {
    console.error('[Bot Init Warning]', err);
  }

  while (true) {
    try {
      const offset = lastUpdateId > 0 ? lastUpdateId + 1 : 0;
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=20`
      );
      if (!res.ok) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        continue;
      }
      const data = (await res.json()) as any;
      if (data && data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          saveLastUpdateId(lastUpdateId);
          try {
            if (update.message) {
              await handleTelegramMessage(update.message);
            } else if (update.callback_query) {
              await handleTelegramCallback(update.callback_query);
            }
          } catch (innerErr) {
            console.error('[Update Processing Error]', update.update_id, innerErr);
          }
        }
      }
    } catch {
      // transient network wait
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function startServer() {
  const distPath = path.join(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath);
  const isDev = process.env.NODE_ENV !== 'production' && !hasDist;

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Enat Server] Running on http://0.0.0.0:${PORT}`);
    startTelegramPolling().catch((err) => console.error('[Polling Fatal Error]', err));
  });
}

startServer();
