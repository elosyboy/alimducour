import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import SpaceCompte from './SpaceCompte'
import './Compte.css'

type CompteProps = {
  onBack: () => void
}

function Compte({ onBack }: CompteProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })

    return () => unsubscribe()
  }, [])

  const resetMessage = () => {
    if (message) {
      setMessage('')
    }
  }

  const handleSubmit = async () => {
    resetMessage()

    if (!email.trim() || !password.trim()) {
      setMessage('Remplissez votre email et votre mot de passe.')
      return
    }

    if (authMode === 'register' && !firstName.trim()) {
      setMessage('Ajoutez votre prénom pour créer le compte.')
      return
    }

    if (authMode === 'register' && password !== confirmPassword) {
      setMessage('Les mots de passe ne correspondent pas.')
      return
    }

    if (password.length < 6) {
      setMessage('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setIsLoading(true)

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password)
        setMessage('Connexion réussie.')
      } else {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)

        await updateProfile(credential.user, {
          displayName: firstName.trim(),
        })

        await setDoc(doc(db, 'users', credential.user.uid), {
          uid: credential.user.uid,
          firstName: firstName.trim(),
          email: email.trim(),
          role: 'client',
          createdAt: serverTimestamp(),
        })

        setMessage('Compte créé avec succès.')
      }

      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error(error)
      setMessage('Impossible de continuer. Vérifiez les informations ou réessayez.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      await signOut(auth)
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setFirstName('')
      setMessage('Vous êtes déconnecté.')
    } catch (error) {
      console.error(error)
      setMessage('Impossible de se déconnecter pour le moment.')
    } finally {
      setIsLoading(false)
    }
  }

  if (currentUser) {
    return (
      <SpaceCompte
        user={currentUser}
        onBack={onBack}
        onLogout={handleLogout}
        isLoading={isLoading}
        message={message}
      />
    )
  }

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
              onClick={() => {
                setAuthMode('login')
                setMessage('')
              }}
            >
              Se connecter
            </button>
            <button
              className={authMode === 'register' ? 'primaryAccountButton' : 'secondaryAccountButton'}
              type="button"
              onClick={() => {
                setAuthMode('register')
                setMessage('')
              }}
            >
              S’inscrire
            </button>
          </div>

          {authMode === 'login' ? (
            <div className="accountFormGrid">
              <label className="fullAccountField">
                Email
                <input
                  type="email"
                  placeholder="client@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="fullAccountField">
                Mot de passe
                <input
                  type="password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            </div>
          ) : (
            <div className="accountFormGrid">
              <label className="fullAccountField">
                Prénom
                <input
                  type="text"
                  placeholder="Votre prénom"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </label>

              <label className="fullAccountField">
                Email
                <input
                  type="email"
                  placeholder="client@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="fullAccountField">
                Mot de passe
                <input
                  type="password"
                  placeholder="Créer un mot de passe"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <label className="fullAccountField">
                Confirmer le mot de passe
                <input
                  type="password"
                  placeholder="Retapez le mot de passe"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            </div>
          )}

          {message ? <p className="accountMessage">{message}</p> : null}

          <button className="saveAccountButton" type="button" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Chargement...' : authMode === 'login' ? 'Se connecter' : 'S’inscrire'}
          </button>
        </div>
      </section>
    </main>
  )
}

export default Compte
