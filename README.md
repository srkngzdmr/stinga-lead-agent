# 🚀 Stinga Lead Agent — Railway Deploy Rehberi

## Bu Nedir?
AI destekli B2B müşteri araştırma platformu. Stinga Enerji'nin emisyonsuz yanma, kömür kurutma, aktif karbon ve bertaraf teknolojileri için potansiyel müşterileri bulur ve analiz eder.

## Özellikler
- 📊 8 sektörde 40+ hazır potansiyel müşteri
- 🤖 Gemini + Claude AI ile canlı sektör araştırması
- 💬 AI satış asistanı (sohbet)
- 📋 Firma listesi (website, LinkedIn, e-posta, telefon)
- 📝 İşlem log'u

---

## ⚡ Railway'e Deploy (Adım Adım)

### 1. GitHub Repo Oluştur
```bash
# Proje klasörüne gir
cd stinga-lead-agent

# Git başlat
git init
git add .
git commit -m "Stinga Lead Agent v1.0"

# GitHub'da yeni repo oluştur: github.com/new
# Repo adı: stinga-lead-agent

git remote add origin https://github.com/KULLANICI_ADIN/stinga-lead-agent.git
git branch -M main
git push -u origin main
```

### 2. Railway'e Bağla
1. **https://railway.app** adresine git
2. **"New Project"** tıkla
3. **"Deploy from GitHub repo"** seç
4. Az önce oluşturduğun **stinga-lead-agent** reposunu seç
5. Railway otomatik olarak build edecek

### 3. Environment Variables Ekle (ÇOK ÖNEMLİ!)
Railway dashboard'unda:
1. Projene tıkla
2. **"Variables"** sekmesine git
3. Şu değişkenleri ekle:

| Değişken | Değer | Açıklama |
|----------|-------|----------|
| `GEMINI_API_KEY` | `AIza...` | Google AI Studio'dan al |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Anthropic Console'dan al |
| `NODE_ENV` | `production` | Otomatik ayarlanır |

> **Not:** En az birini eklemelisiniz. Gemini öncelikli kullanılır, yoksa Claude devreye girer.

### 4. Gemini API Key Nasıl Alınır?
1. https://aistudio.google.com adresine git
2. Google hesabınla giriş yap
3. Sol menüden **"Get API Key"** tıkla
4. **"Create API Key"** tıkla
5. Key'i kopyala → Railway'e yapıştır

### 5. Domain Ayarla
Railway dashboard'unda:
1. **"Settings"** sekmesi
2. **"Networking"** → **"Generate Domain"** tıkla
3. Özel domain isterseniz: `lead-agent.stinga.biz` gibi ekleyebilirsiniz

### 6. Deploy Tamamlandı! 🎉
Railway'in verdiği URL'yi ziyaret edin:
```
https://stinga-lead-agent-production.up.railway.app
```

---

## 🛠 Lokal Geliştirme

```bash
# Bağımlılıkları kur
npm install

# .env dosyası oluştur
cp .env.example .env
# .env dosyasına API key'leri ekle

# Geliştirme sunucusu başlat
npm run dev

# Tarayıcıda aç: http://localhost:3000
```

---

## 📁 Dosya Yapısı
```
stinga-lead-agent/
├── server.js          # Express backend (API proxy)
├── vite.config.js     # Vite build config
├── index.html         # HTML entry
├── package.json       # Bağımlılıklar
├── nixpacks.toml      # Railway build config
├── Procfile           # Railway start komutu
├── .env.example       # Env örneği
├── .gitignore
└── src/
    ├── main.jsx       # React entry
    └── App.jsx        # Ana uygulama
```

## 🔒 Güvenlik
- API key'ler **server.js** üzerinden proxy edilir, frontend'de görünmez
- `/api/ai-search` endpoint'i backend'de çalışır
- Environment variables ile yönetilir

## 🔧 Sorun Giderme
- **"API ✗" görünüyorsa:** Environment variable'ları kontrol edin
- **Build hatası:** `npm run build` lokal olarak çalıştırıp test edin
- **Port hatası:** Railway otomatik PORT atar, değiştirmeyin
