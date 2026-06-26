import { useState } from 'react'
import './Compte.css'

type CompteProps = {
  onBack: () => void
}

function Compte({ onBack }: CompteProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  return (
    <main className="accountPage">
      <header className="accountHeader">
        <button className="accountBackButton" type="button" onClick={onBack}>
          ← Retour
        </button>

        <div>
          <p className="accountEyebrow">Espace client</p>
          <h1>Compte</h1>
        </div>
      </header>

      <section className="accountLayout">
        <div className="accountMainCard">
          <div className="profileTop">
            <div>
              <p className="accountEyebrow">Accès client</p>
              <h2>{authMode === 'login' ? 'Se connecter' : 'Créer un compte'}</h2>
              <p>
                {authMode === 'login'
                  ? 'Connectez-vous avec votre email et votre mot de passe.'
                  : 'Créez un compte pour retrouver vos informations plus rapidement.'}
              </p>
            </div>
          </div>

          <div className="authActions">
            <button
              className={authMode === 'login' ? 'primaryAccountButton' : 'secondaryAccountButton'}
              type="button"
              onClick={() => setAuthMode('login')}
            >
              Se connecter
            </button>
            <button
              className={authMode === 'register' ? 'primaryAccountButton' : 'secondaryAccountButton'}
              type="button"
              onClick={() => setAuthMode('register')}
            >
              S’inscrire
            </button>
          </div>

          {authMode === 'login' ? (
            <div className="accountFormGrid">
              <label className="fullAccountField">
                Email
                <input type="email" placeholder="client@email.com" />
              </label>

              <label className="fullAccountField">
                Mot de passe
                <input type="password" placeholder="Votre mot de passe" />
              </label>
            </div>
          ) : (
            <div className="accountFormGrid">
              <label className="fullAccountField">
                Prénom
                <input type="text" placeholder="Votre prénom" />
              </label>

              <label className="fullAccountField">
                Email
                <input type="email" placeholder="client@email.com" />
              </label>

              <label className="fullAccountField">
                Mot de passe
                <input type="password" placeholder="Créer un mot de passe" />
              </label>

              <label className="fullAccountField">
                Confirmer le mot de passe
                <input type="password" placeholder="Retapez le mot de passe" />
              </label>
            </div>
          )}

          <button className="saveAccountButton" type="button">
            {authMode === 'login' ? 'Se connecter' : 'S’inscrire'}
          </button>
        </div>
      </section>
    </main>
  )
}

export default Compte