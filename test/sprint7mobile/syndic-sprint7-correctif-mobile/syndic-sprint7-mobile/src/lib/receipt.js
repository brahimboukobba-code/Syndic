import { jsPDF } from 'jspdf'
import { supabase } from './supabase'
import { uploadFile } from './storage'

// Génère un reçu PDF pour une cotisation payée, le téléverse dans le
// bucket 'recus', et renvoie le chemin de stockage.
// Le reçu est en français (document officiel).
export async function generateReceipt({ cotisation, immeuble, logementNumero, recuNumero }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const navy = [44, 82, 130]   // #2c5282
  const gray = [90, 90, 90]

  // En-tête
  doc.setFillColor(...navy)
  doc.rect(0, 0, pageW, 38, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('REÇU DE PAIEMENT', 20, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(immeuble?.nom || 'Copropriété', 20, 28)
  if (immeuble?.adresse) doc.text(immeuble.adresse, 20, 34)

  // Numéro de reçu (encadré à droite)
  doc.setTextColor(...navy)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`N° ${recuNumero || '—'}`, pageW - 20, 50, { align: 'right' })

  // Corps
  let y = 64
  doc.setTextColor(...gray)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)

  const line = (label, value) => {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gray)
    doc.text(label, 20, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(String(value), 80, y)
    y += 10
  }

  const dateStr = (d) => d ? new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
  const methods = { especes: 'Espèces', cheque: 'Chèque', virement: 'Virement', carte: 'Carte', autre: 'Autre' }

  line('Logement :', logementNumero || '—')
  line('Période :', cotisation.periode || '—')
  line('Date de paiement :', dateStr(cotisation.date_paiement))
  line('Moyen de paiement :', methods[cotisation.moyen_paiement] || cotisation.moyen_paiement || '—')
  if (cotisation.reference_paiement) line('Référence :', cotisation.reference_paiement)

  // Montant (encadré)
  y += 6
  doc.setFillColor(238, 242, 247) // brand-50
  doc.roundedRect(20, y, pageW - 40, 22, 3, 3, 'F')
  doc.setTextColor(...gray)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Montant réglé', 28, y + 9)
  doc.setTextColor(...navy)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  const montant = new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(Number(cotisation.montant) || 0)
  doc.text(`${montant} MAD`, pageW - 28, y + 11, { align: 'right' })

  // Pied de page
  y += 40
  doc.setTextColor(...gray)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.text('Ce reçu est généré automatiquement par l\'application de gestion de la copropriété.', 20, y)
  doc.text(`Émis le ${dateStr(new Date())}.`, 20, y + 5)

  // Bordure de page
  doc.setDrawColor(...navy)
  doc.setLineWidth(0.5)
  doc.rect(8, 8, pageW - 16, doc.internal.pageSize.getHeight() - 16)

  // Convertir en Blob -> File pour réutiliser uploadFile
  const blob = doc.output('blob')
  const file = new File([blob], `recu-${recuNumero || Date.now()}.pdf`, { type: 'application/pdf' })
  const storagePath = await uploadFile('recus', file)
  return storagePath
}

// Pour télécharger immédiatement un reçu déjà stocké (via URL signée),
// on réutilise getSignedUrl ailleurs. Ici, génération + stockage seulement.
