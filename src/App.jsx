import React, { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// STINGA LEAD AGENT v4.2
// - Gemini 2.5 Flash — Railway /api/gemini proxy üzerinden
// - Persistent notlar (localStorage)
// - Banner büyütüldü
// - AI ile iletişim kişisi + sosyal medya araması
// ============================================================

// ─── Gemini Proxy Çağrısı (Railway /api/ai-search) ──────────
// server.js'deki endpoint: POST /api/ai-search
// Response: { success: true, result: "..." }
const callGemini = async (prompt, systemInstruction = "") => {
  const res = await fetch("/api/ai-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      systemPrompt: systemInstruction,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sunucu hatası ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Gemini API hatası");
  }
  return data.result || "Yanıt alınamadı.";
};

// ─── Stinga Logo (GitHub raw — beyaz yuvarlak çerçeveli) ────
const STINGA_LOGO_URL = "https://raw.githubusercontent.com/srkngzdmr/stinga-lead-agent/refs/heads/master/stinga_logo_ic_i_beyaz_c_erc_eveli-02.png";

// ─── Banner Ajan İkonu (animasyonlu SVG robot) ───────────────
const AjanIcon = ({ size = 42 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    {/* Dış halka */}
    <circle cx="40" cy="40" r="38" fill="rgba(16,185,129,0.08)" stroke="#10b981" strokeWidth="1.5"/>
    {/* Kafa */}
    <rect x="22" y="20" width="36" height="28" rx="6" fill="#0f172a" stroke="#10b981" strokeWidth="1.5"/>
    {/* Gözler */}
    <circle cx="32" cy="32" r="4" fill="#10b981" opacity="0.9"/>
    <circle cx="48" cy="32" r="4" fill="#10b981" opacity="0.9"/>
    {/* Göz parıltısı */}
    <circle cx="33.5" cy="30.5" r="1.2" fill="#fff" opacity="0.7"/>
    <circle cx="49.5" cy="30.5" r="1.2" fill="#fff" opacity="0.7"/>
    {/* Ağız / data çizgisi */}
    <rect x="29" y="40" width="22" height="2" rx="1" fill="#10b981" opacity="0.5"/>
    <rect x="33" y="44" width="14" height="2" rx="1" fill="#10b981" opacity="0.3"/>
    {/* Anten */}
    <line x1="40" y1="20" x2="40" y2="12" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="40" cy="10" r="3" fill="#10b981"/>
    {/* Boyun */}
    <rect x="36" y="48" width="8" height="5" rx="2" fill="#10b981" opacity="0.4"/>
    {/* Gövde */}
    <rect x="26" y="53" width="28" height="18" rx="5" fill="#0f172a" stroke="#10b981" strokeWidth="1.2"/>
    {/* Gövde detaylar */}
    <rect x="31" y="58" width="8" height="3" rx="1.5" fill="#10b981" opacity="0.5"/>
    <rect x="41" y="58" width="8" height="3" rx="1.5" fill="#10b981" opacity="0.3"/>
    <circle cx="40" cy="65" r="2.5" fill="#10b981" opacity="0.6"/>
  </svg>
);

// ─── Stinga Logo (header için — siyah arka plan CSS trick ile yok) ───
const StingaLogo = ({ size = 52 }) => {
  const [err, setErr] = React.useState(false);
  return err ? (
    <AjanIcon size={size} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      overflow: "hidden", flexShrink: 0,
      background: "white",
      boxShadow: "0 0 0 2px #e2e8f0",
    }}>
      <img
        src={STINGA_LOGO_URL}
        alt="Stinga"
        onError={() => setErr(true)}
        style={{
          width: "140%", height: "140%",
          objectFit: "cover",
          marginLeft: "-20%", marginTop: "-20%",
          mixBlendMode: "multiply",
          display: "block",
        }}
      />
    </div>
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
    { name: "İSKİ (İstanbul Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.iski.istanbul", linkedin: "linkedin.com/company/iski", note: "İstanbul'un tüm atıksu yönetimi — günlük 3M+ m³ arıtma kapasitesi. 14 büyük arıtma tesisi. Çamur bertarafı için Silivri ve Kömürcüoda tesisleri kullanılmaktadır.", need: "Çamur termik kurutma & bertaraf, aktif karbon üretimi", phone: "+90 212 321 60 00", email: "bilgi@iski.gov.tr", city: "İstanbul", contacts: [{ name: "Genel Müdürlük", title: "Genel Müdür", linkedin: "linkedin.com/company/iski", email: "gm@iski.gov.tr", note: "Yatırım kararları GM onayına bağlı" }, { name: "Atıksu Dairesi Başkanlığı", title: "Daire Başkanı", email: "atiksudaire@iski.gov.tr", note: "Teknik karar verici birim" }] },
    { name: "İSTAÇ A.Ş.", sector: "Atık Yönetimi", website: "www.istac.istanbul", linkedin: "linkedin.com/company/istac", note: "İBB atık yönetimi şirketi — İstanbul'un katı atık ve biyolojik atık yönetimi. Yıllık 3M ton atık işleme kapasitesi. Kompostlama, biyogaz ve bertaraf tesisleri.", need: "Arıtma çamuru termik bertaraf, emisyonsuz yakma", phone: "+90 212 368 12 00", email: "info@istac.istanbul", city: "İstanbul", contacts: [{ name: "Genel Müdür", title: "CEO", linkedin: "linkedin.com/company/istac", email: "gmd@istac.istanbul", note: "İBB bağlantılı şirket, ihale süreci uzun" }] },
    { name: "ASKİ (Ankara Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.aski.gov.tr", linkedin: "linkedin.com/company/aski-ankara", note: "Ankara'nın atıksu arıtma idaresi. Günlük 600.000 m³ kapasite. Sincan ve Tatlar tesisleri.", need: "Çamur kurutma sistemi, bertaraf lisansı", phone: "+90 312 314 12 43", email: "info@aski.gov.tr", city: "Ankara", contacts: [{ name: "Teknik Hizmetler Dairesi", title: "Daire Başkanı", email: "teknikhizmetler@aski.gov.tr", note: "Termik çözümleri bu birim değerlendiriyor" }] },
    { name: "EGO Genel Müdürlüğü", sector: "Belediye Hizmetleri", website: "www.ego.gov.tr", linkedin: "-", note: "Ankara Büyükşehir Belediyesi'ne bağlı hizmet kuruluşu. Ulaşım ve altyapı hizmetleri kapsamında çevre yatırımları.", need: "Arıtma çamuru bertaraf çözümleri", phone: "+90 312 384 00 00", email: "iletisim@ego.gov.tr", city: "Ankara", contacts: [] },
    { name: "İZSU (İzmir Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.izsu.gov.tr", linkedin: "linkedin.com/company/izsu", note: "Çiğli AAT Türkiye'nin en büyük biyolojik arıtma tesislerinden biri. Yıllık binlerce ton çamur üretimi.", need: "Termik çamur kurutma, karbon ayak izi azaltma", phone: "+90 232 293 13 00", email: "info@izsu.gov.tr", city: "İzmir", contacts: [{ name: "Fen İşleri Direktörlüğü", title: "Teknik Direktör", email: "fenisleri@izsu.gov.tr", note: "Teknik ve yatırım kararları burada alınıyor" }] },
    { name: "BUSKİ (Bursa Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.buski.gov.tr", linkedin: "linkedin.com/company/buski", note: "Nilüfer AAT ve Kestel AAT başlıca arıtma tesisleri. Çamur bertarafı öncelikli gündem maddesidir.", need: "Çamur termik bertaraf, enerji geri kazanım", phone: "+90 224 270 20 00", email: "iletisim@buski.gov.tr", city: "Bursa", contacts: [{ name: "Atıksu Daire Başkanlığı", title: "Daire Başkanı", email: "atiksudaire@buski.gov.tr", note: "Kurutma teknolojisi araştırıyor" }] },
    { name: "KOSKİ (Konya Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.koski.gov.tr", linkedin: "linkedin.com/company/koski", note: "İç Anadolu'nun en büyük arıtma tesisini işletiyor. Atıksu çamurunu tarımda kullanmakta, yeni bertaraf çözümleri arayışında.", need: "Çamur kurutma & tarım dışı bertaraf", phone: "+90 332 234 00 34", email: "koski@koski.gov.tr", city: "Konya", contacts: [] },
    { name: "ASAT (Antalya Su ve Atıksu İdaresi)", sector: "Su/Atık Su", website: "www.asat.gov.tr", linkedin: "linkedin.com/company/asat", note: "Turizm bölgesi olması nedeniyle çevre hassasiyeti yüksek. Çamur bertarafı için yenilikçi çözümler arıyor.", need: "Çamur termik bertaraf, sıfır koku teknolojisi", phone: "+90 242 249 20 00", email: "asat@asat.gov.tr", city: "Antalya", contacts: [] },
    { name: "AdASKİ (Adana Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.adanaski.gov.tr", linkedin: "-", note: "Günlük 400.000 m³ atıksu arıtma kapasitesi. Çamur sorununu çözmek için yatırım planı hazırlamaktadır.", need: "Arıtma çamuru kurutma sistemi", phone: "+90 322 458 00 00", email: "info@adanaski.gov.tr", city: "Adana", contacts: [] },
    { name: "İSU (Kocaeli Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.isu.gov.tr", linkedin: "linkedin.com/company/kocaeli-isu", note: "Sanayi kenti, atıksu yükü yüksek. İzmit Körfezi koruma kapsamında çevre yatırımları zorunlu.", need: "Endüstriyel arıtma çamuru bertaraf & kurutma", phone: "+90 262 317 10 00", email: "info@isu.gov.tr", city: "Kocaeli", contacts: [] },
    { name: "GASKİ (Gaziantep Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.gaski.gov.tr", linkedin: "-", note: "Endüstriyel atıksu yükü yüksek. Çamur bertaraf kapasitesi yetersiz kalmaktadır.", need: "Arıtma çamuru bertaraf, endüstriyel çamur kurutma", phone: "+90 342 321 00 00", email: "gaski@gaski.gov.tr", city: "Gaziantep", contacts: [] },
    { name: "MESKİ (Mersin Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.meski.gov.tr", linkedin: "-", note: "Liman kenti ve turizm merkezi; çevre hassasiyeti yüksek. Çamur bertaraf maliyetleri bütçe yükü oluşturmaktadır.", need: "Çamur termik bertaraf, düzenli depolama alternatifleri", phone: "+90 324 238 00 00", email: "bilgi@meski.gov.tr", city: "Mersin", contacts: [] },
    { name: "HATSu (Hatay Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.hatsu.gov.tr", linkedin: "-", note: "Deprem sonrası yeniden yapılanma kapsamında altyapı yatırımları hız kazanmıştır. Yeni teknolojilere açık.", need: "Modern çamur bertaraf sistemi, yeniden yapılanma", phone: "+90 326 221 00 00", email: "info@hatsu.gov.tr", city: "Hatay", contacts: [] },
    { name: "SASKİ (Sakarya Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.saski.gov.tr", linkedin: "-", note: "Organize sanayi bölgeleri nedeniyle endüstriyel atıksu yoğun. Çamur bertaraf alternatifleri arıyor.", need: "Endüstriyel çamur kurutma, bertaraf teknolojisi", phone: "+90 264 275 90 00", email: "saski@saski.gov.tr", city: "Sakarya", contacts: [] },
    { name: "TRASKİ (Trabzon Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.traski.com.tr", linkedin: "-", note: "Karadeniz'e sıfır deşarj hedefi kapsamında arıtma yatırımları hız kazanmaktadır.", need: "Çamur kurutma & bertaraf, çevre uyumu", phone: "+90 462 327 00 00", email: "traski@traski.com.tr", city: "Trabzon", contacts: [] },
    { name: "ŞUSKİ (Şanlıurfa Su İdaresi)", sector: "Su/Atık Su", website: "www.suski.gov.tr", linkedin: "-", note: "GAP kapsamında genişleyen arıtma ağı ile çamur bertaraf kapasitesi yetersiz kalmaktadır.", need: "Çamur kurutma ve bertaraf çözümü", phone: "+90 414 215 00 00", email: "info@suski.gov.tr", city: "Şanlıurfa", contacts: [] },
    { name: "Çevko Vakfı", sector: "Çevre", website: "www.cevko.org.tr", linkedin: "linkedin.com/company/cevko", note: "500+ üye firma ile Türkiye'nin en büyük geri dönüşüm ağı. Yenilikçi bertaraf teknolojilerine yatırım desteklemektedir.", need: "Emisyonsuz bertaraf teknolojisi tanıtım & ortaklık", phone: "+90 212 283 82 96", email: "info@cevko.org.tr", city: "İstanbul", contacts: [{ name: "Gürhan Uçar", title: "Genel Müdür", linkedin: "linkedin.com/in/gurhanucar", email: "gm@cevko.org.tr", note: "500+ üye firmaya erişim kapısı" }] },
    { name: "ÇEVSAN Çevre ve Sağlık Hizmetleri", sector: "Çevre Teknolojisi", website: "www.cevsan.com.tr", linkedin: "linkedin.com/company/cevsan", note: "Atık yönetimi ve çevre danışmanlık hizmetleri. Belediyeler ve sanayi kuruluşlarına arıtma çamuru bertaraf çözümleri.", need: "Termik çamur bertaraf teknolojisi entegrasyonu", phone: "+90 216 489 00 00", email: "info@cevsan.com.tr", city: "İstanbul", contacts: [] },
    { name: "Stfa Çevre", sector: "Çevre Mühendisliği", website: "www.stfa.com.tr", linkedin: "linkedin.com/company/stfa", note: "Stfa Grubu çevre şirketi — AAT inşaat ve işletme. Türkiye'nin önde gelen çevre mühendisliği firmalarından.", need: "Çamur bertaraf teknoloji ortaklığı", phone: "+90 212 393 00 00", email: "cevre@stfa.com.tr", city: "İstanbul", contacts: [] },
    { name: "Yüksel Proje A.Ş.", sector: "Mühendislik", website: "www.yukselproje.com.tr", linkedin: "linkedin.com/company/yuksel-proje", note: "Altyapı mühendisliği ve çevre projeleri. Pek çok belediyenin AAT projesini yönetmiştir.", need: "Çamur bertaraf teknoloji danışmanlık", phone: "+90 312 427 31 26", email: "info@yukselproje.com.tr", city: "Ankara", contacts: [] },
    { name: "Akdeniz Belediyeler Birliği", sector: "Belediye Birliği", website: "www.akdenizbb.org.tr", linkedin: "-", note: "Akdeniz bölgesi belediyelerinin ortak hizmet birliği. Toplu alım ve proje koordinasyonu sağlar.", need: "Toplu çamur bertaraf çözümü, ortak yatırım", phone: "+90 242 248 00 00", email: "info@akdenizbb.org.tr", city: "Antalya", contacts: [] },
    { name: "Marmara Belediyeler Birliği", sector: "Belediye Birliği", website: "www.marmara.gov.tr", linkedin: "linkedin.com/company/marmara-belediyeler-birligi", note: "100+ üye belediyeye çevre, altyapı ve atık yönetiminde destek sağlar. İhale koordinasyonu yapar.", need: "Bölgesel arıtma çamuru bertaraf stratejisi", phone: "+90 212 440 60 60", email: "mbb@mbb.gov.tr", city: "İstanbul", contacts: [] },
    { name: "ÇED Danışmanlık (Çevre Bakanlığı)", sector: "Kamu", website: "www.csb.gov.tr", linkedin: "-", note: "T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı — arıtma çamuru bertaraf lisanslarını ve çevre mevzuatını düzenlemektedir.", need: "Emisyonsuz bertaraf teknoloji homologasyonu", phone: "+90 312 410 10 00", email: "info@csb.gov.tr", city: "Ankara", contacts: [] },
    // ── YENİ MÜŞTERİLER — 83 İL TABLOSUNDAN EKLENDİ ──────────────
    { name: "DİSKİ (Diyarbakır Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.diski.gov.tr", linkedin: "-", note: "Günlük 458 ton ıslak çamur üretimi. 2 adet Çift Katlı Sistem önerilmektedir. Nüfus: 1.832.882.", need: "Çift Katlı Çamur Kurutma Sistemi (2 adet)", phone: "+90 412 228 00 00", email: "info@diski.gov.tr", city: "Diyarbakır", contacts: [] },
    { name: "MASKİ (Manisa Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.maski.gov.tr", linkedin: "-", note: "Günlük 372 ton ıslak çamur üretimi. 2 adet Çift Katlı Sistem önerilmektedir. Nüfus: 1.488.115.", need: "Çift Katlı Çamur Kurutma Sistemi (2 adet)", phone: "+90 236 231 00 00", email: "info@maski.gov.tr", city: "Manisa", contacts: [] },
    { name: "KASKİ (Kayseri Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.kaski.gov.tr", linkedin: "-", note: "Günlük 362 ton ıslak çamur üretimi. 2 adet Çift Katlı Sistem önerilmektedir. Nüfus: 1.448.438.", need: "Çift Katlı Çamur Kurutma Sistemi (2 adet)", phone: "+90 352 221 00 00", email: "info@kaski.gov.tr", city: "Kayseri", contacts: [] },
    { name: "SASKİ (Samsun Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.saski.gov.tr", linkedin: "-", note: "Günlük 344 ton ıslak çamur üretimi. 2 adet Çift Katlı Sistem önerilmektedir. Nüfus: 1.377.729. (Sakarya SASKİ ile karıştırılmamalıdır.)", need: "Çift Katlı Çamur Kurutma Sistemi (2 adet)", phone: "+90 362 311 00 00", email: "info@saski.samsun.gov.tr", city: "Samsun", contacts: [] },
    { name: "BASKİ (Balıkesir Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.baski.gov.tr", linkedin: "-", note: "Günlük 318 ton ıslak çamur üretimi. 2 adet Çift Katlı Sistem önerilmektedir. Nüfus: 1.271.340.", need: "Çift Katlı Çamur Kurutma Sistemi (2 adet)", phone: "+90 266 239 00 00", email: "info@baski.gov.tr", city: "Balıkesir", contacts: [] },
    { name: "AYSKİ (Aydın Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.ayski.gov.tr", linkedin: "-", note: "Günlük 294 ton ıslak çamur üretimi. 2 adet Çift Katlı Sistem önerilmektedir. Nüfus: 1.175.122.", need: "Çift Katlı Çamur Kurutma Sistemi (2 adet)", phone: "+90 256 211 00 00", email: "info@ayski.gov.tr", city: "Aydın", contacts: [] },
    { name: "KAHSKİ (Kahramanmaraş Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.kahski.gov.tr", linkedin: "-", note: "Günlük 292 ton ıslak çamur üretimi. 2 adet Çift Katlı Sistem önerilmektedir. Nüfus: 1.168.421.", need: "Çift Katlı Çamur Kurutma Sistemi (2 adet)", phone: "+90 344 225 00 00", email: "info@kahski.gov.tr", city: "Kahramanmaraş", contacts: [] },
    { name: "TESKİ (Tekirdağ Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.teski.gov.tr", linkedin: "-", note: "Günlük 289 ton ıslak çamur üretimi. 2 adet Çift Katlı Sistem önerilmektedir. Nüfus: 1.154.704. Marmara havzası koruma kapsamında çevre hassasiyeti yüksek.", need: "Çift Katlı Çamur Kurutma Sistemi (2 adet)", phone: "+90 282 261 00 00", email: "info@teski.gov.tr", city: "Tekirdağ", contacts: [] },
    { name: "VASKİ (Van Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.vaski.gov.tr", linkedin: "-", note: "Günlük 287 ton ıslak çamur üretimi. 2 adet Çift Katlı Sistem önerilmektedir. Nüfus: 1.148.608.", need: "Çift Katlı Çamur Kurutma Sistemi (2 adet)", phone: "+90 432 214 00 00", email: "info@vaski.gov.tr", city: "Van", contacts: [] },
    { name: "MUSKİ (Muğla Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.muski.gov.tr", linkedin: "-", note: "Günlük 276 ton ıslak çamur üretimi. 2 adet Çift Katlı Sistem önerilmektedir. Nüfus: 1.105.052. Turizm bölgesi, çevre hassasiyeti çok yüksek.", need: "Çift Katlı Çamur Kurutma Sistemi (2 adet)", phone: "+90 252 214 00 00", email: "info@muski.gov.tr", city: "Muğla", contacts: [] },
    { name: "DESKİ (Denizli Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.deski.gov.tr", linkedin: "-", note: "Günlük 275 ton ıslak çamur üretimi. 2 adet Çift Katlı Sistem önerilmektedir. Nüfus: 1.099.687.", need: "Çift Katlı Çamur Kurutma Sistemi (2 adet)", phone: "+90 258 265 00 00", email: "info@deski.gov.tr", city: "Denizli", contacts: [] },
    { name: "ESKİ (Eskişehir Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.eski.gov.tr", linkedin: "-", note: "Günlük 228 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 913.615.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 222 211 00 00", email: "info@eski.gov.tr", city: "Eskişehir", contacts: [] },
    { name: "MARSKİ (Mardin Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.marski.gov.tr", linkedin: "-", note: "Günlük 218 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 870.374.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 482 212 00 00", email: "info@marski.gov.tr", city: "Mardin", contacts: [] },
    { name: "TRSKİ (Trabzon Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.trski.gov.tr", linkedin: "-", note: "Günlük 209 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 835.432. (TRASKİ ile aynı kurum — alternatif kısaltma.)", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 462 327 00 00", email: "traski@traski.com.tr", city: "Trabzon", contacts: [] },
    { name: "MALSKİ (Malatya Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.malski.gov.tr", linkedin: "-", note: "Günlük 207 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 826.032.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 422 238 00 00", email: "info@malski.gov.tr", city: "Malatya", contacts: [] },
    { name: "ORSKİ (Ordu Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.orsuki.gov.tr", linkedin: "-", note: "Günlük 196 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 783.550.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 452 214 00 00", email: "info@orsuki.gov.tr", city: "Ordu", contacts: [] },
    { name: "ERSKİ (Erzurum Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.erski.gov.tr", linkedin: "-", note: "Günlük 191 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 762.849.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 442 213 00 00", email: "info@erski.gov.tr", city: "Erzurum", contacts: [] },
    { name: "AFSKİ (Afyonkarahisar Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.afski.gov.tr", linkedin: "-", note: "Günlük 189 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 755.614.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 272 213 00 00", email: "info@afski.gov.tr", city: "Afyonkarahisar", contacts: [] },
    { name: "SİSKİ (Sivas Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.siski.gov.tr", linkedin: "-", note: "Günlük 165 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 658.928.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 346 221 00 00", email: "info@siski.gov.tr", city: "Sivas", contacts: [] },
    { name: "BATSKİ (Batman Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.batski.gov.tr", linkedin: "-", note: "Günlük 161 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 641.981.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 488 213 00 00", email: "info@batski.gov.tr", city: "Batman", contacts: [] },
    { name: "ADSKİ (Adıyaman Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.adski.gov.tr", linkedin: "-", note: "Günlük 158 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 633.074.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 416 214 00 00", email: "info@adski.gov.tr", city: "Adıyaman", contacts: [] },
    { name: "KÜSKİ (Kütahya Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.kuski.gov.tr", linkedin: "-", note: "Günlük 151 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 605.017.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 274 216 00 00", email: "info@kuski.gov.tr", city: "Kütahya", contacts: [] },
    { name: "ELSKİ (Elazığ Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.elski.gov.tr", linkedin: "-", note: "Günlük 151 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 601.955.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 424 212 00 00", email: "info@elski.gov.tr", city: "Elazığ", contacts: [] },
    { name: "ZSKİ (Zonguldak Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.zski.gov.tr", linkedin: "-", note: "Günlük 148 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 591.162. Kömür havzası kenti, enerji ve çevre yatırımlarına açık.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 372 252 00 00", email: "info@zski.gov.tr", city: "Zonguldak", contacts: [] },
    { name: "ŞIRSKİ (Şırnak Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.sirski.gov.tr", linkedin: "-", note: "Günlük 146 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 581.995.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 486 216 00 00", email: "info@sirski.gov.tr", city: "Şırnak", contacts: [] },
    { name: "OSSKİ (Osmaniye Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.osski.gov.tr", linkedin: "-", note: "Günlük 144 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 576.011.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 328 814 00 00", email: "info@osski.gov.tr", city: "Osmaniye", contacts: [] },
    { name: "ÇSKİ (Çanakkale Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.cski.gov.tr", linkedin: "-", note: "Günlük 143 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 573.074. Çanakkale Boğazı kıyısı, çevre hassasiyeti yüksek.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 286 217 00 00", email: "info@cski.gov.tr", city: "Çanakkale", contacts: [] },
    { name: "ÇORSKİ (Çorum Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.corski.gov.tr", linkedin: "-", note: "Günlük 142 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 566.564.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 364 213 00 00", email: "info@corski.gov.tr", city: "Çorum", contacts: [] },
    { name: "TSKİ (Tokat Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.toski.gov.tr", linkedin: "-", note: "Günlük 136 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 545.432.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 356 214 00 00", email: "info@toski.gov.tr", city: "Tokat", contacts: [] },
    { name: "AĞSKİ (Ağrı Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.agski.gov.tr", linkedin: "-", note: "Günlük 134 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 534.700.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 472 215 00 00", email: "info@agski.gov.tr", city: "Ağrı", contacts: [] },
    { name: "AKSKİ (Aksaray Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.akski.gov.tr", linkedin: "-", note: "Günlük 124 ton ıslak çamur üretimi. 1 adet Çift Katlı Sistem önerilmektedir. Nüfus: 495.988.", need: "Çift Katlı Çamur Kurutma Sistemi (1 adet)", phone: "+90 382 213 00 00", email: "info@akski.gov.tr", city: "Aksaray", contacts: [] },
    { name: "GİSKİ (Giresun Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.giski.gov.tr", linkedin: "-", note: "Günlük 115 ton ıslak çamur üretimi. 1 adet Ø3400 Mobil Sistem önerilmektedir. Nüfus: 461.538.", need: "Ø3400 Mobil Çamur Kurutma Sistemi (1 adet)", phone: "+90 454 212 00 00", email: "info@giski.gov.tr", city: "Giresun", contacts: [] },
    { name: "ESKİ (Edirne Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.eski.edirne.gov.tr", linkedin: "-", note: "Günlük 113 ton ıslak çamur üretimi. 1 adet Ø3400 Mobil Sistem önerilmektedir. Nüfus: 452.932. (Eskişehir ESKİ ile karıştırılmamalıdır.)", need: "Ø3400 Mobil Çamur Kurutma Sistemi (1 adet)", phone: "+90 284 213 00 00", email: "info@eski.edirne.gov.tr", city: "Edirne", contacts: [] },
    { name: "ISKİ (Isparta Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.iski.isparta.gov.tr", linkedin: "-", note: "Günlük 110 ton ıslak çamur üretimi. 1 adet Ø3400 Mobil Sistem önerilmektedir. Nüfus: 440.161.", need: "Ø3400 Mobil Çamur Kurutma Sistemi (1 adet)", phone: "+90 246 218 00 00", email: "info@iski.isparta.gov.tr", city: "Isparta", contacts: [] },
    { name: "YOSKİ (Yozgat Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.yoski.gov.tr", linkedin: "-", note: "Günlük 108 ton ıslak çamur üretimi. 1 adet Ø3400 Mobil Sistem önerilmektedir. Nüfus: 430.133.", need: "Ø3400 Mobil Çamur Kurutma Sistemi (1 adet)", phone: "+90 354 212 00 00", email: "info@yoski.gov.tr", city: "Yozgat", contacts: [] },
    { name: "DÜSKİ (Düzce Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.duski.gov.tr", linkedin: "-", note: "Günlük 104 ton ıslak çamur üretimi. 1 adet Ø3400 Mobil Sistem önerilmektedir. Nüfus: 416.128.", need: "Ø3400 Mobil Çamur Kurutma Sistemi (1 adet)", phone: "+90 380 524 00 00", email: "info@duski.gov.tr", city: "Düzce", contacts: [] },
    { name: "MUŞSKİ (Muş Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.musski.gov.tr", linkedin: "-", note: "Günlük 104 ton ıslak çamur üretimi. 1 adet Ø3400 Mobil Sistem önerilmektedir. Nüfus: 416.003.", need: "Ø3400 Mobil Çamur Kurutma Sistemi (1 adet)", phone: "+90 436 212 00 00", email: "info@musski.gov.tr", city: "Muş", contacts: [] },
    { name: "KSKİ (Kırklareli Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.kski.gov.tr", linkedin: "-", note: "Günlük 100 ton ıslak çamur üretimi. 1 adet Ø3400 Mobil Sistem önerilmektedir. Nüfus: 401.716.", need: "Ø3400 Mobil Çamur Kurutma Sistemi (1 adet)", phone: "+90 288 214 00 00", email: "info@kski.gov.tr", city: "Kırklareli", contacts: [] },
    { name: "USKİ (Uşak Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.uski.gov.tr", linkedin: "-", note: "Günlük 98 ton ıslak çamur üretimi. 1 adet Ø3400 Mobil Sistem önerilmektedir. Nüfus: 391.374.", need: "Ø3400 Mobil Çamur Kurutma Sistemi (1 adet)", phone: "+90 276 215 00 00", email: "info@uski.gov.tr", city: "Uşak", contacts: [] },
    { name: "NİSKİ (Niğde Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.niski.gov.tr", linkedin: "-", note: "Günlük 96 ton ıslak çamur üretimi. 1 adet Ø3400 Mobil Sistem önerilmektedir. Nüfus: 384.892.", need: "Ø3400 Mobil Çamur Kurutma Sistemi (1 adet)", phone: "+90 388 213 00 00", email: "info@niski.gov.tr", city: "Niğde", contacts: [] },
    { name: "RİSKİ (Rize Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.riski.gov.tr", linkedin: "-", note: "Günlük 95 ton ıslak çamur üretimi. 1 adet Ø3400 Mobil Sistem önerilmektedir. Nüfus: 380.307. Karadeniz kıyısı, çevre duyarlılığı yüksek.", need: "Ø3400 Mobil Çamur Kurutma Sistemi (1 adet)", phone: "+90 464 213 00 00", email: "info@riski.gov.tr", city: "Rize", contacts: [] },
    { name: "KASKİ (Kastamonu Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.kastamonuski.gov.tr", linkedin: "-", note: "Günlük 95 ton ıslak çamur üretimi. 1 adet Ø3400 Mobil Sistem önerilmektedir. Nüfus: 380.093.", need: "Ø3400 Mobil Çamur Kurutma Sistemi (1 adet)", phone: "+90 366 212 00 00", email: "info@kastamonuski.gov.tr", city: "Kastamonu", contacts: [] },
    { name: "BOSKİ (Bolu Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.boski.gov.tr", linkedin: "-", note: "Günlük 92 ton ıslak çamur üretimi. 1 adet Ø3400 Mobil Sistem önerilmektedir. Nüfus: 369.474.", need: "Ø3400 Mobil Çamur Kurutma Sistemi (1 adet)", phone: "+90 374 218 00 00", email: "info@boski.gov.tr", city: "Bolu", contacts: [] },
    { name: "SİSKİ (Siirt Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.siirtski.gov.tr", linkedin: "-", note: "Günlük 90 ton ıslak çamur üretimi. 1 adet Ø3400 Mobil Sistem önerilmektedir. Nüfus: 360.408.", need: "Ø3400 Mobil Çamur Kurutma Sistemi (1 adet)", phone: "+90 484 223 00 00", email: "info@siirtski.gov.tr", city: "Siirt", contacts: [] },
    { name: "BİTSKİ (Bitlis Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.bitski.gov.tr", linkedin: "-", note: "Günlük 87 ton ıslak çamur üretimi. 1 adet Ø3400 Mobil Sistem önerilmektedir. Nüfus: 348.268.", need: "Ø3400 Mobil Çamur Kurutma Sistemi (1 adet)", phone: "+90 434 226 00 00", email: "info@bitski.gov.tr", city: "Bitlis", contacts: [] },
    { name: "AMSKİ (Amasya Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.amski.gov.tr", linkedin: "-", note: "Günlük 84 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 334.381.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 358 218 00 00", email: "info@amski.gov.tr", city: "Amasya", contacts: [] },
    { name: "NESKİ (Nevşehir Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.neski.gov.tr", linkedin: "-", note: "Günlük 83 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 331.882. Kapadokya turizm bölgesi, çevre hassasiyeti yüksek.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 384 213 00 00", email: "info@neski.gov.tr", city: "Nevşehir", contacts: [] },
    { name: "YSKİ (Yalova Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.yski.gov.tr", linkedin: "-", note: "Günlük 79 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 314.481. Marmara kıyısı, çevre koruma öncelikli.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 226 811 00 00", email: "info@yski.gov.tr", city: "Yalova", contacts: [] },
    { name: "KARSKİ (Kars Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.karski.gov.tr", linkedin: "-", note: "Günlük 77 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 307.897.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 474 212 00 00", email: "info@karski.gov.tr", city: "Kars", contacts: [] },
    { name: "BİSKİ (Bingöl Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.binski.gov.tr", linkedin: "-", note: "Günlük 75 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 300.268.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 426 213 00 00", email: "info@binski.gov.tr", city: "Bingöl", contacts: [] },
    { name: "BURSKİ (Burdur Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.burski.gov.tr", linkedin: "-", note: "Günlük 71 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 285.617.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 248 233 00 00", email: "info@burski.gov.tr", city: "Burdur", contacts: [] },
    { name: "KIRSKİ (Kırıkkale Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.kirski.gov.tr", linkedin: "-", note: "Günlük 70 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 279.430.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 318 224 00 00", email: "info@kirski.gov.tr", city: "Kırıkkale", contacts: [] },
    { name: "KARSKİ (Karaman Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.karamaski.gov.tr", linkedin: "-", note: "Günlük 67 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 266.116.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 338 212 00 00", email: "info@karamaski.gov.tr", city: "Karaman", contacts: [] },
    { name: "HAKSKİ (Hakkari Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.hakski.gov.tr", linkedin: "-", note: "Günlük 65 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 260.478.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 438 211 00 00", email: "info@hakski.gov.tr", city: "Hakkari", contacts: [] },
    { name: "KARSKİ (Karabük Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.karabukski.gov.tr", linkedin: "-", note: "Günlük 65 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 259.752. Demir-çelik kenti, endüstriyel atıksu yükü yüksek.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 370 412 00 00", email: "info@karabukski.gov.tr", city: "Karabük", contacts: [] },
    { name: "KIRSKİ (Kırşehir Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.kirsehirski.gov.tr", linkedin: "-", note: "Günlük 63 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 253.773.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 386 213 00 00", email: "info@kirsehirski.gov.tr", city: "Kırşehir", contacts: [] },
    { name: "ERZSKİ (Erzincan Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.erzski.gov.tr", linkedin: "-", note: "Günlük 61 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 243.561.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 446 214 00 00", email: "info@erzski.gov.tr", city: "Erzincan", contacts: [] },
    { name: "BİLSKİ (Bilecik Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.bilski.gov.tr", linkedin: "-", note: "Günlük 57 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 227.649.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 228 212 00 00", email: "info@bilski.gov.tr", city: "Bilecik", contacts: [] },
    { name: "BASKİ (Bartın Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.bartinski.gov.tr", linkedin: "-", note: "Günlük 55 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 218.459.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 378 227 00 00", email: "info@bartinski.gov.tr", city: "Bartın", contacts: [] },
    { name: "SİSKİ (Sinop Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.sinopski.gov.tr", linkedin: "-", note: "Günlük 53 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 212.453. Karadeniz kıyısı, çevre duyarlılığı yüksek.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 368 261 00 00", email: "info@sinopski.gov.tr", city: "Sinop", contacts: [] },
    { name: "IĞSKİ (Iğdır Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.igski.gov.tr", linkedin: "-", note: "Günlük 52 ton ıslak çamur üretimi. 1 adet Ø3400 Reaktör Sistemi önerilmektedir. Nüfus: 208.021.", need: "Ø3400 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 476 227 00 00", email: "info@igski.gov.tr", city: "Iğdır", contacts: [] },
    { name: "ÇANSKİ (Çankırı Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.canski.gov.tr", linkedin: "-", note: "Günlük 46 ton ıslak çamur üretimi. 1 adet Ø2600 Reaktör Sistemi önerilmektedir. Nüfus: 185.617.", need: "Ø2600 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 376 213 00 00", email: "info@canski.gov.tr", city: "Çankırı", contacts: [] },
    { name: "ARSKİ (Artvin Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.artviński.gov.tr", linkedin: "-", note: "Günlük 45 ton ıslak çamur üretimi. 1 adet Ø2600 Reaktör Sistemi önerilmektedir. Nüfus: 179.628.", need: "Ø2600 Reaktör Çamur Kurutma Sistemi (1 adet)", phone: "+90 466 212 00 00", email: "info@artviński.gov.tr", city: "Artvin", contacts: [] },
    { name: "GÜSKİ (Gümüşhane Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.guski.gov.tr", linkedin: "-", note: "Günlük 43 ton ıslak çamur üretimi. 4 adet Ø1500 Reaktör Sistemi önerilmektedir. Nüfus: 171.753.", need: "Ø1500 Reaktör Çamur Kurutma Sistemi (4 adet)", phone: "+90 456 213 00 00", email: "info@guski.gov.tr", city: "Gümüşhane", contacts: [] },
    { name: "NİSKİ (Gaziantep-Nizip Su İdaresi)", sector: "Su/Atık Su", website: "www.nizip.bel.tr", linkedin: "-", note: "Günlük 41 ton ıslak çamur üretimi. 4 adet Ø1500 Reaktör Sistemi önerilmektedir. Nüfus: 165.000.", need: "Ø1500 Reaktör Çamur Kurutma Sistemi (4 adet)", phone: "+90 342 511 00 00", email: "info@nizip.bel.tr", city: "Gaziantep (Nizip)", contacts: [] },
    { name: "KİSKİ (Kilis Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.kiliski.gov.tr", linkedin: "-", note: "Günlük 34 ton ıslak çamur üretimi. 3 adet Ø1500 Reaktör Sistemi önerilmektedir. Nüfus: 135.000.", need: "Ø1500 Reaktör Çamur Kurutma Sistemi (3 adet)", phone: "+90 348 813 00 00", email: "info@kiliski.gov.tr", city: "Kilis", contacts: [] },
    { name: "ARDSKİ (Ardahan Su ve Kanalizasyon İdaresi)", sector: "Su/Atık Su", website: "www.ardahanski.gov.tr", linkedin: "-", note: "Günlük 23 ton ıslak çamur üretimi. 2 adet Ø1500 Reaktör Sistemi önerilmektedir. Nüfus: 93.371.", need: "Ø1500 Reaktör Çamur Kurutma Sistemi (2 adet)", phone: "+90 478 211 00 00", email: "info@ardahanski.gov.tr", city: "Ardahan", contacts: [] },
  ],
  "Kurutma & Bertaraf Teknolojileri": [
    { name: "Ekotek Çevre Teknolojileri", sector: "Çevre/Kurutma", website: "www.ekotek.com.tr", linkedin: "linkedin.com/company/ekotek", note: "Türkiye'de endüstriyel kurutma ve çamur yönetim çözümleri. Entegre termik kurutma sistemleri konusunda pazar lideri.", need: "Stinga reaktör entegrasyonu ile sıfır emisyon kurutma", phone: "+90 312 385 50 00", email: "info@ekotek.com.tr", city: "Ankara", contacts: [{ name: "Teknik Satış Müdürü", title: "Satış Direktörü", email: "satis@ekotek.com.tr", note: "Teknoloji ortaklığına açık" }] },
    { name: "Hitit Solar (Sanayi Kurutma)", sector: "Endüstriyel Kurutma", website: "www.hititkurutma.com", linkedin: "linkedin.com/company/hitit-solar", note: "Türkiye'nin güneş enerjili ve hibrid kurutma sistemleri üreticisi. Tarımsal ürün ve çamur kurutma.", need: "Emisyonsuz ısı kaynağı entegrasyonu", phone: "+90 312 395 00 00", email: "info@hititkurutma.com", city: "Ankara", contacts: [] },
    { name: "Netas (Nef Teknik Atık Servisleri)", sector: "Atık Bertaraf", website: "www.netas.com.tr", linkedin: "linkedin.com/company/netas-atik", note: "Tehlikeli ve tehlikesiz atık bertaraf lisanslı firma. Çamur ve endüstriyel atık yönetimi.", need: "Termik bertaraf kapasitesi genişletme", phone: "+90 216 576 00 00", email: "info@netas.com.tr", city: "İstanbul", contacts: [] },
    { name: "ERPET Çevre (Atık Yakma & Geri Kazanım)", sector: "Atık Yakma", website: "www.erpet.com.tr", linkedin: "linkedin.com/company/erpet", note: "Lisanslı atık yakma ve enerji geri kazanım tesisi. Emisyon limitleri nedeniyle yeni teknoloji arayışı.", need: "Emisyon sınırlarını aşmadan kapasite artırma", phone: "+90 262 742 00 00", email: "info@erpet.com.tr", city: "Kocaeli", contacts: [] },
    { name: "Setaş Çevre (Arıtma Çamuru)", sector: "Çevre Hizmetleri", website: "www.setas.com.tr", linkedin: "linkedin.com/company/setaş-çevre", note: "Arıtma çamuru nakliye ve bertaraf hizmetleri. Sanayi bölgelerindeki fabrikalar ve belediyelere hizmet.", need: "Termik kurutma ile nakliye maliyeti azaltma", phone: "+90 262 658 00 00", email: "info@setas.com.tr", city: "Kocaeli", contacts: [] },
    { name: "Protel Çevre Mühendislik", sector: "Çevre Teknolojisi", website: "www.protelcevre.com", linkedin: "linkedin.com/company/protel-cevre", note: "Çevre mühendisliği ve danışmanlık. Sanayi tesisleri için atıksu arıtma çamuru bertaraf projeleri.", need: "Arıtma çamuru bertaraf çözümü teknoloji ortaklığı", phone: "+90 312 472 10 00", email: "info@protelcevre.com", city: "Ankara", contacts: [] },
    { name: "Entegre Çevre (İzmir Atık)", sector: "Atık Yönetimi", website: "www.entegrizevre.com.tr", linkedin: "linkedin.com/company/entegre-cevre", note: "İzmir bölgesi odaklı katı ve sıvı atık yönetimi firması. Organize sanayi bölgelerine hizmet.", need: "Kurutma teknolojisi ile bertaraf kapasitesi artırma", phone: "+90 232 472 00 00", email: "info@entegrizevre.com.tr", city: "İzmir", contacts: [] },
    { name: "Doğa Çevre Danışmanlık", sector: "Çevre Danışmanlık", website: "www.dogacevre.com.tr", linkedin: "linkedin.com/company/doga-cevre", note: "ÇED raporu ve atık yönetim planı hazırlayan lider danışmanlık firması. Teknoloji seçimine etki etmektedir.", need: "Emisyonsuz teknoloji danışmanlık entegrasyonu", phone: "+90 312 473 10 00", email: "info@dogacevre.com.tr", city: "Ankara", contacts: [] },
    { name: "Biyoenerji Tarım A.Ş.", sector: "Biyoenerji/Kurutma", website: "www.biyoenerji.com.tr", linkedin: "linkedin.com/company/biyoenerji-tarim", note: "Biyokütle ve organik atık enerji dönüşümü. Çamur ve tarımsal artık kurutma+yakma sistemleri.", need: "Sıfır emisyon yanma reaktörü entegrasyonu", phone: "+90 332 323 00 00", email: "info@biyoenerji.com.tr", city: "Konya", contacts: [] },
    { name: "Suez Türkiye", sector: "Su/Çevre", website: "www.suez.com", linkedin: "linkedin.com/company/suez", note: "Global çevre ve su yönetimi devi — Türkiye operasyonu. Atıksu arıtma, çamur yönetimi ve geri kazanım.", need: "Yerel emisyonsuz bertaraf çözümü ortaklığı", phone: "+90 216 564 00 00", email: "info@suez.com.tr", city: "İstanbul", contacts: [{ name: "Türkiye Ülke Müdürü", title: "Country Manager", email: "turkey@suez.com", note: "Yerel teknoloji ortaklığı arıyor" }] },
  ],
  "Emisyon & Karbon Ayak İzi": [
    { name: "EY Türkiye (ESG & Sürdürülebilirlik)", sector: "Danışmanlık", website: "www.ey.com/tr_tr", linkedin: "linkedin.com/company/ernst-young", note: "Ernst & Young Türkiye — sera gazı envanter, doğrulama ve karbon raporlama. AB SKDM uyum süreçlerinde danışman.", need: "Stinga teknolojisiyle müşterilere karbon azaltım çözümü", phone: "+90 212 408 51 00", email: "ey.turkiye@tr.ey.com", city: "İstanbul", contacts: [{ name: "ESG Direktörü", title: "Partner / ESG Direktörü", email: "esg@tr.ey.com", note: "Endüstri müşterilerine teknoloji tavsiye ediyor" }] },
    { name: "Deloitte Türkiye (Sürdürülebilirlik)", sector: "Danışmanlık", website: "www2.deloitte.com/tr", linkedin: "linkedin.com/company/deloitte", note: "Deloitte Türkiye ESG danışmanlık — karbon muhasebesi, iklim riski değerlendirmesi ve AB SKDM uyum çalışmaları.", need: "Emisyon azaltım teknoloji entegrasyonu", phone: "+90 212 366 60 00", email: "info@deloitte.com.tr", city: "İstanbul", contacts: [] },
    { name: "Carbon Turkey (Karbon Danışmanlık)", sector: "Karbon Yönetimi", website: "www.carbonturkey.com", linkedin: "linkedin.com/company/carbon-turkey", note: "Türkiye'nin öncü karbon ayak izi hesaplama ve azaltım danışmanlık firması. ISO 14064, GHG Protocol, SKDM uyum.", need: "Stinga teknolojisini karbon azaltım portföyüne ekleme", phone: "+90 212 290 30 00", email: "info@carbonturkey.com", city: "İstanbul", contacts: [{ name: "Kurucu Ortak", title: "CEO / Kurucu", email: "ceo@carbonturkey.com", note: "Portföyüne ekleme için doğrudan temas kur" }] },
    { name: "Yeşil Nokta Çevre Danışmanlık", sector: "Çevre/Karbon", website: "www.yesilnokta.com.tr", linkedin: "linkedin.com/company/yesil-nokta", note: "KOBİ ve büyük sanayi kuruluşları için sera gazı envanteri, iklim stratejisi ve karbon nötr sertifikasyon.", need: "Emisyonsuz teknoloji çözümü müşterilere sunma", phone: "+90 312 473 00 00", email: "info@yesilnokta.com.tr", city: "Ankara", contacts: [] },
    { name: "TÜSİAD (Sürdürülebilir Kalkınma)", sector: "İş Dünyası Birliği", website: "www.tusiad.org", linkedin: "linkedin.com/company/tusiad", note: "Türk Sanayicileri ve İş İnsanları Derneği. Üye firmalar için sürdürülebilirlik raporlaması ve yeşil dönüşüm platformu.", need: "Üye firmalara emisyon teknoloji çözümleri", phone: "+90 212 249 19 29", email: "tusiad@tusiad.org", city: "İstanbul", contacts: [] },
    { name: "TÜBİTAK MAM Çevre Enstitüsü", sector: "Ar-Ge/Kamu", website: "www.mam.gov.tr", linkedin: "linkedin.com/company/mam-tubitak", note: "Marmara Araştırma Merkezi — endüstriyel emisyon ölçüm, kirlilik araştırması ve çevre teknolojisi geliştirme.", need: "Emisyonsuz yanma teknolojisi doğrulama & raporlama", phone: "+90 262 677 20 00", email: "mam@tubitak.gov.tr", city: "Kocaeli", contacts: [] },
    { name: "EPDK (Enerji Piyasası Düzenleme Kurumu)", sector: "Kamu Düzenleyici", website: "www.epdk.gov.tr", linkedin: "-", note: "Türkiye enerji sektörü düzenleyicisi. Lisans başvurularında emisyon belgesi talep eder.", need: "Stinga teknoloji homologasyonu & emisyon belgesi", phone: "+90 312 201 40 00", email: "epdk@epdk.gov.tr", city: "Ankara", contacts: [] },
    { name: "Agora Enerji (Yeşil Geçiş)", sector: "Enerji Danışmanlık", website: "www.agoraenerji.com.tr", linkedin: "linkedin.com/company/agora-enerji", note: "Türkiye enerji geçişi danışmanlık ve politika araştırma kuruluşu. Endüstri için dekarbonizasyon yol haritaları.", need: "Stinga teknolojisi emisyon azaltım vaka çalışması", phone: "+90 212 274 00 00", email: "bilgi@agoraenerji.com.tr", city: "İstanbul", contacts: [] },
    { name: "WWF Türkiye (Sanayi İklim Programı)", sector: "STK/Çevre", website: "www.wwf.org.tr", linkedin: "linkedin.com/company/wwf-turkey", note: "World Wildlife Fund Türkiye — kurumsal karbon nötr programı yürütmektedir. Sanayi kuruluşlarını düşük emisyonlu teknolojilere yönlendiriyor.", need: "Emisyonsuz teknoloji proje ortaklığı & tanıtım", phone: "+90 212 528 20 30", email: "info@wwf.org.tr", city: "İstanbul", contacts: [] },
  ],
  "Termik Santral & Enerji": [
    { name: "EÜAŞ (Elektrik Üretim A.Ş.)", sector: "Enerji Üretimi", website: "www.euas.gov.tr", linkedin: "linkedin.com/company/euas", note: "Devlet termik santralleri — Türkiye'nin en büyük kamu enerji üreticisi.", need: "Linyit santrallerinde emisyon düşürme", phone: "+90 312 212 69 00", email: "info@euas.gov.tr", city: "Ankara", contacts: [{ name: "Teknik İşler Daire Başkanlığı", title: "Daire Başkanı", email: "teknik@euas.gov.tr", note: "Devlet kurumu, ihale süreci uzun" }] },
    { name: "Eren Enerji", sector: "Enerji", website: "www.erenenerji.com.tr", linkedin: "linkedin.com/company/eren-enerji", note: "Kömürlü termik santral operatörü — Zonguldak Eren Termik Santrali.", need: "Yanma verimi artırma, emisyon azaltma", phone: "+90 212 381 50 00", email: "info@erenenerji.com.tr", city: "İstanbul", contacts: [{ name: "Teknik Direktör", title: "Teknik Direktör", email: "teknik@erenenerji.com.tr", note: "Emisyon uyumu için acil çözüm arıyor" }] },
    { name: "IC İçtaş Enerji", sector: "Enerji", website: "www.icholding.com.tr", linkedin: "linkedin.com/company/ic-ictas", note: "Büyük ölçekli termik santral yatırımcısı.", need: "Emisyon azaltma teknolojisi", phone: "+90 212 352 00 00", email: "info@icholding.com.tr", city: "İstanbul", contacts: [] },
    { name: "Bereket Enerji", sector: "Enerji", website: "www.bereketenerji.com.tr", linkedin: "linkedin.com/company/bereket-enerji", note: "Termik santral işletmecisi — Afşin-Elbistan bölgesi.", need: "Çevresel uyumluluk, emisyon limitleri", phone: "+90 212 215 33 33", email: "info@bereketenerji.com.tr", city: "İstanbul", contacts: [] },
    { name: "TKİ (Türkiye Kömür İşletmeleri)", sector: "Madencilik", website: "www.tki.gov.tr", linkedin: "linkedin.com/company/tki", note: "Devlet kömür işletmesi — Türkiye linyit rezervlerinin %50'sini işletir.", need: "Kömür kurutma ve kalite artırma", phone: "+90 312 384 24 00", email: "info@tki.gov.tr", city: "Ankara", contacts: [] },
  ],
  "Çimento & Yapı Malzemesi": [
    { name: "Limak Çimento", sector: "Çimento", website: "www.limak.com.tr", linkedin: "linkedin.com/company/limak-holding", note: "Türkiye geneli 5 çimento fabrikası — yıllık 10M+ ton üretim.", need: "Alternatif yakıt, emisyon düşürme", phone: "+90 312 249 01 01", email: "info@limak.com.tr", city: "Ankara", contacts: [{ name: "Çimento Grubu CEO", title: "CEO", email: "cimento@limak.com.tr", note: "5 fabrika için toplu çözüm potansiyeli" }] },
    { name: "Oyak Çimento", sector: "Çimento", website: "www.oyakcimento.com", linkedin: "linkedin.com/company/oyak-cimento", note: "OYAK grubu — Türkiye'nin en büyük çimento üretici grubu.", need: "Karbon vergisi uyumu, AB SKDM hazırlığı", phone: "+90 312 585 55 00", email: "info@oyakcimento.com", city: "Ankara", contacts: [] },
    { name: "Akçansa", sector: "Çimento", website: "www.akcansa.com.tr", linkedin: "linkedin.com/company/akcansa", note: "Sabancı/HeidelbergCement ortaklığı — net sıfır hedefi var.", need: "Sürdürülebilir üretim, net sıfır hedefi", phone: "+90 216 571 30 00", email: "info@akcansa.com.tr", city: "İstanbul", contacts: [{ name: "Sürdürülebilirlik Direktörü", title: "Sustainability Director", email: "sustainability@akcansa.com.tr", note: "Net sıfır taahhüdü — güçlü potansiyel" }] },
    { name: "Çimsa", sector: "Çimento", website: "www.cimsa.com.tr", linkedin: "linkedin.com/company/cimsa", note: "Sabancı grubu — beyaz çimento ve özel çimentolar.", need: "Emisyon azaltma hedefleri", phone: "+90 324 234 66 50", email: "info@cimsa.com.tr", city: "Mersin", contacts: [] },
    { name: "Nuh Çimento", sector: "Çimento", website: "www.nuhcimento.com.tr", linkedin: "linkedin.com/company/nuh-cimento", note: "Kocaeli bölgesi — yıllık 5M ton üretim kapasitesi.", need: "Enerji verimliliği", phone: "+90 262 349 36 00", email: "info@nuhcimento.com.tr", city: "Kocaeli", contacts: [] },
    { name: "Bolu Çimento", sector: "Çimento", website: "www.bolucement.com", linkedin: "linkedin.com/company/bolu-cimento", note: "Bolu ve çevre illerde pazar lideri çimento üreticisi.", need: "Alternatif yakıt çözümü", phone: "+90 374 270 40 00", email: "info@bolucement.com", city: "Bolu", contacts: [] },
    { name: "Çelikler Çimento", sector: "Çimento", website: "www.celikler.com.tr", linkedin: "linkedin.com/company/celikler-holding", note: "Çelikler Holding çimento kolu — entegre üretim.", need: "Kömür kurutma, emisyon azaltma", phone: "+90 312 440 18 28", email: "info@celikler.com.tr", city: "Ankara", contacts: [] },
  ],
  "Demir-Çelik": [
    { name: "Erdemir (Ereğli Demir Çelik)", sector: "Demir-Çelik", website: "www.erdemir.com.tr", linkedin: "linkedin.com/company/erdemir", note: "Türkiye'nin en büyük yassı çelik üreticisi — OYAK grubu.", need: "Karbon ayak izi azaltma", phone: "+90 372 323 55 55", email: "info@erdemir.com.tr", city: "Zonguldak", contacts: [{ name: "Çevre ve Sürdürülebilirlik Direktörü", title: "Çevre Direktörü", email: "cevre@erdemir.com.tr", note: "AB yeşil çelik baskısı — acil çözüm" }] },
    { name: "İsdemir", sector: "Demir-Çelik", website: "www.isdemir.com.tr", linkedin: "linkedin.com/company/isdemir", note: "Erdemir grubu — İskenderun'da entegre demir-çelik tesisi.", need: "Emisyon uyum, AB yeşil dönüşüm", phone: "+90 326 758 40 40", email: "info@isdemir.com.tr", city: "Hatay", contacts: [] },
    { name: "Kardemir", sector: "Demir-Çelik", website: "www.kardemir.com", linkedin: "linkedin.com/company/kardemir", note: "Karabük Demir Çelik — Türkiye'nin ilk demir-çelik tesisi.", need: "Alternatif enerji kaynakları", phone: "+90 370 418 69 00", email: "info@kardemir.com", city: "Karabük", contacts: [] },
    { name: "Tosyalı Holding", sector: "Demir-Çelik", website: "www.tosyaliholding.com.tr", linkedin: "linkedin.com/company/tosyali-holding", note: "Büyük çelik grubu — Osmaniye ve uluslararası tesisler.", need: "Enerji maliyeti düşürme", phone: "+90 328 825 00 00", email: "info@tosyaliholding.com.tr", city: "Osmaniye", contacts: [] },
    { name: "Çolakoğlu Metalurji", sector: "Demir-Çelik", website: "www.colakoglu.com.tr", linkedin: "linkedin.com/company/colakoglu-metalurji", note: "Kocaeli'de yassı ve uzun çelik üretimi.", need: "Enerji verimliliği ve emisyon azaltma", phone: "+90 262 316 10 10", email: "info@colakoglu.com.tr", city: "Kocaeli", contacts: [] },
  ],
  "Tekstil & Kumaş": [
    { name: "Zorlu Holding (Korteks)", sector: "Tekstil", website: "www.zorlu.com.tr", linkedin: "linkedin.com/company/zorlu-holding", note: "Büyük tekstil grubu — polyester iplik üretiminde dünya lideri.", need: "Buhar kazanı verimliliği", phone: "+90 212 456 24 00", email: "info@zorlu.com.tr", city: "İstanbul", contacts: [{ name: "Enerji ve Çevre Direktörü", title: "Enerji Direktörü", email: "enerji@zorlu.com.tr", note: "Büyük buhar tüketimi — yüksek tasarruf potansiyeli" }] },
    { name: "Kipaş Holding", sector: "Tekstil", website: "www.kipas.com.tr", linkedin: "linkedin.com/company/kipas-holding", note: "Kahramanmaraş merkezli entegre tekstil grubu.", need: "Enerji maliyeti optimize", phone: "+90 344 237 00 00", email: "info@kipas.com.tr", city: "Kahramanmaraş", contacts: [] },
    { name: "Sanko Holding", sector: "Tekstil", website: "www.sanko.com.tr", linkedin: "linkedin.com/company/sanko-holding", note: "Gaziantep tekstil — iplik, dokuma, konfeksiyon.", need: "Buhar üretim kazanı", phone: "+90 342 211 15 00", email: "info@sanko.com.tr", city: "Gaziantep", contacts: [{ name: "Enerji Yöneticisi", title: "Teknik Direktör", email: "enerji@sanko.com.tr", note: "Buhar kazanı yenileme planında" }] },
    { name: "Yunsa (Yünsa Yünlü Sanayi)", sector: "Tekstil", website: "www.yunsa.com", linkedin: "linkedin.com/company/yunsa", note: "Çerkezköy merkezli yünlü kumaş üretimi — büyük buhar tüketimi.", need: "Düşük emisyonlu buhar kazanı", phone: "+90 282 726 11 00", email: "info@yunsa.com", city: "Tekirdağ", contacts: [] },
    { name: "Korteks İplik", sector: "Tekstil", website: "www.korteks.com.tr", linkedin: "linkedin.com/company/korteks", note: "Polyester iplik üretimi — enerji yoğun süreçler.", need: "Buhar ve ısı enerjisi optimizasyonu", phone: "+90 224 243 34 00", email: "info@korteks.com.tr", city: "Bursa", contacts: [] },
  ],
  "Su Arıtma & Çevre": [
    { name: "Kurita Turkey", sector: "Su Arıtma", website: "www.kurita.co.jp", linkedin: "linkedin.com/company/kurita-water", note: "Japon su arıtma devi — endüstriyel su çözümleri.", need: "Aktif karbon tedarik", phone: "+90 216 573 83 00", email: "info@kurita.com.tr", city: "İstanbul", contacts: [{ name: "Türkiye Genel Müdürü", title: "Country Manager", email: "turkey@kurita.com", note: "Aktif karbon tedarik zinciri açığı var" }] },
    { name: "Suez Türkiye", sector: "Su/Çevre", website: "www.suez.com", linkedin: "linkedin.com/company/suez", note: "Global çevre ve su yönetimi şirketi.", need: "Yerel aktif karbon tedarik", phone: "+90 216 564 00 00", email: "info@suez.com.tr", city: "İstanbul", contacts: [] },
    { name: "Prominent Türkiye", sector: "Su Arıtma", website: "www.prominent.com", linkedin: "linkedin.com/company/prominent-gmbh", note: "Alman su arıtma ekipmanları üreticisi.", need: "Aktif karbon entegrasyonu", phone: "+90 216 544 00 00", email: "info@prominent.com.tr", city: "İstanbul", contacts: [] },
    { name: "Protel Çevre", sector: "Çevre Teknolojisi", website: "www.protelcevre.com", linkedin: "linkedin.com/company/protel-cevre", note: "Çevre mühendislik ve danışmanlık.", need: "Arıtma çamuru çözümü", phone: "+90 312 472 10 00", email: "info@protelcevre.com", city: "Ankara", contacts: [] },
  ],
  "Gıda & Tarım": [
    { name: "Eti Maden", sector: "Madencilik/Gıda", website: "www.etimaden.gov.tr", linkedin: "linkedin.com/company/eti-maden", note: "Maden işletmesi — bor madenleri ve endüstriyel mineraller.", need: "Kurutma teknolojisi", phone: "+90 312 294 20 00", email: "info@etimaden.gov.tr", city: "Ankara", contacts: [] },
    { name: "Tariş Üzüm", sector: "Tarım/Gıda", website: "www.tarisuzum.com.tr", linkedin: "linkedin.com/company/taris", note: "Üzüm kurutma ve işleme kooperatifi — İzmir bölgesi.", need: "Verimli kurutma sistemi", phone: "+90 232 463 09 09", email: "info@tarisuzum.com.tr", city: "İzmir", contacts: [] },
    { name: "Oltan Gıda", sector: "Gıda İşleme", website: "www.oltan.com.tr", linkedin: "linkedin.com/company/oltan-gida", note: "Türkiye'nin en büyük fındık işleme tesisi — Giresun.", need: "Kurutma fırınları modernizasyonu", phone: "+90 454 215 11 00", email: "info@oltan.com.tr", city: "Giresun", contacts: [] },
  ],
  "Tavuk Çiftlikleri & Kümes": [
    // ── TIER 1: BÜYÜK ULUSAL ENTEGRELEr ──────────────────────────
    { name: "Banvit (BRF Türkiye)", sector: "Kanatlı / Et", website: "www.banvit.com.tr", linkedin: "linkedin.com/company/banvit", note: "Türkiye'nin en büyük entegre piliç üreticilerinden — BRF (Brezilya) bünyesinde. Bandırma merkez, 1000+ sözleşmeli çiftlik, yıllık 250M+ piliç kapasitesi. Enerji maliyeti en kritik gider kalemi.", need: "Kümes ısıtma maliyeti düşürme, LPG/doğalgazdan emisyonsuz kazana geçiş", phone: "+90 266 738 19 00", email: "info@banvit.com.tr", city: "Balıkesir", contacts: [{ name: "Teknik Direktör", title: "Teknik Direktör", email: "teknik@banvit.com.tr", note: "Enerji maliyeti birinci sorun. Sözleşmeli 1000+ çiftliğe standart ısıtma sistemi sunulabilir.", priority: true }] },
    { name: "Erpiliç Entegre Tavukçuluk", sector: "Kanatlı / Et & Hindi", website: "www.erpilic.com.tr", linkedin: "linkedin.com/company/erpilic", note: "Türkiye piliç eti üretiminin ~%13-14'ünü tek başına karşılıyor. Bolu merkez, günlük 530 bin piliç kesim kapasitesi. 1450 sözleşmeli üretici, 4250 çalışan. Bolca Hindi markasını da bünyesinde barındırıyor. Kümes altlık/gübre enerji dönüşüm projesi etütte.", need: "Sözleşmeli çiftliklerde emisyonsuz kümes ısıtma, gübre enerji dönüşümü, kuru yolum için sıcak su alternatifleri", phone: "+90 374 252 00 00", email: "info@erpilic.com.tr", city: "Bolu", contacts: [{ name: "Teknik Müdürlük", title: "Genel Teknik Müdür", email: "teknik@erpilic.com.tr", note: "Kümes gübre enerjisi projesinde Stinga reaktörü tam uyumlu. Öncelikli hedef.", priority: true }, { name: "Enerji Direktörü", title: "Enerji ve Çevre Direktörü", email: "enerji@erpilic.com.tr", note: "LPG/doğalgaz bağımlılığını kırmak istiyor" }] },
    { name: "Beypiliç (Beypi A.Ş.)", sector: "Kanatlı / Et", website: "www.beypilic.com.tr", linkedin: "linkedin.com/company/beypilic", note: "1986 kuruluş, Bolu-Göynük merkez. 100+ çiftlik, yem fabrikası, kesimhane. Türkiye'nin büyük 5 entegresinden biri. Tüm kümeslerde LPG/petrol ısıtma kullanıyor.", need: "Kümes ısıtma maliyeti düşürme, verimli yakıt kullanımı, sıcak hava üretimi", phone: "+90 374 253 50 50", email: "info@beypilic.com.tr", city: "Bolu", contacts: [{ name: "Satın Alma Müdürü", title: "Teknik Satın Alma", email: "satin.alma@beypilic.com.tr", note: "Yüzlerce kümes için standart kazan alımı yapıyor" }] },
    { name: "Keskinoğlu Tavukçuluk", sector: "Kanatlı / Et & Yumurta", website: "www.keskinoglu.com.tr", linkedin: "linkedin.com/company/keskinoglu", note: "1963 kuruluş — Türkiye'nin ilk tam entegre tavukçuluk kuruluşu. Manisa Akhisar merkez. Piliç eti + sofralık yumurta + pastörize yumurta + viyol üretimi. 4 bölge müdürlüğü. İhracat odaklı.", need: "Kümeslerde verimli ısıtma, kömürden temiz enerjiye geçiş, yumurta kümesi iklim kontrolü", phone: "+90 236 414 10 00", email: "info@keskinoglu.com.tr", city: "Manisa", contacts: [{ name: "Teknik Direktörlük", title: "Üretim Direktörü", email: "teknik@keskinoglu.com.tr", note: "Akhisar'daki büyük tesislerde enerji optimizasyonu önceliği" }] },
    { name: "Şenpiliç Gıda", sector: "Kanatlı / Et", website: "www.senpilic.com.tr", linkedin: "linkedin.com/company/senpilic", note: "Sakarya merkezli entegre — yıllık 150M+ civciv kapasitesi. Geniş sözleşmeli çiftlik ağı. Büyük yem fabrikası ve soğuk zincir altyapısı.", need: "Sıcak hava üretim kazanları, enerji tasarrufu, yüzlerce kümesin standart ısıtma çözümü", phone: "+90 264 295 15 15", email: "info@senpilic.com.tr", city: "Sakarya", contacts: [{ name: "Teknik Direktör", title: "Üretim ve Teknik Direktör", email: "teknik@senpilic.com.tr", note: "Çok sayıda sözleşmeli çiftlik — toplu kazan alımı potansiyeli yüksek" }] },
    { name: "CP Standart Gıda (CP Foods Türkiye)", sector: "Kanatlı / Et", website: "www.cpturkiye.com", linkedin: "linkedin.com/company/cp-standart-gida", note: "Tayland merkezli CP Grubu'nun Türkiye operasyonu. Bolu ve Düzce tesisleri. 40-42 günlük yetiştime döngüsü, sıkı iklim kontrolü. Uluslararası standartlar nedeniyle temiz enerji çözümlerine açık.", need: "Merkezi emisyonsuz ısıtma sistemi, uluslararası çevre standartları uyumu", phone: "+90 374 252 00 00", email: "info@cpturkiye.com", city: "Bolu", contacts: [{ name: "Teknik Müdür", title: "Teknik Operasyon Müdürü", email: "teknik@cpturkiye.com", note: "Küresel CP standartları gereği düşük emisyon öncelikli" }] },
    { name: "Abalıoğlu Lezita Gıda", sector: "Kanatlı / Et", website: "www.abalioglu.com.tr", linkedin: "linkedin.com/company/abalioglu-lezita", note: "İzmir-Kemalpaşa merkez. Lezita markası ile Ege bölgesinin lider entegre kanatlı üreticisi. Abalıoğlu Holding bünyesinde yem soya ve tekstil ile birlikte faaliyet.", need: "Kümes ısıtma enerjisi optimizasyonu, enerji maliyeti", phone: "+90 232 462 77 00", email: "info@abalioglu.com.tr", city: "İzmir", contacts: [] },
    { name: "Gedik Piliç (Gedik Tavukçuluk)", sector: "Kanatlı / Et & Hindi", website: "www.gedikpilic.com", linkedin: "linkedin.com/company/gedik-pilic", note: "Çanakkale-Biga ve Uşak-Eşme tesisleri. Piliç eti + hindi eti. Bölgesel entegre üretici, sözleşmeli çiftlik ağı.", need: "Kümes ısıtma kazanları, LPG maliyeti düşürme", phone: "+90 286 415 10 10", email: "info@gedikpilic.com", city: "Çanakkale", contacts: [] },

    // ── TIER 2: ORTA BÜYÜKLÜKTE ENTEGRELEr ──────────────────────
    { name: "HasTavuk Gıda", sector: "Kanatlı / Et", website: "www.hastavuk.com.tr", linkedin: "linkedin.com/company/hastavuk", note: "1972 kuruluş Bursa merkezli entegre. Damızlık + kesimhane + ileri işleme. Güçlü ihracat geçmişi.", need: "Kümes ve işleme tesisi ısıtma, emisyon düşürme", phone: "+90 224 243 10 00", email: "info@hastavuk.com.tr", city: "Bursa", contacts: [{ name: "Teknik Müdür", title: "Üretim Teknik Müdürü", email: "teknik@hastavuk.com.tr", note: "Bursa'daki büyük tesis — yüksek ısı talebi" }] },
    { name: "Bakpiliç Entegre Tavukçuluk", sector: "Kanatlı / Et", website: "www.bakpilic.com.tr", linkedin: "linkedin.com/company/bakpilic", note: "Ankara-Macunköy merkez. BAKPİ, BAKTAV, KIRPİLİÇ, ETLİCE markaları. Orta Anadolu bölgesinin lider entegresi.", need: "Kümes ısıtma, sözleşmeli çiftlik ağı için standart kazan", phone: "+90 312 397 00 00", email: "info@bakpilic.com.tr", city: "Ankara", contacts: [] },
    { name: "Ay-Pi Tavukçuluk", sector: "Kanatlı / Et", website: "www.aypi.com.tr", linkedin: "-", note: "330.000 m² açık alan, 45.000 m² kapalı alan. 2007'den itibaren büyüyen entegre. Samsun bölgesi.", need: "Kapalı kümes ısıtma sistemleri, enerji verimliliği", phone: "+90 362 267 00 00", email: "info@aypi.com.tr", city: "Samsun", contacts: [] },
    { name: "Aytur Tavukçuluk", sector: "Kanatlı / Et", website: "www.aytur.com.tr", linkedin: "-", note: "Samsun-Bafra merkezli entegre üretici. Helal belgeli. Karadeniz bölgesinde önemli oyuncu.", need: "Kümes ısıtma sistemleri, yakıt maliyeti düşürme", phone: "+90 362 542 00 00", email: "info@aytur.com.tr", city: "Samsun", contacts: [] },
    { name: "Akyem (Beyza Piliç)", sector: "Kanatlı / Et", website: "www.beyzapilic.com.tr", linkedin: "-", note: "Adana-Seyhan merkez. Akyem Adana Yem Yağ Biyodizel bünyesinde. Güney bölgesi entegre üreticisi.", need: "Sıcak hava üretim kazanı, enerji verimliliği", phone: "+90 322 346 00 00", email: "info@beyzapilic.com.tr", city: "Adana", contacts: [] },
    { name: "Bahar Hindi (Antbahar)", sector: "Kanatlı / Hindi", website: "www.baharhindi.com.tr", linkedin: "-", note: "Antalya-Döşemealtı OSB. Antbahar Hindi markası. Akdeniz bölgesinin önemli hindi üreticisi.", need: "Hindi kümesi ısıtma, yem kurutma, enerji maliyeti", phone: "+90 242 257 00 00", email: "info@baharhindi.com.tr", city: "Antalya", contacts: [] },
    { name: "Dr. Entegre Tarım Gıda", sector: "Kanatlı / Et", website: "www.drentegre.com.tr", linkedin: "-", note: "Sakarya şubesi. DR. TAVUK PİLİÇ markası. Organik ve doğal yetiştirme odaklı entegre.", need: "Düşük emisyonlu ısıtma, organik sertifika uyumlu enerji", phone: "+90 264 276 00 00", email: "info@drentegre.com.tr", city: "Sakarya", contacts: [] },

    // ── TIER 3: YEMSELCİ & DAMIZLIK FİRMALAR ────────────────────
    { name: "Güres Group (Güres Yumurta)", sector: "Kanatlı / Yumurta", website: "www.gures.com.tr", linkedin: "linkedin.com/company/gures-group", note: "Türkiye'nin tek çatı altında toplanmış EN BÜYÜK tam entegre yumurta üretim tesisi. Yıllık 1.5 milyar adet yumurta. Yem fabrikası + enerji tesisi + kafes ekipmanı üretimi + kuluçka + yarka tesisleri. 250.000 m² kapalı alan.", need: "Yumurta kümesi ısı yönetimi, enerji maliyeti optimizasyonu, emisyonsuz ısıtma", phone: "+90 264 600 00 00", email: "info@gures.com.tr", city: "Sakarya", contacts: [{ name: "Enerji Direktörü", title: "Tesis Enerji ve Teknik Direktörü", email: "enerji@gures.com.tr", note: "Dev tesis — çok yüksek enerji talebi. Kendi enerji tesisi var, ek verimlilik aranıyor.", priority: true }] },
    { name: "Matlı Şirketler Grubu", sector: "Kanatlı / Yumurta & Et", website: "www.matli.com.tr", linkedin: "-", note: "Türkiye'nin lider yem üreticisi + en büyük yumurta üreticisi + 5 büyük süt üreticisinden biri + büyük entegre tavukçuluk tesisi. Topraktan sofraya tam entegre model. Elazığ broiler yatırımı gündemde.", need: "Yumurta kümesi + broiler kümesi ısıtması, yem kurutma entegrasyonu", phone: "+90 342 338 00 00", email: "info@matli.com.tr", city: "Gaziantep", contacts: [{ name: "Genel Müdür", title: "CEO / Genel Müdür", email: "gm@matli.com.tr", note: "Elazığ'da yeni broiler entegre tesisi planlıyor — başlangıçtan doğru kazan seçmek istiyor", priority: true }] },
    { name: "Yemsel Tavukçuluk (Köytür Piliç)", sector: "Kanatlı / Et", website: "www.yemsel.com.tr", linkedin: "-", note: "Samsun-Tekkeköy OSB. Yemsel Tavukçuluk — Köytür Piliç markası. Karadeniz bölgesi entegresi.", need: "Kümes ısıtma, yem fabrikası enerji yönetimi", phone: "+90 362 266 00 00", email: "info@yemsel.com.tr", city: "Samsun", contacts: [] },

    // ── TIER 4: YUMURTA ÜRETİCİLERİ ────────────────────────────
    { name: "CP Standart Gıda — Yumurta Bölümü", sector: "Kanatlı / Yumurta", website: "www.cpturkiye.com", linkedin: "linkedin.com/company/cp-standart-gida", note: "CP Foods Türkiye yumurta üretim kolu. Sözleşmeli yumurta çiftlikleri ağı. Kapalı sistem kümeslerde sıkı sıcaklık kontrolü.", need: "Yumurta kümesi termal konforu, enerji verimliliği", phone: "+90 374 252 00 00", email: "yumurta@cpturkiye.com", city: "Bolu", contacts: [] },
    { name: "İtimat Tavukçuluk ve Gıda", sector: "Kanatlı / Yumurta", website: "www.itimattavukculuk.com.tr", linkedin: "-", note: "1989 kuruluş. 60.000 m² kapalı alan. Yumurta ve kanatlı ürünleri ihracatı yapan köklü üretici.", need: "Yumurta kümesi ısıtma, enerji optimizasyonu", phone: "+90 312 397 00 00", email: "info@itimattavukculuk.com.tr", city: "Ankara", contacts: [] },
    { name: "Parsa Tavukçuluk (Kader Çiftliği)", sector: "Kanatlı / Yumurta", website: "www.parsatavukculuk.com.tr", linkedin: "-", note: "İzmir-Kemalpaşa bölgesi. 1960'lı yıllardan gelen aile geleneği, Kamil Dere tarafından kuruldu. Yumurta + kanatlı ihracatı.", need: "Kümes ısıtma sistemi modernizasyonu, LPG maliyeti düşürme", phone: "+90 232 877 00 00", email: "info@parsatavukculuk.com.tr", city: "İzmir", contacts: [] },

    // ── TIER 5: SEKTÖR KURULUŞLARI & STRATEJİK ORTAKLIKLAR ─────
    { name: "BESD-BİR (Beyaz Et Sanayicileri ve Damızlıkçıları Birliği)", sector: "Sektör Birliği", website: "besd-bir.org", linkedin: "linkedin.com/company/besd-bir", note: "Türkiye kanatlı eti sektörünün 30 yıllık üst çatı birliği. Tüm büyük entegre üyeler dahil. Uluslararası Kanatlı Konseyi (IPC) kurucu üyesi. 15.000+ broiler çiftliği temsil ediyor.", need: "Sektöre yönelik toplu ısıtma çözümü, enerji verimliliği standardı", phone: "+90 312 441 00 00", email: "info@besd-bir.org", city: "Ankara", contacts: [{ name: "Prof. Dr. Ahmet Ergün", title: "Genel Sekreter", email: "genel.sekreter@besd-bir.org", note: "Tüm sektöre kapı açan kişi — BESD-BİR kanalıyla tüm üyelere ulaşılabilir.", priority: true }] },
    { name: "YUMBİR (Yumurta Üreticileri Merkez Birliği)", sector: "Sektör Birliği", website: "www.yumbir.org", linkedin: "-", note: "Yumurta sektörü merkez birliği. 12 yerel birlik üyesi, 300-400 aktif yumurta üreticisi temsil ediyor. Kayseri, Konya, Afyon, İzmir gibi kritik bölgelerde üye örgütleri var.", need: "Yumurta kümesi toplu ısıtma çözümü, enerji verimliliği", phone: "+90 312 441 00 00", email: "info@yumbir.org", city: "Ankara", contacts: [] },
    { name: "Tarım Kredi Kooperatifler (Hayvancılık Kolu)", sector: "Kamu/Finans", website: "www.tarimkredi.org.tr", linkedin: "linkedin.com/company/tarim-kredi", note: "1800+ kooperatif şubesi ile Türkiye'nin en büyük tarım destekçisi. Küçük-orta ölçekli kümes sahiplerine finansman ve teknik destek sağlıyor.", need: "Kümes modernizasyonu için finansman destekli ısıtma çözümü", phone: "+90 312 425 14 00", email: "info@tarimkredi.org.tr", city: "Ankara", contacts: [] },
    { name: "Big Dutchman Türkiye", sector: "Kümes Ekipmanları", website: "www.bigdutchman.com.tr", linkedin: "linkedin.com/company/big-dutchman", note: "Alman kökenli dünya lideri kümes ekipmanları firması. Türkiye'de temsilci. Binlerce çiftliğe havalandırma, ısıtma, yem sistemi kuruyor.", need: "Stinga ısıtma kazanı ile entegre sistem paketi geliştirme ortaklığı", phone: "+90 232 472 00 00", email: "info@bigdutchman.com.tr", city: "İzmir", contacts: [{ name: "Türkiye Satış Direktörü", title: "Country Sales Director", email: "turkey@bigdutchman.com", note: "Çiftliklere anahtar teslim çözüm sunuyor — Stinga ile birlikte ısıtma paketi çok değerli" }] },
    { name: "Skov Türkiye (Kümes İklim Kontrol)", sector: "Kümes Teknolojisi", website: "www.skov.com", linkedin: "linkedin.com/company/skov", note: "Danimarkalı kümes iklim kontrol sistemleri üreticisi. Türkiye'de binden fazla kurulum. Otomatik ısı, nem ve havalandırma yönetimi.", need: "Stinga ısıtma kaynağı ile iklim kontrol sistemi entegrasyon ortaklığı", phone: "+90 232 339 00 00", email: "turkey@skov.com", city: "İzmir", contacts: [] },
  ],
  "Madencilik & Kömür": [
    { name: "TKİ (Türkiye Kömür İşletmeleri)", sector: "Kömür Madenciliği", website: "www.tki.gov.tr", linkedin: "linkedin.com/company/tki", note: "Devlet kömür işletmesi — Türkiye linyit üretiminin %50+'sı, 10+ maden sahası.", need: "Kömür kurutma, kalite artırma, nem azaltma", phone: "+90 312 384 24 00", email: "info@tki.gov.tr", city: "Ankara", contacts: [{ name: "Teknik İşler Daire Başkanlığı", title: "Teknik Direktörlük", email: "teknik@tki.gov.tr", note: "Devlet kurumu, uzun onay süreci" }] },
    { name: "TTK (Türkiye Taşkömürü Kurumu)", sector: "Taşkömürü", website: "www.taskomuru.gov.tr", linkedin: "-", note: "Zonguldak havzası taşkömürü — Türkiye'nin tek taşkömürü üreticisi.", need: "Kömür kurutma ve işleme teknolojisi", phone: "+90 372 252 23 00", email: "info@taskomuru.gov.tr", city: "Zonguldak", contacts: [] },
    { name: "Çelikler Madencilik", sector: "Kömür Madenciliği", website: "www.celikler.com.tr", linkedin: "linkedin.com/company/celikler-holding", note: "Kömür madenciliği ve enerji grubu — Afşin-Elbistan linyit sahası.", need: "Linyit kurutma, karbonlaştırma", phone: "+90 312 440 18 28", email: "info@celikler.com.tr", city: "Ankara", contacts: [] },
    { name: "Polyak Eynez", sector: "Kömür Madenciliği", website: "www.polyak.com.tr", linkedin: "linkedin.com/company/polyak-eynez", note: "Manisa-Soma linyit madeni — yeraltı kömür işletmesi.", need: "Kömür kurutma sistemi", phone: "+90 236 612 80 00", email: "info@polyak.com.tr", city: "Manisa", contacts: [] },
    { name: "Park Termik", sector: "Kömür/Enerji", website: "www.parktermik.com.tr", linkedin: "linkedin.com/company/park-termik", note: "Bolu-Göynük linyit madeni ve termik santral.", need: "Düşük kalorili kömür kurutma", phone: "+90 374 471 22 00", email: "info@parktermik.com.tr", city: "Bolu", contacts: [] },
  ],
  "Kağıt & Selüloz": [
    { name: "Hayat Holding (Hayat Kimya)", sector: "Kağıt/Hijyen", website: "www.hayat.com.tr", linkedin: "linkedin.com/company/hayat-holding", note: "Kağıt ve hijyen ürünleri — Papia, Familia, Bingo markaları. Kocaeli fabrikaları.", need: "Buhar kazanı verimliliği", phone: "+90 262 315 73 00", email: "info@hayat.com.tr", city: "Kocaeli", contacts: [{ name: "Enerji ve Teknik Direktör", title: "Teknik Direktör", email: "teknik@hayat.com.tr", note: "Yüksek buhar tüketimi — büyük tasarruf potansiyeli" }] },
    { name: "Mondi Tire Kutsan", sector: "Kağıt/Ambalaj", website: "www.mondigroup.com", linkedin: "linkedin.com/company/mondi-group", note: "Avusturya merkezli ambalaj kağıdı üreticisi — Tire/İzmir fabrikası.", need: "Enerji maliyeti azaltma", phone: "+90 232 512 10 10", email: "info@mondi.com.tr", city: "İzmir", contacts: [] },
    { name: "Olmuksan IP", sector: "Ambalaj", website: "www.olmuksan.com.tr", linkedin: "linkedin.com/company/olmuksan-ip", note: "Oluklu mukavva üretimi — International Paper grubu.", need: "Buhar üretim sistemi", phone: "+90 262 349 45 00", email: "info@olmuksan.com.tr", city: "Kocaeli", contacts: [] },
    { name: "Modern Karton", sector: "Kağıt/Karton", website: "www.modernkarton.com.tr", linkedin: "linkedin.com/company/modern-karton", note: "Kaplı karton üretimi — Sakarya fabrikası.", need: "Buhar ve enerji verimliliği", phone: "+90 264 276 50 00", email: "info@modernkarton.com.tr", city: "Sakarya", contacts: [] },
  ],
};

// ─── EXCEL EXPORT (gerçek .xlsx — SheetJS) ──────────────────
const exportToExcel = async (companies, leadStatuses, noteEntries) => {
  // SheetJS CDN'den yükle
  if (!window.XLSX) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const XLSX = window.XLSX;

  const header = ["#", "Firma Adı", "Sektör", "Şehir", "Telefon", "E-Posta", "Website", "LinkedIn", "Stinga İhtiyacı", "Firma Notu", "Lead Durumu", "Notlar"];
  const rows = companies.map((c, i) => [
    i + 1,
    c.name,
    c.sectorLabel || c.sector,
    c.city || "",
    c.phone || "",
    c.email || "",
    c.website || "",
    c.linkedin || "",
    c.need,
    c.note,
    LEAD_STATUSES[leadStatuses[c.name] || "new"]?.label || "Yeni",
    (noteEntries[c.name] || []).map(n => n.text).join(" | "),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  // Sütun genişlikleri
  ws["!cols"] = [
    { wch: 4 },   // #
    { wch: 40 },  // Firma
    { wch: 28 },  // Sektör
    { wch: 14 },  // Şehir
    { wch: 18 },  // Telefon
    { wch: 28 },  // E-Posta
    { wch: 24 },  // Website
    { wch: 32 },  // LinkedIn
    { wch: 36 },  // İhtiyaç
    { wch: 50 },  // Not
    { wch: 18 },  // Durum
    { wch: 40 },  // Notlar
  ];

  // Header satırı stil (sadece SheetJS Pro destekler ama range tanımı çalışır)
  ws["!freeze"] = { xSplit: 0, ySplit: 1 }; // üst satırı dondur

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stinga Leads");

  // Özet sayfası ekle
  const summaryData = [
    ["Stinga Enerji A.Ş. — Lead Raporu"],
    ["Oluşturma Tarihi", new Date().toLocaleDateString("tr-TR")],
    ["Toplam Firma", companies.length],
    [],
    ["Durum", "Firma Sayısı"],
    ...Object.entries(LEAD_STATUSES).map(([k, v]) => [
      v.label,
      companies.filter(c => (leadStatuses[c.name] || "new") === k).length
    ]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 24 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Özet");

  XLSX.writeFile(wb, `stinga-leads-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// ─── PDF EXPORT ──────────────────────────────────────────────
const exportToPDF = (companies, leadStatuses) => {
  const date = new Date().toLocaleDateString("tr-TR");
  const rows = companies.map((c, i) => `
    <tr style="background:${i%2===0?"#f9fafb":"#fff"}">
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:11px;font-weight:600">${c.name}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px">${c.sectorLabel||c.sector}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px">${c.city||"-"}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px">${c.phone||"-"}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px">${c.email||"-"}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px;color:#059669">${c.need}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px">${LEAD_STATUSES[leadStatuses[c.name]||"new"]?.label||"Yeni"}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Stinga Lead Raporu</title>
  <style>body{font-family:Arial,sans-serif;margin:20px;color:#1e293b}
  h1{color:#059669;font-size:20px;margin-bottom:4px}
  .meta{font-size:11px;color:#64748b;margin-bottom:16px}
  table{width:100%;border-collapse:collapse}
  th{background:#0f172a;color:#10b981;padding:8px;font-size:11px;text-align:left;border:1px solid #1e293b}
  </style></head><body>
  <h1>🎯 Stinga Enerji — Lead Raporu</h1>
  <div class="meta">Oluşturma tarihi: ${date} · Toplam: ${companies.length} firma</div>
  <table><thead><tr>
    <th>Firma</th><th>Sektör</th><th>Şehir</th><th>Telefon</th><th>E-Posta</th><th>Stinga İhtiyacı</th><th>Durum</th>
  </tr></thead><tbody>${rows}</tbody></table>
  </body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  setTimeout(() => { if(w) { w.print(); URL.revokeObjectURL(url); } }, 800);
};

// ─── MAİL ŞABLONU ────────────────────────────────────────────
const generateMailTemplate = (company) => `Konu: Stinga Enerji — ${company.need} için Emisyonsuz Çözüm Önerimiz

Sayın ${company.contacts?.[0]?.title || "Yetkili"},

${company.name} olarak faaliyet gösterdiğiniz ${company.sector} sektöründe karşılaştığınız ${company.need.toLowerCase()} konusunda size özel bir çözüm sunmak istiyoruz.

Stinga Enerji A.Ş. olarak 18 yıllık AR-GE sürecimizin ürünü olan 4D Reaktör teknolojimizle:

✅ %97 yanma verimi ile enerji maliyetlerinizi düşürüyoruz
✅ CO: 12 ppm (yasal sınırın 20 katı altında) ile sıfır emisyon sağlıyoruz  
✅ 134 ülkede tescilli patentimizle dünya standartlarında hizmet veriyoruz
✅ TÜBİTAK ve ENKA Laboratuvarı onaylı bağımsız test raporlarımız mevcuttur

${company.name} bünyenizde ${company.need} konusunda sunabileceğimiz çözümler:
${company.note}

AB SKDM (Sınırda Karbon Düzenleme Mekanizması) kapsamında 2026 itibarıyla karbon vergisi yükümlülüğü başlamadan önce emisyon değerlerinizi düşürmeniz kritik önem taşımaktadır. Stinga teknolojisi bu süreçte size doğrulanabilir karbon azaltımı ve maliyet tasarrufu sağlayacaktır.

Sizi bilgilendirmek ve teknik detayları yerinde paylaşmak adına tesislerinizi ziyaret etmek istiyoruz. Size uygun bir tarih ve saat belirleyebilir miyiz?

Saygılarımla,
Stinga Enerji A.Ş. — Satış & İş Geliştirme
📞 +90 212 872 23 57
✉️ info@stinga.biz
🌐 www.stingaenerji.com`;


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
  const [mailModal, setMailModal]             = useState(null); // {company, text}

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

  // Gemini çağrısı — Railway /api/gemini proxy üzerinden
  const gemini = useCallback(async (prompt, system = "") => {
    return await callGemini(prompt, system);
  }, []);

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
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes scanLine{0%{top:-10%}100%{top:110%}}
        @keyframes countUp{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
        @keyframes slideRight{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes typewriter{from{width:0}to{width:100%}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes particleFloat{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(-60px) rotate(360deg);opacity:0}}
        .fade-up{animation:fadeUp 0.4s ease-out both}
        .pulse-anim{animation:pulse 1.5s ease-in-out infinite}
        .float-anim{animation:floatY 3s ease-in-out infinite}
        .count-up{animation:countUp 0.5s ease-out both}
        .slide-right{animation:slideRight 0.4s ease-out both}
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
        .hero-shimmer{background:linear-gradient(90deg,transparent,rgba(16,185,129,0.08),transparent);background-size:200% 100%;animation:shimmer 2.5s infinite}
        .stat-card{transition:all 0.2s;cursor:default}
        .stat-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,0.07)}
      `}</style>

      {/* ── BANNER ── */}
      <div className="banner-active" style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e3a2f 50%,#0f172a 100%)", borderBottom: "1px solid rgba(16,185,129,0.3)", padding: "10px 20px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(16,185,129,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.03) 1px,transparent 1px)", backgroundSize: "20px 20px", pointerEvents: "none" }} />
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 16, position: "relative", zIndex: 1 }}>

          {/* SOL */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AjanIcon size={42} />
            <div className="blink" style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px 3px rgba(16,185,129,0.5)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>STINGA AJAN</span>
            <span style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 5, padding: "2px 7px", fontSize: 10, color: "#10b981", fontWeight: 700 }}>v4.2</span>
            {apiStatus === "loading" && <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>◉ AI</span>}
            {apiStatus === "ok"      && <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>✓ OK</span>}
            {apiStatus === "error"   && <span title={apiError} style={{ fontSize: 11, color: "#f87171", fontWeight: 700, cursor: "help" }}>✕ ERR</span>}
          </div>

          {/* ORTA — metrikler eşit dağılımlı */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            {BANNER_METRICS.map((m, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.08)" : "none", padding: "0 14px" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace", marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* SAĞ */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "rgba(16,185,129,0.6)", fontFamily: "'JetBrains Mono',monospace" }}>{dots}</span>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 16 }}>
              {[5, 9, 12, 16].map((h, i) => (
                <div key={i} className={i < 3 ? "blink" : ""} style={{ width: 4, height: h, background: i < 3 ? "#10b981" : "rgba(16,185,129,0.2)", borderRadius: 2, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono',monospace" }}>{clock.toLocaleTimeString("tr-TR")}</span>
          </div>
        </div>
      </div>

      {/* ── HEADER ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "9px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StingaLogo size={52} />
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Stinga Lead Agent</h1>
            <p style={{ fontSize: 10, color: "#64748b" }}>AI-Powered B2B Platform — Stinga Yapay Zeka</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
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
          { id: "export",    label: "📤 Dışa Aktar" },
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

            {/* ── HERO ── */}
            <div style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e3a2f 60%,#0f172a 100%)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 18, padding: "28px 28px 24px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
              {/* Arka plan grid */}
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(16,185,129,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.04) 1px,transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
              {/* Shimmer */}
              <div className="hero-shimmer" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
              {/* Matrix / Kod yağmuru karakterleri */}
              {["01","AI","B2","CO","TR","Σ","λ","∞","░","▒","10","11","∂","π"].map((char, i) => (
                <div key={i} style={{
                  position: "absolute",
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 10 + (i % 3) * 2,
                  color: i % 3 === 0 ? "rgba(16,185,129,0.5)" : i % 3 === 1 ? "rgba(96,165,250,0.35)" : "rgba(167,139,250,0.3)",
                  left: `${(i * 7.1) % 95}%`,
                  top: `${(i * 13) % 80}%`,
                  animation: `particleFloat ${3 + (i % 4) * 0.8}s ease-in-out infinite`,
                  animationDelay: `${i * 0.35}s`,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  pointerEvents: "none",
                }}>{char}</div>
              ))}
              {/* Yatay tarama çizgileri */}
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{
                  position: "absolute", left: 0, right: 0, height: 1,
                  background: "linear-gradient(90deg,transparent,rgba(16,185,129,0.15),transparent)",
                  animation: `scanLine ${3 + i * 1.2}s linear infinite`,
                  animationDelay: `${i * 1.1}s`,
                  pointerEvents: "none",
                }} />
              ))}
              <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div className="slide-right" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 10, color: "#10b981", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.1em" }}>
                      ◉ AJAN AKTİF — {clock.toLocaleTimeString("tr-TR")}
                    </div>
                  </div>
                  <h2 className="slide-right" style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, lineHeight: 1.3, animationDelay: "0.05s" }}>
                    Merhaba, ben <span style={{ color: "#10b981" }}>Stinga Yapay Zeka</span> 👋
                  </h2>
                  <p className="slide-right" style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, maxWidth: 520, animationDelay: "0.1s" }}>
                    Stinga Enerji'nin B2B satış ajanıyım. Emisyonsuz yanma, kömür kurutma ve arıtma çamuru bertarafı teknolojileriniz için <strong style={{ color: "#34d399" }}>{totalLeads} potansiyel müşteri</strong> ve <strong style={{ color: "#60a5fa" }}>{sectorKeys.length} hedef sektörü</strong> sizin için analiz ediyorum.
                  </p>
                  {lastScanTime && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 8, fontFamily: "'JetBrains Mono',monospace" }}>Son tarama: {lastScanTime}</p>}
                  <div className="slide-right" style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", animationDelay: "0.15s" }}>
                    <button className="action-btn" onClick={() => { setAutoScanActive(true); setAutoScanSector(0); setScanProgress(0); addLog("🚀 Otomatik tarama başlatıldı..."); }} disabled={autoScanActive}
                      style={{ background: autoScanActive ? "rgba(148,163,184,0.2)" : "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: autoScanActive ? "1px solid rgba(255,255,255,0.15)" : "none", borderRadius: 10, padding: "10px 20px", fontSize: 12, fontWeight: 700, opacity: autoScanActive ? 0.7 : 1 }}>
                      {autoScanActive ? `⏳ Taranıyor... %${scanProgress}` : "🚀 Tüm Sektörleri Tara"}
                    </button>
                    <button className="action-btn" onClick={() => setActiveTab("chat")}
                      style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 10, padding: "10px 20px", fontSize: 12, fontWeight: 700 }}>
                      💬 Soru Sor
                    </button>
                    <button className="action-btn" onClick={() => setActiveTab("leads")}
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 20px", fontSize: 12, fontWeight: 700 }}>
                      📋 Lead Listesi
                    </button>
                  </div>
                </div>
                {/* Sağ — canlı metrikler */}
                <div className="float-anim" style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                  {[
                    { label: "Aktif Lead", value: totalLeads, color: "#34d399", icon: "🎯" },
                    { label: "Hedef Sektör", value: sectorKeys.length, color: "#60a5fa", icon: "📊" },
                    { label: "Analiz Tamam", value: `${completedSects}/${sectorKeys.length}`, color: "#a78bfa", icon: "✅" },
                    { label: "Toplam Not", value: stats.totalNotes, color: "#f472b6", icon: "📓" },
                  ].map((m, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 14 }}>{m.icon}</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{m.label}</span>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 800, color: m.color, fontFamily: "'JetBrains Mono',monospace" }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {autoScanActive && (
                <div style={{ position: "relative", zIndex: 1, marginTop: 16, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${scanProgress}%`, background: "linear-gradient(90deg,#10b981,#34d399)", borderRadius: 2, transition: "width 0.5s", boxShadow: "0 0 8px rgba(16,185,129,0.6)" }} />
                </div>
              )}
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
                <div key={i} className="stat-card count-up" style={{ background: s.bg, border: "1px solid #e2e8f0", borderRadius: 11, padding: "12px 14px", textAlign: "center", animationDelay: `${i * 0.06}s` }}>
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
                <div style={{ padding: "20px 10px" }}>
                  {/* Logo + karşılama */}
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div className="float-anim" style={{ display: "inline-block", marginBottom: 10 }}>
                      <StingaLogo size={56} />
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Stinga Yapay Zeka</h3>
                    <p style={{ fontSize: 12, color: "#64748b" }}>B2B Satış & Lead Asistanı — Size nasıl yardımcı olabilirim?</p>
                  </div>
                  {/* Hazır sorular grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { q: "Hangi sektör en acil ve öncelikli?", icon: "🎯" },
                      { q: "İSKİ ile nasıl iletişim kuralım?", icon: "📞" },
                      { q: "Çimento sektörü satış stratejisi nedir?", icon: "🏗️" },
                      { q: "AB SKDM'ye uyum için hangi firmalar hedeflenmeli?", icon: "🌿" },
                      { q: "Tavuk çiftliklerine nasıl yaklaşalım?", icon: "🐔" },
                      { q: "Kömür sektöründeki en büyük fırsatlar neler?", icon: "⛏️" },
                      { q: "Stinga'nın en güçlü rekabet avantajları neler?", icon: "💪" },
                      { q: "İlk soğuk e-posta taslağı yazar mısın?", icon: "✉️" },
                      { q: "Belediyelerle ihale sürecinde ne yapmalıyız?", icon: "🏛️" },
                      { q: "Demir-çelik sektörüne teknik sunum hazırla", icon: "🔩" },
                      { q: "Hangi firma en hızlı kazanılabilir lead?", icon: "🏆" },
                      { q: "Tekstil firmaları için fiyat stratejisi öner", icon: "🧵" },
                    ].map(({ q, icon }) => (
                      <button key={q} onClick={() => { setChatInput(q); }} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#374151", borderRadius: 10, padding: "10px 12px", fontSize: 11, cursor: "pointer", fontWeight: 500, textAlign: "left", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.background = "#f0fdf4"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                        <span>{q}</span>
                      </button>
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
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
                placeholder="Stinga Yapay Zeka'ya sorun... (Enter gönderir, Shift+Enter yeni satır)"
                rows={2}
                style={{ flex: 1, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 13, resize: "none", fontFamily: "inherit", lineHeight: 1.5 }}
              />
              <button className="action-btn" onClick={handleChat} disabled={isChatLoading || !chatInput.trim()} style={{ background: isChatLoading ? "#94a3b8" : "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 700, opacity: (isChatLoading || !chatInput.trim()) ? 0.6 : 1, whiteSpace: "nowrap", height: 48 }}>
                {isChatLoading ? "⏳" : "Gönder ↑"}
              </button>
            </div>
          </div>
        )}

        {/* DIŞA AKTAR */}
        {activeTab === "export" && (
          <div className="fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>📤 Dışa Aktar</h2>
                <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Tüm lead listesini Excel/PDF olarak indirin, firma bazlı satış maili oluşturun.</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="action-btn" onClick={() => exportToExcel(Object.entries(KNOWN_COMPANIES).flatMap(([sec,cs])=>cs.map(c=>({...c,sectorLabel:sec}))), leadStatuses, noteEntries)}
                  style={{ background: "linear-gradient(135deg,#059669,#047857)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 12, fontWeight: 700 }}>
                  📊 Excel İndir (.xlsx)
                </button>
                <button className="action-btn" onClick={() => exportToPDF(Object.entries(KNOWN_COMPANIES).flatMap(([sec,cs])=>cs.map(c=>({...c,sectorLabel:sec}))), leadStatuses)}
                  style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 12, fontWeight: 700 }}>
                  📄 PDF İndir
                </button>
              </div>
            </div>

            {/* Sektör bazlı firma listesi + mail butonu */}
            {Object.entries(KNOWN_COMPANIES).map(([sector, companies]) => (
              <div key={sector} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>{SECTOR_QUERIES[sector]?.icon}</span>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{sector}</h3>
                  <span style={{ fontSize: 10, color: "#64748b", background: "#f1f5f9", padding: "2px 7px", borderRadius: 10 }}>{companies.length} firma</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 10 }}>
                  {companies.map((company, i) => (
                    <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, transition: "all 0.18s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#10b981"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{company.name}</div>
                          <div style={{ fontSize: 10, color: "#64748b" }}>{company.city || "-"} · {company.sector}</div>
                        </div>
                        <span style={{ fontSize: 9, background: LEAD_STATUSES[leadStatuses[company.name]||"new"].bg, color: LEAD_STATUSES[leadStatuses[company.name]||"new"].color, padding: "2px 7px", borderRadius: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                          {LEAD_STATUSES[leadStatuses[company.name]||"new"].label}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#059669", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 6, padding: "4px 8px", marginBottom: 10 }}>
                        {company.need}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="action-btn" onClick={() => setMailModal({ company, text: generateMailTemplate({...company, sectorLabel: sector}) })}
                          style={{ flex: 1, background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          ✉️ Satış Maili Oluştur
                        </button>
                        <button className="action-btn" onClick={() => setSelectedCompany({...company, sectorLabel: sector})}
                          style={{ background: "#f0f9ff", border: "1px solid #bfdbfe", color: "#2563eb", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          Detay
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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

            {/* Mail Şablonu Butonu */}
            <div style={{ marginBottom: 14 }}>
              <button className="action-btn" onClick={() => setMailModal({ company: selectedCompany, text: generateMailTemplate(selectedCompany) })}
                style={{ width: "100%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                ✉️ Firmaya Özel Satış Maili Oluştur
              </button>
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

      {/* ── MAİL MODAL ── */}
      {mailModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMailModal(null)}>
          <div className="modal-card" style={{ maxWidth: 720 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>✉️ Satış Maili Şablonu</h2>
                <p style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{mailModal.company.name} — Düzenleyip kopyalayabilirsiniz</p>
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <button onClick={() => { navigator.clipboard.writeText(mailModal.text); addLog(`📋 "${mailModal.company.name}" mail kopyalandı`); }}
                  style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  📋 Kopyala
                </button>
                <a href={`mailto:${mailModal.company.email || ""}?subject=${encodeURIComponent("Stinga Enerji — " + mailModal.company.need + " için Çözüm Önerimiz")}&body=${encodeURIComponent(mailModal.text)}`}
                  style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                  📨 Mail Aç
                </a>
                <button onClick={() => setMailModal(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
              </div>
            </div>
            {/* Firma bilgi bandı */}
            <div style={{ background: "linear-gradient(135deg,#f0fdf4,#f0f9ff)", border: "1px solid #d1fae5", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11 }}>
              <span>🏢 <strong>{mailModal.company.name}</strong></span>
              {mailModal.company.email && <span>✉️ {mailModal.company.email}</span>}
              {mailModal.company.phone && <span>📞 {mailModal.company.phone}</span>}
              {mailModal.company.city && <span>📍 {mailModal.company.city}</span>}
            </div>
            <textarea
              value={mailModal.text}
              onChange={e => setMailModal(prev => ({ ...prev, text: e.target.value }))}
              rows={22}
              style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", fontSize: 12, lineHeight: 1.7, resize: "vertical", fontFamily: "inherit", color: "#1e293b" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => { navigator.clipboard.writeText(mailModal.text); addLog(`📋 "${mailModal.company.name}" mail kopyalandı`); }}
                style={{ flex: 1, background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: 9, padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                📋 Tamamını Kopyala
              </button>
              <a href={`mailto:${mailModal.company.email || ""}?subject=${encodeURIComponent("Stinga Enerji — " + mailModal.company.need + " için Çözüm Önerimiz")}&body=${encodeURIComponent(mailModal.text)}`}
                style={{ flex: 1, background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", borderRadius: 9, padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                📨 E-Posta İstemcisinde Aç
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
