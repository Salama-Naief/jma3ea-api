/**
 * Set the price to the old price
 * This function is getting triggered when the discount price is expired
 * @param {Object} req
 * @param {string} sku
 * @param {Number} old_price
 * @returns
 */
module.exports.resetPrice = async function (req, sku, old_price, product) {
  try {
    let newVariants = [];
    if (product && product.variants && product.variants.length > 0) {
      newVariants = product.variants.map(v => {
        if (v.old_price && v.discount_price_valid_until && v.discount_price_valid_until < new Date()) {
          const oldPrice = parseFloat(v.old_price);
          v.price = oldPrice;
          v.old_price = null;
          v.discount_price_valid_until = null;
          return v;
        }
      });
    }
    const collection = req.custom.db.client().collection("product");
    const response = await collection.updateOne(
      {
        sku,
      },
      {
        $set: {
          old_price: null,
          price: old_price,
          discount_price_valid_until: null,
          variants: newVariants
        },
      }
    );

    if (response) return true;
    else return false;
  } catch (err) {
    return false;
  }
};

module.exports.getTermLang = (term) => {
  const languageCode = /[\u0600-\u06FF]/.test(term) ? 'ar' : 'en';
  return languageCode;
}
