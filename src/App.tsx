import { useState } from 'react'
import './App.css'
import CategoryTabs, { type CategoryName } from './components/CategoryTabs'
import Panier from './components/Panier'
import Compte from './components/Compte'

type Product = {
  id: number
  name: string
  category: Exclude<CategoryName, 'Best seller' | 'All'>
  description: string
  price: string
  emoji: string
  isBestSeller: boolean
}

const categories: CategoryName[] = [
  'Best seller',
  'All',
  'Soft',
  'Alcool',
  'Sucré',
  'Salé',
  'Entretien',
  'Divers',
]

const bestSellers: Product[] = [
  {
    id: 1,
    name: 'Pack Apéro Nuit',
    category: 'Salé',
    description: 'Boisson, snack salé et gourmandise sucrée.',
    price: '12,90 €',
    emoji: '🛒',
    isBestSeller: true,
  },
  {
    id: 2,
    name: 'Coca-Cola 1,5L',
    category: 'Soft',
    description: 'Boisson fraîche classique pour accompagner ton repas.',
    price: '2,90 €',
    emoji: '🥤',
    isBestSeller: true,
  },
  {
    id: 3,
    name: 'Ice Tea Pêche',
    category: 'Soft',
    description: 'Boisson fraîche et sucrée au goût pêche.',
    price: '2,50 €',
    emoji: '🧊',
    isBestSeller: false,
  },
  {
    id: 4,
    name: 'Pack Bière',
    category: 'Alcool',
    description: 'Sélection de bières fraîches disponibles en boutique.',
    price: '8,90 €',
    emoji: '🍺',
    isBestSeller: false,
  },
  {
    id: 5,
    name: 'Bouteille Apéritif',
    category: 'Alcool',
    description: 'Produit alcoolisé pour apéritif, selon disponibilité.',
    price: '14,90 €',
    emoji: '🍾',
    isBestSeller: false,
  },
  {
    id: 6,
    name: 'Kinder Bueno',
    category: 'Sucré',
    description: 'Snack chocolaté gourmand pour une petite faim.',
    price: '1,80 €',
    emoji: '🍫',
    isBestSeller: true,
  },
  {
    id: 7,
    name: 'Bonbons Mix',
    category: 'Sucré',
    description: 'Sachet de bonbons pour une envie sucrée.',
    price: '2,50 €',
    emoji: '🍬',
    isBestSeller: false,
  },
  {
    id: 8,
    name: 'Chips Lay’s',
    category: 'Salé',
    description: 'Chips croustillantes pour apéritif ou snack rapide.',
    price: '2,70 €',
    emoji: '🥔',
    isBestSeller: false,
  },
  {
    id: 9,
    name: 'Cacahuètes Salées',
    category: 'Salé',
    description: 'Snack salé pratique pour accompagner une boisson.',
    price: '2,20 €',
    emoji: '🥜',
    isBestSeller: false,
  },
  {
    id: 10,
    name: 'Lessive Dépannage',
    category: 'Entretien',
    description: 'Produit utile du quotidien pour dépannage rapide.',
    price: '5,90 €',
    emoji: '🧴',
    isBestSeller: false,
  },
  {
    id: 11,
    name: 'Essuie-tout',
    category: 'Entretien',
    description: 'Indispensable maison, disponible en boutique.',
    price: '3,50 €',
    emoji: '🧻',
    isBestSeller: false,
  },
  {
    id: 12,
    name: 'Briquet',
    category: 'Divers',
    description: 'Petit essentiel de dépannage.',
    price: '1,50 €',
    emoji: '🔥',
    isBestSeller: false,
  },
  {
    id: 13,
    name: 'Chargeur Téléphone',
    category: 'Divers',
    description: 'Accessoire pratique selon disponibilité.',
    price: '9,90 €',
    emoji: '🔌',
    isBestSeller: false,
  },
]

function App() {
  const [activeCategory, setActiveCategory] = useState<CategoryName>('Best seller')
  const [currentPage, setCurrentPage] = useState<'home' | 'cart' | 'account'>('home')

  const filteredProducts =
    activeCategory === 'Best seller'
      ? bestSellers.filter((product) => product.isBestSeller)
      : activeCategory === 'All'
        ? bestSellers
        : bestSellers.filter((product) => product.category === activeCategory)

  if (currentPage === 'cart') {
    return <Panier onBack={() => setCurrentPage('home')} />
  }

  if (currentPage === 'account') {
    return <Compte onBack={() => setCurrentPage('home')} />
  }

  return (
    <main className="app">
      <header className="header">
        <img className="logoImage" src="/logo.png" alt="Logo Alimducour" />

        <div className="headerActions">
          <button
            className="headerButton"
            type="button"
            onClick={() => setCurrentPage('account')}
          >
            Compte
          </button>

          <button
            className="headerButton cartButton"
            type="button"
            onClick={() => setCurrentPage('cart')}
          >
            <span aria-hidden="true">🛒</span>
            Panier
          </button>
        </div>
      </header>

      <section className="heroSection">
        <div className="heroText">
          <p className="status">Ouvert aujourd’hui de 10h à 22h</p>
          <h2>Tout ce qu’il te faut, rapidement.</h2>
          <p>
            Boissons, snacks, produits d’entretien, dépannage du quotidien et
            service locker colis au même endroit.
          </p>
        </div>

        <div className="heroCard">
          <span>🚲</span>
          <strong>Style livraison rapide</strong>
          <p>Commande simple, retrait ou livraison locale.</p>
        </div>
      </section>

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <section className="bestSellerSection">
        <div className="productGrid">
          {filteredProducts.map((product) => (
            <article className="productCard" key={product.id}>
              <div className="productEmoji">{product.emoji}</div>
              <div>
                <h3>{product.name}</h3>
                <p className="productCategory">{product.category}</p>
                <p>{product.description}</p>
              </div>
              <strong>{product.price}</strong>
            </article>
          ))}
        </div>
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
          <h2>Alimducour</h2>
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
    </main>
  )
}

export default App
