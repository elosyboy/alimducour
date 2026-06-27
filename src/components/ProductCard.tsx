import { useState } from 'react'
import './ProductCard.css'

export type ProductCardData = {
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

type ProductCardProps = {
  product: ProductCardData
  onAddToCart: () => void
  onOpenProduct?: () => void
}

function ProductCard({ product, onAddToCart, onOpenProduct }: ProductCardProps) {
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
    <article className={`productCard ${isAdded ? 'addedToCart' : ''}`} onClick={onOpenProduct} role="button" tabIndex={0}>
      <div className="productImageBox">
        {product.imageUrl ? (
          <img className="productImage" src={product.imageUrl} alt={product.name} />
        ) : (
          <div className="productImagePlaceholder">
            <span>Photo bientôt disponible</span>
          </div>
        )}
      </div>

      <div className="productInfo">
        <div className="productMeta">
          <span className="productCategory">{product.category}</span>
          {product.isBestSeller ? <span className="bestBadge">Best</span> : null}
        </div>

        <h3>{product.name}</h3>
      </div>

      <div className="productFooter">
        <strong>{product.price}</strong>
        <button
          className="addProductButton"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            handleAddToCart()
          }}
        >
          Ajouter au panier
        </button>
      </div>
    </article>
  )
}

export default ProductCard
