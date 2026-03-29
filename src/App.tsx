/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Globe, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Users, 
  Share2, 
  Download, 
  History, 
  Moon, 
  Sun, 
  X, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Loader2,
  Zap,
  LayoutGrid,
  List,
  ArrowRightLeft,
  FileText,
  Table,
  Languages,
  Bot as BotIcon,
  Globe2,
  Settings2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';
import { GoogleGenAI, Type } from "@google/genai";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { translations } from './translations';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Language = 'en' | 'pt' | 'es';
type Currency = string;
type CountryCode = string;

interface UserPrefs {
  country: CountryCode;
  language: Language;
  currency: Currency;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  roi: number;
  competition: number; // 0-100
  demand: 'low' | 'medium' | 'high';
  sentiment: 'positive' | 'negative' | 'neutral';
  seasonality: string;
  adSubjects: string[];
  adHeadlines: string[];
  targetAudience: string;
  platforms: string[];
  badges: ('trending' | 'margin' | 'rated')[];
  trendData: string; // Emoji/Text chart
  dominationStrategy: string;
  technicalRequirements: string;
  marketGap: string;
  pricingStrategy: string;
  imageKeyword: string; // Single word in English for image searching
}

interface AnalysisResult {
  id: string;
  niche: string;
  country: CountryCode;
  timestamp: number;
  products: Product[];
}

// --- Constants ---
const COUNTRIES: { code: CountryCode; name: string; flag: string; currency: Currency; lang: Language }[] = [
  { code: 'GLOBAL', name: 'Global', flag: '🌐', currency: 'USD', lang: 'en' },
  { code: 'US', name: 'USA', flag: '🇺🇸', currency: 'USD', lang: 'en' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', currency: 'BRL', lang: 'pt' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR', lang: 'pt' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', currency: 'AOA', lang: 'pt' },
  { code: 'MZ', name: 'Moçambique', flag: '🇲🇿', currency: 'MZN', lang: 'pt' },
  { code: 'ES', name: 'España', flag: '🇪🇸', currency: 'EUR', lang: 'es' },
  { code: 'MX', name: 'México', flag: '🇲🇽', currency: 'MXN', lang: 'es' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS', lang: 'es' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: 'COP', lang: 'es' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', currency: 'CLP', lang: 'es' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', currency: 'PEN', lang: 'es' },
  { code: 'GB', name: 'UK', flag: '🇬🇧', currency: 'GBP', lang: 'en' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', lang: 'en' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD', lang: 'en' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', lang: 'en' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', lang: 'en' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR', lang: 'en' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY', lang: 'en' },
  { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY', lang: 'en' },
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', lang: 'en' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', currency: 'RUB', lang: 'en' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', lang: 'en' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', lang: 'en' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', currency: 'EGP', lang: 'en' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', lang: 'en' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED', lang: 'en' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', currency: 'TRY', lang: 'en' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'KRW', lang: 'en' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', currency: 'IDR', lang: 'en' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', currency: 'THB', lang: 'en' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'VND', lang: 'en' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'PHP', lang: 'en' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', currency: 'MYR', lang: 'en' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', lang: 'en' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', lang: 'en' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', currency: 'EUR', lang: 'en' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currency: 'CHF', lang: 'en' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', currency: 'SEK', lang: 'en' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', currency: 'NOK', lang: 'en' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', currency: 'DKK', lang: 'en' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', currency: 'EUR', lang: 'en' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'PLN', lang: 'en' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', currency: 'CZK', lang: 'en' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', currency: 'HUF', lang: 'en' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', currency: 'RON', lang: 'en' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', currency: 'EUR', lang: 'en' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', currency: 'ILS', lang: 'en' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', currency: 'NZD', lang: 'en' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', currency: 'EUR', lang: 'en' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', currency: 'EUR', lang: 'en' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', currency: 'MAD', lang: 'en' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS', lang: 'en' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', lang: 'en' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', currency: 'UAH', lang: 'en' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR', lang: 'en' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', currency: 'BDT', lang: 'en' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', currency: 'UYU', lang: 'es' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', currency: 'PYG', lang: 'es' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', currency: 'BOB', lang: 'es' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', currency: 'USD', lang: 'es' },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  BRL: 'R$',
  EUR: '€',
  MXN: '$',
  COP: '$',
  ARS: '$',
  CLP: '$',
  PEN: 'S/',
  GBP: '£',
  CAD: '$',
  AUD: '$',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  RUB: '₽',
  ZAR: 'R',
  NGN: '₦',
  EGP: 'E£',
  SAR: 'SR',
  AED: 'د.إ',
  TRY: '₺',
  KRW: '₩',
  IDR: 'Rp',
  THB: '฿',
  VND: '₫',
  PHP: '₱',
  MYR: 'RM',
  SGD: '$',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  ILS: '₪',
  NZD: '$',
  AOA: 'Kz',
  MZN: 'MT',
  MAD: 'DH',
  GHS: 'GH₵',
  KES: 'KSh',
  UAH: '₴',
  PKR: 'Rs',
  BDT: '৳',
  UYU: '$U',
  PYG: '₲',
  BOB: 'Bs',
};

const PREMIUM_CODE = "PRO2025";

const MarketCharts = ({ products, t }: { products: Product[], t: any }) => {
  const data = products.map(p => ({
    name: p.name.length > 15 ? p.name.substring(0, 12) + '...' : p.name,
    roi: p.roi,
    competition: p.competition,
    price: p.price
  }));

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

  return (
    <div className="grid md:grid-cols-2 gap-8 mt-12">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <BarChart3 size={20} className="text-indigo-500" />
          ROI Comparison (%)
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
              />
              <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-500" />
          Competition vs. Demand
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="competition" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="roi" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const Badge = ({ type, t }: { type: 'trending' | 'margin' | 'rated'; t: any; key?: React.Key }) => {
  const styles = {
    trending: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    margin: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    rated: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
  };
  const labels = {
    trending: t.trendingBadge,
    margin: t.highMarginBadge,
    rated: t.topRatedBadge
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider", styles[type])}>
      {labels[type]}
    </span>
  );
};

// --- Main App Component ---
export default function App() {
  // State
  const [prefs, setPrefs] = useState<UserPrefs>({ country: 'US', language: 'en', currency: 'USD' });
  const [isDark, setIsDark] = useState(false);
  const [niche, setNiche] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [trialCount, setTrialCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [compareCountry, setCompareCountry] = useState<CountryCode | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  const t = translations[prefs.language];

  const toggleMagic = () => {
    const nextLang: Record<Language, Language> = { en: 'pt', pt: 'es', es: 'en' };
    const nextCountry: Record<Language, string> = { en: 'PT', pt: 'AO', es: 'MZ' };
    const newLang = nextLang[prefs.language];
    const countryCode = nextCountry[prefs.language];
    const country = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
    
    setPrefs({
      ...prefs,
      language: newLang,
      country: country.code,
      currency: country.currency
    });
    setIsDark(!isDark);
  };

  // Initialize
  useEffect(() => {
    // Load preferences
    const savedPrefs = localStorage.getItem('mi_user_prefs');
    if (savedPrefs) {
      setPrefs(JSON.parse(savedPrefs));
    } else {
      detectUserLocation();
    }

    // Load theme
    const savedTheme = localStorage.getItem('mi_theme');
    if (savedTheme === 'dark') setIsDark(true);

    // Load history
    const savedHistory = localStorage.getItem('mi_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    // Load trial
    const savedTrial = localStorage.getItem('mi_trial_count');
    if (savedTrial) setTrialCount(parseInt(savedTrial));

    // Load premium
    const premiumUntil = localStorage.getItem('mi_premium_until');
    if (premiumUntil && parseInt(premiumUntil) > Date.now()) {
      setIsPremium(true);
    }

    // Handle shared link
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');
    if (shareId) {
      const sharedData = localStorage.getItem(`mi_shared_${shareId}`);
      if (sharedData) {
        setResults(JSON.parse(sharedData));
        setNiche(JSON.parse(sharedData).niche);
      }
    }
  }, []);

  // Save changes
  useEffect(() => {
    localStorage.setItem('mi_user_prefs', JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    localStorage.setItem('mi_theme', isDark ? 'dark' : 'light');
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('mi_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('mi_trial_count', trialCount.toString());
  }, [trialCount]);

  // --- Helpers ---
  const detectUserLocation = async () => {
    try {
      // Try Geolocation API first
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await response.json();
            const countryCode = data.countryCode as CountryCode;
            const foundCountry = COUNTRIES.find(c => c.code === countryCode);
            if (foundCountry) {
              setPrefs(prev => ({
                ...prev,
                country: foundCountry.code,
                currency: foundCountry.currency,
                language: foundCountry.lang
              }));
            }
          } catch (e) {
            console.error("Reverse geocode failed", e);
            detectByIP();
          }
        }, () => {
          detectByIP();
        });
      } else {
        detectByIP();
      }
    } catch (e) {
      console.error("Location detection failed", e);
      detectByIP();
    }
  };

  const detectByIP = async () => {
    try {
      const ipResponse = await fetch('https://ipapi.co/json/');
      const ipData = await ipResponse.json();
      const countryCode = ipData.country_code as CountryCode;
      const foundCountry = COUNTRIES.find(c => c.code === countryCode);
      if (foundCountry) {
        setPrefs(prev => ({
          ...prev,
          country: foundCountry.code,
          language: foundCountry.lang,
          currency: foundCountry.currency
        }));
      }
    } catch (e) {
      console.error("IP detection failed", e);
    }
  };

  const formatCurrency = (val: number, curr: Currency) => {
    return new Intl.NumberFormat(prefs.language === 'en' ? 'en-US' : prefs.language === 'pt' ? 'pt-BR' : 'es-ES', {
      style: 'currency',
      currency: curr
    }).format(val);
  };

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === PREMIUM_CODE) {
      const thirtyDays = Date.now() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem('mi_premium_until', thirtyDays.toString());
      setIsPremium(true);
      setPromoCode('');
      alert("PRO2025 Applied! 30 days of Premium unlocked.");
    }
  };

  const runAnalysis = async (targetCountry?: CountryCode) => {
    if (!niche.trim()) return;
    
    // Check limits
    if (!isPremium && trialCount >= 3 && !targetCountry) {
      setShowUpgradeModal(true);
      return;
    }

    setIsAnalyzing(true);
    const countryToAnalyze = targetCountry || prefs.country;
    const countryData = COUNTRIES.find(c => c.code === countryToAnalyze);
    const countryName = countryData?.name || countryToAnalyze;
    const isGlobal = countryToAnalyze === 'GLOBAL';

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `Act as a professional market analyst. Perform a deep search for the niche "${niche}" ${isGlobal ? 'globally, identifying the best markets worldwide' : `with a primary focus on ${countryName}, but also considering global trends that could be applied locally`}. 
            Specifically search for:
            1. "best selling products ${niche} ${isGlobal ? 'worldwide' : `in ${countryName} and global top sellers`} last 30 days"
            2. "top affiliate products ${niche} ${isGlobal ? 'globally' : `in ${countryName} and global high-performers`}"
            3. "consumer trends ${niche} ${isGlobal ? 'global' : `in ${countryName} vs global trends`} ${new Date().toLocaleString('default', { month: 'long' })}"
            4. "competitor stores ${niche} ${isGlobal ? 'worldwide' : `in ${countryName} and international benchmarks`}"
            
            Analyze the search results and extract 6 high-potential products for this ${isGlobal ? 'global market' : `market (prioritizing ${countryName} but including global winners that would work there)`}.
            Return a JSON array of 6 products. 
            Each product must have:
            - id: string
            - name: string (translated to ${prefs.language})
            - category: string
            - price: number (suggested selling price in ${prefs.currency})
            - costPrice: number (estimated cost in ${prefs.currency})
            - roi: number (percentage, calculated as (price - costPrice) / costPrice * 100)
            - competition: number (0-100, where 100 is extremely high)
            - demand: "low" | "medium" | "high"
            - sentiment: "positive" | "negative" | "neutral" (based on customer reviews found)
            - seasonality: string (e.g., "High in December", "Stable")
            - adSubjects: string[] (3 catchy email/ad subject lines in ${prefs.language})
            - adHeadlines: string[] (3 high-converting headlines in ${prefs.language})
            - targetAudience: string (detailed buyer persona for ${isGlobal ? 'the global market' : countryName} in ${prefs.language}, e.g., "Women 25-40, middle class, urban areas")
            - platforms: string[] (top 3 platforms to sell/advertise in ${isGlobal ? 'the world' : countryName}, e.g., Mercado Libre, Amazon, TikTok)
            - badges: array of "trending" (if demand is high), "margin" (if ROI > 50%), "rated" (if sentiment is positive)
            - trendData: string (emoji/text chart showing 3 months trend, e.g. "📈 ↗️ 📈")
            - dominationStrategy: string (detailed strategy to dominate this niche in ${prefs.language})
            - technicalRequirements: string (parts, tools, or skills needed to master this in ${prefs.language})
            - marketGap: string (what competitors are missing in ${prefs.language})
            - pricingStrategy: string (how to price and position for maximum profit in ${prefs.language})
            - imageKeyword: string (a single, descriptive English word representing the product for image searching, e.g., "watch", "drone", "sneakers")` }]
          }
        ],
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                price: { type: Type.NUMBER },
                costPrice: { type: Type.NUMBER },
                roi: { type: Type.NUMBER },
                competition: { type: Type.NUMBER },
                demand: { type: Type.STRING },
                sentiment: { type: Type.STRING },
                seasonality: { type: Type.STRING },
                adSubjects: { type: Type.ARRAY, items: { type: Type.STRING } },
                adHeadlines: { type: Type.ARRAY, items: { type: Type.STRING } },
                targetAudience: { type: Type.STRING },
                platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
                badges: { type: Type.ARRAY, items: { type: Type.STRING } },
                trendData: { type: Type.STRING },
                dominationStrategy: { type: Type.STRING },
                technicalRequirements: { type: Type.STRING },
                marketGap: { type: Type.STRING },
                pricingStrategy: { type: Type.STRING },
                imageKeyword: { type: Type.STRING }
              },
              required: ["id", "name", "category", "price", "costPrice", "roi", "competition", "demand", "sentiment", "seasonality", "adSubjects", "adHeadlines", "targetAudience", "platforms", "badges", "trendData", "dominationStrategy", "technicalRequirements", "marketGap", "pricingStrategy", "imageKeyword"]
            }
          }
        }
      });

      const response = await model;
      const products = JSON.parse(response.text) as Product[];

      const newResult: AnalysisResult = {
        id: Math.random().toString(36).substr(2, 9),
        niche,
        country: countryToAnalyze,
        timestamp: Date.now(),
        products
      };

      if (!targetCountry) {
        setResults(newResult);
        setHistory(prev => [newResult, ...prev].slice(0, 5));
        if (!isPremium) setTrialCount(prev => prev + 1);
      } else {
        return newResult;
      }
    } catch (error) {
      console.error("Analysis failed", error);
      alert(t.errorSearch);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCompare = async (targetCountry: CountryCode) => {
    setIsComparing(true);
    const result = await runAnalysis(targetCountry);
    if (result) {
      setComparisonResult(result);
    }
    setIsComparing(false);
  };

  const exportCSV = () => {
    if (!results) return;
    const headers = ["Name", "Category", "Price", "Cost", "ROI", "Competition", "Demand", "Sentiment", "Seasonality"];
    const rows = results.products.map(p => [
      p.name, p.category, p.price, p.costPrice, p.roi, p.competition, p.demand, p.sentiment, p.seasonality
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `market_insight_${results.niche}.csv`);
    document.body.appendChild(link);
    link.click();
    alert(t.csvExported);
  };

  const askAI = async (customQuery?: string, productContext?: Product) => {
    if (isAiThinking) return;
    
    setIsAiThinking(true);
    const contextNiche = productContext?.name || results?.niche || "any high-potential market";
    const contextCountry = results?.country || prefs.country;
    const countryName = COUNTRIES.find(c => c.code === contextCountry)?.name || contextCountry;
    
    const query = customQuery || aiQuery || `Generate a master plan for the niche ${contextNiche} in ${countryName}. Include execution steps and market entry strategy.`;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `You are the MarketInsight Pro Global AI Strategy Assistant. 
            Context: The user is analyzing ${productContext ? `the specific product "${productContext.name}"` : `the niche "${contextNiche}"`} in ${countryName}.
            ${results ? `Current Market Data: ${JSON.stringify(results.products.map(p => ({ name: p.name, price: p.price, roi: p.roi })))}` : ''}
            ${productContext ? `Product Details: ${JSON.stringify(productContext)}` : ''}
            
            Task: ${query}
            
            Requirements:
            1. Provide a professional, data-driven response.
            2. If generating a "Master Plan", include:
               - Market Entry Strategy
               - Pricing Estimates (Low, Mid, High)
               - Marketing Channels with estimated ROI
               - Technical Parts/Requirements needed to dominate
               - 12-month growth projection
            3. Use Markdown for formatting.
            4. Language: ${prefs.language === 'pt' ? 'Portuguese' : prefs.language === 'es' ? 'Spanish' : 'English'}.
            5. Currency: ${prefs.currency}.` }]
          }
        ]
      });

      const response = await model;
      setAiResponse(response.text || "No response generated.");
      setAiQuery('');
    } catch (e) {
      console.error("AI Assistant failed", e);
      setAiResponse("Error connecting to AI Assistant. Please try again.");
    } finally {
      setIsAiThinking(false);
    }
  };

  const exportPDF = (singleProduct?: Product) => {
    if (!results) return;
    const doc = new jsPDF();
    const countryName = COUNTRIES.find(c => c.code === results.country)?.name || results.country;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text("MarketInsight Pro Global", 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Report: ${results.niche} (${countryName})`, 14, 30);
    doc.text(`Date: ${new Date(results.timestamp).toLocaleDateString()}`, 14, 37);

    const productsToExport = singleProduct ? [singleProduct] : results.products;

    autoTable(doc, {
      startY: 45,
      head: [["Product", "Category", "Price", "Cost", "ROI", "Competition", "Demand"]],
      body: productsToExport.map(p => [
        p.name, 
        p.category, 
        formatCurrency(p.price, prefs.currency), 
        formatCurrency(p.costPrice, prefs.currency), 
        `+${p.roi}%`, 
        `${p.competition}%`, 
        t[p.demand]
      ]),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    if (singleProduct) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(t.dominationStrategy + ":", 14, currentY);
      doc.setFontSize(10);
      doc.setTextColor(100);
      let splitText = doc.splitTextToSize(singleProduct.dominationStrategy, 180);
      doc.text(splitText, 14, currentY + 7);
      currentY += (splitText.length * 5) + 15;

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(t.technicalRequirements + ":", 14, currentY);
      doc.setFontSize(10);
      doc.setTextColor(100);
      splitText = doc.splitTextToSize(singleProduct.technicalRequirements, 180);
      doc.text(splitText, 14, currentY + 7);
    } else if (aiResponse) {
      // Add AI Master Plan to full report
      doc.addPage();
      doc.setFontSize(18);
      doc.setTextColor(79, 70, 229);
      doc.text(t.masterPlan, 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(50);
      const splitText = doc.splitTextToSize(aiResponse, 180);
      doc.text(splitText, 14, 30);
    }

    doc.save(`market_insight_${results.niche}${singleProduct ? '_' + singleProduct.name : '_full_plan'}.pdf`);
    alert(t.pdfExported);
  };

  const copyPublicLink = () => {
    if (!results) return;
    // Simulate a public link by saving to a "shared" key in localStorage
    const shareId = results.id;
    localStorage.setItem(`mi_shared_${shareId}`, JSON.stringify(results));
    const url = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
    navigator.clipboard.writeText(url);
    alert(t.linkCopied);
  };

  // --- Render Components ---

  return (
    <div className={cn("min-h-screen font-sans transition-colors duration-500", isDark ? "bg-[#0A0C10] text-slate-200" : "bg-[#F8FAFC] text-slate-900")}>
      {/* Enhanced Top Bar & Header */}
      <div className="sticky top-0 z-50 w-full">
        {/* Top Utility Bar */}
        <div className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-2 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center text-[11px] font-bold uppercase tracking-widest">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsDark(!isDark)} 
                className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-95"
              >
                {isDark ? <Sun size={14} className="text-yellow-500" /> : <Moon size={14} className="text-indigo-600" />}
                <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
              </button>
              
              <div className="relative group flex items-center gap-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer">
                <Globe2 size={14} className="text-indigo-500" />
                <span>{COUNTRIES.find(c => c.code === prefs.country)?.name} • {prefs.currency}</span>
                <select 
                  value={prefs.country} 
                  onChange={(e) => {
                    const c = COUNTRIES.find(x => x.code === e.target.value);
                    if (c) setPrefs({ ...prefs, country: c.code, currency: c.currency, language: c.lang });
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.currency})</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={detectUserLocation}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-500 transition-all active:scale-90"
                title="Detect Location"
              >
                <Settings2 size={14} />
              </button>
            </div>

            <div className="flex items-center gap-6 text-slate-500">
              <div className="hidden md:flex items-center gap-2">
                <Languages size={14} />
                <span>{prefs.language.toUpperCase()}</span>
              </div>
              {!isPremium && (
                <div className="flex items-center gap-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  <span className="animate-pulse">●</span>
                  <span>{3 - trialCount} {t.freeAnalysesLeft.split(':')[0]}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 rotate-3">
                <TrendingUp className="text-white w-7 h-7" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl md:text-2xl font-black tracking-tighter leading-none italic bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  {t.title}
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Global Intelligence Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={toggleMagic}
                className="group relative flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
              >
                <Sparkles size={16} className="text-indigo-500 group-hover:animate-pulse" />
                <span className="hidden md:inline">{t.magicToggle}</span>
              </button>
              
              {isPremium ? (
                <div className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2.5 rounded-2xl shadow-lg shadow-orange-500/20">
                  <Zap size={16} fill="currentColor" />
                  <span className="text-xs font-black uppercase tracking-widest">PRO</span>
                </div>
              ) : (
                <button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl text-xs font-black transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                  UPGRADE
                </button>
              )}
            </div>
          </div>
        </header>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero & Search */}
        <section className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[11px] font-bold uppercase tracking-widest mb-6 border border-indigo-500/20">
              <Sparkles size={14} />
              Powered by Gemini 3.1 Flash
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
              {t.subtitle}
            </h2>
            
            <div className="max-w-3xl mx-auto relative group mb-16">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[32px] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative flex flex-col md:flex-row items-center bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-200 dark:border-slate-800 p-3 gap-3">
                <div className="flex flex-1 items-center w-full">
                  <div className="pl-5 text-slate-400">
                    <Search size={24} />
                  </div>
                  <input 
                    type="text" 
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runAnalysis()}
                    placeholder={t.searchPlaceholder}
                    className="w-full bg-transparent px-5 py-4 focus:outline-none text-xl font-medium placeholder:text-slate-400"
                  />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => runAnalysis()}
                    disabled={isAnalyzing}
                    className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-indigo-500/20 active:scale-95"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" /> : <Zap size={20} />}
                    {isAnalyzing ? t.analyzing : t.searchButton}
                  </button>
                </div>
              </div>
            </div>

            {/* AI Strategy Assistant Section (Homepage Version) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-16 bg-gradient-to-br from-indigo-600 to-violet-800 rounded-[40px] p-8 md:p-12 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <BotIcon size={200} />
              </div>
              
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                      <BotIcon size={32} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black tracking-tight">{t.aiAssistant}</h2>
                      <p className="text-indigo-100/70 text-sm font-medium uppercase tracking-widest mt-1">Advanced Strategy Engine</p>
                    </div>
                  </div>
                  
                  {results && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
                      <Globe size={16} className="text-indigo-200" />
                      <span className="text-xs font-bold uppercase tracking-wider">{results.niche} • {COUNTRIES.find(c => c.code === results.country)?.name}</span>
                    </div>
                  )}
                </div>

                <div className="grid lg:grid-cols-5 gap-10">
                  <div className="lg:col-span-2 flex flex-col h-full">
                    <p className="text-indigo-50 mb-8 leading-relaxed text-lg">
                      {results ? `Analyzing "${results.niche}" in ${results.country}. Ask for a specific strategy or generate a master plan.` : `Not sure where to start? Ask the AI for high-potential niche ideas in ${COUNTRIES.find(c => c.code === prefs.country)?.name || prefs.country}.`}
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3">
                        <div className="relative">
                          <input 
                            type="text" 
                            value={aiQuery}
                            onChange={(e) => setAiQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && askAI()}
                            placeholder={t.askAssistant}
                            className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-lg placeholder:text-indigo-200/50 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all backdrop-blur-sm shadow-inner"
                          />
                          <button 
                            onClick={() => askAI()}
                            disabled={isAiThinking}
                            className="absolute right-2 top-2 bottom-2 bg-white text-indigo-600 px-6 rounded-xl font-black text-sm hover:bg-indigo-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                          >
                            {isAiThinking ? <Loader2 className="animate-spin" size={18} /> : <ArrowRightLeft size={18} />}
                            {t.searchButton}
                          </button>
                        </div>
                        
                        {results && (
                          <button 
                            onClick={() => askAI(`Generate a complete step-by-step master plan to dominate the ${results.niche} niche in ${results.country}.`)}
                            disabled={isAiThinking}
                            className="w-full py-5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-2xl font-black text-xl flex items-center justify-center gap-4 transition-all group shadow-xl"
                          >
                            <Sparkles className="group-hover:scale-125 transition-transform text-amber-300" />
                            {t.generatePlan}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-3 bg-slate-950/40 backdrop-blur-xl rounded-[32px] p-8 border border-white/10 min-h-[400px] flex flex-col shadow-inner">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Strategy Output</span>
                      </div>
                      <div className="flex gap-3">
                        {aiResponse && (
                          <>
                            <button 
                              onClick={() => setAiResponse('')}
                              className="text-[10px] font-black uppercase tracking-widest bg-red-500/20 hover:bg-red-500/40 text-red-200 px-4 py-2 rounded-xl transition-all border border-red-500/30"
                            >
                              {t.clear}
                            </button>
                            <button 
                              onClick={() => exportPDF()}
                              className="text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all border border-white/20"
                            >
                              {t.fullExport}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto max-h-[450px] pr-4 custom-scrollbar">
                      {isAiThinking ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
                          <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse" />
                            <Loader2 className="animate-spin text-white/80 relative" size={64} />
                          </div>
                          <p className="text-indigo-200 font-black text-xl animate-pulse tracking-tight">{t.executing}</p>
                        </div>
                      ) : aiResponse ? (
                        <div className="prose prose-invert prose-indigo max-w-none">
                          <div className="whitespace-pre-wrap text-base leading-relaxed text-indigo-50/90 font-medium">
                            {aiResponse}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-12">
                          <BotIcon size={80} className="mb-6 text-indigo-300" />
                          <p className="text-lg font-bold tracking-tight">{t.aiAssistantReady}</p>
                          <p className="text-sm mt-2 text-indigo-200/60">Input a query to begin analysis</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Results */}
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white dark:bg-[#1A1F26] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 animate-pulse">
                  <div className="w-full aspect-video bg-gray-200 dark:bg-gray-800 rounded-2xl mb-4" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-full w-3/4 mb-3" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-full w-1/2 mb-6" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                    <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                  </div>
                </div>
              ))}
            </motion.div>
          ) : results ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-xl gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-500/20">
                    <Globe size={18} />
                    <span className="text-sm font-black uppercase tracking-widest">{COUNTRIES.find(c => c.code === results.country)?.name}</span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">"{results.niche}"</h3>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button 
                    onClick={() => setShowCompareModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all border border-indigo-100 dark:border-indigo-900/30"
                  >
                    <ArrowRightLeft size={18} />
                    {t.compareCountry}
                  </button>
                  <button 
                    onClick={() => {
                      setResults(null);
                      setComparisonResult(null);
                      setNiche('');
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all border border-red-100 dark:border-red-900/30"
                  >
                    <X size={18} />
                    {t.clearSearch}
                  </button>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1" />
                  <button 
                    onClick={copyPublicLink}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-black rounded-2xl transition-all"
                  >
                    <Share2 size={18} />
                    {t.copyLink}
                  </button>
                  <button 
                    onClick={() => exportPDF()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-black rounded-2xl transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <FileText size={18} />
                    {t.exportReport}
                  </button>
                  <button 
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-black rounded-2xl transition-all"
                  >
                    <Table size={18} />
                    CSV
                  </button>
                </div>
              </div>

              {comparisonResult && (
                <div className="bg-indigo-600 text-white p-6 rounded-[32px] shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-black flex items-center gap-3">
                      <ArrowRightLeft />
                      {t.compareTitle}
                    </h3>
                    <button onClick={() => setComparisonResult(null)} className="p-2 hover:bg-white/20 rounded-xl">
                      <X size={24} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/20">
                        <span className="text-2xl">{COUNTRIES.find(c => c.code === results.country)?.flag}</span>
                        <span className="font-bold uppercase tracking-wider">{COUNTRIES.find(c => c.code === results.country)?.name}</span>
                      </div>
                      <div className="space-y-2">
                        {results.products.slice(0, 3).map(p => (
                          <div key={p.id} className="bg-white/5 p-3 rounded-xl flex justify-between items-center">
                            <span className="text-sm font-medium">{p.name}</span>
                            <span className="font-bold text-emerald-300">+{p.roi}% ROI</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/20">
                        <span className="text-2xl">{COUNTRIES.find(c => c.code === comparisonResult.country)?.flag}</span>
                        <span className="font-bold uppercase tracking-wider">{COUNTRIES.find(c => c.code === comparisonResult.country)?.name}</span>
                      </div>
                      <div className="space-y-2">
                        {comparisonResult.products.slice(0, 3).map(p => (
                          <div key={p.id} className="bg-white/5 p-3 rounded-xl flex justify-between items-center">
                            <span className="text-sm font-medium">{p.name}</span>
                            <span className="font-bold text-emerald-300">+{p.roi}% ROI</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.products.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group bg-white dark:bg-[#1A1F26] rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500"
                  >
                    {/* Image Placeholder */}
                    <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                      <img 
                        src={`https://loremflickr.com/600/400/${product.imageKeyword || product.category || 'product'}`} 
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4">
                        <div className="flex gap-1.5">
                          {product.badges.map(b => <Badge key={b} type={b as any} t={t} />)}
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">{product.category}</p>
                          <h4 className="text-xl font-bold leading-tight">{product.name}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.roi}</p>
                          <p className="text-lg font-black text-emerald-500">+{product.roi}%</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 my-6">
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                          <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">{t.sellingPrice}</p>
                          <p className="text-lg font-bold">{formatCurrency(product.price, prefs.currency)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                          <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">{t.costPrice}</p>
                          <p className="text-lg font-bold">{formatCurrency(product.costPrice, prefs.currency)}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-[10px] font-bold uppercase mb-1.5">
                            <span className="text-gray-500">{t.competition}</span>
                            <span className={cn(
                              product.competition > 70 ? "text-red-500" : product.competition > 40 ? "text-orange-500" : "text-emerald-500"
                            )}>{product.competition}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-1000",
                                product.competition > 70 ? "bg-red-500" : product.competition > 40 ? "bg-orange-500" : "bg-emerald-500"
                              )}
                              style={{ width: `${product.competition}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-2 border-y border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-2">
                            <BarChart3 size={14} className="text-gray-400" />
                            <span className="text-xs font-medium">{t.demand}: <span className="font-bold">{t[product.demand]}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-gray-400" />
                            <span className="text-xs font-bold">{product.trendData}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <Users size={14} className="text-indigo-500" />
                            <p className="text-gray-600 dark:text-gray-400 line-clamp-2 italic">{product.targetAudience}</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {product.platforms.map(p => (
                              <span key={p} className="text-[9px] font-bold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md text-gray-500">{p}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-6">
                        <button 
                          onClick={() => setSelectedProduct(product)}
                          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                          <LayoutGrid size={16} />
                          {t.viewDetails}
                        </button>
                        <button 
                          onClick={() => exportPDF(product)}
                          className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* AI Strategy Assistant Section - Removed from here, moved to homepage */}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-6">
                <LayoutGrid size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Ready to start?</h3>
              <p className="max-w-xs text-sm">Enter a niche above or use the AI Assistant to discover winning products and market trends.</p>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* History Sidebar Toggle */}
      <button 
        onClick={() => setShowHistory(true)}
        className="fixed bottom-8 left-8 w-14 h-14 bg-white dark:bg-[#1A1F26] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-500 hover:text-indigo-600 transition-colors z-30"
      >
        <History size={24} />
      </button>

      {/* History Drawer */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed top-0 left-0 h-full w-80 bg-white dark:bg-[#151921] z-50 shadow-2xl p-6 border-r border-gray-200 dark:border-gray-800"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <History className="text-indigo-500" />
                  {t.history}
                </h3>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-10">{t.noHistory}</p>
                ) : (
                  history.map(item => (
                    <button 
                      key={item.id}
                      onClick={() => {
                        setResults(item);
                        setNiche(item.niche);
                        setShowHistory(false);
                      }}
                      className="w-full text-left p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">{COUNTRIES.find(c => c.code === item.country)?.flag} {item.country}</span>
                        <span className="text-[10px] text-gray-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="font-bold group-hover:text-indigo-600 transition-colors">{item.niche}</p>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Compare Modal */}
      <AnimatePresence>
        {showCompareModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCompareModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-[#1A1F26] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800"
            >
              <div className="p-8">
                <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
                  <Globe className="text-indigo-500" />
                  {t.selectCountry}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {COUNTRIES.filter(c => c.code !== prefs.country).map(c => (
                    <button 
                      key={c.code}
                      onClick={() => {
                        handleCompare(c.code);
                        setShowCompareModal(false);
                      }}
                      className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left"
                    >
                      <span className="text-2xl">{c.flag}</span>
                      <span className="font-bold text-sm">{c.name}</span>
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setShowCompareModal(false)}
                  className="w-full mt-6 py-3 text-sm font-bold text-gray-400 uppercase tracking-widest"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[95vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-[20px] flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3">
                    <LayoutGrid size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-1">{selectedProduct.name}</h2>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">{selectedProduct.category}</span>
                      <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <div className="flex gap-1">
                        {selectedProduct.badges.map(b => <Badge key={b} type={b as any} t={t} />)}
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-500 active:scale-90"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                {/* Charts Section - Now inside Modal */}
                <div className="mb-12">
                  <MarketCharts products={results?.products || []} t={t} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">{t.sellingPrice}</p>
                    <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(selectedProduct.price, prefs.currency)}</p>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">{t.costPrice}</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(selectedProduct.costPrice, prefs.currency)}</span>
                    </div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-[10px] uppercase font-bold text-emerald-600/60 mb-2 tracking-widest">{t.roi}</p>
                    <p className="text-3xl font-black text-emerald-600">+{selectedProduct.roi}%</p>
                    <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
                      <span className="text-xs text-emerald-600/70 font-medium">{t.competition}</span>
                      <span className="text-sm font-bold text-emerald-600">{selectedProduct.competition}%</span>
                    </div>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-[10px] uppercase font-bold text-indigo-600/60 mb-2 tracking-widest">{t.demand}</p>
                    <p className="text-3xl font-black text-indigo-600">{t[selectedProduct.demand]}</p>
                    <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-800 flex justify-between items-center">
                      <span className="text-xs text-indigo-600/70 font-medium">{t.sentiment}</span>
                      <span className="text-sm font-bold text-indigo-600">{t[selectedProduct.sentiment]}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-indigo-500" />
                        {t.dominationStrategy}
                      </h3>
                      <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {selectedProduct.dominationStrategy}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Zap size={20} className="text-amber-500" />
                        {t.technicalRequirements}
                      </h3>
                      <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {selectedProduct.technicalRequirements}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-8">
                    <section>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <AlertCircle size={20} className="text-red-500" />
                        {t.marketGap}
                      </h3>
                      <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {selectedProduct.marketGap}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <DollarSign size={20} className="text-emerald-500" />
                        {t.pricingStrategy}
                      </h3>
                      <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {selectedProduct.pricingStrategy}
                      </div>
                    </section>
                  </div>
                </div>

                {/* AI Assistant inside Modal */}
                <div className="mt-12 bg-slate-900 rounded-[32px] p-6 md:p-8 text-white">
                  <div className="flex items-center gap-3 mb-6">
                    <BotIcon size={24} className="text-indigo-400" />
                    <h3 className="text-xl font-bold">Ask AI about {selectedProduct.name}</h3>
                  </div>
                  <div className="grid lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <p className="text-slate-400 text-sm">Ask for specific marketing angles, supplier ideas, or localized scaling tips for this product.</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                          type="text" 
                          value={aiQuery}
                          onChange={(e) => setAiQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && askAI(undefined, selectedProduct)}
                          placeholder={t.askAssistant}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button 
                          onClick={() => askAI(undefined, selectedProduct)}
                          disabled={isAiThinking}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                        >
                          {isAiThinking ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                          {t.searchButton}
                        </button>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 min-h-[150px] max-h-[300px] overflow-y-auto custom-scrollbar border border-white/10">
                      {isAiThinking ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-50">
                          <Loader2 className="animate-spin" />
                          <p className="text-xs uppercase tracking-widest font-bold">{t.executing}</p>
                        </div>
                      ) : aiResponse ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                            {aiResponse}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                          <BotIcon size={32} />
                          <p className="text-xs mt-2">Ready to assist...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <section className="bg-slate-100 dark:bg-slate-800/50 p-8 rounded-3xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <Users size={24} className="text-indigo-500" />
                      {t.targetAudience}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                      {selectedProduct.targetAudience}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.platforms.map((p, i) => (
                        <span key={i} className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-600">
                          {p}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="bg-indigo-600 text-white p-8 rounded-3xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <BarChart3 size={24} className="text-white" />
                      {t.adHeadlines}
                    </h3>
                    <div className="space-y-4">
                      {selectedProduct.adHeadlines.map((h, i) => (
                        <div key={i} className="p-3 bg-white/10 rounded-xl border border-white/20 text-sm font-medium">
                          "{h}"
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-end gap-3">
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors order-2 sm:order-1"
                >
                  {t.close}
                </button>
                <button 
                  onClick={() => exportPDF(selectedProduct)}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 order-1 sm:order-2"
                >
                  <Download size={18} />
                  {t.exportReport}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpgradeModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-[#1A1F26] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Zap size={40} className="text-indigo-600" fill="currentColor" />
                </div>
                <h3 className="text-2xl font-black mb-2">MarketInsight Pro</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                  {t.upgradeMessage}
                </p>

                <div className="space-y-4">
                  <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all">
                    {t.subscribeButton.replace('{price}', formatCurrency(29.90, prefs.currency))}
                  </button>
                  
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-gray-800"></div></div>
                    <div className="relative flex justify-center text-xs uppercase font-bold text-gray-400"><span className="bg-white dark:bg-[#1A1F26] px-2">OR</span></div>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={t.premiumCodePlaceholder}
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-xl focus:outline-none text-sm font-medium"
                    />
                    <button 
                      onClick={handleApplyPromo}
                      className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm"
                    >
                      {t.applyCode}
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => setShowUpgradeModal(false)}
                  className="mt-8 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-gray-200 dark:border-gray-800 mt-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <TrendingUp size={20} />
            <span className="font-bold text-sm tracking-tight">{t.title}</span>
          </div>
          <p className="text-xs text-gray-500 font-medium">{t.footer}</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs font-bold text-gray-400 hover:text-indigo-500 transition-colors uppercase tracking-widest">Privacy</a>
            <a href="#" className="text-xs font-bold text-gray-400 hover:text-indigo-500 transition-colors uppercase tracking-widest">Terms</a>
            <a href="#" className="text-xs font-bold text-gray-400 hover:text-indigo-500 transition-colors uppercase tracking-widest">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
