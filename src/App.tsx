import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import './App.css'
import CategoryTabs, { type CategoryName } from './components/CategoryTabs'
import Panier from './components/Panier'
import Compte from './components/Compte'
import ProductCard from './components/ProductCard'
import VisionCard from './components/VisionCard'
import { db } from './firebase'

type Product = {
  id: string
  name: string
  category: string
  subCategory: string
  description: string
  price: string
  emoji: string
  imageUrl?: string
  cloudinaryPublicId?: string
  isBestSeller: boolean
  isVisible?: boolean
}

type CartItem = Product & {
  quantity: number
}

const CART_STORAGE_KEY = 'alimducour-cart'

function getSavedCartItems() {
  try {
    const savedCart = window.localStorage.getItem(CART_STORAGE_KEY)

    if (!savedCart) {
      return []
    }

    const parsedCart = JSON.parse(savedCart) as CartItem[]

    if (!Array.isArray(parsedCart)) {
      return []
    }

    return parsedCart
  } catch {
    return []
  }
}

const categories: CategoryName[] = [
  'Best seller',
  'All',
  'Soft',
  'Alcool',
  'Puff',
  'Sucré',
  'Salé',
  'Entretien',
  'Divers',
]

function App() {
  const [activeCategory, setActiveCategory] = useState<CategoryName>('Best seller')
  const [currentPage, setCurrentPage] = useState<'home' | 'cart' | 'account'>('home')
  const [products, setProducts] = useState<Product[]>([])
  const [isProductsLoading, setIsProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>(getSavedCartItems)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const firestoreProducts = snapshot.docs
          .map((doc) => {
            const data = doc.data()

            const product: Product = {
              id: doc.id,
              name: String(data.name ?? ''),
              category: String(data.category ?? 'Divers'),
              subCategory: String(data.subCategory ?? 'Autres'),
              description: String(data.description ?? ''),
              price: String(data.price ?? '0 €'),
              emoji: String(data.emoji ?? '🛒'),
              isBestSeller: Boolean(data.isBestSeller),
              isVisible: data.isVisible !== false,
            }

            if (typeof data.imageUrl === 'string' && data.imageUrl.trim()) {
              product.imageUrl = data.imageUrl
            }

            if (typeof data.cloudinaryPublicId === 'string' && data.cloudinaryPublicId.trim()) {
              product.cloudinaryPublicId = data.cloudinaryPublicId
            }

            return product
          })
          .filter((product) => product.name && product.isVisible)

        setProducts(firestoreProducts)
        setProductsError('')
        setIsProductsLoading(false)
      },
      (error) => {
        console.error(error)
        setProducts([])
        setProductsError('Impossible de charger les produits pour le moment.')
        setIsProductsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const animatedElements = document.querySelectorAll('.mapCard, .detailsCard, .lockerSection')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('isVisible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.18 },
    )

    animatedElements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
  }, [cartItems])

  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0)

  const addProductToCart = (product: Product) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id)

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }

      return [...currentItems, { ...product, quantity: 1 }]
    })
  }

  const filteredProducts =
    activeCategory === 'Best seller'
      ? products.filter((product) => product.isBestSeller)
      : activeCategory === 'All'
        ? products
        : products.filter((product) => product.category === activeCategory)

  const productSections =
    activeCategory === 'Best seller'
      ? [['', filteredProducts] as const]
      : Object.entries(
          filteredProducts.reduce<Record<string, Product[]>>(
            (groups, product) => {
              if (!groups[product.subCategory]) {
                groups[product.subCategory] = []
              }

              groups[product.subCategory].push(product)
              return groups
            },
            {},
          ),
        )

  if (currentPage === 'cart') {
    return <Panier cartItems={cartItems} setCartItems={setCartItems} onBack={() => setCurrentPage('home')} />
  }

  if (currentPage === 'account') {
    return <Compte onBack={() => setCurrentPage('home')} />
  }

  return (
    <main className="app">
      <header className="header">
        <img className="logoImage" src="/logo.png" alt="Logo Alim du Cours" />

        <div className="headerActions">
          <button
            className="headerButton"
            type="button"
            onClick={() => setCurrentPage('account')}
          >
            Compte
          </button>

          <button
            className="cartIconButton"
            type="button"
            onClick={() => setCurrentPage('cart')}
            aria-label="Ouvrir le panier"
          >
            <span className="cartIcon" aria-hidden="true">🛒</span>
            {cartItemCount > 0 ? <span className="cartBadge">{cartItemCount}</span> : null}
          </button>
        </div>
      </header>

      <section className="heroSection">
        <div className="heroText">
          <div className="statusRow">
            <p className="status">Ouvert 10h - 22h</p>
            <p className="status">Livraison</p>
            <p className="status">Click and collect</p>
          </div>
          <h2>Tout ce qu’il te faut, rapidement.</h2>
          <p>
            Boissons, snacks, produits d’entretien, dépannage du quotidien et
            service locker colis au même endroit.
          </p>
        </div>
      </section>

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <section className="bestSellerSection">
        {isProductsLoading ? (
          <div className="productsStateCard">
            <h2>Chargement des produits...</h2>
            <p>Les produits de la boutique arrivent.</p>
          </div>
        ) : productsError ? (
          <div className="productsStateCard">
            <h2>Produits indisponibles</h2>
            <p>{productsError}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="productsStateCard">
            <h2>Aucun produit disponible</h2>
            <p>Les produits de cette catégorie seront bientôt disponibles.</p>
          </div>
        ) : (
          productSections.map(([sectionTitle, products]) => (
            <div className="productCategoryGroup" key={sectionTitle || 'best-seller'}>
              {sectionTitle ? (
                <div className="productCategoryHeader">
                  <h2>{sectionTitle}</h2>
                </div>
              ) : null}

              <div className="productGrid">
                {products.map((product) => (
                  <ProductCard
                    product={product}
                    key={product.id}
                    onAddToCart={() => addProductToCart(product)}
                    onOpenProduct={() => setSelectedProduct(product)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="infoSection">
        <div className="mapCard">
          <iframe
            className="realMap"
            title="Carte Alimducour - 6 rue de la Mule Noire, 13100 Aix-en-Provence"
            src="https://www.google.com/maps?q=6%20rue%20de%20la%20Mule%20Noire%2C%2013100%20Aix-en-Provence&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{ width: '100%', height: '360px', border: 0, borderRadius: '26px' }}
          />
        </div>

        <div className="detailsCard">
          <p className="eyebrow">Adresse & contact</p>
          <h2>Alim du Cours</h2>
          <p>6 rue de la Mule Noire, 13100 Aix-en-Provence</p>
          <p className="accessText">À deux pas du Cours Mirabeau, facile d’accès depuis le centre-ville.</p>
          <p className="accessText">Accès pratique aussi par la route d’Italie.</p>
          <a className="phoneNumber" href="tel:0760555793">07 60 55 57 93</a>
          <p>Ouvert de 10h à 22h</p>
        </div>
      </section>

      <section className="lockerSection">
        <div>
          <p className="eyebrow">Service disponible</p>
          <h2>Locker colis</h2>
          <p>
            Dépose et récupération de colis directement sur place, pratique et
            rapide pendant les horaires d’ouverture.
          </p>
        </div>
        <button type="button">Voir le service</button>
      </section>

      <footer className="legalBanner">
        <p>
          Politique de confidentialité · Mentions légales · Vente d’alcool interdite aux mineurs.
          Une pièce d’identité peut être demandée lors du retrait ou de la livraison.
        </p>
      </footer>

      {selectedProduct ? (
        <VisionCard
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={() => addProductToCart(selectedProduct)}
        />
      ) : null}
    </main>
  )
}

export default App
