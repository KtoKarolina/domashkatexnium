import { Card } from '../components/Card.jsx'
import { PageHeading } from '../components/PageHeading.jsx'
import { MOCK_LEGAL } from '../mockData.js'

export function LegalPage() {
  return (
    <div>
      <PageHeading title="📋 Юридическое" subtitle="Кратко." />
      <Card className="mb-6">
        <h3 className="font-display text-lg text-star-gold">🔒 Конфиденциальность</h3>
        <p className="mt-3 text-purple-100">{MOCK_LEGAL.privacy}</p>
      </Card>
      <Card>
        <h3 className="font-display text-lg text-star-gold">📜 Условия</h3>
        <p className="mt-3 text-purple-100">{MOCK_LEGAL.terms}</p>
      </Card>
    </div>
  )
}
