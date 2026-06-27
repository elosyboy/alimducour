import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import './SpaceCompte.css'

type SpaceCompteProps = {
  user: User
  onBack: () => void
  onLogout: () => void
  isLoading: boolean
  message: string
}

type ClientOrder = {
  id: string
  total: number
  totalQuantity: number
  status: string
  deliveryMode: 'delivery' | 'pickup'
  createdAt?: {
    seconds?: number
  }
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

function formatOrderDate(order: ClientOrder) {
  if (!order.createdAt?.seconds) {
    return 'Date en attente'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(order.createdAt.seconds * 1000))
}

function getStatusLabel(status: string) {
  if (status === 'pending') {
    return 'En attente'
  }

  if (status === 'accepted') {
    return 'Acceptée'
  }

  if (status === 'preparing') {
    return 'En préparation'
  }

  if (status === 'ready') {
    return 'Prête'
  }

  if (status === 'delivered') {
    return 'Terminée'
  }

  if (status === 'cancelled') {
    return 'Annulée'
  }

  return status
}

function SpaceCompte({ user, onBack, onLogout, isLoading, message }: SpaceCompteProps) {
  const firstName = user.displayName || 'client'
  const [orders, setOrders] = useState<ClientOrder[]>([])
  const [isOrdersLoading, setIsOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState('')

  useEffect(() => {
    const ordersQuery = query(collection(db, 'orders'), where('userId', '==', user.uid))

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const nextOrders: ClientOrder[] = snapshot.docs
          .map((orderDoc) => {
            const data = orderDoc.data()

            const deliveryMode: ClientOrder['deliveryMode'] =
              data.deliveryMode === 'pickup' ? 'pickup' : 'delivery'

            return {
              id: orderDoc.id,
              total: Number(data.total ?? 0),
              totalQuantity: Number(data.totalQuantity ?? 0),
              status: String(data.status ?? 'pending'),
              deliveryMode,
              createdAt: data.createdAt as ClientOrder['createdAt'],
            }
          })
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))

        setOrders(nextOrders)
        setOrdersError('')
        setIsOrdersLoading(false)
      },
      (error) => {
        console.error(error)
        setOrders([])
        setOrdersError('Impossible de charger vos commandes.')
        setIsOrdersLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user.uid])

  const validatedOrdersCount = orders.filter((order) => order.status === 'delivered').length
  const loyaltyProgress = Math.min(validatedOrdersCount, 10) * 10

  return (
    <main className="spaceComptePage">
      <header className="spaceCompteHeader">
        <button className="spaceBackButton" type="button" onClick={onBack}>
          ← Retour boutique
        </button>

        <div className="spaceHeaderIdentity">
          <p>Espace client</p>
          <h1>Bonjour {firstName}</h1>
          <span>{user.email}</span>
        </div>
      </header>

      <section className="spaceCompteHero">
        <div>
          <p className="spaceEyebrow">Compte connecté</p>
          <h2>Votre espace personnel Alim du Cours</h2>
          <p>
            Retrouvez vos informations client, vos futures commandes et vos avantages fidélité.
          </p>
        </div>

        <button className="spaceLogoutButton" type="button" onClick={onLogout} disabled={isLoading}>
          {isLoading ? 'Chargement...' : 'Se déconnecter'}
        </button>
      </section>

      {message ? <p className="spaceMessage">{message}</p> : null}

      <section className="spaceCompteGrid">
        <article className="spaceCard profileCard">
          <p className="spaceEyebrow">Profil</p>
          <h3>Informations client</h3>

          <div className="spaceInfoList">
            <div>
              <span>Prénom</span>
              <strong>{firstName}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
            <div>
              <span>Statut</span>
              <strong>Client</strong>
            </div>
          </div>
        </article>

        <article className="spaceCard ordersCard">
          <p className="spaceEyebrow">Commandes</p>
          <h3>Commandes récentes</h3>

          {isOrdersLoading ? (
            <p>Chargement de vos commandes...</p>
          ) : ordersError ? (
            <p>{ordersError}</p>
          ) : orders.length === 0 ? (
            <>
              <p>Aucune commande enregistrée pour le moment.</p>
              <button type="button" onClick={onBack}>Faire mes courses</button>
            </>
          ) : (
            <div className="ordersList">
              {orders.slice(0, 3).map((order) => (
                <div className="orderLine" key={order.id}>
                  <div>
                    <strong>{formatPrice(order.total)}</strong>
                    <span>{formatOrderDate(order)}</span>
                  </div>
                  <div>
                    <span>{order.totalQuantity} article{order.totalQuantity > 1 ? 's' : ''}</span>
                    <em>{getStatusLabel(order.status)}</em>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="spaceCard loyaltyCard">
          <p className="spaceEyebrow">Fidélité</p>
          <h3>Avantage client</h3>
          <p>-20% après 10 commandes validées.</p>

          <div className="loyaltyProgress">
            <div>
              <span style={{ width: `${loyaltyProgress}%` }} />
            </div>
            <strong>{validatedOrdersCount} / 10 commandes validées</strong>
          </div>
        </article>

        <article className="spaceCard supportCard">
          <p className="spaceEyebrow">Aide</p>
          <h3>Besoin d’aide ?</h3>
          <p>Contactez la boutique pour une question sur une commande, un produit ou un retrait.</p>
          <a href="tel:0760555793">07 60 55 57 93</a>
        </article>
      </section>
    </main>
  )
}

export default SpaceCompte
