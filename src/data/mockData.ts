import { LotteryDraw, Ticket, Transaction, UserProfile, WinnerNotification } from '../types/lottery';
import { 
  lottery1000BannerImage, 
  lottery5000BannerImage, 
  lottery10000BannerImage,
  lottery20000BannerImage
} from '../assets/banknotes';

export const INITIAL_USER: UserProfile = {
  id: 'usr_eth_' + Math.floor(1000 + Math.random() * 9000),
  telegramId: '',
  telegramUsername: '',
  fullName: 'ደንበኛ',
  phone: '',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  walletBalance: 0,
  ticketsCount: 0,
  totalWon: 0,
  isRegistered: true,
};

// The 4 active lotteries are present initially.
// Zero mock/completed draws: completed draws ONLY appear when the admin executes an official draw!
export const INITIAL_LOTTERIES: LotteryDraw[] = [
  {
    id: 'lot_derash_1000',
    titleAm: 'ባለ 1,000 ብር ደራሽ',
    titleEn: 'Bale 1,000 ETB Derash',
    code: 'DERASH-1K',
    category: 'instant',
    bannerUrl: lottery1000BannerImage,
    ticketPrice: 10,
    totalInventory: 200,
    ticketsSold: 0,
    round: 1,
    jackpotAmount: 1000,
    drawDate: new Date(Date.now() + 3600000 * 24).toISOString(),
    status: 'active',
    prizes: [
      { rank: 1, titleAm: '1ኛ ዕጣ (ጃክፖት)', titleEn: 'Jackpot Prize', amount: 1000, winnersCount: 1 },
    ],
    provablyFairSeed: '0x8f2a99e19d3e84a2110cbe9087d',
  },
  {
    id: 'lot_derash_5000',
    titleAm: 'ባለ 5,000 ብር ደራሽ',
    titleEn: 'Bale 5,000 ETB Derash',
    code: 'DERASH-5K',
    category: 'digital',
    bannerUrl: lottery5000BannerImage,
    ticketPrice: 50,
    totalInventory: 200,
    ticketsSold: 0,
    round: 1,
    jackpotAmount: 5000,
    drawDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: 'active',
    prizes: [
      { rank: 1, titleAm: '1ኛ ዕጣ (ጃክፖት)', titleEn: 'Jackpot Prize', amount: 5000, winnersCount: 1 },
    ],
    provablyFairSeed: '0x33b1e77f0987ad18900cde99a41',
  },
  {
    id: 'lot_derash_10000',
    titleAm: 'ባለ 10,000 ብር ደራሽ',
    titleEn: 'Bale 10,000 ETB Derash',
    code: 'DERASH-10K',
    category: 'national',
    bannerUrl: lottery10000BannerImage,
    ticketPrice: 100,
    totalInventory: 200,
    ticketsSold: 0,
    round: 1,
    jackpotAmount: 10000,
    drawDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    status: 'active',
    prizes: [
      { rank: 1, titleAm: '1ኛ ዕጣ (ጃክፖት)', titleEn: 'Jackpot Prize', amount: 10000, winnersCount: 1 },
    ],
    provablyFairSeed: '0x17c9920a4beff349a110029b3c',
  },
  {
    id: 'lot_derash_20000',
    titleAm: 'ባለ 20,000 ብር ደራሽ',
    titleEn: 'Bale 20,000 ETB Derash',
    code: 'DERASH-20K',
    category: 'national',
    bannerUrl: lottery20000BannerImage,
    ticketPrice: 200,
    totalInventory: 200,
    ticketsSold: 0,
    round: 1,
    jackpotAmount: 20000,
    drawDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: 'active',
    prizes: [
      { rank: 1, titleAm: '1ኛ ዕጣ (ጃክፖት)', titleEn: 'Jackpot Prize', amount: 20000, winnersCount: 1 },
    ],
    provablyFairSeed: '0x49a0182ceba81290384729019',
  },
];

export const INITIAL_TICKETS: Ticket[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];
export const INITIAL_NOTIFICATIONS: WinnerNotification[] = [];
