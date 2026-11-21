import type { WorkspaceState } from '../../types';
import { createHospitalDemoState } from './hospitalDemoData';

export type SectorPackId = 'hastane' | 'restoran' | 'santiye' | 'eticaret';

export interface SectorPack {
  id: SectorPackId;
  name: string;
  badge: string;
  description: string;
  createState: () => WorkspaceState;
}

function createRestaurantDemoState(): WorkspaceState {
  const chartSeries = [
    { period: 'Oca 2026', patients: 11200, discharged: 10980, revenue: 4120000, cost: 3190000, profit: 930000, margin: 22.6 },
    { period: 'Şub 2026', patients: 11850, discharged: 11640, revenue: 4380000, cost: 3340000, profit: 1040000, margin: 23.7 },
    { period: 'Mar 2026', patients: 12900, discharged: 12710, revenue: 4860000, cost: 3650000, profit: 1210000, margin: 24.9 },
    { period: 'Nis 2026', patients: 13640, discharged: 13450, revenue: 5240000, cost: 3890000, profit: 1350000, margin: 25.8 },
    { period: 'May 2026', patients: 14580, discharged: 14410, revenue: 5690000, cost: 4180000, profit: 1510000, margin: 26.5 },
    { period: 'Haz 2026', patients: 15420, discharged: 15250, revenue: 6150000, cost: 4460000, profit: 1690000, margin: 27.5 },
  ];

  return {
    workspaceName: 'Zeytinli Ocakbaşı & Bistro (3 Şube)',
    sector: 'Restoran & Gıda Operasyonu',
    chartSeries,
    documents: [
      {
        id: 'doc_rest_fin',
        name: '2026_Sube_Ciro_ve_FoodCost_Raporu.xlsx',
        kind: 'excel',
        size: 112_400,
        uploadedAt: '2026-06-28T10:10:00.000Z',
        category: 'Finans & Mali Analiz',
        summary: '3 şubenin 6 aylık adisyon hacmi, ciro, gıda maliyeti (food cost) ve net kâr tablosu çözümlendi.',
        status: 'ready',
        tables: [
          {
            name: 'Şube Performans',
            headers: ['Dönem', 'Adisyon', 'Tamamlanan', 'Gelir (TL)', 'Gider (TL)', 'Net Kâr (TL)', 'Kâr Marjı (%)'],
            rows: chartSeries.map((pt) => ({
              Dönem: pt.period,
              Adisyon: pt.patients,
              Tamamlanan: pt.discharged,
              'Gelir (TL)': pt.revenue,
              'Gider (TL)': pt.cost,
              'Net Kâr (TL)': pt.profit,
              'Kâr Marjı (%)': pt.margin,
            })),
          },
        ],
        rawText:
          '2026 ilk 6 ayda 3 şubede toplam 79.590 adisyon, 30.440.000 TL ciro, 7.730.000 TL net kâr ve %25,4 ortalama kâr marjı elde edildi. Kadıköy şubesi en yüksek ciroyu sağladı.',
      },
      {
        id: 'doc_rest_hygiene',
        name: 'Mutfak_Soguk_Hava_ve_Baca_Bakim_Tutanagi.pdf',
        kind: 'pdf',
        size: 245_100,
        uploadedAt: '2026-06-26T15:20:00.000Z',
        category: 'Tesis & Bakım',
        summary: '2 sayfa PDF çözümlendi; soğuk hava deposu, davlumbaz baca temizliği ve belediye hijyen denetim tarihleri çıkarıldı.',
        status: 'ready',
        tables: [],
        rawText:
          'Kadıköy ve Beşiktaş şubeleri davlumbaz yağ filtresi ve baca temizliği son tarih: 09.07.2026.\nSoğuk hava deposu (+2°C) kompresör gaz basıncı kontrolü: 11.07.2026.\nTarım ve Orman Bakanlığı gıda hijyen numune denetimi hazırlık kontrolü: 16.07.2026.',
      },
      {
        id: 'doc_rest_inv',
        name: 'Tedarikci_Et_ve_Zeytinyagi_Faturasi_OCR.png',
        kind: 'image',
        size: 488_900,
        uploadedAt: '2026-06-29T08:15:00.000Z',
        category: 'Finans & Mali Analiz',
        summary: 'OCR ile fatura bilgileri çıkarıldı (VKN: 4820913456, KDV %1 / %10, Toplam: 184.500 TL).',
        ocrUsed: true,
        status: 'ready',
        tables: [],
        rawText:
          'Fatura No: GDA20260004821\nTarih: 28.06.2026\nVKN: 4820913456\nKDV Matrahı: 168.000,00 TL\nHesaplanan KDV (%10): 16.500,00 TL\nÖdenecek Tutar: 184.500,00 TL\nSon Ödeme Tarihi: 13.07.2026',
      },
    ],
    assets: [
      {
        id: 'ast_rest_cold',
        name: 'Kadıköy Şube Soğuk Hava Deposu (-18°C / +4°C)',
        code: 'MTF-01',
        department: 'Kadıköy Mutfak',
        category: 'Soğuk Zincir Ekipmanı',
        acquiredAt: '2025-11-10',
        status: 'attention',
        nextMaintenanceDate: '2026-07-11',
        notes: 'Kapı contası değişimi ve kompresör gaz ölçümü gerekiyor.',
        linkedDocIds: ['doc_rest_hygiene'],
      },
      {
        id: 'ast_rest_hood',
        name: 'Beşiktaş Şube Endüstriyel Davlumbaz & Sulu Filtre',
        code: 'MTF-04',
        department: 'Beşiktaş Mutfak',
        category: 'Havalandırma & Güvenlik',
        status: 'maintenance',
        nextMaintenanceDate: '2026-07-09',
        notes: '3 aylık yetkili baca temizlik sertifikası yenilenecek.',
        linkedDocIds: ['doc_rest_hygiene'],
      },
      {
        id: 'ast_rest_oven',
        name: 'Rational iCombi Pro 10-1/1 Fırın (2 Adet)',
        code: 'MTF-08',
        department: 'Merkez Üretim',
        category: 'Pişirme Ekipmanı',
        acquiredAt: '2026-01-20',
        status: 'active',
        nextMaintenanceDate: '2026-08-01',
        notes: 'Kireç temizliği ve su yumuşatma kartuşu güncel.',
        linkedDocIds: ['doc_rest_fin'],
      },
    ],
    reminders: [
      {
        id: 'rem_rest_hood',
        title: 'Beşiktaş & Kadıköy davlumbaz baca temizliği ve sertifika yenileme',
        dueDate: '2026-07-09',
        priority: 'high',
        category: 'maintenance',
        completed: false,
        sourceDocId: 'doc_rest_hygiene',
        assetId: 'ast_rest_hood',
        autoExtracted: true,
      },
      {
        id: 'rem_rest_cold',
        title: 'Soğuk hava deposu kompresör & sıcaklık sensörü kalibrasyonu',
        dueDate: '2026-07-11',
        priority: 'high',
        category: 'maintenance',
        completed: false,
        sourceDocId: 'doc_rest_hygiene',
        assetId: 'ast_rest_cold',
        autoExtracted: true,
      },
      {
        id: 'rem_rest_inv',
        title: 'Gıda tedarikçi faturası (184.500 TL) son ödeme günü',
        dueDate: '2026-07-13',
        priority: 'high',
        category: 'finance',
        completed: false,
        sourceDocId: 'doc_rest_inv',
        autoExtracted: true,
      },
      {
        id: 'rem_rest_hyg',
        title: 'Gıda hijyen ve HACCP kayıt defteri aylık iç denetimi',
        dueDate: '2026-07-16',
        priority: 'medium',
        category: 'other',
        completed: false,
        sourceDocId: 'doc_rest_hygiene',
        autoExtracted: true,
      },
    ],
    metrics: [
      { id: 'met_rest_vol', label: 'Toplam Adisyon (6 Ay)', value: 79590, unit: 'adisyon', period: 'Oca–Haz 2026', category: 'volume', sourceDocId: 'doc_rest_fin' },
      { id: 'met_rest_rev', label: 'Toplam Ciro (6 Ay)', value: 30440000, unit: 'TL', period: 'Oca–Haz 2026', category: 'revenue', sourceDocId: 'doc_rest_fin' },
      { id: 'met_rest_cost', label: 'Toplam Maliyet (6 Ay)', value: 22710000, unit: 'TL', period: 'Oca–Haz 2026', category: 'cost', sourceDocId: 'doc_rest_fin' },
      { id: 'met_rest_prof', label: 'Net Kâr (6 Ay)', value: 7730000, unit: 'TL', period: 'Oca–Haz 2026', category: 'profit', sourceDocId: 'doc_rest_fin' },
    ],
  };
}

function createConstructionDemoState(): WorkspaceState {
  const chartSeries = [
    { period: 'Oca 2026', patients: 142, discharged: 138, revenue: 18500000, cost: 15200000, profit: 3300000, margin: 17.8 },
    { period: 'Şub 2026', patients: 156, discharged: 151, revenue: 21400000, cost: 17300000, profit: 4100000, margin: 19.2 },
    { period: 'Mar 2026', patients: 168, discharged: 164, revenue: 24900000, cost: 19850000, profit: 5050000, margin: 20.3 },
    { period: 'Nis 2026', patients: 175, discharged: 172, revenue: 27600000, cost: 21700000, profit: 5900000, margin: 21.4 },
    { period: 'May 2026', patients: 184, discharged: 180, revenue: 31200000, cost: 24400000, profit: 6800000, margin: 21.8 },
    { period: 'Haz 2026', patients: 192, discharged: 189, revenue: 34800000, cost: 26900000, profit: 7900000, margin: 22.7 },
  ];

  return {
    workspaceName: 'Kuzey Vadi Karma Proje — Şantiye Yönetimi',
    sector: 'İnşaat & Şantiye Operasyonu',
    chartSeries,
    documents: [
      {
        id: 'doc_const_hakedis',
        name: '2026_Aylik_Hakedis_ve_Saha_Maliyet.xlsx',
        kind: 'excel',
        size: 164_200,
        uploadedAt: '2026-06-28T13:00:00.000Z',
        category: 'Finans & Mali Analiz',
        summary: '6 aylık hakediş, taşeron maliyetleri, saha personel sayısı ve proje kârlılığı çözümlendi.',
        status: 'ready',
        tables: [
          {
            name: 'Hakediş Özeti',
            headers: ['Dönem', 'Saha Personeli', 'Aktif Görev', 'Gelir (TL)', 'Gider (TL)', 'Net Kâr (TL)', 'Kâr Marjı (%)'],
            rows: chartSeries.map((pt) => ({
              Dönem: pt.period,
              'Saha Personeli': pt.patients,
              'Aktif Görev': pt.discharged,
              'Gelir (TL)': pt.revenue,
              'Gider (TL)': pt.cost,
              'Net Kâr (TL)': pt.profit,
              'Kâr Marjı (%)': pt.margin,
            })),
          },
        ],
        rawText:
          'Kuzey Vadi şantiyesi 6 aylık toplam hakediş geliri 158.400.000 TL, toplam saha maliyeti 125.350.000 TL, net kâr 33.050.000 TL (%20,9). Haziran ayında B Blok kaba inşaatı %94 tamamlandı.',
      },
      {
        id: 'doc_const_isg',
        name: 'ISG_Periyodik_Makine_Kontrol_ve_Vinc_Raporu.pdf',
        kind: 'pdf',
        size: 382_000,
        uploadedAt: '2026-06-27T09:40:00.000Z',
        category: 'Tesis & Bakım',
        summary: '4 sayfa İSG raporu çözümlendi; Kule Vinç #2 periyodik muayene ve beton numune kırımı son tarihleri çıkarıldı.',
        status: 'ready',
        tables: [],
        rawText:
          'İSG PERİYODİK KONTROL TAKVİMİ\n1. Kule Vinç #2 (Liebherr 200 EC-H) halat ve fren yük testi son tarih: 10.07.2026.\n2. B Blok 8. Kat C35 beton 28 günlük basınç dayanım testi: 12.07.2026.\n3. Taşeron Haziran ayı SGK bildirge ve hakediş kesinti kontrolü: 15.07.2026.',
      },
    ],
    assets: [
      {
        id: 'ast_const_crane',
        name: 'Liebherr 200 EC-H Kule Vinç #2',
        code: 'SNT-VNC-02',
        department: 'B Blok Saha',
        category: 'Ağır İş Makinesi',
        acquiredAt: '2025-09-01',
        status: 'attention',
        nextMaintenanceDate: '2026-07-10',
        notes: '3 aylık MMO onaylı halat & yük testi yaklaşmakta.',
        linkedDocIds: ['doc_const_isg'],
      },
      {
        id: 'ast_const_pump',
        name: 'Putzmeister 42m Mobil Beton Pompası',
        code: 'SNT-BMP-01',
        department: 'Beton & Kaba Yapı',
        category: 'İş Makinesi',
        status: 'active',
        nextMaintenanceDate: '2026-07-25',
        notes: 'Hidrolik basınç testleri güncel.',
        linkedDocIds: ['doc_const_isg'],
      },
      {
        id: 'ast_const_gen',
        name: 'Şantiye Ana Jeneratör & Pano Grubu (800 kVA)',
        code: 'SNT-ELK-03',
        department: 'Elektrik & Altyapı',
        category: 'Enerji Altyapısı',
        status: 'active',
        nextMaintenanceDate: '2026-07-20',
        notes: 'Topraklama ölçümü Mayıs 2026 tarihinde onaylandı.',
        linkedDocIds: ['doc_const_isg'],
      },
    ],
    reminders: [
      {
        id: 'rem_const_crane',
        title: 'Kule Vinç #2 periyodik yük testi ve İSG uygunluk raporu',
        dueDate: '2026-07-10',
        priority: 'high',
        category: 'maintenance',
        completed: false,
        sourceDocId: 'doc_const_isg',
        assetId: 'ast_const_crane',
        autoExtracted: true,
      },
      {
        id: 'rem_const_beton',
        title: 'B Blok 8. Kat C35 beton 28 günlük laboratuvar kırım sonucu',
        dueDate: '2026-07-12',
        priority: 'high',
        category: 'other',
        completed: false,
        sourceDocId: 'doc_const_isg',
        autoExtracted: true,
      },
      {
        id: 'rem_const_hakedis',
        title: 'Taşeron Haziran hakediş ve SGK borcu yoktur mutabakatı',
        dueDate: '2026-07-15',
        priority: 'high',
        category: 'finance',
        completed: false,
        sourceDocId: 'doc_const_isg',
        autoExtracted: true,
      },
    ],
    metrics: [
      { id: 'met_const_staff', label: 'Ort. Saha Personeli', value: 170, unit: 'kişi', period: 'Oca–Haz 2026', category: 'volume', sourceDocId: 'doc_const_hakedis' },
      { id: 'met_const_rev', label: 'Toplam Hakediş (6 Ay)', value: 158400000, unit: 'TL', period: 'Oca–Haz 2026', category: 'revenue', sourceDocId: 'doc_const_hakedis' },
      { id: 'met_const_cost', label: 'Toplam Saha Maliyeti', value: 125350000, unit: 'TL', period: 'Oca–Haz 2026', category: 'cost', sourceDocId: 'doc_const_hakedis' },
      { id: 'met_const_prof', label: 'Net Proje Kârı', value: 33050000, unit: 'TL', period: 'Oca–Haz 2026', category: 'profit', sourceDocId: 'doc_const_hakedis' },
    ],
  };
}

function createEcommerceDemoState(): WorkspaceState {
  const chartSeries = [
    { period: 'Oca 2026', patients: 8420, discharged: 8110, revenue: 6420000, cost: 4980000, profit: 1440000, margin: 22.4 },
    { period: 'Şub 2026', patients: 9150, discharged: 8860, revenue: 7080000, cost: 5410000, profit: 1670000, margin: 23.6 },
    { period: 'Mar 2026', patients: 10340, discharged: 10020, revenue: 8120000, cost: 6150000, profit: 1970000, margin: 24.3 },
    { period: 'Nis 2026', patients: 11280, discharged: 10940, revenue: 8960000, cost: 6720000, profit: 2240000, margin: 25.0 },
    { period: 'May 2026', patients: 12650, discharged: 12310, revenue: 10180000, cost: 7540000, profit: 2640000, margin: 25.9 },
    { period: 'Haz 2026', patients: 13890, discharged: 13520, revenue: 11340000, cost: 8280000, profit: 3060000, margin: 27.0 },
  ];

  return {
    workspaceName: 'Anatolia Home & Living — E-Ticaret',
    sector: 'E-Ticaret & Depo Lojistik',
    chartSeries,
    documents: [
      {
        id: 'doc_ecom_sales',
        name: '2026_Pazaryeri_Siparis_ve_Karlilik.xlsx',
        kind: 'excel',
        size: 135_600,
        uploadedAt: '2026-06-29T09:00:00.000Z',
        category: 'Finans & Mali Analiz',
        summary: '6 aylık sipariş hacmi, teslim edilen kargo, pazaryeri ciro, reklam/komisyon gideri ve net marj çözümlendi.',
        status: 'ready',
        tables: [
          {
            name: 'Pazaryeri Özet',
            headers: ['Dönem', 'Sipariş', 'Teslim Edilen', 'Gelir (TL)', 'Gider (TL)', 'Net Kâr (TL)', 'Kâr Marjı (%)'],
            rows: chartSeries.map((pt) => ({
              Dönem: pt.period,
              Sipariş: pt.patients,
              'Teslim Edilen': pt.discharged,
              'Gelir (TL)': pt.revenue,
              'Gider (TL)': pt.cost,
              'Net Kâr (TL)': pt.profit,
              'Kâr Marjı (%)': pt.margin,
            })),
          },
        ],
        rawText:
          '2026 ilk 6 ayda 65.730 sipariş, 63.760 başarılı teslimat (%2,9 iade oranı), 52.100.000 TL ciro ve 13.020.000 TL net kâr (%25,0 ortalama marj) gerçekleşti.',
      },
      {
        id: 'doc_ecom_ops',
        name: 'Depo_SLA_ve_Pazaryeri_Mutabakat_Takvimi.pdf',
        kind: 'pdf',
        size: 198_400,
        uploadedAt: '2026-06-27T16:45:00.000Z',
        category: 'Genel Operasyon',
        summary: '2 sayfa operasyon takvimi çözümlendi; pazaryeri komisyon mutabakatı, KDV beyanı ve depo barkod yazıcı bakımı çıkarıldı.',
        status: 'ready',
        tables: [],
        rawText:
          '1. Trendyol & Hepsiburada Haziran ayı komisyon ve kargo kesinti mutabakatı: 11.07.2026.\n2. Otomatik paketleme bandı ve Zebra ZT411 barkod yazıcı kafa bakımı: 13.07.2026.\n3. KDV-1 ve e-Fatura mutabakat kontrolü son tarih: 24.07.2026.',
      },
    ],
    assets: [
      {
        id: 'ast_ecom_belt',
        name: 'Otomatik Koli Bantlama & Konveyör Hattı #1',
        code: 'DP-HAT-01',
        department: 'Tuzla Ana Depo',
        category: 'Depo Otomasyon',
        acquiredAt: '2026-01-15',
        status: 'active',
        nextMaintenanceDate: '2026-07-19',
        notes: 'Günlük 1.200 koli kapasite ile çalışıyor.',
        linkedDocIds: ['doc_ecom_ops'],
      },
      {
        id: 'ast_ecom_zebra',
        name: 'Zebra ZT411 Endüstriyel Barkod Yazıcı (4 Adet)',
        code: 'DP-BRK-04',
        department: 'Paketleme Alanı',
        category: 'Etiketleme Ekipmanı',
        status: 'maintenance',
        nextMaintenanceDate: '2026-07-13',
        notes: 'Termal yazıcı kafa temizliği ve sensör kalibrasyonu planlandı.',
        linkedDocIds: ['doc_ecom_ops'],
      },
      {
        id: 'ast_ecom_rf',
        name: 'Honeywell EDA52 El Terminali Filosu (12 Adet)',
        code: 'DP-WMS-12',
        department: 'Stok & Toplama',
        category: 'WMS Donanımı',
        status: 'active',
        nextMaintenanceDate: '2026-08-10',
        notes: 'Batarya sağlık oranı %92 üzerinde.',
        linkedDocIds: ['doc_ecom_sales'],
      },
    ],
    reminders: [
      {
        id: 'rem_ecom_mutabakat',
        title: 'Trendyol & Hepsiburada Haziran komisyon / kargo kesinti mutabakatı',
        dueDate: '2026-07-11',
        priority: 'high',
        category: 'finance',
        completed: false,
        sourceDocId: 'doc_ecom_ops',
        autoExtracted: true,
      },
      {
        id: 'rem_ecom_zebra',
        title: 'Zebra ZT411 barkod yazıcı termal kafa bakımı',
        dueDate: '2026-07-13',
        priority: 'medium',
        category: 'maintenance',
        completed: false,
        sourceDocId: 'doc_ecom_ops',
        assetId: 'ast_ecom_zebra',
        autoExtracted: true,
      },
      {
        id: 'rem_ecom_kdv',
        title: 'KDV-1 ve e-Fatura / e-Arşiv aylık mutabakat kontrolü',
        dueDate: '2026-07-24',
        priority: 'high',
        category: 'finance',
        completed: false,
        sourceDocId: 'doc_ecom_ops',
        autoExtracted: true,
      },
    ],
    metrics: [
      { id: 'met_ecom_ord', label: 'Toplam Sipariş (6 Ay)', value: 65730, unit: 'sipariş', period: 'Oca–Haz 2026', category: 'volume', sourceDocId: 'doc_ecom_sales' },
      { id: 'met_ecom_rev', label: 'Toplam Ciro (6 Ay)', value: 52100000, unit: 'TL', period: 'Oca–Haz 2026', category: 'revenue', sourceDocId: 'doc_ecom_sales' },
      { id: 'met_ecom_cost', label: 'Toplam Gider (6 Ay)', value: 39080000, unit: 'TL', period: 'Oca–Haz 2026', category: 'cost', sourceDocId: 'doc_ecom_sales' },
      { id: 'met_ecom_prof', label: 'Net Kâr (6 Ay)', value: 13020000, unit: 'TL', period: 'Oca–Haz 2026', category: 'profit', sourceDocId: 'doc_ecom_sales' },
    ],
  };
}

export const SECTOR_PACKS: SectorPack[] = [
  {
    id: 'hastane',
    name: 'Hastane & Klinik',
    badge: 'Sağlık',
    description:
      'Hasta hacmi, gelir/kâr marjı, 4 yeni tıbbi cihaz, Ameliyathane/WC bakımı ve SUT/Medula takvimi.',
    createState: createHospitalDemoState,
  },
  {
    id: 'restoran',
    name: 'Restoran & Şube',
    badge: 'Gıda',
    description:
      '3 şube ciro ve food-cost analizi, soğuk hava/davlumbaz bakımı, tedarikçi fatura OCR ve hijyen takibi.',
    createState: createRestaurantDemoState,
  },
  {
    id: 'santiye',
    name: 'Şantiye & Hakediş',
    badge: 'İnşaat',
    description:
      'Aylık hakediş ve saha maliyeti, kule vinç/pompa periyodik İSG kontrolleri ve beton numune takvimi.',
    createState: createConstructionDemoState,
  },
  {
    id: 'eticaret',
    name: 'E-Ticaret & Depo',
    badge: 'Perakende',
    description:
      'Sipariş/teslimat hacmi, pazaryeri komisyon mutabakatı, konveyör/barkod ekipman ve KDV takibi.',
    createState: createEcommerceDemoState,
  },
];

export function getSectorPackById(id: string): SectorPack | undefined {
  const norm = id.trim().toLowerCase();
  return SECTOR_PACKS.find((p) => p.id === norm);
}
