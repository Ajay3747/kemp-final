import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X, ShoppingBag, Store, PackageSearch, Star } from "lucide-react";
import ProductDetailModal from "../components/ProductDetailModal";
import CategoryDropdown from "../components/CategoryDropdown";
import WarrantyBadge from "../components/WarrantyBadge";
import StarRating from "../components/StarRating";
import SellerReviewsModal from "../components/SellerReviewsModal";
import { getSellersRatingSummary } from "../utils/ratingApi";

const API_URL = "http://localhost:5000/api/products";

const getImageUrl = (url) => {
  if (!url) return "https://via.placeholder.com/300x200?text=No+Image";
  return url;
};

export default function Buying() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeStore, setActiveStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ratingSummary, setRatingSummary] = useState({});
  const [reviewsStore, setReviewsStore] = useState(null);

  const categories = ["All", "Books", "Gadgets", "Notes", "Electronics", "Apparel", "Sports", "Furniture", "Dorm Essentials", "Other"];

  // Fetch products from backend
  useEffect(() => {
    fetchProducts();
  }, []);

  // Deep-link support so "View Product" from a Community post can open this
  // exact product's modal, even if it's since gone RESERVED/SOLD (which the
  // /all listing excludes) — fetched directly by id instead.
  useEffect(() => {
    const deepLinkedProductId = searchParams.get("productId");
    if (!deepLinkedProductId) return;

    fetch(`${API_URL}/${deepLinkedProductId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then((product) => setActiveProduct(product))
      .catch((err) => console.error("Error fetching linked product:", err))
      .finally(() => {
        const next = new URLSearchParams(searchParams);
        next.delete("productId");
        setSearchParams(next, { replace: true });
      });
    // Only run for the productId present on initial navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleProductRemoved = (event) => {
      const removedId = event?.detail?.productId;
      if (!removedId) return;
      setProducts((prev) => prev.filter((product) => product._id !== removedId));
      if (activeProduct?._id === removedId) {
        setActiveProduct(null);
      }
    };

    window.addEventListener('product-removed', handleProductRemoved);
    return () => window.removeEventListener('product-removed', handleProductRemoved);
  }, [activeProduct]);

  // One batched call for every store's average rating, instead of one per card.
  useEffect(() => {
    const sellerIds = products.map((product) =>
      product.sellerId && typeof product.sellerId === "object" ? product.sellerId._id : product.sellerId
    );
    if (sellerIds.filter(Boolean).length === 0) return;

    getSellersRatingSummary(sellerIds)
      .then(setRatingSummary)
      .catch((err) => console.error("Error fetching seller ratings:", err));
  }, [products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/all`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const data = await response.json();
      console.log("Products fetched:", data);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(`Error: ${err.message}`);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      product.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "All" || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const stores = filteredProducts.reduce((acc, product) => {
    const sellerIdValue = product.sellerId && typeof product.sellerId === "object"
      ? product.sellerId._id
      : product.sellerId;

    if (!sellerIdValue) return acc;

    const sellerNameValue = product.sellerName
      || (product.sellerId && typeof product.sellerId === "object" ? product.sellerId.username : null)
      || "kemp Store";

    const sellerEmailValue = product.sellerEmail
      || (product.sellerId && typeof product.sellerId === "object" ? product.sellerId.collegeEmail : null);

    if (!acc[sellerIdValue]) {
      acc[sellerIdValue] = {
        sellerId: sellerIdValue,
        sellerName: sellerNameValue,
        sellerEmail: sellerEmailValue,
        products: [],
        coverImage: product.imageUrl
      };
    }
    acc[sellerIdValue].products.push(product);
    if (!acc[sellerIdValue].coverImage && product.imageUrl) {
      acc[sellerIdValue].coverImage = product.imageUrl;
    }
    return acc;
  }, {});

  const storeList = Object.values(stores);
  const isSearching = searchTerm.trim().length > 0;

  return (
    <div className="min-h-screen text-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="text-center mb-8 animate-fadeInUp">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1.5 mb-4">
            <ShoppingBag size={14} className="text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-300 tracking-wide uppercase">Campus Dealing</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 bg-gradient-to-r from-white via-white to-yellow-200 bg-clip-text text-transparent">
            Browse Items &amp; Stores
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Discover pre-loved books, gadgets and essentials listed by students near you.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-xl text-red-200 animate-fadeIn">
            {error}
          </div>
        )}

        {/* Categories bar under title */}
        <div className="mb-6 animate-fadeInUp">
          <CategoryDropdown
            value={filterCategory}
            onChange={(val) => setFilterCategory(val)}
            options={categories}
            inline={true}
          />
        </div>

        {/* Search box centered */}
        <div className="flex justify-center mb-8 animate-fadeInUp">
          <div className="relative w-full max-w-2xl group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-yellow-400 transition-colors" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="premium-input w-full pl-11 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:bg-white/[0.07]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden animate-pulse min-h-[340px]">
              <div className="h-44 bg-white/10" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
                <div className="h-3 bg-white/10 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isSearching ? (
            filteredProducts.length > 0 ? (
              filteredProducts.map((product, idx) => (
                <div
                  key={product._id}
                  style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                  className="animate-card-enter premium-card group cursor-pointer flex flex-col justify-between min-h-[340px] overflow-hidden"
                  onClick={() => setActiveProduct(product)}
                >
                  <div>
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={getImageUrl(product.imageUrl)}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                        onError={(e) => {
                          e.currentTarget.src = "https://via.placeholder.com/300x200?text=Image+Not+Found";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {product.price !== undefined && product.price !== null && Number.isFinite(Number(product.price)) && (
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-yellow-400 py-1 px-3 rounded-full font-bold text-sm shadow-lg">
                          ₹{Number(product.price).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="text-white font-bold text-lg leading-snug group-hover:text-yellow-300 transition-colors">{product.title}</h3>
                      <p className="text-gray-400 text-sm mt-1">{product.category}</p>
                      <div className="mt-2">
                        <WarrantyBadge available={product.warrantyAvailable} duration={product.warrantyDuration} />
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    <div className="flex justify-between items-center mb-2 pt-3 border-t border-white/10">
                      <span className="text-gray-500 text-xs uppercase tracking-wide">{product.condition}</span>
                      {product.averageRating > 0 && (
                        <span className="flex items-center gap-1 text-yellow-300 text-sm font-medium">
                          <Star size={13} className="fill-current" /> {product.averageRating}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs truncate">Seller: {product.sellerName}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400 animate-fadeIn">
                <PackageSearch size={40} className="mb-3 text-gray-600" />
                No products found
              </div>
            )
          ) : storeList.length > 0 ? (
            storeList.map((store, idx) => (
              <div
                key={store.sellerId}
                style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                className="animate-card-enter premium-card group cursor-pointer flex flex-col justify-between min-h-[340px] overflow-hidden"
                onClick={() => setActiveStore(store)}
              >
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={getImageUrl(store.coverImage)}
                      alt={`${store.sellerName} store`}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/300x200?text=Store+Image";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white/90 py-1 px-2.5 rounded-full text-xs font-medium">
                      <Store size={12} className="text-yellow-400" />
                      {store.products.length} item{store.products.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-white font-bold text-lg leading-snug group-hover:text-yellow-300 transition-colors">{store.sellerName}'s Store</h3>
                    <div className="mt-1.5">
                      <StarRating
                        value={(ratingSummary[store.sellerId] || {}).averageRating || 0}
                        count={(ratingSummary[store.sellerId] || {}).totalRatings || 0}
                        size={15}
                      />
                    </div>
                    {Array.isArray(store.products) && store.products.length > 0 && (() => {
                      const prices = store.products.map(p => Number(p.price)).filter(v => Number.isFinite(v));
                      if (prices.length === 0) return null;
                      const min = Math.min(...prices);
                      return (<div className="text-yellow-400 font-bold mt-1">From ₹{min.toLocaleString()}</div>);
                    })()}
                  </div>
                </div>

                <div className="flex items-center justify-between px-5 pb-5 pt-3 border-t border-white/10">
                  <span className="text-yellow-400 text-sm font-semibold flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                    View Store
                  </span>
                  <span className="text-gray-500 text-xs">Seller</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400 animate-fadeIn">
              <Store size={40} className="mb-3 text-gray-600" />
              No stores found
            </div>
          )}
        </div>
      )}

      {activeProduct && (
        <ProductDetailModal
          product={activeProduct}
          onClose={() => setActiveProduct(null)}
        />
      )}

      {activeStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto p-6 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-yellow-400">{activeStore.sellerName}'s Store</h2>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <StarRating
                    value={(ratingSummary[activeStore.sellerId] || {}).averageRating || 0}
                    count={(ratingSummary[activeStore.sellerId] || {}).totalRatings || 0}
                    size={15}
                  />
                  <button
                    onClick={() => setReviewsStore(activeStore)}
                    className="text-yellow-400 text-xs font-semibold hover:underline"
                  >
                    View Reviews
                  </button>
                </div>
                <p className="text-gray-400 text-sm mt-1">{activeStore.products.length} product{activeStore.products.length === 1 ? "" : "s"}</p>
              </div>
              <button
                onClick={() => setActiveStore(null)}
                className="p-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                aria-label="Close store view"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeStore.products.map((product) => (
                <div
                  key={product._id}
                  className="premium-card group cursor-pointer overflow-hidden"
                  onClick={() => {
                    setActiveStore(null);
                    setActiveProduct(product);
                  }}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={getImageUrl(product.imageUrl)}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/300x200?text=Image+Not+Found";
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-bold text-base group-hover:text-yellow-300 transition-colors">{product.title}</h3>
                    <p className="text-gray-400 text-xs mb-2">{product.category}</p>
                    {product.price !== undefined && product.price !== null && Number.isFinite(Number(product.price)) && (
                      <div className="text-yellow-400 font-semibold">₹{Number(product.price).toLocaleString()}</div>
                    )}
                    <div className="mt-2">
                      <WarrantyBadge available={product.warrantyAvailable} duration={product.warrantyDuration} />
                    </div>
                    <div className="flex justify-end items-center mt-1">
                      <span className="text-gray-500 text-xs">{product.condition}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {reviewsStore && (
        <SellerReviewsModal
          sellerId={reviewsStore.sellerId}
          sellerName={reviewsStore.sellerName}
          onClose={() => setReviewsStore(null)}
        />
      )}
    </div>
  );
}
