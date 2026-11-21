import type { WorkspaceState } from '../../types';

export interface MissingEvidenceItem {
  id: string;
  entityType: 'asset' | 'reminder' | 'document';
  entityId: string;
  title: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
  actionHint: string;
}

export interface AuditReadinessResult {
  score: number;
  totalChecks: number;
  passedChecks: number;
  missingItems: MissingEvidenceItem[];
  assetMissingIds: string[];
}

function normalizeTr(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

export function computeAuditReadiness(state: WorkspaceState): AuditReadinessResult {
  const missingItems: MissingEvidenceItem[] = [];
  const assetMissingSet = new Set<string>();
  const docIdSet = new Set(state.documents.filter((d) => d.status === 'ready').map((d) => d.id));

  let totalChecks = 0;
  let passedChecks = 0;

  if (
    state.documents.length === 0 &&
    state.assets.length === 0 &&
    state.reminders.length === 0
  ) {
    return {
      score: 0,
      totalChecks: 0,
      passedChecks: 0,
      missingItems: [],
      assetMissingIds: [],
    };
  }

  // Check 1: Workspace has at least one parsed operational/financial document
  totalChecks += 1;
  if (docIdSet.size > 0) {
    passedChecks += 1;
  } else {
    missingItems.push({
      id: 'miss_base_doc',
      entityType: 'document',
      entityId: 'workspace',
      title: 'Temel operasyonel / mali kanıt belgesi eksik',
      reason: 'Çalışma alanında doğrulanmış belge bulunmuyor.',
      severity: 'high',
      actionHint: 'Excel, PDF veya taranmış tutanak yükleyin.',
    });
  }

  // Check 2: Each asset's linked document evidence + maintenance schedule + status readiness
  for (const asset of state.assets) {
    // 2a. Linked certificate / inventory document check
    totalChecks += 1;
    const hasValidDoc = asset.linkedDocIds.some((id) => docIdSet.has(id));
    if (hasValidDoc) {
      passedChecks += 1;
    } else {
      assetMissingSet.add(asset.id);
      missingItems.push({
        id: `miss_asset_doc_${asset.id}`,
        entityType: 'asset',
        entityId: asset.id,
        title: `${asset.name} — Kanıt / sertifika belgesi yok`,
        reason: `${asset.department} birimindeki bu varlığa bağlı bir kalibrasyon, fatura veya tutanak belgesi eşleşmedi.`,
        severity: asset.status === 'attention' ? 'high' : 'medium',
        actionHint: 'İlgili kalibrasyon veya bakım belgesini yükleyin.',
      });
    }

    // 2b. Maintenance schedule check
    totalChecks += 1;
    if (asset.nextMaintenanceDate && asset.nextMaintenanceDate.trim().length > 0) {
      passedChecks += 1;
    } else {
      assetMissingSet.add(asset.id);
      missingItems.push({
        id: `miss_asset_maint_${asset.id}`,
        entityType: 'asset',
        entityId: asset.id,
        title: `${asset.name} — Bakım takvimi tanımsız`,
        reason: 'Sonraki periyodik bakım veya kontrol tarihi girilmemiş.',
        severity: 'medium',
        actionHint: 'Varlık kaydına sonraki bakım tarihini ekleyin.',
      });
    }

    // 2c. Attention status check
    if (asset.status === 'attention') {
      totalChecks += 1;
      assetMissingSet.add(asset.id);
      missingItems.push({
        id: `miss_asset_attn_${asset.id}`,
        entityType: 'asset',
        entityId: asset.id,
        title: `${asset.name} — Açık teknik / hijyen uyarısı`,
        reason: asset.notes ?? 'Varlık "Dikkat" durumunda; denetim öncesi kapatılmalı.',
        severity: 'high',
        actionHint: 'Bakımı tamamlayıp durumu "Aktif" olarak güncelleyin.',
      });
    }
  }

  // Check 3: High-priority & SUT/compliance reminders
  const criticalReminders = state.reminders.filter(
    (r) => r.priority === 'high' || r.category === 'sut'
  );
  for (const rem of criticalReminders) {
    totalChecks += 1;
    const hasDocProof = Boolean(rem.sourceDocId && docIdSet.has(rem.sourceDocId));
    if (rem.completed) {
      passedChecks += 1;
    } else if (hasDocProof) {
      // Half-credit if tracked with source doc but still open; flag as pending evidence
      missingItems.push({
        id: `miss_rem_open_${rem.id}`,
        entityType: 'reminder',
        entityId: rem.id,
        title: `${rem.title}`,
        reason: `Son tarih: ${rem.dueDate} · Yüksek öncelikli / mevzuat görevi henüz tamamlanmadı.`,
        severity: rem.category === 'sut' ? 'high' : 'medium',
        actionHint: 'İşlemi tamamlayıp hatırlatıcıyı kapatın.',
      });
    } else {
      missingItems.push({
        id: `miss_rem_doc_${rem.id}`,
        entityType: 'reminder',
        entityId: rem.id,
        title: `${rem.title} — Dayanak belgesi eksik`,
        reason: `Son tarih: ${rem.dueDate} · Görev açık ve kaynak belge bağlı değil.`,
        severity: 'high',
        actionHint: 'Dayanak belgeyi yükleyip görevi tamamlayın.',
      });
    }
  }

  // Check 4: Does workspace have calibration/SUT/compliance keyword coverage in docs?
  const allDocText = normalizeTr(state.documents.map((d) => `${d.name} ${d.rawText}`).join(' '));
  if (state.assets.length > 0) {
    totalChecks += 1;
    if (/(kalibrasyon|bakim|sertifika|tutanak|kontrol|denetim|isg|hijyen)/.test(allDocText)) {
      passedChecks += 1;
    } else {
      missingItems.push({
        id: 'miss_compliance_doc',
        entityType: 'document',
        entityId: 'workspace_compliance',
        title: 'Bakım / kalibrasyon tutanağı belgesi bulunamadı',
        reason: 'Yüklü belgelerde bakım veya kalibrasyon kanıtı tespit edilemedi.',
        severity: 'medium',
        actionHint: 'Taranmış bakım tutanağı veya servis formu yükleyin.',
      });
    }
  }

  const severityOrder: Record<MissingEvidenceItem['severity'], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  missingItems.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const score =
    totalChecks === 0 ? 0 : Math.min(100, Math.max(0, Math.round((passedChecks / totalChecks) * 100)));

  return {
    score,
    totalChecks,
    passedChecks,
    missingItems,
    assetMissingIds: Array.from(assetMissingSet),
  };
}
