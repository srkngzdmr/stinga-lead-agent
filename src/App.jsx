import { useState, useEffect, useRef, useCallback } from "react";

const STINGA_CONTEXT = `
Stinga Enerji A.Ş. Hakkında:
- 134 ülkede patentli emisyonsuz yanma teknolojisi
- 18 yıllık AR-GE geçmişi, %97 yanma verimi, ≈0 emisyon
- Kurucu: Şenol Faik Özyaman
- Merkez: Büyükçekmece/İstanbul
- Tel: +90 212 872 23 57 | E-Posta: info@stinga.biz

Ürün ve Hizmetler:
1. Emisyonsuz Yanma Teknolojisi (Stinga 4D Reaktörler)
2. Kömür Kurutma Sistemleri (oksijensiz ortamda karbonlaştırma)
3. Buhar/Sıcak Su/Sıcak Hava Üretim Kazanları
4. Aktif Karbon Üretimi (su & hava arıtma)
5. Arıtma Çamuru Bertaraf Teknolojisi
6. Madencilik (Pınarhisar kömür madeni)
7. Endüstriyel Makine İmalatı
8. Bitümlü Şist Yakma Teknolojisi

Emisyon Değerleri (ENKA Lab onaylı):
- CO: 12 ppm (yasal 250), CO₂: %0.4 (tipik %8-12)
- NOx: 3 ppm (yasal 400), SO₂: ≈0 (yasal 2000)
`;

const SECTOR_QUERIES = {
  "Termik Santral & Enerji": {
    icon: "⚡", color: "#f59e0b",
    reason: "Emisyonsuz yanma ile kömür verimini artırma ve emisyonları düşürme",
    currentSystem: "Konvansiyonel kömür yakma kazanları, yüksek emisyon, düşük verim"
  },
  "Çimento & Yapı Malzemesi": {
    icon: "🏗️", color: "#8b5cf6",
    reason: "Yüksek sıcaklık ihtiyacı, kömür kurutma ve emisyon azaltma",
    currentSystem: "Döner fırınlar, yüksek CO₂ emisyonu, karbon vergisi riski"
  },
  "Demir-Çelik": {
    icon: "🔩", color: "#ef4444",
    reason: "Yüksek enerji tüketimi, emisyon düşürme zorunluluğu",
    currentSystem: "Geleneksel fırınlar, yüksek karbon ayak izi"
  },
  "Tekstil & Kumaş": {
    icon: "🧵", color: "#ec4899",
    reason: "Buhar üretim kazanları, enerji maliyeti düşürme",
    currentSystem: "Doğalgaz/kömür kazanları, yüksek yakıt maliyeti"
  },
  "Belediye & Atık Yönetimi": {
    icon: "🏛️", color: "#06b6d4",
    reason: "Arıtma çamuru bertarafı, atık yakma, aktif karbon üretimi",
    currentSystem: "Depolama/düzenli depolama, yüksek maliyet, çevre sorunları"
  },
  "Su Arıtma & Çevre": {
    icon: "💧", color: "#3b82f6",
    reason: "Aktif karbon tedariki, arıtma teknolojileri",
    currentSystem: "İthal aktif karbon kullanımı, yüksek maliyet"
  },
  "Gıda & Tarım": {
    icon: "🌾", color: "#22c55e",
    reason: "Kurutma teknolojisi, enerji verimliliği",
    currentSystem: "Geleneksel kurutma fırınları, yüksek enerji tüketimi"
  },
  "Kağıt & Selüloz": {
    icon: "📄", color: "#a855f7",
    reason: "Buhar üretimi, kurutma süreçleri, emisyon azaltma",
    currentSystem: "Yüksek buhar tüketimi, doğalgaz bağımlılığı"
  }
};

const KNOWN_COMPANIES = {
  "Termik Santral & Enerji": [
    { name: "EÜAŞ", sector: "Enerji Üretimi", website: "www.euas.gov.tr", linkedin: "linkedin.com/company/euas", email: "bilgi@euas.gov.tr", phone: "+90 312 212 69 00", note: "Devlet termik santralleri", need: "Linyit santrallerinde emisyon düşürme", priority: "high" },
    { name: "Eren Enerji", sector: "Enerji", website: "www.erenenerji.com.tr", linkedin: "linkedin.com/company/eren-enerji", email: "info@erenenerji.com.tr", note: "Kömürlü termik santral", need: "Yanma verimi artırma", priority: "high" },
    { name: "IC İçtaş Enerji", sector: "Enerji", website: "www.icholding.com.tr", linkedin: "linkedin.com/company/ic-ictas", email: "info@icholding.com.tr", note: "Termik santral yatırımcısı", need: "Emisyon azaltma teknolojisi", priority: "high" },
    { name: "Çelikler Holding", sector: "Enerji/Madencilik", website: "www.celikler.com.tr", linkedin: "linkedin.com/company/celikler-holding", email: "info@celikler.com.tr", note: "Kömür madeni + santral", need: "Kömür kalitesini artırma", priority: "high" },
    { name: "Bereket Enerji", sector: "Enerji", website: "www.bereketenerji.com.tr", linkedin: "linkedin.com/company/bereket-enerji", email: "info@bereketenerji.com.tr", note: "Termik santral", need: "Çevresel uyumluluk", priority: "medium" },
    { name: "TKİ", sector: "Madencilik", website: "www.tki.gov.tr", linkedin: "linkedin.com/company/tki", email: "bilgi@tki.gov.tr", phone: "+90 312 295 70 00", note: "Devlet kömür işletmesi — Stinga ile geçmiş çalışma var", need: "Kömür kurutma ve kalite artırma", priority: "high" },
  ],
  "Çimento & Yapı Malzemesi": [
    { name: "Limak Çimento", sector: "Çimento", website: "www.limak.com.tr", linkedin: "linkedin.com/company/limak-holding", email: "info@limak.com.tr", note: "Türkiye geneli çimento", need: "Alternatif yakıt, emisyon düşürme", priority: "high" },
    { name: "Oyak Çimento", sector: "Çimento", website: "www.oyakcimento.com", linkedin: "linkedin.com/company/oyak-cimento", email: "info@oyakcimento.com", note: "Büyük çimento grubu", need: "Karbon vergisi uyumu", priority: "high" },
    { name: "Akçansa", sector: "Çimento", website: "www.akcansa.com.tr", linkedin: "linkedin.com/company/akcansa", email: "info@akcansa.com.tr", note: "Sabancı/HeidelbergCement", need: "Sürdürülebilir üretim", priority: "high" },
    { name: "Çimsa", sector: "Çimento", website: "www.cimsa.com.tr", linkedin: "linkedin.com/company/cimsa", email: "info@cimsa.com.tr", note: "Sabancı grubu", need: "Emisyon azaltma hedefleri", priority: "medium" },
    { name: "Nuh Çimento", sector: "Çimento", website: "www.nuhcimento.com.tr", linkedin: "linkedin.com/company/nuh-cimento", email: "info@nuhcimento.com.tr", note: "Kocaeli bölgesi", need: "Enerji verimliliği", priority: "medium" },
  ],
  "Demir-Çelik": [
    { name: "Erdemir", sector: "Demir-Çelik", website: "www.erdemir.com.tr", linkedin: "linkedin.com/company/erdemir", email: "info@erdemir.com.tr", phone: "+90 372 323 23 00", note: "Türkiye'nin en büyüğü", need: "Karbon ayak izi azaltma", priority: "high" },
    { name: "İsdemir", sector: "Demir-Çelik", website: "www.isdemir.com.tr", linkedin: "linkedin.com/company/isdemir", email: "info@isdemir.com.tr", note: "Erdemir grubu", need: "Emisyon uyum", priority: "high" },
    { name: "Kardemir", sector: "Demir-Çelik", website: "www.kardemir.com", linkedin: "linkedin.com/company/kardemir", email: "info@kardemir.com", note: "Karabük Demir Çelik", need: "Alternatif enerji kaynakları", priority: "medium" },
    { name: "Tosyalı Holding", sector: "Demir-Çelik", website: "www.tosyaliholding.com.tr", linkedin: "linkedin.com/company/tosyali-holding", email: "info@tosyaliholding.com.tr", note: "Büyük çelik grubu", need: "Enerji maliyeti düşürme", priority: "high" },
  ],
  "Tekstil & Kumaş": [
    { name: "Zorlu Holding (Korteks)", sector: "Tekstil", website: "www.zorlu.com.tr", linkedin: "linkedin.com/company/zorlu-holding", email: "info@zorlu.com.tr", note: "Büyük tekstil grubu", need: "Buhar kazanı verimliliği", priority: "high" },
    { name: "Kipaş Holding", sector: "Tekstil", website: "www.kipas.com.tr", linkedin: "linkedin.com/company/kipas-holding", email: "info@kipas.com.tr", note: "Kahramanmaraş tekstil", need: "Enerji maliyeti optimize", priority: "medium" },
    { name: "Sanko Holding", sector: "Tekstil", website: "www.sanko.com.tr", linkedin: "linkedin.com/company/sanko-holding", email: "info@sanko.com.tr", note: "Gaziantep tekstil", need: "Buhar üretim kazanı", priority: "medium" },
    { name: "İTHİB", sector: "Sektör Birliği", website: "www.ithib.org.tr", linkedin: "linkedin.com/company/ithib", email: "info@ithib.org.tr", note: "Sektör birliği — tüm üyelere ulaşım", need: "Üyelere teknoloji tanıtım", priority: "high" },
  ],
  "Belediye & Atık Yönetimi": [
    { name: "İSTAÇ A.Ş.", sector: "Atık Yönetimi", website: "www.istac.istanbul", linkedin: "linkedin.com/company/istac", email: "info@istac.istanbul", phone: "+90 212 485 24 24", note: "İBB atık yönetimi", need: "Arıtma çamuru bertarafı", priority: "high" },
    { name: "İSKİ", sector: "Su/Atık Su", website: "www.iski.istanbul", linkedin: "linkedin.com/company/iski", email: "bilgi@iski.gov.tr", phone: "+90 212 321 00 00", note: "İstanbul su idaresi", need: "Çamur kurutma, aktif karbon", priority: "high" },
    { name: "ASKİ (Ankara)", sector: "Su/Atık Su", website: "www.aski.gov.tr", linkedin: "linkedin.com/company/aski-ankara", email: "bilgi@aski.gov.tr", note: "Ankara su idaresi", need: "Arıtma çamuru bertarafı", priority: "medium" },
    { name: "Çevko Vakfı", sector: "Çevre", website: "www.cevko.org.tr", linkedin: "linkedin.com/company/cevko", email: "info@cevko.org.tr", note: "Çevre koruma vakfı", need: "Emisyonsuz teknoloji tanıtım", priority: "low" },
    { name: "ITC Invest Trading", sector: "Çevre Teknolojileri", website: "www.itcinvest.com", linkedin: "linkedin.com/company/itc-invest", email: "info@itcinvest.com", note: "Çevre yatırımları", need: "Bertaraf teknolojisi", priority: "medium" },
  ],
  "Su Arıtma & Çevre": [
    { name: "Kurita Turkey", sector: "Su Arıtma", website: "www.kurita.co.jp", linkedin: "linkedin.com/company/kurita-water", email: "info@kurita.com.tr", note: "Japon su arıtma", need: "Aktif karbon tedarik", priority: "high" },
    { name: "Suez Türkiye", sector: "Su/Çevre", website: "www.suez.com", linkedin: "linkedin.com/company/suez", email: "info@suez.com.tr", note: "Global çevre şirketi", need: "Yerel aktif karbon", priority: "high" },
    { name: "Prominent Türkiye", sector: "Su Arıtma", website: "www.prominent.com", linkedin: "linkedin.com/company/prominent-gmbh", email: "info@prominent.com.tr", note: "Su arıtma ekipmanları", need: "Aktif karbon entegrasyonu", priority: "medium" },
    { name: "Protel Çevre", sector: "Çevre Teknolojisi", website: "www.protelcevre.com", linkedin: "linkedin.com/company/protel-cevre", email: "info@protelcevre.com", note: "Çevre mühendislik", need: "Arıtma çamuru çözümü", priority: "medium" },
  ],
  "Gıda & Tarım": [
    { name: "Eti Maden", sector: "Madencilik/Gıda", website: "www.etimaden.gov.tr", linkedin: "linkedin.com/company/eti-maden", email: "bilgi@etimaden.gov.tr", phone: "+90 312 294 20 00", note: "Maden işletmesi", need: "Kurutma teknolojisi", priority: "medium" },
    { name: "Tariş Üzüm", sector: "Tarım/Gıda", website: "www.tarisuzum.com.tr", linkedin: "linkedin.com/company/taris", email: "info@tarisuzum.com.tr", note: "Üzüm kurutma", need: "Verimli kurutma sistemi", priority: "high" },
    { name: "Oltan Gıda", sector: "Gıda İşleme", website: "www.oltan.com.tr", linkedin: "linkedin.com/company/oltan-gida", email: "info@oltan.com.tr", note: "Fındık işleme", need: "Kurutma fırınları", priority: "high" },
  ],
  "Kağıt & Selüloz": [
    { name: "Hayat Holding", sector: "Kağıt/Hijyen", website: "www.hayat.com.tr", linkedin: "linkedin.com/company/hayat-holding", email: "info@hayat.com.tr", note: "Kağıt ürünleri", need: "Buhar kazanı verimliliği", priority: "high" },
    { name: "Mondi Tire Kutsan", sector: "Kağıt/Ambalaj", website: "www.mondigroup.com", linkedin: "linkedin.com/company/mondi-group", email: "info@mondigroup.com", note: "Ambalaj kağıdı", need: "Enerji maliyeti azaltma", priority: "medium" },
    { name: "Olmuksan IP", sector: "Ambalaj", website: "www.olmuksan.com.tr", linkedin: "linkedin.com/company/olmuksan-ip", email: "info@olmuksan.com.tr", note: "Oluklu mukavva", need: "Buhar üretim sistemi", priority: "medium" },
    { name: "Modern Karton", sector: "Ambalaj", website: "www.modernkarton.com.tr", linkedin: "linkedin.com/company/modern-karton", email: "info@modernkarton.com.tr", note: "Karton üretimi", need: "Buhar/enerji verimliliği", priority: "medium" },
  ]
};

function PriorityBadge({ priority }) {
  const cfg = {
    high: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", text: "YÜKSEK" },
    medium: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", text: "ORTA" },
    low: { bg: "rgba(100,116,139,0.12)", color: "#94a3b8", text: "DÜŞÜK" },
  }[priority] || { bg: "#1e293b", color: "#64748b", text: "—" };

  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
      letterSpacing: "0.04em"
    }}>{cfg.text}</span>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedSector, setSelectedSector] = useState(null);
  const [searchResults, setSearchResults] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [searchLog, setSearchLog] = useState([]);
  const [apiStatus, setApiStatus] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const chatEndRef = useRef(null);

  const totalLeads = Object.values(KNOWN_COMPANIES).reduce((s, a) => s + a.length, 0);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(setApiStatus).catch(() => setApiStatus({ status: 'offline' }));
  }, []);

  const addLog = useCallback((msg) => {
    setSearchLog(prev => [...prev, { time: new Date().toLocaleTimeString('tr-TR'), msg }]);
  }, []);

  const callAI = async (prompt, systemPrompt) => {
    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt })
      });
      const data = await res.json();
      if (data.success) return { text: data.result, provider: data.provider };
      return { text: "API yanıt vermedi: " + (data.error || "Bilinmeyen hata"), provider: "none" };
    } catch (err) {
      return { text: "Bağlantı hatası: " + err.message, provider: "error" };
    }
  };

  const runSectorResearch = async (sectorName) => {
    setIsSearching(true);
    setSelectedSector(sectorName);
    setActiveTab("results");
    addLog(`🔍 "${sectorName}" sektörü araştırması başlatıldı`);

    const sector = SECTOR_QUERIES[sectorName];
    const companies = KNOWN_COMPANIES[sectorName] || [];
    setSearchResults(prev => ({ ...prev, [sectorName]: { companies, status: "researching" } }));
    addLog(`📊 ${companies.length} bilinen firma listelendi`);

    const prompt = `${STINGA_CONTEXT}
Sektör: ${sectorName}
Stinga çözümü: ${sector.reason}
Mevcut sistem: ${sector.currentSystem}

Bu sektördeki Türkiye'deki büyük firmaları web'de araştır. Her firma için:
1. Firma adı, ne iş yaptığı
2. Stinga'nın hangi ürününe neden ihtiyaç duyduğu
3. Mevcut kullandıkları enerji/yanma sistemi
4. LinkedIn profili, website, iletişim (varsa)

Ayrıca:
- Sektörün enerji/emisyon sorunları
- Stinga'nın sağlayacağı avantajlar
- Satış stratejisi önerileri
- Karar verici kişi profilleri (hangi departmana ulaşılmalı)

Detaylı ve Türkçe yanıt ver.`;

    addLog(`🤖 AI analiz yapıyor...`);
    const { text, provider } = await callAI(prompt, `Sen Stinga Enerji için B2B müşteri araştırması yapan satış istihbarat uzmanısın. Web araştırması yap, detaylı bilgi ver. Türkçe yanıt ver.`);

    setSearchResults(prev => ({
      ...prev,
      [sectorName]: { companies, analysis: text, status: "complete", provider }
    }));
    addLog(`✅ "${sectorName}" analizi tamamlandı (${provider})`);
    setIsSearching(false);
  };

  const handleChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsChatLoading(true);

    const allCompanies = Object.entries(KNOWN_COMPANIES)
      .map(([sector, list]) => `\n${sector}:\n${list.map(c => `- ${c.name}: ${c.note} | İhtiyaç: ${c.need} | Öncelik: ${c.priority}`).join('\n')}`)
      .join('\n');

    const { text, provider } = await callAI(
      `${STINGA_CONTEXT}\n\nMevcut lead veritabanı:${allCompanies}\n\nKullanıcı sorusu: ${userMsg}`,
      `Sen Stinga Enerji'nin AI satış asistanısın. Potansiyel müşteriler, satış stratejileri, sektör analizleri hakkında bilgi ver. Web araştırması yapabilirsin. Türkçe yanıt ver.`
    );
    setChatMessages(prev => [...prev, { role: "assistant", content: text, provider }]);
    setIsChatLoading(false);
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "results", label: "Araştırma", icon: "🔍" },
    { id: "leads", label: "Lead Listesi", icon: "📋" },
    { id: "chat", label: "AI Asistan", icon: "🤖" },
    { id: "log", label: "Log", icon: "📝" }
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: "#080c16", color: "#e2e8f0", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #0f1629; }
        ::-webkit-scrollbar-thumb { background: #2d3a5c; border-radius: 3px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-up { animation: fadeUp .4s ease-out both; }
        .pulse-a { animation: pulse 1.5s ease-in-out infinite; }
        .card:hover { transform: translateY(-3px); border-color: rgba(16,185,129,.35) !important; }
        .card { transition: all .25s ease; cursor: pointer; }
        .row:hover { background: rgba(16,185,129,.04) !important; }
        .btn { transition: all .15s; cursor: pointer; border: none; }
        .btn:hover { filter: brightness(1.15); transform: scale(1.01); }
        .btn:active { transform: scale(.98); }
        textarea:focus, input:focus { outline: none; border-color: #10b981 !important; }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .grid-sectors { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ═══ HEADER ═══ */}
      <header style={{ background: "linear-gradient(135deg, #0d1225, #131b35)", borderBottom: "1px solid #1a2544", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>S</div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", letterSpacing: "-.01em" }}>Stinga Lead Agent</h1>
            <p style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>AI-Powered B2B Müşteri Araştırma</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.25)", padding: "4px 10px", borderRadius: 16, fontSize: 11, color: "#10b981", fontWeight: 600 }}>
            {totalLeads} Lead
          </span>
          {apiStatus && (
            <span style={{ background: apiStatus.gemini || apiStatus.claude ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)", border: `1px solid ${apiStatus.gemini || apiStatus.claude ? "rgba(16,185,129,.25)" : "rgba(239,68,68,.25)"}`, padding: "4px 10px", borderRadius: 16, fontSize: 11, color: apiStatus.gemini || apiStatus.claude ? "#10b981" : "#ef4444", fontWeight: 600 }}>
              {apiStatus.gemini ? "Gemini ✓" : apiStatus.claude ? "Claude ✓" : "API ✗"}
            </span>
          )}
        </div>
      </header>

      {/* ═══ TABS ═══ */}
      <nav style={{ display: "flex", gap: 2, padding: "8px 20px", background: "#0a0f1e", borderBottom: "1px solid #151d32", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} className="btn" onClick={() => { setActiveTab(t.id); setMobileMenuOpen(false); }}
            style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              color: activeTab === t.id ? "#fff" : "#64748b", whiteSpace: "nowrap",
              background: activeTab === t.id ? "linear-gradient(135deg, #10b981, #059669)" : "transparent",
            }}>{t.icon} {t.label}</button>
        ))}
      </nav>

      {/* ═══ MAIN ═══ */}
      <main style={{ flex: 1, padding: "16px 20px", overflowY: "auto" }}>

        {/* ──── DASHBOARD ──── */}
        {activeTab === "dashboard" && (
          <div className="fade-up">
            <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,.06), rgba(59,130,246,.04))", border: "1px solid rgba(16,185,129,.12)", borderRadius: 14, padding: "20px", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "#f1f5f9" }}>🎯 Hedef Sektör Analizi</h2>
              <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                Emisyonsuz yanma, kömür kurutma, aktif karbon ve bertaraf teknolojileriniz için AI destekli müşteri araştırması. Sektör kartına tıklayın → AI otomatik araştırma + analiz yapacak.
              </p>
            </div>
            <div className="grid-sectors" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {Object.entries(SECTOR_QUERIES).map(([name, s], i) => {
                const status = searchResults[name]?.status;
                const count = KNOWN_COMPANIES[name]?.length || 0;
                return (
                  <div key={name} className="card fade-up" onClick={() => runSectorResearch(name)}
                    style={{ background: "#0f1527", border: `1px solid ${status === 'complete' ? 'rgba(16,185,129,.3)' : '#1a2544'}`, borderRadius: 12, padding: "18px", animationDelay: `${i * .05}s` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <span style={{ fontSize: 28 }}>{s.icon}</span>
                      {status === 'complete' && <span style={{ fontSize: 9, color: "#10b981", background: "rgba(16,185,129,.1)", padding: "2px 7px", borderRadius: 8, fontWeight: 700 }}>✓ TAMAM</span>}
                      {status === 'researching' && <span className="pulse-a" style={{ fontSize: 9, color: "#f59e0b", background: "rgba(245,158,11,.1)", padding: "2px 7px", borderRadius: 8, fontWeight: 700 }}>⏳ ÇALIŞIYOR</span>}
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 5 }}>{name}</h3>
                    <p style={{ fontSize: 11, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>{s.reason}</p>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{count} firma</span>
                      <span style={{ fontSize: 11, color: "#3b82f6" }}>Araştır →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ──── RESULTS ──── */}
        {activeTab === "results" && (
          <div className="fade-up">
            {!selectedSector ? (
              <div style={{ textAlign: "center", padding: 50, color: "#475569" }}>
                <p style={{ fontSize: 36, marginBottom: 12 }}>🔍</p>
                <p>Dashboard'dan bir sektör seçin</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>{SECTOR_QUERIES[selectedSector]?.icon} {selectedSector}</h2>
                    <p style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{SECTOR_QUERIES[selectedSector]?.reason}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {Object.keys(SECTOR_QUERIES).filter(s => s !== selectedSector).slice(0, 3).map(s => (
                      <button key={s} className="btn" onClick={() => runSectorResearch(s)}
                        style={{ background: "#1a2544", color: "#94a3b8", borderRadius: 8, padding: "6px 12px", fontSize: 11 }}>
                        {SECTOR_QUERIES[s].icon} {s.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Compare boxes */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div style={{ background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.15)", borderRadius: 10, padding: 14 }}>
                    <h4 style={{ fontSize: 12, color: "#ef4444", marginBottom: 5, fontWeight: 700 }}>❌ Mevcut Sistem</h4>
                    <p style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>{SECTOR_QUERIES[selectedSector]?.currentSystem}</p>
                  </div>
                  <div style={{ background: "rgba(16,185,129,.05)", border: "1px solid rgba(16,185,129,.15)", borderRadius: 10, padding: 14 }}>
                    <h4 style={{ fontSize: 12, color: "#10b981", marginBottom: 5, fontWeight: 700 }}>✅ Stinga Çözümü</h4>
                    <p style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>{SECTOR_QUERIES[selectedSector]?.reason}</p>
                  </div>
                </div>

                {/* Company Table */}
                <div style={{ background: "#0f1527", border: "1px solid #1a2544", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a2544", background: "#0c1120" }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>Potansiyel Müşteriler ({KNOWN_COMPANIES[selectedSector]?.length || 0})</h3>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #1a2544", color: "#475569", background: "#0a0f1e" }}>
                          {["Öncelik", "Firma", "İhtiyaç", "Web / LinkedIn / E-posta", "Not"].map(h => (
                            <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(KNOWN_COMPANIES[selectedSector] || []).map((c, i) => (
                          <tr key={i} className="row" style={{ borderBottom: "1px solid #151d32" }}>
                            <td style={{ padding: "10px 12px" }}><PriorityBadge priority={c.priority} /></td>
                            <td style={{ padding: "10px 12px", fontWeight: 600, color: "#f1f5f9" }}>{c.name}</td>
                            <td style={{ padding: "10px 12px", color: "#10b981" }}>{c.need}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <a href={`https://${c.website}`} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", fontSize: 10, textDecoration: "none" }}>🌐 {c.website}</a>
                                {c.linkedin && c.linkedin !== "-" && <a href={`https://${c.linkedin}`} target="_blank" rel="noreferrer" style={{ color: "#0ea5e9", fontSize: 10, textDecoration: "none" }}>💼 LinkedIn</a>}
                                {c.email && <a href={`mailto:${c.email}`} style={{ color: "#a78bfa", fontSize: 10, textDecoration: "none" }}>✉️ {c.email}</a>}
                                {c.phone && <span style={{ color: "#64748b", fontSize: 10 }}>📞 {c.phone}</span>}
                              </div>
                            </td>
                            <td style={{ padding: "10px 12px", color: "#64748b", fontSize: 10 }}>{c.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI Analysis */}
                {searchResults[selectedSector]?.analysis && (
                  <div style={{ background: "#0f1527", border: "1px solid rgba(16,185,129,.15)", borderRadius: 12, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>🤖 AI Sektör Analizi</h3>
                      {searchResults[selectedSector]?.provider && (
                        <span style={{ fontSize: 10, color: "#64748b", background: "#1a2544", padding: "2px 8px", borderRadius: 6 }}>
                          {searchResults[selectedSector].provider === 'gemini' ? '🔮 Gemini' : '🟣 Claude'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {searchResults[selectedSector].analysis}
                    </div>
                  </div>
                )}

                {isSearching && (
                  <div className="pulse-a" style={{ textAlign: "center", padding: 24, color: "#f59e0b", fontSize: 13 }}>
                    ⏳ AI araştırma yapıyor... 15-30 saniye sürebilir.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ──── LEADS ──── */}
        {activeTab === "leads" && (
          <div className="fade-up">
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>📋 Tüm Potansiyel Müşteriler ({totalLeads})</h2>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {Object.keys(SECTOR_QUERIES).map(s => (
                <button key={s} className="btn" onClick={() => { setSelectedSector(s); setActiveTab("results"); }}
                  style={{ background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.15)", color: "#10b981", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 600 }}>
                  {SECTOR_QUERIES[s].icon} {s} ({KNOWN_COMPANIES[s]?.length})
                </button>
              ))}
            </div>
            <div style={{ background: "#0f1527", border: "1px solid #1a2544", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1a2544", color: "#475569", background: "#0a0f1e" }}>
                      {["#", "Öncelik", "Firma", "Sektör", "İhtiyaç", "Website", "LinkedIn", "E-posta"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(KNOWN_COMPANIES).flatMap(([sector, list]) => list.map(c => ({ ...c, sectorLabel: sector }))).map((c, i) => (
                      <tr key={i} className="row" style={{ borderBottom: "1px solid #151d32" }}>
                        <td style={{ padding: "8px 10px", color: "#475569" }}>{i + 1}</td>
                        <td style={{ padding: "8px 10px" }}><PriorityBadge priority={c.priority} /></td>
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: "#f1f5f9" }}>{c.name}</td>
                        <td style={{ padding: "8px 10px" }}><span style={{ background: "rgba(59,130,246,.08)", color: "#3b82f6", padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>{c.sectorLabel.split(' ')[0]}</span></td>
                        <td style={{ padding: "8px 10px", color: "#10b981", fontSize: 10 }}>{c.need}</td>
                        <td style={{ padding: "8px 10px" }}><a href={`https://${c.website}`} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", fontSize: 10, textDecoration: "none" }}>{c.website}</a></td>
                        <td style={{ padding: "8px 10px" }}>{c.linkedin && c.linkedin !== "-" ? <a href={`https://${c.linkedin}`} target="_blank" rel="noreferrer" style={{ color: "#0ea5e9", fontSize: 10, textDecoration: "none" }}>Profil →</a> : "—"}</td>
                        <td style={{ padding: "8px 10px" }}>{c.email ? <a href={`mailto:${c.email}`} style={{ color: "#a78bfa", fontSize: 10, textDecoration: "none" }}>{c.email}</a> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ──── CHAT ──── */}
        {activeTab === "chat" && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>🤖 Stinga AI Satış Asistanı</h2>
            <div style={{ flex: 1, background: "#0f1527", border: "1px solid #1a2544", borderRadius: "12px 12px 0 0", padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: "center", padding: 30, color: "#475569" }}>
                  <p style={{ fontSize: 32, marginBottom: 10 }}>💬</p>
                  <p style={{ fontSize: 12, marginBottom: 14 }}>Örnek sorular:</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                    {[
                      "Çimento sektörüne satış stratejisi öner",
                      "Erdemir'e nasıl yaklaşmalıyız?",
                      "Aktif karbon için en uygun müşteriler?",
                      "Belediye atık bertarafı için teklif taslağı"
                    ].map((q, i) => (
                      <button key={i} className="btn" onClick={() => setChatInput(q)}
                        style={{ background: "rgba(16,185,129,.05)", border: "1px solid rgba(16,185,129,.12)", color: "#10b981", borderRadius: 8, padding: "7px 14px", fontSize: 11 }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%",
                  background: msg.role === "user" ? "linear-gradient(135deg, #10b981, #059669)" : "#1a2544",
                  borderRadius: msg.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px", padding: "10px 14px"
                }}>
                  <p style={{ fontSize: 12, color: msg.role === "user" ? "#fff" : "#e2e8f0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.content}</p>
                  {msg.provider && <span style={{ fontSize: 9, color: "#475569", marginTop: 4, display: "block" }}>{msg.provider === 'gemini' ? '🔮 Gemini' : '🟣 Claude'}</span>}
                </div>
              ))}
              {isChatLoading && <div className="pulse-a" style={{ alignSelf: "flex-start", background: "#1a2544", borderRadius: 12, padding: "10px 16px" }}><span style={{ fontSize: 12, color: "#64748b" }}>⏳ Düşünüyor...</span></div>}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: 8, background: "#0c1120", border: "1px solid #1a2544", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 10 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChat()}
                placeholder="Sorunuzu yazın..." style={{ flex: 1, background: "#1a2544", border: "1px solid #2d3a5c", borderRadius: 8, padding: "9px 14px", color: "#e2e8f0", fontSize: 12, fontFamily: "inherit" }} />
              <button className="btn" onClick={handleChat} style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", borderRadius: 8, padding: "9px 18px", fontSize: 12, fontWeight: 600 }}>Gönder</button>
            </div>
          </div>
        )}

        {/* ──── LOG ──── */}
        {activeTab === "log" && (
          <div className="fade-up">
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>📝 İşlem Geçmişi</h2>
            <div style={{ background: "#0f1527", border: "1px solid #1a2544", borderRadius: 12, padding: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, maxHeight: 500, overflowY: "auto" }}>
              {searchLog.length === 0 ? (
                <p style={{ color: "#475569", textAlign: "center", padding: 24 }}>Henüz işlem yok. Dashboard'dan başlayın.</p>
              ) : searchLog.map((l, i) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #151d32", color: "#94a3b8" }}>
                  <span style={{ color: "#475569" }}>[{l.time}]</span> {l.msg}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer style={{ padding: "10px 20px", borderTop: "1px solid #151d32", background: "#080c16", textAlign: "center", fontSize: 10, color: "#334155" }}>
        Stinga Lead Agent v1.0 — AI destekli B2B müşteri araştırma — Gemini + Claude
      </footer>
    </div>
  );
}
