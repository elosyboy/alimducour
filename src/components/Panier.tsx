import { type Dispatch, type SetStateAction, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import './Panier.css'

type CartItem = {
  id: string
  name: string
  category: string
  subCategory: string
  description: string
  price: string
  quantity: number
  emoji: string
  imageUrl?: string
  cloudinaryPublicId?: string
  isBestSeller: boolean
  isVisible?: boolean
}

type PanierProps = {
  cartItems: CartItem[]
  setCartItems: Dispatch<SetStateAction<CartItem[]>>
  onBack: () => void
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

function parseProductPrice(price: string) {
  const normalizedPrice = price.replace('€', '').replace(',', '.').trim()
  const parsedPrice = Number.parseFloat(normalizedPrice)

  return Number.isNaN(parsedPrice) ? 0 : parsedPrice
}

function Panier({ cartItems, setCartItems, onBack }: PanierProps) {
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery')
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerPostalCode, setCustomerPostalCode] = useState('13100')
  const [wantedTime, setWantedTime] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [checkoutMessage, setCheckoutMessage] = useState('')

  const subtotal = cartItems.reduce(
    (total, item) => total + parseProductPrice(item.price) * item.quantity,
    0,
  )
  const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0)
  const deliveryPrice = deliveryMode === 'delivery' ? 3.5 : 0
  const serviceFee = cartItems.length > 0 ? 0.5 : 0
  const total = subtotal + deliveryPrice + serviceFee

  const increaseQuantity = (itemId: string) => {
    setCartItems((items) =>
      items.map((item) =>
        item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    )
  }

  const decreaseQuantity = (itemId: string) => {
    setCartItems((items) =>
      items
        .map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const removeItem = (itemId: string) => {
    setCartItems((items) => items.filter((item) => item.id !== itemId))
  }

  const submitOrder = async () => {
    setCheckoutMessage('')

    if (cartItems.length === 0) {
      setCheckoutMessage('Votre panier est vide.')
      return
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setCheckoutMessage('Ajoutez votre prénom et votre numéro de téléphone.')
      return
    }

    if (deliveryMode === 'delivery' && !customerAddress.trim()) {
      setCheckoutMessage('Ajoutez une adresse de livraison complète.')
      return
    }

    setIsSubmittingOrder(true)

    try {
      const currentUser = auth.currentUser

      await addDoc(collection(db, 'orders'), {
        userId: currentUser?.uid ?? null,
        customerEmail: currentUser?.email ?? null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        customerPostalCode: customerPostalCode.trim(),
        wantedTime: wantedTime || null,
        orderNote: orderNote.trim(),
        deliveryMode,
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          subCategory: item.subCategory,
          description: item.description,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl ?? null,
          cloudinaryPublicId: item.cloudinaryPublicId ?? null,
        })),
        subtotal,
        deliveryPrice,
        serviceFee,
        total,
        totalQuantity,
        status: 'pending',
        source: 'site',
        createdAt: serverTimestamp(),
      })

      setCartItems([])
      setCustomerName('')
      setCustomerPhone('')
      setCustomerAddress('')
      setCustomerPostalCode('13100')
      setWantedTime('')
      setOrderNote('')
      setCheckoutMessage('Commande envoyée. La boutique va la préparer.')
      setIsCheckoutOpen(false)
    } catch (error) {
      console.error(error)
      setCheckoutMessage('Impossible d’envoyer la commande pour le moment.')
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  if (isCheckoutOpen) {
    return (
      <main className="cartPage">
        <header className="cartHeader">
          <button className="backButton" type="button" onClick={() => setIsCheckoutOpen(false)}>
            ← Retour panier
          </button>

          <div>
            <p className="cartEyebrow">Finalisation</p>
            <h1>{deliveryMode === 'delivery' ? 'Livraison' : 'Retrait'}</h1>
          </div>
        </header>

        <section className="checkoutLayout">
          <form className="checkoutForm">
            <div className="checkoutFormHeader">
              <p className="cartEyebrow">Vos informations</p>
              <h2>Complétez la commande</h2>
              <p>
                Ces informations serviront à préparer la commande et organiser
                {deliveryMode === 'delivery' ? ' la livraison.' : ' le retrait en boutique.'}
              </p>
            </div>

            <div className="formGrid">
              <label>
                Prénom
                <input
                  type="text"
                  placeholder="Votre prénom"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </label>

              <label>
                Numéro de téléphone
                <input
                  type="tel"
                  placeholder="07 00 00 00 00"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                />
              </label>

              <label className="fullField">
                Adresse
                <input
                  type="text"
                  placeholder={
                    deliveryMode === 'delivery'
                      ? 'Adresse complète de livraison'
                      : 'Adresse facultative pour le retrait'
                  }
                  value={customerAddress}
                  onChange={(event) => setCustomerAddress(event.target.value)}
                />
              </label>

              <label>
                Code postal
                <input
                  type="text"
                  placeholder="13100"
                  value={customerPostalCode}
                  onChange={(event) => setCustomerPostalCode(event.target.value)}
                />
              </label>

              <label>
                Heure souhaitée
                <input
                  type="time"
                  value={wantedTime}
                  onChange={(event) => setWantedTime(event.target.value)}
                />
              </label>

              <label className="fullField">
                Note pour la commande
                <textarea
                  placeholder="Étage, interphone, précision, remplacement si produit absent..."
                  value={orderNote}
                  onChange={(event) => setOrderNote(event.target.value)}
                />
              </label>
            </div>

            {checkoutMessage ? <p className="checkoutMessage">{checkoutMessage}</p> : null}

            <button
              className="checkoutButton"
              type="button"
              onClick={submitOrder}
              disabled={isSubmittingOrder || cartItems.length === 0}
            >
              {isSubmittingOrder ? 'Envoi de la commande...' : 'Valider la commande'}
            </button>
          </form>

          <aside className="checkoutSummary">
            <p className="cartEyebrow">Résumé</p>
            <h3>{totalQuantity} article{totalQuantity > 1 ? 's' : ''}</h3>

            <div className="summaryLines">
              <div>
                <span>Sous-total</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <div>
                <span>{deliveryMode === 'delivery' ? 'Livraison' : 'Retrait'}</span>
                <strong>{formatPrice(deliveryPrice)}</strong>
              </div>
              <div>
                <span>Service</span>
                <strong>{formatPrice(serviceFee)}</strong>
              </div>
            </div>

            <div className="totalLine">
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            <p className="cartNote">
              La boutique recevra votre commande et vous contactera si besoin.
            </p>
          </aside>
        </section>
      </main>
    )
  }

  return (
    <main className="cartPage">
      <header className="cartHeader">
        <button className="backButton" type="button" onClick={onBack}>
          ← Retour
        </button>

        <div>
          <p className="cartEyebrow">Votre commande</p>
          <h1>Panier</h1>
        </div>
      </header>

      <section className="cartLayout">
        <div className="cartItemsCard">
          <div className="cartSectionTitle">
            <h2>Articles sélectionnés</h2>
            <span>{totalQuantity} article{totalQuantity > 1 ? 's' : ''}</span>
          </div>

          <div className="cartItemsList">
            {cartItems.length === 0 ? (
              <div className="emptyCartMessage">
                <h3>Votre panier est vide</h3>
                <p>Ajoutez des produits depuis la boutique pour commencer une commande.</p>
              </div>
            ) : null}

            {cartItems.map((item) => (
              <article className="cartItem" key={item.id}>
                <div className="cartItemEmoji">
                  {item.imageUrl ? (
                    <img className="cartItemImage" src={item.imageUrl} alt={item.name} />
                  ) : (
                    <div className="cartItemImagePlaceholder">
                      <span>Photo bientôt disponible</span>
                    </div>
                  )}
                </div>

                <div className="cartItemInfo">
                  <h3>{item.name}</h3>
                  <p>{item.subCategory}</p>
                </div>

                <div className="cartItemActions">
                  <div className="quantityControls" aria-label={`Quantité ${item.name}`}>
                    <button type="button" onClick={() => decreaseQuantity(item.id)}>
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => increaseQuantity(item.id)}>
                      +
                    </button>
                  </div>

                  <button
                    className="removeItemButton"
                    type="button"
                    onClick={() => removeItem(item.id)}
                  >
                    Supprimer
                  </button>
                </div>

                <strong>{formatPrice(parseProductPrice(item.price) * item.quantity)}</strong>
              </article>
            ))}
          </div>
        </div>

        <aside className="cartSummaryCard">
          <div className="deliveryChoice">
            <button
              className={`deliveryOption ${deliveryMode === 'delivery' ? 'active' : ''}`}
              type="button"
              onClick={() => setDeliveryMode('delivery')}
            >
              Livraison
            </button>
            <button
              className={`deliveryOption ${deliveryMode === 'pickup' ? 'active' : ''}`}
              type="button"
              onClick={() => setDeliveryMode('pickup')}
            >
              Retrait
            </button>
          </div>

          <div className="addressBox">
            <p className="cartEyebrow">Adresse</p>
            <h3>6 rue de la Mule Noire</h3>
            <p>13100 Aix-en-Provence</p>
            <span>Proche Cours Mirabeau · Route d’Italie</span>
          </div>

          <div className="summaryLines">
            <div>
              <span>Sous-total</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <div>
              <span>Livraison</span>
              <strong>{formatPrice(deliveryPrice)}</strong>
            </div>
            <div>
              <span>Service</span>
              <strong>{formatPrice(serviceFee)}</strong>
            </div>
          </div>

          <div className="totalLine">
            <span>Total</span>
            <strong>{formatPrice(total)}</strong>
          </div>

          <button
            className="checkoutButton"
            type="button"
            onClick={() => setIsCheckoutOpen(true)}
            disabled={cartItems.length === 0}
          >
            Commander maintenant
          </button>

          {checkoutMessage ? <p className="checkoutMessage">{checkoutMessage}</p> : null}

          <p className="cartNote">
            Votre commande sera transmise à la boutique après validation.
          </p>
        </aside>
      </section>
    </main>
  )
}

export default Panier