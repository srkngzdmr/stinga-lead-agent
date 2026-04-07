import { useState, useEffect, useRef, useCallback } from "react";

const STINGA_LOGO = "https://raw.githubusercontent.com/srkngzdmr/stinga-lead-agent/master/stinga_logo_ic_i_beyaz_c_erc_eveli-02.png";

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
9. Tavuk Çiftliği Isıtma Sistemleri (kümes ısıtma kazanları)

Teknik Özellikler:
- CO: 12 ppm (yasal sınır 250 mg/Nm³)
- CO₂: %0.4 (tipik kazan %8-12)
- NOx: 3 ppm (yasal sınır 400 mg/Nm³)
- SO₂: ≈0 ppm (yasal sınır 2000 mg/Nm³)
- ENKA Laboratuvarı onaylı
- TÜBİTAK raporu mevcut
- TKİ Seyitömer raporu mevcut
- Kyoto Protokolü uyumlu

Hedef Sektörler:
- Termik santraller, enerji üretim tesisleri
- Çimento fabrikaları
- Demir-çelik endüstrisi
- Kağıt/selüloz fabrikaları
- Tekstil fabrikaları (buhar ihtiyacı)
- Gıda işleme tesisleri (kurutma)
- Belediyeler (atık bertaraf, arıtma çamuru)
- Madencilik şirketleri (kömür kurutma)
- Su arıtma tesisleri (aktif karbon)
- Kimya endüstrisi
- Seramik fabrikaları
- Tuğla/kiremit fabrikaları
- Tavuk çiftlikleri (kümes ısıtma)
`;

const SECTOR_QUERIES = {
  "Termik Santral & Enerji": {
    icon: "⚡",
    queries: ["Türkiye termik santral şirketleri iletişim", "kömür yakıtlı enerji santralleri Türkiye firmaları"],
    reason: "Emisyonsuz yanma teknolojisi ile kömür verimini artırma ve emisyonları düşürme",
    currentSystem: "Konvansiyonel kömür yakma kazanları, yüksek emisyon, düşük verim"
  },
  "Çimento & Yapı Malzemesi": {
    icon: "🏗️",
    queries: ["Türkiye çimento fabrikaları listesi", "çimento sektörü firmaları iletişim bilgileri"],
    reason: "Yüksek sıcaklık ihtiyacı, kömür kurutma ve emisyon azaltma",
    currentSystem: "Döner fırınlar, yüksek CO₂ emisyonu, karbon vergisi riski"
  },
  "Demir-Çelik": {
    icon: "🔩",
    queries: ["Türkiye demir çelik fabrikaları", "çelik üretim şirketleri Türkiye iletişim"],
    reason: "Yüksek enerji tüketimi, emisyon düşürme zorunluluğu",
    currentSystem: "Geleneksel fırınlar, yüksek karbon ayak izi"
  },
  "Tekstil & Kumaş": {
    icon: "🧵",
    queries: ["Türkiye tekstil fabrikaları buhar kazanı", "büyük tekstil firmaları enerji ihtiyacı"],
    reason: "Buhar üretim kazanları, enerji maliyeti düşürme",
    currentSystem: "Doğalgaz/kömür kazanları, yüksek yakıt maliyeti"
  },
  "Belediye & Atık Yönetimi": {
    icon: "🏛️",
    queries: ["belediye arıtma çamuru bertaraf tesisleri Türkiye", "atık yönetimi şirketleri Türkiye"],
    reason: "Arıtma çamuru bertarafı, atık yakma, aktif karbon üretimi",
    currentSystem: "Depolama/düzenli depolama, yüksek maliyet, çevre sorunları"
  },
  "Su Arıtma & Çevre": {
    icon: "💧",
    queries: ["su arıtma tesisleri Türkiye firmaları", "aktif karbon tedarikçi Türkiye"],
    reason: "Aktif karbon tedariki, arıtma teknolojileri",
    currentSystem: "İthal aktif karbon kullanımı, yüksek maliyet"
  },
  "Gıda & Tarım": {
    icon: "🌾",
    queries: ["gıda kurutma tesisleri Türkiye", "tarım ürünleri kurutma firmaları"],
    reason: "Kurutma teknolojisi, enerji verimliliği",
    currentSystem: "Geleneksel kurutma fırınları, yüksek enerji tüketimi"
  },
  "Kağıt & Selüloz": {
    icon: "📄",
    queries: ["Türkiye kağıt fabrikaları listesi", "selüloz üretim tesisleri Türkiye"],
    reason: "Buhar üretimi, kurutma süreçleri, emisyon azaltma",
    currentSystem: "Yüksek buhar tüketimi, doğalgaz bağımlılığı"
  },
  "Tavuk Çiftlikleri & Kümes": {
    icon: "🐔",
    queries: ["Türkiye tavuk çiftlikleri büyük firmalar", "kanatlı hayvan üretim şirketleri Türkiye"],
    reason: "Kümes ısıtma kazanları, düşük maliyetli ve emisyonsuz ısıtma çözümleri",
    currentSystem: "Doğalgaz/LPG/kömür sobaları, yüksek yakıt maliyeti, hava kalitesi sorunları"
  },
  "Madencilik & Kömür": {
    icon: "⛏️",
    queries: ["Türkiye kömür madeni firmaları", "maden şirketleri kömür kurutma ihtiyacı"],
    reason: "Kömür kurutma ve kalite artırma, linyit karbonlaştırma teknolojisi",
    currentSystem: "Açık hava kurutma, verimsiz kömür işleme, yüksek nem oranları"
  }
};

const KNOWN_COMPANIES = {
  "Termik Santral & Enerji": [
    { name: "EÜAŞ (Elektrik Üretim A.Ş.)", sector: "Enerji Üretimi", website: "www.euas.gov.tr", linkedin: "linkedin.com/company/euas", note: "Devlet termik santralleri — Türkiye'nin en büyük kamu enerji üreticisi", need: "Linyit santrallerinde emisyon düşürme", phone: "+90 312 212 69 00", email: "info@euas.gov.tr", city: "Ankara", lat: 39.9334, lng: 32.8597 },
    { name: "Eren Enerji", sector: "Enerji", website: "www.erenenerji.com.tr", linkedin: "linkedin.com/company/eren-enerji", note: "Kömürlü termik santral operatörü — Zonguldak Eren Termik Santrali", need: "Yanma verimi artırma, emisyon azaltma", phone: "+90 212 381 50 00", email: "info@erenenerji.com.tr", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
    { name: "IC İçtaş Enerji", sector: "Enerji", website: "www.icholding.com.tr", linkedin: "linkedin.com/company/ic-ictas", note: "Büyük ölçekli termik santral yatırımcısı — HES ve termik portföyü", need: "Emisyon azaltma teknolojisi", phone: "+90 212 352 00 00", email: "info@icholding.com.tr", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
    { name: "Çelikler Holding", sector: "Enerji/Madencilik", website: "www.celikler.com.tr", linkedin: "linkedin.com/company/celikler-holding", note: "Kömür madeni + santral entegrasyonu — dikey entegre yapı", need: "Kömür kalitesini artırma, kurutma", phone: "+90 312 440 18 28", email: "info@celikler.com.tr", city: "Ankara", lat: 39.9334, lng: 32.8597 },
    { name: "Bereket Enerji", sector: "Enerji", website: "www.bereketenerji.com.tr", linkedin: "linkedin.com/company/bereket-enerji", note: "Termik santral işletmecisi — Afşin-Elbistan bölgesi", need: "Çevresel uyumluluk, emisyon limitleri", phone: "+90 212 215 33 33", email: "info@bereketenerji.com.tr", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
    { name: "TKİ (Türkiye Kömür İşletmeleri)", sector: "Madencilik", website: "www.tki.gov.tr", linkedin: "linkedin.com/company/tki", note: "Devlet kömür işletmesi — Türkiye linyit rezervlerinin %50'sini işletir", need: "Kömür kurutma ve kalite artırma", phone: "+90 312 384 24 00", email: "info@tki.gov.tr", city: "Ankara", lat: 39.9334, lng: 32.8597 },
  ],
  "Çimento & Yapı Malzemesi": [
    { name: "Limak Çimento", sector: "Çimento", website: "www.limak.com.tr", linkedin: "linkedin.com/company/limak-holding", note: "Türkiye geneli 5 çimento fabrikası — yıllık 10M+ ton üretim", need: "Alternatif yakıt, emisyon düşürme", phone: "+90 312 249 01 01", email: "info@limak.com.tr", city: "Ankara", lat: 39.9334, lng: 32.8597 },
    { name: "Oyak Çimento", sector: "Çimento", website: "www.oyakcimento.com", linkedin: "linkedin.com/company/oyak-cimento", note: "OYAK grubu — Türkiye'nin en büyük çimento üretici grubu", need: "Karbon vergisi uyumu, AB SKDM hazırlığı", phone: "+90 312 585 55 00", email: "info@oyakcimento.com", city: "Ankara", lat: 39.9334, lng: 32.8597 },
    { name: "Akçansa", sector: "Çimento", website: "www.akcansa.com.tr", linkedin: "linkedin.com/company/akcansa", note: "Sabancı/HeidelbergCement ortaklığı — 2 entegre fabrika", need: "Sürdürülebilir üretim, net sıfır hedefi", phone: "+90 216 571 30 00", email: "info@akcansa.com.tr", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
    { name: "Çimsa", sector: "Çimento", website: "www.cimsa.com.tr", linkedin: "linkedin.com/company/cimsa", note: "Sabancı grubu — beyaz çimento ve özel çimentolar", need: "Emisyon azaltma hedefleri", phone: "+90 324 234 66 50", email: "info@cimsa.com.tr", city: "Mersin", lat: 36.8121, lng: 34.6415 },
    { name: "Nuh Çimento", sector: "Çimento", website: "www.nuhcimento.com.tr", linkedin: "linkedin.com/company/nuh-cimento", note: "Kocaeli bölgesi — yıllık 5M ton üretim kapasitesi", need: "Enerji verimliliği", phone: "+90 262 349 36 00", email: "info@nuhcimento.com.tr", city: "Kocaeli", lat: 40.7654, lng: 29.9408 },
  ],
  "Demir-Çelik": [
    { name: "Erdemir (Ereğli Demir Çelik)", sector: "Demir-Çelik", website: "www.erdemir.com.tr", linkedin: "linkedin.com/company/erdemir", note: "Türkiye'nin en büyük yassı çelik üreticisi — OYAK grubu", need: "Karbon ayak izi azaltma", phone: "+90 372 323 55 55", email: "info@erdemir.com.tr", city: "Zonguldak", lat: 41.4534, lng: 31.7987 },
    { name: "İsdemir", sector: "Demir-Çelik", website: "www.isdemir.com.tr", linkedin: "linkedin.com/company/isdemir", note: "Erdemir grubu — İskenderun'da entegre demir-çelik tesisi", need: "Emisyon uyum, AB yeşil dönüşüm", phone: "+90 326 758 40 40", email: "info@isdemir.com.tr", city: "Hatay", lat: 36.5946, lng: 36.1726 },
    { name: "Kardemir", sector: "Demir-Çelik", website: "www.kardemir.com", linkedin: "linkedin.com/company/kardemir", note: "Karabük Demir Çelik — Türkiye'nin ilk demir-çelik tesisi", need: "Alternatif enerji kaynakları", phone: "+90 370 418 69 00", email: "info@kardemir.com", city: "Karabük", lat: 41.2061, lng: 32.6204 },
    { name: "Tosyalı Holding", sector: "Demir-Çelik", website: "www.tosyaliholding.com.tr", linkedin: "linkedin.com/company/tosyali-holding", note: "Büyük çelik grubu — Osmaniye ve uluslararası tesisler", need: "Enerji maliyeti düşürme", phone: "+90 328 825 00 00", email: "info@tosyaliholding.com.tr", city: "Osmaniye", lat: 37.0746, lng: 36.2464 },
    { name: "Çolakoğlu Metalurji", sector: "Demir-Çelik", website: "www.colakoglu.com.tr", linkedin: "linkedin.com/company/colakoglu-metalurji", note: "Kocaeli'de yassı ve uzun çelik üretimi", need: "Enerji verimliliği ve emisyon azaltma", phone: "+90 262 316 10 10", email: "info@colakoglu.com.tr", city: "Kocaeli", lat: 40.7654, lng: 29.9408 },
  ],
  "Tekstil & Kumaş": [
    { name: "Zorlu Holding (Korteks)", sector: "Tekstil", website: "www.zorlu.com.tr", linkedin: "linkedin.com/company/zorlu-holding", note: "Büyük tekstil grubu — polyester iplik üretiminde dünya lideri", need: "Buhar kazanı verimliliği", phone: "+90 212 456 24 00", email: "info@zorlu.com.tr", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
    { name: "Kipaş Holding", sector: "Tekstil", website: "www.kipas.com.tr", linkedin: "linkedin.com/company/kipas-holding", note: "Kahramanmaraş merkezli entegre tekstil grubu", need: "Enerji maliyeti optimize", phone: "+90 344 237 00 00", email: "info@kipas.com.tr", city: "Kahramanmaraş", lat: 37.5847, lng: 36.9371 },
    { name: "Sanko Holding", sector: "Tekstil", website: "www.sanko.com.tr", linkedin: "linkedin.com/company/sanko-holding", note: "Gaziantep tekstil — iplik, dokuma, konfeksiyon", need: "Buhar üretim kazanı", phone: "+90 342 211 15 00", email: "info@sanko.com.tr", city: "Gaziantep", lat: 37.0662, lng: 37.3833 },
    { name: "İTHİB", sector: "Sektör Birliği", website: "www.ithib.org.tr", linkedin: "linkedin.com/company/ithib", note: "İstanbul Tekstil ve Hammaddeleri İhracatçıları Birliği", need: "Üyelere teknoloji tanıtım", phone: "+90 212 454 02 00", email: "info@ithib.org.tr", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
  ],
  "Belediye & Atık Yönetimi": [
    { name: "İSTAÇ A.Ş.", sector: "Atık Yönetimi", website: "www.istac.istanbul", linkedin: "linkedin.com/company/istac", note: "İBB atık yönetimi şirketi — İstanbul'un katı atık yönetimi", need: "Arıtma çamuru bertarafı", phone: "+90 212 368 12 00", email: "info@istac.istanbul", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
    { name: "İSKİ", sector: "Su/Atık Su", website: "www.iski.istanbul", linkedin: "linkedin.com/company/iski", note: "İstanbul Su ve Kanalizasyon İdaresi — günlük 5M+ m³ su", need: "Çamur kurutma, aktif karbon", phone: "+90 212 321 60 00", email: "bilgi@iski.gov.tr", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
    { name: "ASKİ (Ankara)", sector: "Su/Atık Su", website: "www.aski.gov.tr", linkedin: "linkedin.com/company/aski-ankara", note: "Ankara Su ve Kanalizasyon İdaresi", need: "Arıtma çamuru bertarafı", phone: "+90 312 314 12 43", email: "info@aski.gov.tr", city: "Ankara", lat: 39.9334, lng: 32.8597 },
    { name: "Çevko Vakfı", sector: "Çevre", website: "www.cevko.org.tr", linkedin: "linkedin.com/company/cevko", note: "Çevre Koruma ve Ambalaj Atıkları Değerlendirme Vakfı", need: "Emisyonsuz teknoloji tanıtım", phone: "+90 212 283 82 96", email: "info@cevko.org.tr", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
    { name: "ITC Invest Trading", sector: "Çevre Teknolojileri", website: "www.itcinvest.com", linkedin: "linkedin.com/company/itc-invest", note: "Çevre yatırımları ve teknoloji", need: "Bertaraf teknolojisi", phone: "+90 212 355 00 00", email: "info@itcinvest.com", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
  ],
  "Su Arıtma & Çevre": [
    { name: "Kurita Turkey", sector: "Su Arıtma", website: "www.kurita.co.jp", linkedin: "linkedin.com/company/kurita-water", note: "Japon su arıtma devi — endüstriyel su çözümleri", need: "Aktif karbon tedarik", phone: "+90 216 573 83 00", email: "info@kurita.com.tr", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
    { name: "Suez Türkiye", sector: "Su/Çevre", website: "www.suez.com", linkedin: "linkedin.com/company/suez", note: "Global çevre ve su yönetimi şirketi", need: "Yerel aktif karbon tedarik", phone: "+90 216 564 00 00", email: "info@suez.com.tr", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
    { name: "Prominent Türkiye", sector: "Su Arıtma", website: "www.prominent.com", linkedin: "linkedin.com/company/prominent-gmbh", note: "Alman su arıtma ekipmanları üreticisi", need: "Aktif karbon entegrasyonu", phone: "+90 216 544 00 00", email: "info@prominent.com.tr", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
    { name: "Protel Çevre", sector: "Çevre Teknolojisi", website: "www.protelcevre.com", linkedin: "linkedin.com/company/protel-cevre", note: "Çevre mühendislik ve danışmanlık", need: "Arıtma çamuru çözümü", phone: "+90 312 472 10 00", email: "info@protelcevre.com", city: "Ankara", lat: 39.9334, lng: 32.8597 },
  ],
  "Gıda & Tarım": [
    { name: "Eti Maden", sector: "Madencilik/Gıda", website: "www.etimaden.gov.tr", linkedin: "linkedin.com/company/eti-maden", note: "Maden işletmesi — bor madenleri ve endüstriyel mineraller", need: "Kurutma teknolojisi", phone: "+90 312 294 20 00", email: "info@etimaden.gov.tr", city: "Ankara", lat: 39.9334, lng: 32.8597 },
    { name: "Tariş Üzüm", sector: "Tarım/Gıda", website: "www.tarisuzum.com.tr", linkedin: "linkedin.com/company/taris", note: "Üzüm kurutma ve işleme kooperatifi — İzmir bölgesi", need: "Verimli kurutma sistemi", phone: "+90 232 463 09 09", email: "info@tarisuzum.com.tr", city: "İzmir", lat: 38.4237, lng: 27.1428 },
    { name: "Oltan Gıda", sector: "Gıda İşleme", website: "www.oltan.com.tr", linkedin: "linkedin.com/company/oltan-gida", note: "Türkiye'nin en büyük fındık işleme tesisi", need: "Kurutma fırınları modernizasyonu", phone: "+90 454 215 11 00", email: "info@oltan.com.tr", city: "Giresun", lat: 40.9128, lng: 38.3895 },
  ],
  "Kağıt & Selüloz": [
    { name: "Hayat Holding (Hayat Kimya)", sector: "Kağıt/Hijyen", website: "www.hayat.com.tr", linkedin: "linkedin.com/company/hayat-holding", note: "Kağıt ve hijyen ürünleri — Papia, Familia, Bingo markaları", need: "Buhar kazanı verimliliği", phone: "+90 262 315 73 00", email: "info@hayat.com.tr", city: "Kocaeli", lat: 40.7654, lng: 29.9408 },
    { name: "Mondi Tire Kutsan", sector: "Kağıt/Ambalaj", website: "www.mondigroup.com", linkedin: "linkedin.com/company/mondi-group", note: "Avusturya merkezli ambalaj kağıdı üreticisi — Tire fabrikası", need: "Enerji maliyeti azaltma", phone: "+90 232 512 10 10", email: "info@mondi.com.tr", city: "İzmir", lat: 38.4237, lng: 27.1428 },
    { name: "Olmuksan IP", sector: "Ambalaj", website: "www.olmuksan.com.tr", linkedin: "linkedin.com/company/olmuksan-ip", note: "Oluklu mukavva üretimi — International Paper grubu", need: "Buhar üretim sistemi", phone: "+90 262 349 45 00", email: "info@olmuksan.com.tr", city: "Kocaeli", lat: 40.7654, lng: 29.9408 },
    { name: "Modern Karton", sector: "Kağıt/Karton", website: "www.modernkarton.com.tr", linkedin: "linkedin.com/company/modern-karton", note: "Kaplı karton üretimi — Sakarya fabrikası", need: "Buhar ve enerji verimliliği", phone: "+90 264 276 50 00", email: "info@modernkarton.com.tr", city: "Sakarya", lat: 40.7569, lng: 30.3781 },
  ],
  "Tavuk Çiftlikleri & Kümes": [
    { name: "Banvit (BRF Türkiye)", sector: "Kanatlı Hayvan", website: "www.banvit.com.tr", linkedin: "linkedin.com/company/banvit", note: "Türkiye'nin en büyük entegre tavuk üreticilerinden — Bandırma merkezli, yıllık 200M+ tavuk kapasitesi", need: "Kümes ısıtma maliyeti düşürme, emisyonsuz kazan", phone: "+90 266 738 19 00", email: "info@banvit.com.tr", city: "Balıkesir", lat: 40.3420, lng: 27.9711 },
    { name: "Beypi (Beypiliç)", sector: "Kanatlı Hayvan", website: "www.beypi.com.tr", linkedin: "linkedin.com/company/beypi", note: "Bolu merkezli entegre tavukçuluk — 100+ çiftlik, yem fabrikası, kesimhane", need: "Kümes ısıtma, verimli yakıt kullanımı", phone: "+90 374 253 50 50", email: "info@beypi.com.tr", city: "Bolu", lat: 40.7355, lng: 31.6112 },
    { name: "Şenpiliç", sector: "Kanatlı Hayvan", website: "www.senpilic.com.tr", linkedin: "linkedin.com/company/senpilic", note: "Sakarya merkezli — yıllık 150M+ civciv kapasitesi", need: "Sıcak hava üretim kazanları, enerji tasarrufu", phone: "+90 264 295 15 15", email: "info@senpilic.com.tr", city: "Sakarya", lat: 40.7569, lng: 30.3781 },
    { name: "CP Standart Gıda (CP Foods Türkiye)", sector: "Kanatlı Hayvan", website: "www.cpturkiye.com", linkedin: "linkedin.com/company/cp-standart-gida", note: "Tayland CP grubu Türkiye operasyonu — Bolu ve Düzce tesisleri", need: "Merkezi ısıtma sistemi, düşük emisyon", phone: "+90 374 252 00 00", email: "info@cpturkiye.com", city: "Bolu", lat: 40.7355, lng: 31.6112 },
    { name: "Gedik Piliç", sector: "Kanatlı Hayvan", website: "www.gedikpilic.com", linkedin: "linkedin.com/company/gedik-pilic", note: "Çanakkale-Biga merkezli — bölgesel entegre üretici", need: "Kümes ısıtma kazanları", phone: "+90 286 415 10 10", email: "info@gedikpilic.com", city: "Çanakkale", lat: 40.1553, lng: 26.4142 },
    { name: "Keskinoğlu", sector: "Kanatlı Hayvan", website: "www.keskinoglu.com.tr", linkedin: "linkedin.com/company/keskinoglu", note: "Manisa Akhisar merkezli — yumurta ve et tavukçuluğu", need: "Kümeslerde verimli ısıtma, kömürden geçiş", phone: "+90 236 414 10 00", email: "info@keskinoglu.com.tr", city: "Manisa", lat: 38.6191, lng: 27.4289 },
    { name: "Abalıoğlu Holding (Lezita)", sector: "Kanatlı Hayvan", website: "www.abalioglu.com.tr", linkedin: "linkedin.com/company/abalioglu-holding", note: "İzmir merkezli — Lezita markası, entegre kanatlı üretimi", need: "Enerji verimliliği, ısıtma maliyeti", phone: "+90 232 462 77 00", email: "info@abalioglu.com.tr", city: "İzmir", lat: 38.4237, lng: 27.1428 },
  ],
  "Madencilik & Kömür": [
    { name: "TKİ (Türkiye Kömür İşletmeleri)", sector: "Kömür Madenciliği", website: "www.tki.gov.tr", linkedin: "linkedin.com/company/tki", note: "Devlet kömür işletmesi — Türkiye linyit üretiminin %50+'sı, 10+ maden sahası", need: "Kömür kurutma, kalite artırma, nem azaltma", phone: "+90 312 384 24 00", email: "info@tki.gov.tr", city: "Ankara", lat: 39.9334, lng: 32.8597 },
    { name: "TTK (Türkiye Taşkömürü Kurumu)", sector: "Taşkömürü", website: "www.taskomuru.gov.tr", linkedin: "-", note: "Zonguldak havzası taşkömürü üretimi — Türkiye'nin tek taşkömürü üreticisi", need: "Kömür kurutma ve işleme teknolojisi", phone: "+90 372 252 23 00", email: "info@taskomuru.gov.tr", city: "Zonguldak", lat: 41.4534, lng: 31.7987 },
    { name: "Çelikler Madencilik", sector: "Kömür Madenciliği", website: "www.celikler.com.tr", linkedin: "linkedin.com/company/celikler-holding", note: "Kömür madenciliği ve enerji grubu — Afşin-Elbistan linyit sahası", need: "Linyit kurutma, karbonlaştırma", phone: "+90 312 440 18 28", email: "info@celikler.com.tr", city: "Ankara", lat: 39.9334, lng: 32.8597 },
    { name: "Polyak Eynez", sector: "Kömür Madenciliği", website: "www.polyak.com.tr", linkedin: "linkedin.com/company/polyak-eynez", note: "Manisa-Soma linyit madeni — yeraltı kömür işletmesi", need: "Kömür kurutma sistemi", phone: "+90 236 612 80 00", email: "info@polyak.com.tr", city: "Manisa", lat: 38.6191, lng: 27.4289 },
    { name: "Demir Export", sector: "Madencilik", website: "www.demirexport.com", linkedin: "linkedin.com/company/demir-export", note: "Krom, kömür ve enerji yatırımları — Afşin-Elbistan", need: "Kömür kalite iyileştirme, kurutma", phone: "+90 312 459 76 00", email: "info@demirexport.com", city: "Ankara", lat: 39.9334, lng: 32.8597 },
    { name: "Hattat Holding (Hattat Enerji)", sector: "Madencilik/Enerji", website: "www.hattat.com.tr", linkedin: "linkedin.com/company/hattat-holding", note: "Amasra kömür madeni ve termik santral projesi", need: "Kömür kurutma, kalite artırma", phone: "+90 212 355 12 00", email: "info@hattat.com.tr", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
    { name: "Fernas İnşaat (Kolin Grubu)", sector: "Madencilik", website: "www.fernas.com.tr", linkedin: "linkedin.com/company/fernas", note: "Maden ve inşaat grubu — kömür madeni operasyonları", need: "Verimli kömür işleme", phone: "+90 312 497 30 00", email: "info@fernas.com.tr", city: "Ankara", lat: 39.9334, lng: 32.8597 },
    { name: "Park Termik", sector: "Kömür/Enerji", website: "www.parktermik.com.tr", linkedin: "linkedin.com/company/park-termik", note: "Bolu-Göynük linyit madeni ve termik santral", need: "Düşük kalorili kömür kurutma", phone: "+90 374 471 22 00", email: "info@parktermik.com.tr", city: "Bolu", lat: 40.7355, lng: 31.6112 },
  ]
};

const API_URL = "/api/ai-search";

// Lead status options
const LEAD_STATUSES = {
  new: { label: "Yeni", color: "#64748b", bg: "rgba(100,116,139,0.12)" },
  contacted: { label: "İletişim Kuruldu", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  meeting: { label: "Toplantı Planlandı", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  proposal: { label: "Teklif Verildi", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  won: { label: "Kazanıldı", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  lost: { label: "Kaybedildi", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

export default function StingaLeadAgent() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedSector, setSelectedSector] = useState(null);
  const [searchResults, setSearchResults] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [searchLog, setSearchLog] = useState([]);
  const [leadStatuses, setLeadStatuses] = useState({});
  const [leadNotes, setLeadNotes] = useState({});
  const [filterSector, setFilterSector] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [autoScanActive, setAutoScanActive] = useState(false);
  const [autoScanSector, setAutoScanSector] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScanTime, setLastScanTime] = useState(null);
  const chatEndRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalLeads = Object.values(KNOWN_COMPANIES).reduce((sum, arr) => sum + arr.length, 0);
  const sectorKeys = Object.keys(SECTOR_QUERIES);
  const completedSectors = Object.values(searchResults).filter(r => r?.status === "complete").length;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Auto-scan logic
  useEffect(() => {
    if (autoScanActive) {
      const runNext = async () => {
        if (autoScanSector < sectorKeys.length) {
          const sector = sectorKeys[autoScanSector];
          if (!searchResults[sector]?.status) {
            await runSectorResearch(sector, true);
          }
          setScanProgress(Math.round(((autoScanSector + 1) / sectorKeys.length) * 100));
          setAutoScanSector(prev => prev + 1);
        } else {
          setAutoScanActive(false);
          setLastScanTime(new Date().toLocaleString('tr-TR'));
          addLog("✅ Otomatik tarama tamamlandı — tüm sektörler analiz edildi");
        }
      };
      const timer = setTimeout(runNext, 2000);
      return () => clearTimeout(timer);
    }
  }, [autoScanActive, autoScanSector]);

  const addLog = useCallback((msg) => {
    setSearchLog(prev => [{ time: new Date().toLocaleTimeString('tr-TR'), msg }, ...prev]);
  }, []);

  const callClaude = async (prompt, systemPrompt) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemPrompt: systemPrompt || "Sen bir B2B satış araştırma uzmanısın. Türkçe yanıt ver."
        })
      });
      const data = await response.json();
      if (data.success) {
        return data.result || "Sonuç alınamadı.";
      }
      return "Hata: " + (data.error || "Bilinmeyen bir hata oluştu.");
    } catch (err) {
      console.error("API Error:", err);
      return "API hatası: " + err.message;
    }
  };

  const runSectorResearch = async (sectorName, silent = false) => {
    setIsSearching(true);
    setSelectedSector(sectorName);
    if (!silent) setActiveTab("results");
    addLog(`🔍 "${sectorName}" sektörü araştırması başlatıldı...`);

    const sector = SECTOR_QUERIES[sectorName];
    const companies = KNOWN_COMPANIES[sectorName] || [];

    setSearchResults(prev => ({
      ...prev,
      [sectorName]: { companies, status: "researching" }
    }));

    addLog(`📊 ${companies.length} bilinen firma listelendi`);

    try {
      const prompt = `${STINGA_CONTEXT}\n\nSektör: ${sectorName}\nStinga'nın bu sektöre sunabileceği çözüm: ${sector.reason}\nBu sektörün mevcut sistemi: ${sector.currentSystem}\n\nLütfen bu sektördeki potansiyel müşterileri araştır. Her firma için:\n1. Firma adı ve ne iş yaptığı\n2. Stinga'nın hangi ürününe neden ihtiyaç duyduğu\n3. Mevcut kullandıkları sistem/teknoloji\n4. İletişim bilgileri (varsa website, LinkedIn)\n\nAyrıca sektör analizi yap:\n- Sektörün mevcut enerji/emisyon sorunları\n- Stinga teknolojisinin bu sektöre sağlayacağı avantajlar\n- Satış stratejisi önerileri\n\nTürkçe ve detaylı yanıt ver.`;

      addLog(`🤖 AI analiz yapıyor: ${sectorName}...`);
      const result = await callClaude(prompt, `Sen Stinga Enerji A.Ş. için B2B müşteri araştırması yapan bir satış istihbarat uzmanısın. Web'de araştırma yap ve detaylı bilgi ver. Türkçe yanıt ver.`);

      setSearchResults(prev => ({
        ...prev,
        [sectorName]: { companies, analysis: result, status: "complete" }
      }));

      addLog(`✅ "${sectorName}" analizi tamamlandı`);
    } catch (err) {
      addLog(`❌ Hata: ${err.message}`);
    }

    setIsSearching(false);
  };

  const startAutoScan = () => {
    setAutoScanActive(true);
    setAutoScanSector(0);
    setScanProgress(0);
    addLog("🚀 Otomatik sektör taraması başlatıldı...");
  };

  const handleChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsChatLoading(true);

    try {
      const allCompanies = Object.entries(KNOWN_COMPANIES)
        .map(([sector, list]) => `\n${sector}:\n${list.map(c => `- ${c.name}: ${c.note} | İhtiyaç: ${c.need}`).join('\n')}`)
        .join('\n');

      const result = await callClaude(
        `${STINGA_CONTEXT}\n\nMevcut lead veritabanı:${allCompanies}\n\nKullanıcı sorusu: ${userMsg}`,
        `Sen Stinga Enerji A.Ş.'nin AI satış asistanısın. Potansiyel müşteriler hakkında bilgi ver, satış stratejileri öner, sektör analizleri yap. Her zaman Türkçe yanıt ver. Web araştırması yapabilirsin.`
      );
      setChatMessages(prev => [...prev, { role: "assistant", content: result }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Hata: " + err.message }]);
    }
    setIsChatLoading(false);
  };

  const updateLeadStatus = (companyName, status) => {
    setLeadStatuses(prev => ({ ...prev, [companyName]: status }));
    addLog(`📌 "${companyName}" durumu güncellendi: ${LEAD_STATUSES[status].label}`);
  };

  const updateLeadNote = (companyName, note) => {
    setLeadNotes(prev => ({ ...prev, [companyName]: note }));
  };

  // Filter logic
  const getFilteredCompanies = () => {
    let all = Object.entries(KNOWN_COMPANIES).flatMap(([sector, companies]) =>
      companies.map(c => ({ ...c, sectorLabel: sector }))
    );
    if (filterSector !== "all") all = all.filter(c => c.sectorLabel === filterSector);
    if (filterStatus !== "all") {
      if (filterStatus === "new") all = all.filter(c => !leadStatuses[c.name]);
      else all = all.filter(c => leadStatuses[c.name] === filterStatus);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      all = all.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q) ||
        c.need.toLowerCase().includes(q)
      );
    }
    return all;
  };

  const stats = {
    total: totalLeads,
    contacted: Object.values(leadStatuses).filter(s => s === "contacted").length,
    meeting: Object.values(leadStatuses).filter(s => s === "meeting").length,
    proposal: Object.values(leadStatuses).filter(s => s === "proposal").length,
    won: Object.values(leadStatuses).filter(s => s === "won").length,
  };

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      background: "#f0f2f5",
      color: "#1e293b",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 3px; }
        ::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scanPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.3); } 50% { box-shadow: 0 0 0 8px rgba(16,185,129,0); } }
        .fade-up { animation: fadeUp 0.4s ease-out both; }
        .pulse-anim { animation: pulse 1.5s ease-in-out infinite; }
        .slide-in { animation: slideIn 0.3s ease-out both; }
        .sector-card { transition: all 0.25s ease; border: 1px solid #e2e8f0; }
        .sector-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); border-color: #10b981; }
        .tab-btn { transition: all 0.2s; border: none; cursor: pointer; }
        .tab-btn:hover { background: rgba(16, 185, 129, 0.08) !important; }
        .action-btn { transition: all 0.2s; cursor: pointer; }
        .action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .company-row { transition: background 0.2s; }
        .company-row:hover { background: rgba(16, 185, 129, 0.04) !important; }
        textarea:focus, input:focus, select:focus { outline: none; border-color: #10b981 !important; }
        .status-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; }
        .status-pill:hover { filter: brightness(0.95); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .modal-card { background: #fff; border-radius: 16px; padding: 28px; max-width: 560px; width: 90%; max-height: 85vh; overflow-y: auto; box-shadow: 0 24px 48px rgba(0,0,0,0.15); }
        .scan-active { animation: scanPulse 2s ease-in-out infinite; }
        .progress-bar { height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #10b981, #059669); border-radius: 2px; transition: width 0.5s ease; }
      `}</style>

      {/* Header */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            border: "2.5px solid #fff",
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
            overflow: "hidden",
            flexShrink: 0,
            position: "relative",
            background: "#fff"
          }}>
            <img src={STINGA_LOGO} alt="Stinga" style={{
              position: "absolute", inset: -30,
              width: 120, height: 120,
              objectFit: "contain"
            }} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
              Stinga Lead Agent
            </h1>
            <p style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
              AI-Powered B2B Müşteri Araştırma Platformu
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{
            background: "#f8fafc", border: "1px solid #e2e8f0",
            padding: "6px 14px", borderRadius: 10, fontSize: 13, color: "#0f172a", fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.02em"
          }}>
            {clock.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            <span style={{ marginLeft: 8, color: "#10b981" }}>
              {clock.toLocaleTimeString('tr-TR')}
            </span>
          </div>
          {autoScanActive && (
            <div className="scan-active" style={{
              background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
              padding: "6px 14px", borderRadius: 20, fontSize: 12, color: "#059669", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6
            }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
              Taranıyor... %{scanProgress}
            </div>
          )}
          <span style={{
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
            padding: "6px 12px", borderRadius: 20, fontSize: 12, color: "#059669", fontWeight: 600
          }}>
            {totalLeads} Lead
          </span>
          <span style={{
            background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
            padding: "6px 12px", borderRadius: 20, fontSize: 12, color: "#2563eb", fontWeight: 600
          }}>
            {sectorKeys.length} Sektör
          </span>
          <span style={{
            background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)",
            padding: "6px 12px", borderRadius: 20, fontSize: 12, color: "#7c3aed", fontWeight: 600
          }}>
            {completedSectors}/{sectorKeys.length} Analiz
          </span>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav style={{
        display: "flex", gap: 2, padding: "8px 24px",
        background: "#fff", borderBottom: "1px solid #e2e8f0",
        overflowX: "auto"
      }}>
        {[
          { id: "dashboard", label: "📊 Dashboard" },
          { id: "results", label: "🔍 Araştırma" },
          { id: "leads", label: "📋 Lead Yönetimi" },
          { id: "chat", label: "🤖 AI Asistan" },
          { id: "log", label: "📝 İşlem Logu" }
        ].map(tab => (
          <button key={tab.id}
            className="tab-btn"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 18px", borderRadius: 8,
              fontSize: 13, fontWeight: 600,
              color: activeTab === tab.id ? "#fff" : "#64748b",
              background: activeTab === tab.id ? "linear-gradient(135deg, #10b981, #059669)" : "transparent",
              whiteSpace: "nowrap"
            }}
          >{tab.label}</button>
        ))}
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="fade-up">
            {/* Hero + Auto Scan */}
            <div style={{
              background: "linear-gradient(135deg, #ecfdf5, #f0f9ff)",
              border: "1px solid #d1fae5",
              borderRadius: 16, padding: 24, marginBottom: 20,
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              flexWrap: "wrap", gap: 16
            }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>
                  🎯 Stinga Enerji — Hedef Sektör Analizi
                </h2>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, maxWidth: 600 }}>
                  Emisyonsuz yanma, kömür kurutma, kümes ısıtma, aktif karbon ve bertaraf teknolojileriniz için
                  en uygun potansiyel müşterileri AI destekli araştırma ile bulun.
                </p>
                {lastScanTime && (
                  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
                    Son tarama: {lastScanTime}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button className="action-btn"
                  onClick={startAutoScan}
                  disabled={autoScanActive}
                  style={{
                    background: autoScanActive ? "#94a3b8" : "linear-gradient(135deg, #10b981, #059669)",
                    color: "#fff", border: "none", borderRadius: 10,
                    padding: "12px 24px", fontSize: 13, fontWeight: 700,
                    opacity: autoScanActive ? 0.6 : 1
                  }}>
                  {autoScanActive ? "⏳ Taranıyor..." : "🚀 Tüm Sektörleri Tara"}
                </button>
                {autoScanActive && (
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${scanProgress}%` }} />
                  </div>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Toplam Lead", value: stats.total, color: "#0f172a", bg: "#fff" },
                { label: "İletişim Kuruldu", value: stats.contacted, color: "#2563eb", bg: "rgba(59,130,246,0.06)" },
                { label: "Toplantı", value: stats.meeting, color: "#d97706", bg: "rgba(245,158,11,0.06)" },
                { label: "Teklif Verildi", value: stats.proposal, color: "#7c3aed", bg: "rgba(139,92,246,0.06)" },
                { label: "Kazanılan", value: stats.won, color: "#059669", bg: "rgba(16,185,129,0.06)" },
              ].map((s, i) => (
                <div key={i} style={{
                  background: s.bg, border: "1px solid #e2e8f0",
                  borderRadius: 12, padding: "16px 18px", textAlign: "center"
                }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Sector Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 14
            }}>
              {sectorKeys.map((sector, i) => {
                const s = SECTOR_QUERIES[sector];
                const companyCount = KNOWN_COMPANIES[sector]?.length || 0;
                const status = searchResults[sector]?.status;
                return (
                  <div key={sector} className="sector-card fade-up" style={{
                    background: "#fff",
                    borderColor: status === 'complete' ? '#a7f3d0' : '#e2e8f0',
                    borderRadius: 14, padding: 18, cursor: "pointer",
                    animationDelay: `${i * 0.04}s`
                  }}
                    onClick={() => runSectorResearch(sector)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <span style={{ fontSize: 28 }}>{s.icon}</span>
                      {status === 'complete' && (
                        <span style={{ fontSize: 10, color: "#059669", background: "rgba(16,185,129,0.1)", padding: "3px 8px", borderRadius: 10, fontWeight: 600 }}>✓ Tamamlandı</span>
                      )}
                      {status === 'researching' && (
                        <span className="pulse-anim" style={{ fontSize: 10, color: "#d97706", background: "rgba(245,158,11,0.1)", padding: "3px 8px", borderRadius: 10, fontWeight: 600 }}>⏳ Araştırılıyor</span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{sector}</h3>
                    <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>{s.reason}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>{companyCount} firma</span>
                      <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 500 }}>Araştır →</span>
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
                <p style={{ fontSize: 40, marginBottom: 16 }}>🔍</p>
                <p style={{ fontSize: 15, color: "#64748b" }}>Dashboard'dan bir sektör seçin veya otomatik taramayı başlatın</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
                      {SECTOR_QUERIES[selectedSector]?.icon} {selectedSector}
                    </h2>
                    <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{SECTOR_QUERIES[selectedSector]?.reason}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {sectorKeys.map(s => (
                      <button key={s} className="action-btn"
                        onClick={() => { setSelectedSector(s); if (!searchResults[s]) runSectorResearch(s); }}
                        style={{
                          background: selectedSector === s ? "#10b981" : "#fff",
                          color: selectedSector === s ? "#fff" : "#475569",
                          border: "1px solid #e2e8f0", borderRadius: 8,
                          padding: "5px 12px", fontSize: 11, fontWeight: 600
                        }}
                      >{SECTOR_QUERIES[s].icon}</button>
                    ))}
                  </div>
                </div>

                {/* Mevcut Sistem vs Stinga */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                  <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 12, padding: 16 }}>
                    <h4 style={{ fontSize: 13, color: "#dc2626", marginBottom: 6, fontWeight: 600 }}>❌ Mevcut Sistem</h4>
                    <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{SECTOR_QUERIES[selectedSector]?.currentSystem}</p>
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #a7f3d0", borderRadius: 12, padding: 16 }}>
                    <h4 style={{ fontSize: 13, color: "#059669", marginBottom: 6, fontWeight: 600 }}>✅ Stinga Çözümü</h4>
                    <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{SECTOR_QUERIES[selectedSector]?.reason}</p>
                  </div>
                </div>

                {/* Company Table */}
                <div style={{
                  background: "#fff", border: "1px solid #e2e8f0",
                  borderRadius: 14, overflow: "hidden", marginBottom: 18
                }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                      Potansiyel Müşteri Listesi ({KNOWN_COMPANIES[selectedSector]?.length || 0})
                    </h3>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b", background: "#f8fafc" }}>
                          <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600 }}>Firma</th>
                          <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600 }}>Şehir</th>
                          <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600 }}>İhtiyaç</th>
                          <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600 }}>Durum</th>
                          <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600 }}>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(KNOWN_COMPANIES[selectedSector] || []).map((c, i) => (
                          <tr key={i} className="company-row" style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>{c.name}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.sector}</div>
                            </td>
                            <td style={{ padding: "12px 16px", color: "#475569", fontSize: 12 }}>{c.city || "-"}</td>
                            <td style={{ padding: "12px 16px", color: "#059669", fontSize: 12 }}>{c.need}</td>
                            <td style={{ padding: "12px 16px" }}>
                              <select
                                value={leadStatuses[c.name] || "new"}
                                onChange={e => updateLeadStatus(c.name, e.target.value)}
                                style={{
                                  background: LEAD_STATUSES[leadStatuses[c.name] || "new"].bg,
                                  color: LEAD_STATUSES[leadStatuses[c.name] || "new"].color,
                                  border: "none", borderRadius: 20, padding: "4px 10px",
                                  fontSize: 11, fontWeight: 600, cursor: "pointer"
                                }}
                              >
                                {Object.entries(LEAD_STATUSES).map(([k, v]) => (
                                  <option key={k} value={k}>{v.label}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <button className="action-btn"
                                onClick={() => setSelectedCompany(c)}
                                style={{
                                  background: "#f0f9ff", border: "1px solid #bfdbfe",
                                  color: "#2563eb", borderRadius: 8, padding: "5px 12px",
                                  fontSize: 11, fontWeight: 600
                                }}>Detay</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI Analysis */}
                {searchResults[selectedSector]?.analysis && (
                  <div style={{
                    background: "#fff", border: "1px solid #a7f3d0",
                    borderRadius: 14, padding: 20
                  }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#059669", marginBottom: 12 }}>
                      🤖 AI Sektör Analizi & Öneriler
                    </h3>
                    <div style={{
                      fontSize: 13, color: "#334155", lineHeight: 1.7,
                      whiteSpace: "pre-wrap"
                    }}>
                      {searchResults[selectedSector].analysis}
                    </div>
                  </div>
                )}

                {isSearching && (
                  <div className="pulse-anim" style={{
                    textAlign: "center", padding: 30, color: "#d97706", fontSize: 14
                  }}>
                    ⏳ AI araştırma yapıyor... Bu işlem 15-30 saniye sürebilir.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* LEAD MANAGEMENT */}
        {activeTab === "leads" && (
          <div className="fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>📋 Lead Yönetimi</h2>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {getFilteredCompanies().length} / {totalLeads} firma gösteriliyor
              </div>
            </div>

            {/* Filters */}
            <div style={{
              display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap",
              background: "#fff", padding: 14, borderRadius: 12, border: "1px solid #e2e8f0"
            }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 Firma, şehir veya sektör ara..."
                style={{
                  flex: 1, minWidth: 200, background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#1e293b"
                }}
              />
              <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
                style={{
                  background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "8px 14px", fontSize: 12, color: "#475569"
                }}>
                <option value="all">Tüm Sektörler</option>
                {sectorKeys.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{
                  background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "8px 14px", fontSize: 12, color: "#475569"
                }}>
                <option value="all">Tüm Durumlar</option>
                {Object.entries(LEAD_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {/* Lead Table */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b", background: "#f8fafc" }}>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>#</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>Firma</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>Sektör</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>Şehir</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>İhtiyaç</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>Durum</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredCompanies().map((c, idx) => (
                      <tr key={idx} className="company-row" style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{idx + 1}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "#0f172a" }}>{c.name}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{
                            background: "rgba(59,130,246,0.08)", color: "#2563eb",
                            padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500
                          }}>{c.sectorLabel}</span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>{c.city || "-"}</td>
                        <td style={{ padding: "10px 14px", color: "#059669", fontSize: 11 }}>{c.need}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <select
                            value={leadStatuses[c.name] || "new"}
                            onChange={e => updateLeadStatus(c.name, e.target.value)}
                            style={{
                              background: LEAD_STATUSES[leadStatuses[c.name] || "new"].bg,
                              color: LEAD_STATUSES[leadStatuses[c.name] || "new"].color,
                              border: "none", borderRadius: 20, padding: "4px 10px",
                              fontSize: 11, fontWeight: 600, cursor: "pointer"
                            }}
                          >
                            {Object.entries(LEAD_STATUSES).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <button className="action-btn"
                            onClick={() => setSelectedCompany(c)}
                            style={{
                              background: "#f0f9ff", border: "1px solid #bfdbfe",
                              color: "#2563eb", borderRadius: 8, padding: "4px 10px",
                              fontSize: 11, fontWeight: 600
                            }}>Detay</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CHAT */}
        {activeTab === "chat" && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
              🤖 Stinga AI Satış Asistanı
            </h2>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
              Potansiyel müşteriler, sektör analizleri, satış stratejileri ve Stinga teknolojileri hakkında sorular sorun.
            </p>

            <div style={{
              flex: 1, background: "#fff", border: "1px solid #e2e8f0",
              borderRadius: "14px 14px 0 0", padding: 16, overflowY: "auto",
              display: "flex", flexDirection: "column", gap: 12
            }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                  <p style={{ fontSize: 36, marginBottom: 12 }}>💬</p>
                  <p style={{ fontSize: 13, color: "#64748b" }}>Örnek sorular:</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, alignItems: "center" }}>
                    {[
                      "Tavuk çiftlikleri için satış stratejisi öner",
                      "Kömür madenciliği firmalarına nasıl yaklaşmalıyız?",
                      "Erdemir'e nasıl teklif hazırlamalıyız?",
                      "Kümes ısıtma kazanlarımızın avantajları neler?",
                      "Hangi firmalar arıtma çamuru bertarafı yapıyor?"
                    ].map((q, i) => (
                      <button key={i} onClick={() => setChatInput(q)}
                        style={{
                          background: "#f0fdf4", border: "1px solid #bbf7d0",
                          color: "#15803d", borderRadius: 10, padding: "8px 16px",
                          fontSize: 12, cursor: "pointer", maxWidth: 400
                        }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className="slide-in" style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, #10b981, #059669)"
                    : "#f8fafc",
                  border: msg.role === "user" ? "none" : "1px solid #e2e8f0",
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  padding: "12px 16px",
                  animationDelay: `${i * 0.05}s`
                }}>
                  <p style={{
                    fontSize: 13, color: msg.role === "user" ? "#fff" : "#334155",
                    lineHeight: 1.6, whiteSpace: "pre-wrap"
                  }}>{msg.content}</p>
                </div>
              ))}
              {isChatLoading && (
                <div className="pulse-anim" style={{
                  alignSelf: "flex-start", background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14, padding: "12px 20px"
                }}>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>⏳ Düşünüyor...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{
              display: "flex", gap: 8, background: "#fff",
              border: "1px solid #e2e8f0", borderTop: "none",
              borderRadius: "0 0 14px 14px", padding: 12
            }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleChat()}
                placeholder="Sorunuzu yazın..."
                style={{
                  flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: 10, padding: "10px 16px", color: "#1e293b",
                  fontSize: 13, fontFamily: "inherit"
                }}
              />
              <button className="action-btn" onClick={handleChat} style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#fff", border: "none", borderRadius: 10,
                padding: "10px 20px", fontSize: 13, fontWeight: 600
              }}>Gönder</button>
            </div>
          </div>
        )}

        {/* LOG */}
        {activeTab === "log" && (
          <div className="fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>📝 İşlem Geçmişi</h2>
              <span style={{ fontSize: 12, color: "#64748b" }}>{searchLog.length} kayıt</span>
            </div>
            <div style={{
              background: "#fff", border: "1px solid #e2e8f0",
              borderRadius: 14, padding: 16, fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, maxHeight: 500, overflowY: "auto"
            }}>
              {searchLog.length === 0 ? (
                <p style={{ color: "#94a3b8", textAlign: "center", padding: 30 }}>
                  Henüz işlem yapılmadı. Dashboard'dan tarama başlatın.
                </p>
              ) : (
                searchLog.map((log, i) => (
                  <div key={i} className="slide-in" style={{
                    padding: "8px 0", borderBottom: "1px solid #f1f5f9",
                    color: "#475569", animationDelay: `${i * 0.02}s`
                  }}>
                    <span style={{ color: "#94a3b8" }}>[{log.time}]</span>{" "}
                    <span>{log.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Company Detail Modal */}
      {selectedCompany && (
        <div className="modal-overlay" onClick={() => setSelectedCompany(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                  {selectedCompany.name}
                </h3>
                <span style={{
                  background: "rgba(59,130,246,0.08)", color: "#2563eb",
                  padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600
                }}>{selectedCompany.sector}</span>
              </div>
              <button onClick={() => setSelectedCompany(null)} style={{
                background: "#f1f5f9", border: "none", borderRadius: 8,
                width: 32, height: 32, fontSize: 16, cursor: "pointer", color: "#64748b"
              }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>Şehir</div>
                <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>{selectedCompany.city || "-"}</div>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>Telefon</div>
                <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>{selectedCompany.phone || "-"}</div>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>E-Posta</div>
                <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 500 }}>{selectedCompany.email || "-"}</div>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>Website</div>
                <a href={`https://${selectedCompany.website}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 13, color: "#2563eb", fontWeight: 500, textDecoration: "none" }}>{selectedCompany.website}</a>
              </div>
            </div>

            <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, marginBottom: 4 }}>Stinga İhtiyacı</div>
              <div style={{ fontSize: 13, color: "#15803d" }}>{selectedCompany.need}</div>
            </div>

            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>Firma Hakkında</div>
              <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>{selectedCompany.note}</div>
            </div>

            {/* Lead Note */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 6 }}>Notlarınız</div>
              <textarea
                value={leadNotes[selectedCompany.name] || ""}
                onChange={e => updateLeadNote(selectedCompany.name, e.target.value)}
                placeholder="Bu firma hakkında notlarınızı yazın..."
                rows={3}
                style={{
                  width: "100%", background: "#fff", border: "1px solid #e2e8f0",
                  borderRadius: 10, padding: 12, fontSize: 13, color: "#1e293b",
                  resize: "vertical", fontFamily: "inherit"
                }}
              />
            </div>

            {/* Status */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 8 }}>Lead Durumu</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(LEAD_STATUSES).map(([k, v]) => (
                  <button key={k} className="status-pill"
                    onClick={() => updateLeadStatus(selectedCompany.name, k)}
                    style={{
                      background: leadStatuses[selectedCompany.name] === k ? v.color : v.bg,
                      color: leadStatuses[selectedCompany.name] === k ? "#fff" : v.color,
                    }}
                  >{v.label}</button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selectedCompany.lat && selectedCompany.lng && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${selectedCompany.lat},${selectedCompany.lng}`}
                  target="_blank" rel="noreferrer"
                  className="action-btn"
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                    color: "#fff", borderRadius: 10, padding: "10px 18px",
                    fontSize: 12, fontWeight: 600, textDecoration: "none",
                    display: "inline-flex", alignItems: "center", gap: 6
                  }}>📍 Haritada Göster</a>
              )}
              {selectedCompany.linkedin && selectedCompany.linkedin !== "-" && (
                <a href={`https://${selectedCompany.linkedin}`}
                  target="_blank" rel="noreferrer"
                  className="action-btn"
                  style={{
                    background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                    color: "#fff", borderRadius: 10, padding: "10px 18px",
                    fontSize: 12, fontWeight: 600, textDecoration: "none",
                    display: "inline-flex", alignItems: "center", gap: 6
                  }}>💼 LinkedIn</a>
              )}
              <a href={`mailto:${selectedCompany.email}`}
                className="action-btn"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#fff", borderRadius: 10, padding: "10px 18px",
                  fontSize: 12, fontWeight: 600, textDecoration: "none",
                  display: "inline-flex", alignItems: "center", gap: 6
                }}>📧 E-Posta Gönder</a>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        padding: "12px 24px", borderTop: "1px solid #e2e8f0",
        background: "#fff", textAlign: "center",
        fontSize: 11, color: "#94a3b8",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8
      }}>
        <img src={STINGA_LOGO} alt="" style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid #e2e8f0" }} />
        Stinga Lead Agent v2.0 — AI destekli B2B müşteri araştırma platformu — Gemini AI ile güçlendirilmiştir
      </footer>
    </div>
  );
}
