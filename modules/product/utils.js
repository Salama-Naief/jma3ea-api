/**
 * Set the price to the old price
 * This function is getting triggered when the discount price is expired
 * @param {Object} req
 * @param {string} sku
 * @param {Number} old_price
 * @returns
 */
module.exports.resetPrice = async function (req, sku, old_price) {
  try {
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
