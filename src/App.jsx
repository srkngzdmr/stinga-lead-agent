import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// STINGA LEAD AGENT v4.1
// - Gemini 1.5 Flash doğrudan API (proxy YOK, Failed to fetch FIX)
// - Persistent notlar (localStorage)
// - Düzeltilmiş banner ortalamaları
// - AI ile iletişim kişisi + sosyal medya araması
// ============================================================

// ⚠️ Buraya kendi Gemini API anahtarınızı girin
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
const GEMINI_MODEL   = "gemini-2.5-flash-preview-05-20";

// ─── Gemini Doğrudan API Çağrısı ────────────────────────────
const callGemini = async (prompt, systemInstruction = "") => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    ...(systemInstruction
      ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
      : {}),
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Yanıt alınamadı."
  );
};

// ─── Stinga Bağlamı ─────────────────────────────────────────
const STINGA_CONTEXT = `
Stinga Enerji A.Ş. Hakkında:
- 134 ülkede patentli emisyonsuz yanma teknolojisi
- 18 yıllık AR-GE geçmişi
- %97 yanma verimi, ≈0 emisyon
- Kurucu: Şenol Faik Özyaman
- Merkez: Büyükçekmece/İstanbul
- Tel: +90 212 872 23 57
- E-Posta: info@stinga.biz

Ürün ve Hizmetler:
1. Emisyonsuz Yanma Teknolojisi (Stinga 4D Reaktörler)
2. Kömür Kurutma Sistemleri (oksijensiz ortamda karbonlaştırma)
3. Buhar/Sıcak Su/Sıcak Hava Üretim Kazanları
4. Aktif Karbon Üretimi (su & hava arıtma)
5. Arıtma Çamuru Bertaraf Teknolojisi
6. Madencilik (Pınarhisar kömür madeni)
7. Endüstriyel Makine İmalatı
8. Bitümlü Şist Yakma Teknolojisi
9. Tavuk Çiftliği Isıtma Sistemleri

Teknik Özellikler:
- CO: 12 ppm (yasal sınır 250 mg/Nm³)
- CO₂: %0.4 (tipik kazan %8-12)
- NOx: 3 ppm (yasal sınır 400 mg/Nm³)
- SO₂: ≈0 ppm (yasal sınır 2000 mg/Nm³)
- ENKA Laboratuvarı onaylı, TÜBİTAK raporu mevcut
`;

const LEAD_STATUSES = {
  new:       { label: "Yeni",               color: "#64748b", bg: "rgba(100,116,139,0.12)" },
  contacted: { label: "İletişim Kuruldu",   color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  meeting:   { label: "Toplantı Planlandı", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  proposal:  { label: "Teklif Verildi",     color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  won:       { label: "Kazanıldı",          color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  lost:      { label: "Kaybedildi",         color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

const SECTOR_QUERIES = {
  "Belediye & Arıtma Çamuru":      { icon: "🏛️", reason: "Arıtma çamuru kurutma & termik bertaraf, aktif karbon üretimi, sıfır depolama hedefi", currentSystem: "Çamur düzenli depolama alanları dolmakta. Yüksek nakliye & bertaraf maliyeti.", priority: true },
  "Kurutma & Bertaraf Teknolojileri": { icon: "🔥", reason: "Stinga 4D reaktör: oksijensiz kurutma, sıfır emisyon, karbonlaştırma", currentSystem: "Konvansiyonel döner tamburlu kurutucular, yüksek enerji ve emisyon", priority: true },
  "Emisyon & Karbon Ayak İzi":     { icon: "🌿", reason: "AB SKDM uyumu, karbon kredisi kazanımı, TÜBİTAK onaylı raporlama", currentSystem: "Yüksek karbon ayak izi, artan AB sınır vergisi riski", priority: true },
  "Termik Santral & Enerji":       { icon: "⚡", reason: "Emisyonsuz yanma ile kömür verimini artırma ve emisyonları düşürme", currentSystem: "Konvansiyonel kömür yakma kazanları, yüksek emisyon, düşük verim" },
  "Çimento & Yapı Malzemesi":      { icon: "🏗️", reason: "Yüksek sıcaklık ihtiyacı, kömür kurutma ve emisyon azaltma", currentSystem: "Döner fırınlar, yüksek CO₂ emisyonu, karbon vergisi riski" },
  "Demir-Çelik":                   { icon: "🔩", reason: "Yüksek enerji tüketimi, emisyon düşürme zorunluluğu", currentSystem: "Geleneksel fırınlar, yüksek karbon ayak izi" },
  "Tekstil & Kumaş":               { icon: "🧵", reason: "Buhar üretim kazanları, enerji maliyeti düşürme", currentSystem: "Doğalgaz/kömür kazanları, yüksek yakıt maliyeti" },
  "Su Arıtma & Çevre":             { icon: "💧", reason: "Aktif karbon tedariki, arıtma teknolojileri", currentSystem: "İthal aktif karbon kullanımı, yüksek maliyet" },
  "Gıda & Tarım":                  { icon: "🌾", reason: "Kurutma teknolojisi, enerji verimliliği", currentSystem: "Geleneksel kurutma fırınları, yüksek enerji tüketimi" },
  "Tavuk Çiftlikleri & Kümes":     { icon: "🐔", reason: "Kümes ısıtma kazanları, düşük maliyetli ve emisyonsuz ısıtma", currentSystem: "Doğalgaz/LPG/kömür sobaları, yüksek yakıt maliyeti" },
  "Madencilik & Kömür":            { icon: "⛏️", reason: "Kömür kurutma ve kalite artırma, linyit karbonlaştırma", currentSystem: "Açık hava kurutma, verimsiz kömür işleme" },
  "Kağıt & Selüloz":               { icon: "📄", reason: "Buhar üretimi, kurutma süreçleri, emisyon azaltma", currentSystem: "Yüksek buhar tüketimi, doğalgaz bağımlılığı" },
};

const KNOWN_COMPANIES = {
  "Belediye & Arıtma Çamuru": [
    { name: "İSKİ", sector: "Su/Atık Su", website: "www.iski.istanbul", linkedin: "linkedin.com/company/iski", note: "İstanbul'un tüm atıksu yönetimi — günlük 3M+ m³ arıtma. 14 büyük tesis.", need: "Çamur termik kurutma & bertaraf, aktif karbon", phone: "+90 212 321 60 00", email: "bilgi@iski.gov.tr", city: "İstanbul", contacts: [{ name: "Genel Müdürlük", title: "Genel Müdür", linkedin: "linkedin.com/company/iski", email: "gm@iski.gov.tr", note: "Yatırım kararları GM onayına bağlı" }, { name: "Atıksu Dairesi Başkanlığı", title: "Daire Başkanı", email: "atiksudaire@iski.gov.tr", note: "Teknik karar verici birim" }] },
    { name: "İSTAÇ A.Ş.", sector: "Atık Yönetimi", website: "www.istac.istanbul", linkedin: "linkedin.com/company/istac", note: "İBB atık yönetimi şirketi — yıllık 3M ton atık işleme. Kompostlama, biyogaz, bertaraf.", need: "Arıtma çamuru termik bertaraf, emisyonsuz yakma", phone: "+90 212 368 12 00", email: "info@istac.istanbul", city: "İstanbul", contacts: [{ name: "Genel Müdür", title: "CEO", linkedin: "linkedin.com/company/istac", email: "gmd@istac.istanbul", note: "İBB bağlantılı şirket, ihale süreci uzun" }] },
    { name: "ASKİ", sector: "Su/Atık Su", website: "www.aski.gov.tr", linkedin: "linkedin.com/company/aski-ankara", note: "Günlük 600.000 m³ kapasite. Sincan ve Tatlar arıtma tesisleri.", need: "Çamur kurutma sistemi, bertaraf lisansı", phone: "+90 312 314 12 43", email: "info@aski.gov.tr", city: "Ankara", contacts: [{ name: "Teknik Hizmetler Dairesi", title: "Daire Başkanı", email: "teknikhizmetler@aski.gov.tr", note: "Termik çözümleri bu birim değerlendiriyor" }] },
    { name: "İZSU", sector: "Su/Atık Su", website: "www.izsu.gov.tr", linkedin: "linkedin.com/company/izsu", note: "Çiğli AAT — Türkiye'nin en büyük biyolojik arıtma tesislerinden biri.", need: "Termik çamur kurutma, karbon ayak izi azaltma", phone: "+90 232 293 13 00", email: "info@izsu.gov.tr", city: "İzmir", contacts: [{ name: "Fen İşleri Direktörlüğü", title: "Teknik Direktör", email: "fenisleri@izsu.gov.tr", note: "Teknik ve yatırım kararları burada alınıyor" }] },
    { name: "BUSKİ", sector: "Su/Atık Su", website: "www.buski.gov.tr", linkedin: "linkedin.com/company/buski", note: "Nilüfer AAT ve Kestel AAT başlıca tesisleri.", need: "Çamur termik bertaraf, enerji geri kazanım", phone: "+90 224 270 20 00", email: "iletisim@buski.gov.tr", city: "Bursa", contacts: [{ name: "Atıksu Daire Başkanlığı", title: "Daire Başkanı", email: "atiksudaire@buski.gov.tr", note: "Kurutma teknolojisi araştırıyor" }] },
    { name: "Çevko Vakfı", sector: "Çevre", website: "www.cevko.org.tr", linkedin: "linkedin.com/company/cevko", note: "500+ üye firma ile Türkiye'nin en büyük geri dönüşüm ağı.", need: "Emisyonsuz bertaraf teknolojisi tanıtım & ortaklık", phone: "+90 212 283 82 96", email: "info@cevko.org.tr", city: "İstanbul", contacts: [{ name: "Gürhan Uçar", title: "Genel Müdür", linkedin: "linkedin.com/in/gurhanucar", email: "gm@cevko.org.tr", note: "500+ üye firmaya erişim kapısı" }] },
  ],
  "Kurutma & Bertaraf Teknolojileri": [
    { name: "Ekotek Çevre Teknolojileri", sector: "Çevre/Kurutma", website: "www.ekotek.com.tr", linkedin: "linkedin.com/company/ekotek", note: "Türkiye'de endüstriyel kurutma ve çamur yönetim çözümleri.", need: "Stinga reaktör entegrasyonu ile sıfır emisyon kurutma", phone: "+90 312 385 50 00", email: "info@ekotek.com.tr", city: "Ankara", contacts: [{ name: "Teknik Satış Müdürü", title: "Satış Direktörü", linkedin: "linkedin.com/company/ekotek", email: "satis@ekotek.com.tr", note: "Teknoloji ortaklığına açık" }] },
    { name: "Suez Türkiye", sector: "Su/Çevre", website: "www.suez.com", linkedin: "linkedin.com/company/suez", note: "Global çevre ve su yönetimi devi — Türkiye operasyonu.", need: "Yerel emisyonsuz bertaraf çözümü ortaklığı", phone: "+90 216 564 00 00", email: "info@suez.com.tr", city: "İstanbul", contacts: [{ name: "Türkiye Ülke Müdürü", title: "Country Manager", linkedin: "linkedin.com/company/suez", email: "turkey@suez.com", note: "Yerel teknoloji ortaklığı arıyor" }] },
  ],
  "Emisyon & Karbon Ayak İzi": [
    { name: "EY Türkiye (ESG & Sürdürülebilirlik)", sector: "Danışmanlık", website: "www.ey.com/tr_tr", linkedin: "linkedin.com/company/ernst-young", note: "Sera gazı envanter, doğrulama ve karbon raporlama.", need: "Stinga teknolojisiyle müşterilere karbon azaltım çözümü", phone: "+90 212 408 51 00", email: "ey.turkiye@tr.ey.com", city: "İstanbul", contacts: [{ name: "ESG Direktörü", title: "Partner / ESG Direktörü", linkedin: "linkedin.com/company/ernst-young", email: "esg@tr.ey.com", note: "Endüstri müşterilerine teknoloji tavsiye ediyor" }] },
    { name: "Carbon Turkey", sector: "Karbon Yönetimi", website: "www.carbonturkey.com", linkedin: "linkedin.com/company/carbon-turkey", note: "Türkiye'nin öncü karbon ayak izi hesaplama ve azaltım danışmanlık firması.", need: "Stinga teknolojisini karbon azaltım portföyüne ekleme", phone: "+90 212 290 30 00", email: "info@carbonturkey.com", city: "İstanbul", contacts: [{ name: "Kurucu Ortak", title: "CEO / Kurucu", linkedin: "linkedin.com/company/carbon-turkey", email: "ceo@carbonturkey.com", note: "Portföyüne ekleme için doğrudan temas kur" }] },
  ],
  "Termik Santral & Enerji": [
    { name: "EÜAŞ", sector: "Enerji Üretimi", website: "www.euas.gov.tr", linkedin: "linkedin.com/company/euas", note: "Devlet termik santralleri — Türkiye'nin en büyük kamu enerji üreticisi.", need: "Linyit santrallerinde emisyon düşürme", phone: "+90 312 212 69 00", email: "info@euas.gov.tr", city: "Ankara", contacts: [{ name: "Teknik İşler Daire Başkanlığı", title: "Daire Başkanı", email: "teknik@euas.gov.tr", note: "Devlet kurumu, ihale süreci uzun" }] },
    { name: "Eren Enerji", sector: "Enerji", website: "www.erenenerji.com.tr", linkedin: "linkedin.com/company/eren-enerji", note: "Kömürlü termik santral operatörü — Zonguldak Eren Termik Santrali.", need: "Yanma verimi artırma, emisyon azaltma", phone: "+90 212 381 50 00", email: "info@erenenerji.com.tr", city: "İstanbul", contacts: [{ name: "Teknik Direktör", title: "Teknik Direktör", email: "teknik@erenenerji.com.tr", note: "Emisyon uyumu için acil çözüm arıyor" }] },
  ],
  "Çimento & Yapı Malzemesi": [
    { name: "Limak Çimento", sector: "Çimento", website: "www.limak.com.tr", linkedin: "linkedin.com/company/limak-holding", note: "Türkiye geneli 5 çimento fabrikası — yıllık 10M+ ton üretim.", need: "Alternatif yakıt, emisyon düşürme", phone: "+90 312 249 01 01", email: "info@limak.com.tr", city: "Ankara", contacts: [{ name: "Çimento Grubu CEO", title: "CEO", linkedin: "linkedin.com/company/limak-holding", email: "cimento@limak.com.tr", note: "5 fabrika için toplu çözüm potansiyeli" }] },
    { name: "Akçansa", sector: "Çimento", website: "www.akcansa.com.tr", linkedin: "linkedin.com/company/akcansa", note: "Sabancı/HeidelbergCement ortaklığı — net sıfır hedefi var.", need: "Sürdürülebilir üretim, net sıfır hedefi", phone: "+90 216 571 30 00", email: "info@akcansa.com.tr", city: "İstanbul", contacts: [{ name: "Sürdürülebilirlik Direktörü", title: "Sustainability Director", linkedin: "linkedin.com/company/akcansa", email: "sustainability@akcansa.com.tr", note: "Net sıfır taahhüdü — güçlü potansiyel" }] },
    { name: "Çimsa", sector: "Çimento", website: "www.cimsa.com.tr", linkedin: "linkedin.com/company/cimsa", note: "Sabancı grubu — beyaz çimento ve özel çimentolar.", need: "Emisyon azaltma hedefleri", phone: "+90 324 234 66 50", email: "info@cimsa.com.tr", city: "Mersin", contacts: [{ name: "Teknik ve Enerji Direktörü", title: "Teknik Direktör", email: "teknik@cimsa.com.tr", note: "Alternatif yakıt projesine açık" }] },
  ],
  "Demir-Çelik": [
    { name: "Erdemir", sector: "Demir-Çelik", website: "www.erdemir.com.tr", linkedin: "linkedin.com/company/erdemir", note: "Türkiye'nin en büyük yassı çelik üreticisi — OYAK grubu.", need: "Karbon ayak izi azaltma", phone: "+90 372 323 55 55", email: "info@erdemir.com.tr", city: "Zonguldak", contacts: [{ name: "Çevre ve Sürdürülebilirlik Direktörü", title: "Çevre Direktörü", linkedin: "linkedin.com/company/erdemir", email: "cevre@erdemir.com.tr", note: "AB yeşil çelik baskısı — acil çözüm" }] },
    { name: "Kardemir", sector: "Demir-Çelik", website: "www.kardemir.com", linkedin: "linkedin.com/company/kardemir", note: "Karabük Demir Çelik — Türkiye'nin ilk demir-çelik tesisi.", need: "Alternatif enerji kaynakları", phone: "+90 370 418 69 00", email: "info@kardemir.com", city: "Karabük", contacts: [{ name: "Enerji Direktörü", title: "Enerji Müdürü", email: "enerji@kardemir.com", note: "Yüksek enerji maliyeti sorunu gündemdedir" }] },
  ],
  "Tekstil & Kumaş": [
    { name: "Zorlu Holding (Korteks)", sector: "Tekstil", website: "www.zorlu.com.tr", linkedin: "linkedin.com/company/zorlu-holding", note: "Büyük tekstil grubu — polyester iplik üretiminde dünya lideri.", need: "Buhar kazanı verimliliği", phone: "+90 212 456 24 00", email: "info@zorlu.com.tr", city: "İstanbul", contacts: [{ name: "Enerji ve Çevre Direktörü", title: "Enerji Direktörü", email: "enerji@zorlu.com.tr", note: "Büyük buhar tüketimi — yüksek tasarruf potansiyeli" }] },
    { name: "Sanko Holding", sector: "Tekstil", website: "www.sanko.com.tr", linkedin: "linkedin.com/company/sanko-holding", note: "Gaziantep tekstil — iplik, dokuma, konfeksiyon.", need: "Buhar üretim kazanı", phone: "+90 342 211 15 00", email: "info@sanko.com.tr", city: "Gaziantep", contacts: [{ name: "Enerji Yöneticisi", title: "Teknik Direktör", email: "enerji@sanko.com.tr", note: "Buhar kazanı yenileme planında" }] },
  ],
  "Su Arıtma & Çevre": [
    { name: "Kurita Turkey", sector: "Su Arıtma", website: "www.kurita.co.jp", linkedin: "linkedin.com/company/kurita-water", note: "Japon su arıtma devi — endüstriyel su çözümleri.", need: "Aktif karbon tedarik", phone: "+90 216 573 83 00", email: "info@kurita.com.tr", city: "İstanbul", contacts: [{ name: "Türkiye Genel Müdürü", title: "Country Manager", email: "turkey@kurita.com", note: "Aktif karbon tedarik zinciri açığı var" }] },
  ],
  "Gıda & Tarım": [
    { name: "Oltan Gıda", sector: "Gıda İşleme", website: "www.oltan.com.tr", linkedin: "linkedin.com/company/oltan-gida", note: "Türkiye'nin en büyük fındık işleme tesisi — Giresun.", need: "Kurutma fırınları modernizasyonu", phone: "+90 454 215 11 00", email: "info@oltan.com.tr", city: "Giresun", contacts: [{ name: "Fabrika Müdürü", title: "Fabrika Direktörü", email: "fabrika@oltan.com.tr", note: "Sezonsal kurutma kapasitesi yetersiz" }] },
  ],
  "Tavuk Çiftlikleri & Kümes": [
    { name: "Banvit (BRF Türkiye)", sector: "Kanatlı Hayvan", website: "www.banvit.com.tr", linkedin: "linkedin.com/company/banvit", note: "Türkiye'nin en büyük entegre tavuk üreticilerinden — yıllık 200M+ kapasitesi.", need: "Kümes ısıtma maliyeti düşürme, emisyonsuz kazan", phone: "+90 266 738 19 00", email: "info@banvit.com.tr", city: "Balıkesir", contacts: [{ name: "Teknik Direktör", title: "Teknik Direktör", email: "teknik@banvit.com.tr", note: "Enerji maliyeti birinci sorun" }, { name: "Satın Alma Direktörü", title: "Procurement Director", email: "procurement@banvit.com.tr", note: "Büyük ölçekli tedarik kararları burada" }] },
    { name: "Keskinoğlu", sector: "Kanatlı Hayvan", website: "www.keskinoglu.com.tr", linkedin: "linkedin.com/company/keskinoglu", note: "Manisa Akhisar merkezli — yumurta ve et tavukçuluğu.", need: "Kümeslerde verimli ısıtma, kömürden geçiş", phone: "+90 236 414 10 00", email: "info@keskinoglu.com.tr", city: "Manisa", contacts: [{ name: "Teknik Direktör", title: "Teknik Direktör", email: "teknik@keskinoglu.com.tr", note: "Kömürden geçiş için bütçe ayrıldı" }] },
  ],
  "Madencilik & Kömür": [
    { name: "TKİ", sector: "Kömür Madenciliği", website: "www.tki.gov.tr", linkedin: "linkedin.com/company/tki", note: "Devlet kömür işletmesi — Türkiye linyit üretiminin %50+'sı.", need: "Kömür kurutma, kalite artırma, nem azaltma", phone: "+90 312 384 24 00", email: "info@tki.gov.tr", city: "Ankara", contacts: [{ name: "Teknik İşler Daire Başkanlığı", title: "Teknik Direktörlük", email: "teknik@tki.gov.tr", note: "Devlet kurumu, uzun onay süreci" }] },
    { name: "Çelikler Madencilik", sector: "Kömür Madenciliği", website: "www.celikler.com.tr", linkedin: "linkedin.com/company/celikler-holding", note: "Kömür madenciliği ve enerji grubu — Afşin-Elbistan linyit sahası.", need: "Linyit kurutma, karbonlaştırma", phone: "+90 312 440 18 28", email: "info@celikler.com.tr", city: "Ankara", contacts: [{ name: "Madencilik Direktörü", title: "Operasyon Direktörü", email: "madencilik@celikler.com.tr", note: "Linyit kalitesini artırma hedefi var" }] },
  ],
  "Kağıt & Selüloz": [
    { name: "Hayat Holding (Hayat Kimya)", sector: "Kağıt/Hijyen", website: "www.hayat.com.tr", linkedin: "linkedin.com/company/hayat-holding", note: "Papia, Familia, Bingo markaları. Kocaeli fabrikaları.", need: "Buhar kazanı verimliliği", phone: "+90 262 315 73 00", email: "info@hayat.com.tr", city: "Kocaeli", contacts: [{ name: "Enerji ve Teknik Direktör", title: "Teknik Direktör", email: "teknik@hayat.com.tr", note: "Yüksek buhar tüketimi — büyük tasarruf potansiyeli" }] },
  ],
};

// ─── localStorage yardımcıları ───────────────────────────────
const LS = {
  STATUSES:     "stinga_statuses_v4",
  NOTE_ENTRIES: "stinga_note_entries_v4",
  FOUND_CONTACTS: "stinga_found_contacts_v4",
};
const lsGet = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const lsSet = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

// ─── ANA BİLEŞEN ────────────────────────────────────────────
export default function StingaLeadAgent() {
  const [activeTab, setActiveTab]             = useState("dashboard");
  const [selectedSector, setSelectedSector]   = useState(null);
  const [searchResults, setSearchResults]     = useState({});
  const [isSearching, setIsSearching]         = useState(false);
  const [chatMessages, setChatMessages]       = useState([]);
  const [chatInput, setChatInput]             = useState("");
  const [isChatLoading, setIsChatLoading]     = useState(false);
  const [searchLog, setSearchLog]             = useState([]);
  const [leadStatuses, setLeadStatuses]       = useState(() => lsGet(LS.STATUSES, {}));
  const [filterSector, setFilterSector]       = useState("all");
  const [filterStatus, setFilterStatus]       = useState("all");
  const [searchQuery, setSearchQuery]         = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [autoScanActive, setAutoScanActive]   = useState(false);
  const [autoScanSector, setAutoScanSector]   = useState(0);
  const [scanProgress, setScanProgress]       = useState(0);
  const [lastScanTime, setLastScanTime]       = useState(null);
  const [bannerDot, setBannerDot]             = useState(0);
  const [clock, setClock]                     = useState(new Date());
  const [apiStatus, setApiStatus]             = useState("idle");
  const [apiError, setApiError]               = useState("");
  const [noteEntries, setNoteEntries]         = useState(() => lsGet(LS.NOTE_ENTRIES, {}));
  const [noteInput, setNoteInput]             = useState("");
  const [noteFilter, setNoteFilter]           = useState("");
  const [contactSearching, setContactSearching] = useState(false);
  const [foundContacts, setFoundContacts]     = useState(() => lsGet(LS.FOUND_CONTACTS, {}));
  const [editingNote, setEditingNote]         = useState(null);
  const [apiKeyInput, setApiKeyInput]         = useState("");
  const [activeApiKey, setActiveApiKey]       = useState(GEMINI_API_KEY);

  const chatEndRef = useRef(null);

  const totalLeads     = Object.values(KNOWN_COMPANIES).reduce((s, a) => s + a.length, 0);
  const sectorKeys     = Object.keys(SECTOR_QUERIES);
  const completedSects = Object.values(searchResults).filter(r => r?.status === "complete").length;

  // Persist
  useEffect(() => { lsSet(LS.STATUSES, leadStatuses); }, [leadStatuses]);
  useEffect(() => { lsSet(LS.NOTE_ENTRIES, noteEntries); }, [noteEntries]);
  useEffect(() => { lsSet(LS.FOUND_CONTACTS, foundContacts); }, [foundContacts]);

  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setBannerDot(d => (d + 1) % 4), 600); return () => clearInterval(t); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const addLog = useCallback((msg) => {
    setSearchLog(prev => [{ time: new Date().toLocaleTimeString("tr-TR"), msg }, ...prev.slice(0, 199)]);
  }, []);

  // Gemini çağrısı — aktif API key kullanır
  const gemini = useCallback(async (prompt, system = "") => {
    const key = activeApiKey || GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    };
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.text(); throw new Error(`Gemini ${res.status}: ${e.slice(0, 200)}`); }
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt alınamadı.";
  }, [activeApiKey]);

  // ─── Auto-scan ──────────────────────────────────────────────
  useEffect(() => {
    if (!autoScanActive) return;
    const timer = setTimeout(async () => {
      if (autoScanSector < sectorKeys.length) {
        const sector = sectorKeys[autoScanSector];
        if (!searchResults[sector]?.status) await runSectorResearch(sector, true);
        setScanProgress(Math.round(((autoScanSector + 1) / sectorKeys.length) * 100));
        setAutoScanSector(p => p + 1);
      } else {
        setAutoScanActive(false);
        setLastScanTime(new Date().toLocaleString("tr-TR"));
        addLog("✅ Otomatik tarama tamamlandı");
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [autoScanActive, autoScanSector]);

  const runSectorResearch = async (sectorName, silent = false) => {
    setIsSearching(true);
    setSelectedSector(sectorName);
    if (!silent) setActiveTab("results");
    addLog(`🔍 "${sectorName}" araştırması başlatıldı...`);
    const sector    = SECTOR_QUERIES[sectorName];
    const companies = KNOWN_COMPANIES[sectorName] || [];
    setSearchResults(prev => ({ ...prev, [sectorName]: { companies, status: "researching" } }));
    setApiStatus("loading");
    try {
      const prompt = `${STINGA_CONTEXT}\n\nSektör: ${sectorName}\nStinga çözümü: ${sector.reason}\nMevcut sistem: ${sector.currentSystem}\n\nBu sektör için kısa satış strateji özeti yaz. En kritik 2-3 ağrı noktası, Stinga'nın 2-3 güçlü avantajı, ilk temas yaklaşımı. Başlık veya madde işareti olmadan düz paragraf, 200 kelimeyi geçme.`;
      const result = await gemini(prompt, "Sen Stinga Yapay Zeka — Stinga Enerji A.Ş. için B2B satış istihbarat uzmanısın. Kısa, net, satış odaklı Türkçe yanıt ver. Madde işareti veya başlık kullanma.");
      setSearchResults(prev => ({ ...prev, [sectorName]: { companies, analysis: result, status: "complete" } }));
      setApiStatus("ok");
      addLog(`✅ "${sectorName}" analizi tamamlandı`);
    } catch (err) {
      setApiStatus("error");
      setApiError(err.message);
      addLog(`❌ API Hatası: ${err.message}`);
      setSearchResults(prev => ({ ...prev, [sectorName]: { companies, status: "error", error: err.message } }));
    }
    setIsSearching(false);
  };

  const handleChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsChatLoading(true);
    setApiStatus("loading");
    try {
      const allCompanies = Object.entries(KNOWN_COMPANIES)
        .map(([sec, list]) => `\n${sec}:\n${list.map(c => `- ${c.name}: ${c.note} | İhtiyaç: ${c.need}`).join("\n")}`)
        .join("\n");
      const result = await gemini(
        `${STINGA_CONTEXT}\n\nMevcut lead veritabanı:${allCompanies}\n\nKullanıcı sorusu: ${userMsg}`,
        "Sen Stinga Yapay Zeka — Stinga Enerji A.Ş.'nin AI satış asistanısın. Her zaman Türkçe yanıt ver. Sade ve anlaşılır cümleler kur."
      );
      setChatMessages(prev => [...prev, { role: "assistant", content: result }]);
      setApiStatus("ok");
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "❌ API Hatası: " + err.message }]);
      setApiStatus("error");
      setApiError(err.message);
    }
    setIsChatLoading(false);
  };

  // ─── AI ile iletişim kişisi + sosyal medya bul ──────────────
  const findContacts = async (company) => {
    setContactSearching(true);
    addLog(`👤 "${company.name}" için iletişim kişisi aranıyor...`);
    try {
      const prompt = `Stinga Enerji A.Ş. için bu Türk firmasındaki karar vericileri bul:

Firma: ${company.name}
Sektör: ${company.sector}
Website: ${company.website}
LinkedIn: ${company.linkedin}
İhtiyaç: ${company.need}

Bu firmada gerçekten görev yapan veya bu tür firmalarda tipik pozisyonlara sahip karar vericileri listele.
Her kişi için gerçek veya makul olabilecek sosyal medya, iletişim ve LinkedIn bilgilerini ekle.

JSON formatında döndür:
[
  {
    "name": "Ad Soyad (gerçek veya 'Pozisyon Adı' şeklinde)",
    "title": "Unvan",
    "department": "Departman",
    "linkedin": "linkedin.com/in/... veya linkedin.com/company/...",
    "twitter": "@kullaniciadi veya boş",
    "email": "email adresi veya tahmini format",
    "phone": "telefon veya boş",
    "note": "Satış perspektifinden bu kişiye yaklaşım notu",
    "priority": true/false
  }
]
Sadece JSON döndür, başka açıklama yapma.`;
      const raw = await gemini(prompt, "Sen Stinga Yapay Zeka — B2B satış araştırma uzmanısın. Türk sanayi firmalarındaki karar vericileri iyi bilirsin. Gerçekçi, araştırılabilir kişi ve iletişim bilgileri ver. Sadece JSON döndür.");
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setFoundContacts(prev => ({ ...prev, [company.name]: parsed }));
      addLog(`✅ "${company.name}" için ${parsed.length} kişi bulundu`);
    } catch (err) {
      addLog(`⚠️ "${company.name}" kişi araması başarısız: ${err.message}`);
      setFoundContacts(prev => ({ ...prev, [company.name]: company.contacts || [] }));
    }
    setContactSearching(false);
  };

  // ─── Not işlemleri ──────────────────────────────────────────
  const addNoteEntry = (companyName, text) => {
    if (!text.trim()) return;
    const entry = { id: Date.now(), text: text.trim(), date: new Date().toLocaleString("tr-TR"), edited: false };
    setNoteEntries(prev => ({ ...prev, [companyName]: [entry, ...(prev[companyName] || [])] }));
    addLog(`📓 "${companyName}" için not eklendi`);
  };

  const deleteNoteEntry = (companyName, id) => {
    setNoteEntries(prev => ({ ...prev, [companyName]: (prev[companyName] || []).filter(e => e.id !== id) }));
  };

  const saveEditNote = (companyName, id, newText) => {
    if (!newText.trim()) return;
    setNoteEntries(prev => ({
      ...prev,
      [companyName]: (prev[companyName] || []).map(e =>
        e.id === id ? { ...e, text: newText.trim(), edited: true, editDate: new Date().toLocaleString("tr-TR") } : e
      )
    }));
    setEditingNote(null);
  };

  const updateLeadStatus = (companyName, status) => {
    setLeadStatuses(prev => ({ ...prev, [companyName]: status }));
    addLog(`📌 "${companyName}" → ${LEAD_STATUSES[status].label}`);
  };

  const getFilteredCompanies = () => {
    let all = Object.entries(KNOWN_COMPANIES).flatMap(([sec, cs]) => cs.map(c => ({ ...c, sectorLabel: sec })));
    if (filterSector !== "all") all = all.filter(c => c.sectorLabel === filterSector);
    if (filterStatus !== "all") {
      if (filterStatus === "new") all = all.filter(c => !leadStatuses[c.name]);
      else all = all.filter(c => leadStatuses[c.name] === filterStatus);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      all = all.filter(c => c.name.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q) || c.need.toLowerCase().includes(q));
    }
    return all;
  };

  const stats = {
    total:      totalLeads,
    contacted:  Object.values(leadStatuses).filter(s => s === "contacted").length,
    meeting:    Object.values(leadStatuses).filter(s => s === "meeting").length,
    proposal:   Object.values(leadStatuses).filter(s => s === "proposal").length,
    won:        Object.values(leadStatuses).filter(s => s === "won").length,
    lost:       Object.values(leadStatuses).filter(s => s === "lost").length,
    withNotes:  Object.values(noteEntries).filter(e => e?.length > 0).length,
    totalNotes: Object.values(noteEntries).reduce((s, a) => s + (a?.length || 0), 0),
  };

  const dots = ["●○○", "●●○", "●●●", "○●●"][bannerDot];

  const allNotesFlat = Object.entries(noteEntries)
    .flatMap(([company, entries]) => (entries || []).map(e => ({ ...e, company })))
    .sort((a, b) => b.id - a.id)
    .filter(e => !noteFilter || e.company.toLowerCase().includes(noteFilter.toLowerCase()) || e.text.toLowerCase().includes(noteFilter.toLowerCase()));

  const currentContacts = selectedCompany
    ? (foundContacts[selectedCompany.name] || selectedCompany.contacts || [])
    : [];

  const BANNER_METRICS = [
    { label: "HEDEF",    value: totalLeads,          color: "#34d399" },
    { label: "SEKTÖR",   value: sectorKeys.length,   color: "#60a5fa" },
    { label: "ANALİZ",   value: `${completedSects}/${sectorKeys.length}`, color: "#a78bfa" },
    { label: "İLETŞM",  value: stats.contacted,     color: "#38bdf8" },
    { label: "KAZANLD",  value: stats.won,            color: "#fbbf24" },
    { label: "NOT",      value: stats.totalNotes,    color: "#f472b6" },
  ];

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", background: "#f0f2f5", color: "#1e293b", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#e2e8f0}::-webkit-scrollbar-thumb{background:#94a3b8;border-radius:3px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes radarSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blinkDot{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes bannerGlow{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)}50%{box-shadow:0 0 20px 4px rgba(16,185,129,0.15)}}
        .fade-up{animation:fadeUp 0.4s ease-out both}
        .pulse-anim{animation:pulse 1.5s ease-in-out infinite}
        .sector-card{transition:all 0.22s;border:1px solid #e2e8f0;cursor:pointer}
        .sector-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.08);border-color:#10b981}
        .tab-btn{transition:all 0.18s;border:none;cursor:pointer}
        .tab-btn:hover{background:rgba(16,185,129,0.08)!important}
        .action-btn{transition:all 0.18s;cursor:pointer}
        .action-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.10)}
        .company-row:hover{background:rgba(16,185,129,0.04)!important}
        textarea:focus,input:focus,select:focus{outline:none;border-color:#10b981!important}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
        .modal-card{background:#fff;border-radius:16px;padding:24px;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 48px rgba(0,0,0,0.18)}
        .radar{animation:radarSpin 3s linear infinite}
        .blink{animation:blinkDot 1s ease-in-out infinite}
        .banner-active{animation:bannerGlow 2.5s ease-in-out infinite}
        .note-item{transition:background 0.14s;border-radius:10px}
        .note-item:hover{background:#f8fafc}
        .contact-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:11px 14px;margin-bottom:8px;transition:border-color 0.15s}
        .contact-card:hover{border-color:#10b981}
        .social-link{display:inline-flex;align-items:center;gap:4px;font-size:10px;padding:2px 8px;border-radius:10px;text-decoration:none;font-weight:600}
      `}</style>

      {/* ── BANNER ── */}
      <div className="banner-active" style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e3a2f 50%,#0f172a 100%)", borderBottom: "1px solid rgba(16,185,129,0.3)", padding: "6px 16px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(16,185,129,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.03) 1px,transparent 1px)", backgroundSize: "20px 20px", pointerEvents: "none" }} />
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>

          {/* SOL */}
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg viewBox="0 0 28 28" width="20" height="20" style={{ flexShrink: 0 }}>
              <circle cx="14" cy="14" r="12" stroke="rgba(16,185,129,0.15)" strokeWidth="1.5" fill="none" />
              <circle cx="14" cy="14" r="7" stroke="rgba(16,185,129,0.25)" strokeWidth="1" fill="none" />
              <circle cx="14" cy="14" r="2.5" fill="#10b981" />
              <g className="radar"><path d="M14 14 L14 2" stroke="rgba(16,185,129,0.6)" strokeWidth="1.5" strokeLinecap="round" /></g>
            </svg>
            <div className="blink" style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 5px 2px rgba(16,185,129,0.5)" }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: "#10b981", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>STINGA AJAN</span>
            <span style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 4, padding: "1px 5px", fontSize: 7, color: "#10b981", fontWeight: 700 }}>v4.1</span>
            {apiStatus === "loading" && <span style={{ fontSize: 8, color: "#fbbf24", fontWeight: 700 }}>◉ AI</span>}
            {apiStatus === "ok"      && <span style={{ fontSize: 8, color: "#10b981", fontWeight: 700 }}>✓ OK</span>}
            {apiStatus === "error"   && <span title={apiError} style={{ fontSize: 8, color: "#f87171", fontWeight: 700, cursor: "help" }}>✕ ERR</span>}
          </div>

          {/* ORTA — metrikler eşit dağılımlı */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0 }}>
            {BANNER_METRICS.map((m, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none", padding: "0 10px" }}>
                <div style={{ fontSize: 7, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace" }}>{m.label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.2 }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* SAĞ */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, color: "rgba(16,185,129,0.6)", fontFamily: "'JetBrains Mono',monospace" }}>{dots}</span>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 12 }}>
              {[4, 7, 9, 12].map((h, i) => (
                <div key={i} className={i < 3 ? "blink" : ""} style={{ width: 3, height: h, background: i < 3 ? "#10b981" : "rgba(16,185,129,0.2)", borderRadius: 1.5, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono',monospace" }}>{clock.toLocaleTimeString("tr-TR")}</span>
          </div>
        </div>
      </div>

      {/* ── HEADER ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "9px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid #e2e8f0", overflow: "hidden", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
          </div>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Stinga Lead Agent</h1>
            <p style={{ fontSize: 10, color: "#64748b" }}>AI-Powered B2B Platform — Stinga Yapay Zeka</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
          {/* API Key Girişi */}
          <div style={{ display: "flex", gap: 5, alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "3px 8px" }}>
            <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>API KEY:</span>
            <input
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              onBlur={() => { if (apiKeyInput.trim()) { setActiveApiKey(apiKeyInput.trim()); addLog("🔑 API anahtarı güncellendi"); } }}
              placeholder="AIza..."
              type="password"
              style={{ width: 120, background: "transparent", border: "none", fontSize: 10, outline: "none", color: "#0f172a" }}
            />
            {activeApiKey && activeApiKey !== GEMINI_API_KEY && <span style={{ fontSize: 8, color: "#10b981", fontWeight: 700 }}>✓</span>}
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "3px 9px", borderRadius: 7, fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>
            {clock.toLocaleDateString("tr-TR", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
          </div>
          {[
            { label: `${totalLeads} Lead`, bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", color: "#059669" },
            { label: `${sectorKeys.length} Sektör`, bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)", color: "#2563eb" },
            { label: `${stats.totalNotes} Not`, bg: "rgba(244,114,182,0.08)", border: "rgba(244,114,182,0.2)", color: "#db2777" },
          ].map((b, i) => (
            <span key={i} style={{ background: b.bg, border: `1px solid ${b.border}`, padding: "3px 9px", borderRadius: 20, fontSize: 10, color: b.color, fontWeight: 600 }}>{b.label}</span>
          ))}
        </div>
      </header>

      {/* ── TABS ── */}
      <nav style={{ display: "flex", gap: 2, padding: "5px 18px", background: "#fff", borderBottom: "1px solid #e2e8f0", overflowX: "auto" }}>
        {[
          { id: "dashboard", label: "📊 Dashboard" },
          { id: "results",   label: "🔍 Araştırma" },
          { id: "leads",     label: "📋 Lead Yönetimi" },
          { id: "notebook",  label: `📓 Not Defteri${stats.totalNotes > 0 ? ` (${stats.totalNotes})` : ""}` },
          { id: "chat",      label: "🤖 Stinga Yapay Zeka" },
          { id: "log",       label: "📝 Log" },
        ].map(tab => (
          <button key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            color: activeTab === tab.id ? "#fff" : "#64748b",
            background: activeTab === tab.id ? "linear-gradient(135deg,#10b981,#059669)" : "transparent",
            whiteSpace: "nowrap",
          }}>{tab.label}</button>
        ))}
      </nav>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, padding: "16px 18px", overflowY: "auto" }}>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="fade-up">
            <div style={{ background: "linear-gradient(135deg,#ecfdf5,#f0f9ff)", border: "1px solid #d1fae5", borderRadius: 14, padding: 18, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 5, color: "#0f172a" }}>🎯 Stinga Enerji — Hedef Sektör Analizi</h2>
                <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, maxWidth: 560 }}>Emisyonsuz yanma, kömür kurutma, arıtma çamuru bertarafı ve aktif karbon teknolojileriniz için en uygun potansiyel müşterileri <strong>Stinga Yapay Zeka</strong> ile bulun.</p>
                {lastScanTime && <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 5 }}>Son tarama: {lastScanTime}</p>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <button className="action-btn" onClick={() => { setAutoScanActive(true); setAutoScanSector(0); setScanProgress(0); addLog("🚀 Otomatik tarama başlatıldı..."); }} disabled={autoScanActive} style={{ background: autoScanActive ? "#94a3b8" : "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 12, fontWeight: 700, opacity: autoScanActive ? 0.6 : 1 }}>
                  {autoScanActive ? `⏳ Taranıyor... %${scanProgress}` : "🚀 Tüm Sektörleri Tara"}
                </button>
                {autoScanActive && (
                  <div style={{ height: 4, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${scanProgress}%`, background: "linear-gradient(90deg,#10b981,#059669)", borderRadius: 2, transition: "width 0.5s" }} />
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 9, marginBottom: 16 }}>
              {[
                { label: "Toplam Lead",      value: stats.total,      color: "#0f172a", bg: "#fff" },
                { label: "İletişim Kuruldu", value: stats.contacted,  color: "#2563eb", bg: "rgba(59,130,246,0.06)" },
                { label: "Toplantı",         value: stats.meeting,    color: "#d97706", bg: "rgba(245,158,11,0.06)" },
                { label: "Teklif Verildi",   value: stats.proposal,   color: "#7c3aed", bg: "rgba(139,92,246,0.06)" },
                { label: "Kazanılan",        value: stats.won,        color: "#059669", bg: "rgba(16,185,129,0.06)" },
                { label: "Kaybedilen",       value: stats.lost,       color: "#dc2626", bg: "rgba(239,68,68,0.06)" },
                { label: "Notlu Firma",      value: stats.withNotes,  color: "#db2777", bg: "rgba(244,114,182,0.06)" },
                { label: "Toplam Not",       value: stats.totalNotes, color: "#9333ea", bg: "rgba(147,51,234,0.06)" },
              ].map((s, i) => (
                <div key={i} style={{ background: s.bg, border: "1px solid #e2e8f0", borderRadius: 11, padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Sector Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 11 }}>
              {sectorKeys.map((sector, i) => {
                const s   = SECTOR_QUERIES[sector];
                const cnt = KNOWN_COMPANIES[sector]?.length || 0;
                const st  = searchResults[sector]?.status;
                return (
                  <div key={sector} className="sector-card fade-up" onClick={() => runSectorResearch(sector)} style={{ background: "#fff", borderColor: st === "complete" ? "#a7f3d0" : s.priority ? "#fecaca" : "#e2e8f0", borderRadius: 13, padding: 15, animationDelay: `${i * 0.04}s`, position: "relative" }}>
                    {s.priority && <div className="pulse-anim" style={{ position: "absolute", top: 9, right: 9, background: "#dc2626", color: "#fff", fontSize: 7, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>ÖNCELİKLİ</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
                      <span style={{ fontSize: 22 }}>{s.icon}</span>
                      {st === "complete"    && <span style={{ fontSize: 9, color: "#059669", background: "rgba(16,185,129,0.1)", padding: "2px 6px", borderRadius: 10, fontWeight: 600 }}>✓ Tamam</span>}
                      {st === "researching" && <span className="pulse-anim" style={{ fontSize: 9, color: "#d97706", background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: 10, fontWeight: 600 }}>⏳</span>}
                      {st === "error"       && <span style={{ fontSize: 9, color: "#dc2626", background: "rgba(239,68,68,0.1)", padding: "2px 6px", borderRadius: 10, fontWeight: 600 }}>✕ Hata</span>}
                    </div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{sector}</h3>
                    <p style={{ fontSize: 11, color: "#64748b", marginBottom: 9, lineHeight: 1.5 }}>{s.reason}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>{cnt} firma</span>
                      <span style={{ fontSize: 11, color: "#2563eb" }}>Araştır →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RESULTS */}
        {activeTab === "results" && (
          <div className="fade-up">
            {!selectedSector ? (
              <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
                <p style={{ fontSize: 32, marginBottom: 10 }}>🔍</p>
                <p style={{ fontSize: 14, color: "#64748b" }}>Dashboard'dan bir sektör seçin</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{SECTOR_QUERIES[selectedSector]?.icon} {selectedSector}</h2>
                    <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{SECTOR_QUERIES[selectedSector]?.reason}</p>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {sectorKeys.map(s => (
                      <button key={s} className="action-btn" onClick={() => { setSelectedSector(s); if (!searchResults[s]) runSectorResearch(s); }} style={{ background: selectedSector === s ? "#10b981" : "#fff", color: selectedSector === s ? "#fff" : "#475569", border: "1px solid #e2e8f0", borderRadius: 7, padding: "4px 9px", fontSize: 11, fontWeight: 600 }}>
                        {SECTOR_QUERIES[s].icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginBottom: 14 }}>
                  <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 11, padding: 13 }}>
                    <h4 style={{ fontSize: 11, color: "#dc2626", marginBottom: 4, fontWeight: 700 }}>❌ Mevcut Sistem</h4>
                    <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{SECTOR_QUERIES[selectedSector]?.currentSystem}</p>
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #a7f3d0", borderRadius: 11, padding: 13 }}>
                    <h4 style={{ fontSize: 11, color: "#059669", marginBottom: 4, fontWeight: 700 }}>✅ Stinga Çözümü</h4>
                    <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{SECTOR_QUERIES[selectedSector]?.reason}</p>
                  </div>
                </div>

                {searchResults[selectedSector]?.analysis && (
                  <div style={{ background: "linear-gradient(135deg,#f0f9ff,#ecfdf5)", border: "1px solid #a7f3d0", borderRadius: 11, padding: 14, marginBottom: 14 }}>
                    <h4 style={{ fontSize: 11, color: "#059669", marginBottom: 7, fontWeight: 700 }}>🤖 Stinga Yapay Zeka Satış Stratejisi</h4>
                    <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.7 }}>{searchResults[selectedSector].analysis}</p>
                  </div>
                )}
                {searchResults[selectedSector]?.status === "researching" && (
                  <div className="pulse-anim" style={{ background: "#fff", border: "1px solid #fde68a", borderRadius: 11, padding: 14, marginBottom: 14, fontSize: 12, color: "#d97706", textAlign: "center" }}>
                    ⏳ Stinga Yapay Zeka analiz yapıyor...
                  </div>
                )}
                {searchResults[selectedSector]?.status === "error" && (
                  <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 11, padding: 14, marginBottom: 14 }}>
                    <p style={{ fontSize: 12, color: "#dc2626" }}>❌ {searchResults[selectedSector].error}</p>
                    <p style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>API anahtarınızı header'dan girebilirsiniz.</p>
                  </div>
                )}

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 13, overflow: "hidden" }}>
                  <div style={{ padding: "11px 14px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700 }}>🏢 Hedef Firmalar</h3>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{(searchResults[selectedSector]?.companies || []).length} firma</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b" }}>
                          {["Firma", "Şehir", "İhtiyaç", "Not", "Durum", "İşlem"].map(h => (
                            <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(searchResults[selectedSector]?.companies || []).map((c, idx) => (
                          <tr key={idx} className="company-row" style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "8px 12px", fontWeight: 600, color: "#0f172a" }}>{c.name}</td>
                            <td style={{ padding: "8px 12px", color: "#475569" }}>{c.city || "-"}</td>
                            <td style={{ padding: "8px 12px", color: "#059669", fontSize: 11 }}>{c.need}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{ fontSize: 11, color: (noteEntries[c.name]?.length || 0) > 0 ? "#db2777" : "#94a3b8", fontWeight: 600 }}>
                                {(noteEntries[c.name]?.length || 0) > 0 ? `📓 ${noteEntries[c.name].length}` : "—"}
                              </span>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <select value={leadStatuses[c.name] || "new"} onChange={e => updateLeadStatus(c.name, e.target.value)} style={{ background: LEAD_STATUSES[leadStatuses[c.name] || "new"].bg, color: LEAD_STATUSES[leadStatuses[c.name] || "new"].color, border: "none", borderRadius: 20, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>
                                {Object.entries(LEAD_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <button className="action-btn" onClick={() => setSelectedCompany(c)} style={{ background: "#f0f9ff", border: "1px solid #bfdbfe", color: "#2563eb", borderRadius: 7, padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>Detay</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* LEAD YÖNETİMİ */}
        {activeTab === "leads" && (
          <div className="fade-up">
            <div style={{ display: "flex", gap: 7, marginBottom: 12, flexWrap: "wrap", background: "#fff", padding: 11, borderRadius: 11, border: "1px solid #e2e8f0" }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 Firma, şehir veya sektör ara..." style={{ flex: 1, minWidth: 180, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 11px", fontSize: 12 }} />
              <select value={filterSector} onChange={e => setFilterSector(e.target.value)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 11px", fontSize: 11, color: "#475569" }}>
                <option value="all">Tüm Sektörler</option>
                {sectorKeys.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 11px", fontSize: 11, color: "#475569" }}>
                <option value="all">Tüm Durumlar</option>
                {Object.entries(LEAD_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 13, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b", background: "#f8fafc" }}>
                      {["#", "Firma", "Sektör", "Şehir", "İhtiyaç", "Not", "Durum", "İşlem"].map(h => (
                        <th key={h} style={{ padding: "8px 11px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredCompanies().map((c, idx) => (
                      <tr key={idx} className="company-row" style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 11px", color: "#94a3b8" }}>{idx + 1}</td>
                        <td style={{ padding: "8px 11px", fontWeight: 600, color: "#0f172a" }}>{c.name}</td>
                        <td style={{ padding: "8px 11px" }}><span style={{ background: "rgba(59,130,246,0.08)", color: "#2563eb", padding: "2px 6px", borderRadius: 5, fontSize: 10 }}>{c.sectorLabel}</span></td>
                        <td style={{ padding: "8px 11px", color: "#475569" }}>{c.city || "-"}</td>
                        <td style={{ padding: "8px 11px", color: "#059669", fontSize: 11 }}>{c.need}</td>
                        <td style={{ padding: "8px 11px" }}>
                          <span style={{ fontSize: 11, color: (noteEntries[c.name]?.length || 0) > 0 ? "#db2777" : "#94a3b8", fontWeight: 600 }}>
                            {(noteEntries[c.name]?.length || 0) > 0 ? `📓 ${noteEntries[c.name].length}` : "—"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 11px" }}>
                          <select value={leadStatuses[c.name] || "new"} onChange={e => updateLeadStatus(c.name, e.target.value)} style={{ background: LEAD_STATUSES[leadStatuses[c.name] || "new"].bg, color: LEAD_STATUSES[leadStatuses[c.name] || "new"].color, border: "none", borderRadius: 20, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>
                            {Object.entries(LEAD_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "8px 11px" }}>
                          <button className="action-btn" onClick={() => setSelectedCompany(c)} style={{ background: "#f0f9ff", border: "1px solid #bfdbfe", color: "#2563eb", borderRadius: 7, padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>Detay</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* NOT DEFTERİ */}
        {activeTab === "notebook" && (
          <div className="fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>📓 Not Defteri</h2>
                <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Tüm firma notlarınız burada — tarayıcıyı kapatsanız da silinmez (localStorage).</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#db2777", fontWeight: 600, background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.2)", padding: "3px 9px", borderRadius: 20 }}>
                  {stats.totalNotes} not · {stats.withNotes} firma
                </span>
                <input value={noteFilter} onChange={e => setNoteFilter(e.target.value)} placeholder="🔍 Not veya firma ara..." style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 11px", fontSize: 12, width: 190 }} />
              </div>
            </div>
            {allNotesFlat.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
                <p style={{ fontSize: 28, marginBottom: 10 }}>📓</p>
                <p style={{ fontSize: 13, color: "#64748b" }}>Henüz not yok. Firma detayından not ekleyin.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {allNotesFlat.map((entry) => (
                  <div key={entry.id} className="note-item" style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "13px 16px" }}>
                    {editingNote?.id === entry.id ? (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", marginBottom: 7 }}>{entry.company}</div>
                        <textarea value={editingNote.text} onChange={e => setEditingNote(prev => ({ ...prev, text: e.target.value }))} rows={3} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 11px", fontSize: 12, resize: "vertical", fontFamily: "inherit" }} />
                        <div style={{ display: "flex", gap: 7, marginTop: 7 }}>
                          <button onClick={() => saveEditNote(entry.company, entry.id, editingNote.text)} style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: 8, padding: "5px 13px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Kaydet</button>
                          <button onClick={() => setEditingNote(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "5px 13px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>İptal</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", cursor: "pointer", textDecoration: "underline dotted" }} onClick={() => { const c = Object.values(KNOWN_COMPANIES).flat().find(x => x.name === entry.company); if (c) setSelectedCompany(c); }}>{entry.company}</span>
                            {leadStatuses[entry.company] && (
                              <span style={{ fontSize: 9, background: LEAD_STATUSES[leadStatuses[entry.company]].bg, color: LEAD_STATUSES[leadStatuses[entry.company]].color, padding: "1px 6px", borderRadius: 6, fontWeight: 600 }}>
                                {LEAD_STATUSES[leadStatuses[entry.company]].label}
                              </span>
                            )}
                            <span style={{ fontSize: 10, color: "#94a3b8" }}>{entry.date}</span>
                            {entry.edited && <span style={{ fontSize: 9, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "1px 5px", borderRadius: 5, fontWeight: 600 }}>düzenlendi</span>}
                          </div>
                          <div style={{ display: "flex", gap: 5 }}>
                            <button onClick={() => setEditingNote({ id: entry.id, text: entry.text })} style={{ background: "#f0f9ff", border: "1px solid #bfdbfe", color: "#2563eb", borderRadius: 6, padding: "2px 7px", fontSize: 10, cursor: "pointer", fontWeight: 600 }}>Düzenle</button>
                            <button onClick={() => deleteNoteEntry(entry.company, entry.id)} style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 6, padding: "2px 7px", fontSize: 10, cursor: "pointer", fontWeight: 600 }}>Sil</button>
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{entry.text}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI ASISTAN CHAT */}
        {activeTab === "chat" && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", minHeight: 400 }}>
            <div style={{ flex: 1, overflowY: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 13, padding: 16, marginBottom: 11 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                  <p style={{ fontSize: 28, marginBottom: 10 }}>🤖</p>
                  <p style={{ fontSize: 13, color: "#64748b" }}>Stinga Yapay Zeka hazır. Soru sorun!</p>
                  <div style={{ display: "flex", gap: 7, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
                    {["Hangi sektör en acil?", "İSKİ'ye nasıl yaklaşalım?", "Çimento sektörü satış stratejisi?"].map(q => (
                      <button key={q} onClick={() => { setChatInput(q); }} style={{ background: "#f0f9ff", border: "1px solid #bfdbfe", color: "#2563eb", borderRadius: 20, padding: "5px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ marginBottom: 12, display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "80%", background: msg.role === "user" ? "linear-gradient(135deg,#10b981,#059669)" : "#f8fafc", color: msg.role === "user" ? "#fff" : "#374151", border: msg.role === "user" ? "none" : "1px solid #e2e8f0", borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", padding: "9px 13px", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div className="pulse-anim" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px 12px 12px 2px", padding: "9px 13px", fontSize: 12, color: "#64748b" }}>🤖 Stinga Yapay Zeka düşünüyor...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChat()}
                placeholder="Stinga Yapay Zeka'ya sorun... (Enter ile gönder)"
                style={{ flex: 1, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}
              />
              <button className="action-btn" onClick={handleChat} disabled={isChatLoading} style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, opacity: isChatLoading ? 0.6 : 1 }}>
                Gönder
              </button>
            </div>
          </div>
        )}

        {/* LOG */}
        {activeTab === "log" && (
          <div className="fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>📝 İşlem Geçmişi</h2>
              <button onClick={() => setSearchLog([])} style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 7, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Temizle</button>
            </div>
            <div style={{ background: "#0f172a", borderRadius: 13, padding: 16, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#94a3b8", maxHeight: 500, overflowY: "auto" }}>
              {searchLog.length === 0 ? <p style={{ color: "#475569" }}>Log boş — araştırma başlatın</p> : searchLog.map((l, i) => (
                <div key={i} style={{ marginBottom: 5, display: "flex", gap: 10 }}>
                  <span style={{ color: "#475569", flexShrink: 0 }}>{l.time}</span>
                  <span style={{ color: l.msg.includes("❌") ? "#f87171" : l.msg.includes("✅") ? "#34d399" : l.msg.includes("⚠️") ? "#fbbf24" : "#94a3b8" }}>{l.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── FİRMA DETAY MODAL ── */}
      {selectedCompany && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedCompany(null)}>
          <div className="modal-card">
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{selectedCompany.name}</h2>
                <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                  <span style={{ background: "rgba(59,130,246,0.08)", color: "#2563eb", padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 600 }}>{selectedCompany.sector}</span>
                  {selectedCompany.city && <span style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 7px", borderRadius: 5, fontSize: 10 }}>{selectedCompany.city}</span>}
                  <select value={leadStatuses[selectedCompany.name] || "new"} onChange={e => updateLeadStatus(selectedCompany.name, e.target.value)} style={{ background: LEAD_STATUSES[leadStatuses[selectedCompany.name] || "new"].bg, color: LEAD_STATUSES[leadStatuses[selectedCompany.name] || "new"].color, border: "none", borderRadius: 20, padding: "2px 7px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                    {Object.entries(LEAD_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => setSelectedCompany(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>

            {/* Firma Bilgileri */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                {selectedCompany.phone && <div><span style={{ color: "#64748b" }}>📞 </span><a href={`tel:${selectedCompany.phone}`} style={{ color: "#2563eb" }}>{selectedCompany.phone}</a></div>}
                {selectedCompany.email && <div><span style={{ color: "#64748b" }}>✉️ </span><a href={`mailto:${selectedCompany.email}`} style={{ color: "#2563eb" }}>{selectedCompany.email}</a></div>}
                {selectedCompany.website && <div><span style={{ color: "#64748b" }}>🌐 </span><a href={`https://${selectedCompany.website}`} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>{selectedCompany.website}</a></div>}
                {selectedCompany.linkedin && <div><span style={{ color: "#64748b" }}>💼 </span><a href={`https://${selectedCompany.linkedin}`} target="_blank" rel="noreferrer" style={{ color: "#0077b5" }}>LinkedIn</a></div>}
              </div>
              <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(16,185,129,0.06)", borderRadius: 7, border: "1px solid rgba(16,185,129,0.15)" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#059669" }}>İHTİYAÇ: </span>
                <span style={{ fontSize: 11, color: "#374151" }}>{selectedCompany.need}</span>
              </div>
              <p style={{ fontSize: 11, color: "#64748b", marginTop: 8, lineHeight: 1.6 }}>{selectedCompany.note}</p>
            </div>

            {/* İletişim Kişileri */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>👤 İletişim Kişileri</h3>
                <button className="action-btn" onClick={() => findContacts(selectedCompany)} disabled={contactSearching} style={{ background: contactSearching ? "#94a3b8" : "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 600, opacity: contactSearching ? 0.6 : 1 }}>
                  {contactSearching ? "🔍 Aranıyor..." : "🤖 Stinga YZ ile Kişi Bul"}
                </button>
              </div>
              {currentContacts.length === 0 ? (
                <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>Henüz kişi yok — AI ile aratın</p>
              ) : (
                currentContacts.map((contact, i) => (
                  <div key={i} className="contact-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{contact.name}</span>
                          {contact.priority && <span style={{ fontSize: 8, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>ÖNCELİK</span>}
                        </div>
                        <span style={{ fontSize: 11, color: "#64748b" }}>{contact.title}</span>
                        {contact.department && <span style={{ fontSize: 10, color: "#94a3b8" }}> · {contact.department}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                      {contact.linkedin && (
                        <a href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noreferrer" className="social-link" style={{ background: "rgba(0,119,181,0.08)", color: "#0077b5", border: "1px solid rgba(0,119,181,0.2)" }}>💼 LinkedIn</a>
                      )}
                      {contact.twitter && (
                        <a href={`https://twitter.com/${contact.twitter.replace("@","")}`} target="_blank" rel="noreferrer" className="social-link" style={{ background: "rgba(29,161,242,0.08)", color: "#1da1f2", border: "1px solid rgba(29,161,242,0.2)" }}>𝕏 {contact.twitter}</a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="social-link" style={{ background: "rgba(16,185,129,0.08)", color: "#059669", border: "1px solid rgba(16,185,129,0.2)" }}>✉️ {contact.email}</a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="social-link" style={{ background: "rgba(245,158,11,0.08)", color: "#d97706", border: "1px solid rgba(245,158,11,0.2)" }}>📞 {contact.phone}</a>
                      )}
                    </div>
                    {contact.note && <p style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5, fontStyle: "italic" }}>💡 {contact.note}</p>}
                  </div>
                ))
              )}
            </div>

            {/* Not Ekleme */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 9 }}>📓 Notlar <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>(kalıcı olarak kaydedilir)</span></h3>
              <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
                <textarea
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder="Bu firma hakkında not ekleyin... (kalıcı olarak saklanır)"
                  rows={2}
                  style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 11px", fontSize: 12, resize: "vertical", fontFamily: "inherit" }}
                />
                <button className="action-btn" onClick={() => { addNoteEntry(selectedCompany.name, noteInput); setNoteInput(""); }} style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", alignSelf: "flex-start" }}>
                  + Not Ekle
                </button>
              </div>
              {(noteEntries[selectedCompany.name] || []).length === 0 ? (
                <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: "10px 0" }}>Bu firma için henüz not yok</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 250, overflowY: "auto" }}>
                  {(noteEntries[selectedCompany.name] || []).map((entry) => (
                    <div key={entry.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px" }}>
                      {editingNote?.id === entry.id ? (
                        <div>
                          <textarea value={editingNote.text} onChange={e => setEditingNote(p => ({ ...p, text: e.target.value }))} rows={2} style={{ width: "100%", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 9px", fontSize: 12, resize: "vertical", fontFamily: "inherit" }} />
                          <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                            <button onClick={() => saveEditNote(selectedCompany.name, entry.id, editingNote.text)} style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Kaydet</button>
                            <button onClick={() => setEditingNote(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", color: "#64748b" }}>İptal</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 10, color: "#94a3b8" }}>{entry.date}</span>
                              {entry.edited && <span style={{ fontSize: 9, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>düzenlendi</span>}
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => setEditingNote({ id: entry.id, text: entry.text })} style={{ background: "none", border: "none", color: "#2563eb", fontSize: 10, cursor: "pointer", fontWeight: 600 }}>Düzenle</button>
                              <button onClick={() => deleteNoteEntry(selectedCompany.name, entry.id)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 10, cursor: "pointer", fontWeight: 600 }}>Sil</button>
                            </div>
                          </div>
                          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{entry.text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
