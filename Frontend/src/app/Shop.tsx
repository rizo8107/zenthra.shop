                      {/* Product name and price */}
                      <div className="space-y-1">
                        <h3 className="font-medium text-sm text-gray-900 leading-tight line-clamp-2 group-hover:text-[#7C3AED] transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-xs text-gray-500">{product.brand || 'Brand'}</p>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-base font-semibold text-gray-900">
                            ₹ {typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
                          </p>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddToCart(product);
                            }}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-[#7C3AED] hover:text-white flex items-center justify-center transition-colors"
                          >
                            <Heart className="h-4 w-4" />
                          </button>
                        </div>
                      </div>