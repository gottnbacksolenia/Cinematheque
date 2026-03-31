# Cinémathèque - Yerel Film Kütüphanesi

> Windows için yerel film kütüphane uygulaması — Electron tabanlı masaüstü uygulaması

## Özellikler

- Yerel disk üzerindeki film dosyalarını otomatik tarama ve listeleme
- Film adına göre arama ve filtreleme
- Seyredildi / İzlenecekler listesi yönetimi
- Film detayları ve kapak görseli
- Portable (kurulum gerektirmez) Windows uygulaması

## Kurulum

### Gereksinimler

- [Node.js](https://nodejs.org/) 20+
- [Git](https://git-scm.com/)

### Geliştirme Ortamı

```bash
# Repoyu klonla
git clone https://github.com/gottnbacksolenia/Cinematheque.git
cd Cinematheque

# Bağımlılıkları yükle
npm install

# Uygulamayı başlat
npm start
```

### Derleme (Windows Portable EXE)

```bash
npm run build
```

Çıktı: `../cinematheque-exe/Cinematheque.exe`

## Proje Yapısı

```
├── main.js          # Electron ana süreç
├── preload.js       # Güvenli IPC köprüsü
├── index.html       # Uygulama giriş noktası
├── favicon.svg      # Uygulama ikonu
├── assets/          # Derlenmiş UI (React + CSS)
└── package.json     # Proje yapılandırması
```

## Teknolojiler

- **Electron** — Masaüstü uygulama çerçevesi
- **React** — Kullanıcı arayüzü
- **Vite** — Derleme aracı
- **electron-builder** — Paketleme ve dağıtım

## Lisans

MIT
