import { useState } from 'react'
import './VisionCard.css'

type VisionProduct = {
  id: string
  name: string
  category: string
  description: string
  price: string
  emoji: string
  imageUrl?: string
  cloudinaryPublicId?: string
  isBestSeller?: boolean
}

type VisionCardProps = {
  product: VisionProduct
  onClose: () => void
  onAddToCart: () => void
}

function VisionCard({ product, onClose, onAddToCart }: VisionCardProps) {
  const [isAdded, setIsAdded] = useState(false)

  const handleAddToCart = () => {
    navigator.vibrate?.(35)
    onAddToCart()
    setIsAdded(true)

    window.setTimeout(() => {
      setIsAdded(false)
    }, 420)
  }

  return (
    <div className="visionOverlay" role="presentation" onClick={onClose}>
      <article className="visionCard" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button className="visionCloseButton" type="button" onClick={onClose} aria-label="Fermer la fiche produit">
          ×
        </button>

        <div className="visionImageBox">
          {product.imageUrl ? (
            <img className="visionImage" src={product.imageUrl} alt={product.name} />
          ) : (
            <div className="visionImagePlaceholder">
              <span>Photo bientôt disponible</span>
            </div>
          )}
        </div>

        <div className="visionContent">
          <div className="visionTopLine">
            <span>{product.category}</span>
            {product.isBestSeller ? <strong>Best seller</strong> : null}
          </div>

          <h2>{product.name}</h2>
          <p>{product.description}</p>

          <div className="visionFooter">
            <strong>{product.price}</strong>
            <button
              className={`visionAddButton ${isAdded ? 'addedToCart' : ''}`}
              type="button"
              onClick={handleAddToCart}
            >
              {isAdded ? 'Ajouté au panier' : 'Ajouter au panier'}
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}

export default VisionCard