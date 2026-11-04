import { useState } from 'react'
import { CreditView } from './CreditView'
import { InvestorView } from './InvestorView'

type Mode = 'credit' | 'investor'

export function App() {
  const [mode, setMode] = useState<Mode>('credit')

  return (
    <main>
      <header className="topbar">
        <div className="brand-group">
          <a className="academy-brand" href="https://academy-strateg.by" target="_blank" rel="noopener noreferrer" aria-label="Академия Стратег">
            <img src="/strateg-logo.svg" width="1255" height="588" alt="Академия Стратег" />
          </a>
          <a className="product-brand" href="#top" aria-label="Финансы — наверх">Финансы</a>
        </div>
        <nav className="mode-switch" aria-label="Режим расчёта">
          <button type="button" className={mode === 'credit' ? 'active' : ''} onClick={() => setMode('credit')}>Кредит</button>
          <button type="button" className={mode === 'investor' ? 'active' : ''} onClick={() => setMode('investor')}>Инвестор</button>
        </nav>
      </header>

      {mode === 'credit' ? <CreditView /> : <InvestorView />}

      <footer>
        <div>
          <p>Финансы · личный инструмент Дмитрия</p>
          <p className="footer-dev">Разработка: <a href="https://archi-landing-iota.vercel.app" target="_blank" rel="noopener noreferrer">Automation Studio Creative</a></p>
        </div>
        <p className="footer-note">Расчёт носит информационный характер и не заменяет условия кредитного договора или инвестиционного соглашения.</p>
      </footer>
    </main>
  )
}
