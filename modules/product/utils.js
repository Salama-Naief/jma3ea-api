/**
 * Set the price to the old price
 * This function is getting triggered when the discount price is expired
 * @param {Object} req
 * @param {string} sku
 * @param {Number} old_price
 * @returns
 */
module.exports.resetPrice = async function (req, product) {
  try {

    let shouldUpdate = false;
    let newVariants = [];
    if (product && product.variants && product.variants.length > 0) {
      newVariants = product.variants.map(v => {
        if (v.old_price && v.discount_price_valid_until && v.discount_price_valid_until < new Date()) {
          const oldPrice = parseFloat(v.old_price);
          v.price = oldPrice;
          v.old_price = null;
          v.discount_price_valid_until = null;

          shouldUpdate = true;
        }

        return v;
      });
    }

    const data = {};

    if (newVariants.length > 0) {
      data.variants = newVariants;
    }

    if (product.old_price && product.discount_price_valid_until && product.discount_price_valid_until < new Date()) {
      data.price = product.old_price;
      data.old_price = null;
      data.discount_price_valid_until = null;
      shouldUpdate = true;
    }

    if (product.vip_old_price && product.vip_discount_price_valid_until && product.vip_discount_price_valid_until < new Date()) {
      data.vip_price = product.vip_old_price;
      data.vip_old_price = null;
      data.vip_discount_price_valid_until = null;
      shouldUpdate = true;
    }

    if (!shouldUpdate || !product.sku) {
      return;
    }

    const collection = req.custom.db.client().collection("product");
    const response = await collection.updateOne(
      {
        sku: product.sku,
      },
      {
        $set: data,
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
