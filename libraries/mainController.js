// Categories Controller

// Load required modules
const common = require("./common");
const status_message = require("../enums/status_message");
const ObjectID = require("../types/object_id");
const { resetPrice } = require("../modules/product/utils");

/**
 * List all categories
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (
  req,
  res,
  collectionName,
  projection,
  callback
) {
  if (req.custom.isAuthorized === false) {
    return res.out(
      req.custom.UnauthorizedObject,
      status_message.UNAUTHENTICATED
    );
  }
  const cache = req.custom.cache;

  let user = req.custom.authorizationObject;
  user.cart = user.cart || {};
  user.wishlist = Array.isArray(user.wishlist) ? user.wishlist : [];

  const is_cached = new Promise((resolve, reject) => {
    if (req.custom.cache_key) {
      if (req.custom.isVIP == true && !req.custom.cache_key.includes("vip")) {
        req.custom.cache_key += "__vip";
      }
      return cache
        .get(req.custom.cache_key)
        .then((cached_data) => {
          if (cached_data) {
            if (req.custom.isProducts == true) {
              const promises = [];
              cached_data.data = cached_data.data.filter((i) => {
                return i && i.sku;
              });
              cached_data.data = cached_data.data.map((i) => {
                const is_exists_product = i && i.sku;
                const prod_exists_in_cart = is_exists_product
                  ? Object.keys(user.cart).indexOf(i.sku.toString()) > -1
                  : false;
                i.cart_status = {
                  is_exists: prod_exists_in_cart,
                  quantity: prod_exists_in_cart ? user.cart[i.sku] : 0,
                };
                i.wishlist_status = {
                  is_exists: user.wishlist.indexOf(i.sku.toString()) > -1,
                };

                promises.push(
                  resetPrice(req, i).catch((e) => {
                    console.error(req.originalUrl, e);
                    return res.out(
                      {
                        message: req.custom.local.unexpected_error,
                      },
                      status_message.UNEXPECTED_ERROR
                    );
                  })
                );

                if (
                  i.old_price &&
                  i.discount_price_valid_until &&
                  i.discount_price_valid_until < new Date()
                ) {
                  const oldPrice = parseFloat(i.old_price);
                  i.price = oldPrice;
                }

                if (req.custom.isVIP == true) {
                  if (
                    i.vip_old_price &&
                    i.vip_old_price > 0 &&
                    (i.vip_discount_price_valid_until
                      ? i.vip_discount_price_valid_until < new Date()
                      : false)
                  ) {
                    i.vip_price = i.vip_old_price;
                    i.vip_old_price = 0;
                  }

                  if (i.vip_price && i.vip_price > 0) {
                    i.price = i.vip_price;
                    i.old_price = i.vip_old_price;
                  } else {
                    if (i.old_price && i.old_price > 0) {
                      i.price = i.old_price;
                      i.old_price = 0;
                    }
                  }
                }

                if (i.variants && i.variants.length > 0) {
                  i.variants = i.variants.map((v) => {
                    if (
                      v.old_price &&
                      v.discount_price_valid_until &&
                      v.discount_price_valid_until < new Date()
                    ) {
                      const oldPrice = parseFloat(v.old_price);
                      v.price = oldPrice;
                    }
                    return v;
                  });
                }

                return i;
              });
              if (promises.length > 0) {
                Promise.all(promises);
              }
            }
            res.out(cached_data);
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .catch((e) => {
          console.error(req.originalUrl, e);
          resolve(false);
        });
    }
    resolve(false);
  });

  is_cached
    .then(async (_is_cached) => {
      if (_is_cached) {
        return;
      }

      const collection = req.custom.db.collection(collectionName);
      const filter =
        req.custom.isProducts != true
          ? req.custom.clean_filter
          : await common.filter_internal_suppliers_by_city(req);

      if (req.custom.all_status != true) {
        filter.status = req.custom.clean_filter.status || true;
      }

      if (req.custom.isProducts == true) {
        filter.status = true;
        const city_id =
          req.custom.authorizationObject &&
          req.custom.authorizationObject.city_id
            ? req.custom.authorizationObject.city_id.toString()
            : "";
        /* if (!city_id) {
				return res.out({
					'message': req.custom.local.choose_city_first
				}, status_message.CITY_REQUIRED);
			} */
      }

      collection.count(filter, (err, total) => {
        if (err || total === 0) {
          const out = {
            total: 0,
            count: 0,
            per_page: req.custom.limit,
            current_page: req.query.skip || 1,
            data: [],
          };

          if (callback) {
            callback(out);
          } else {
            res.out(out);
          }
        } else {
          let sort =
            Object.keys(req.custom.clean_sort).length > 0
              ? req.custom.clean_sort
              : {
                  sorting: 1,
                  name: 1,
                };

          // Pipeline
          let pipeline = [];

          pipeline.push({
            $match: filter,
          });

          if (
            req.custom.isProducts &&
            [
              "/:Id/category",
              "/:Id/category/:rankId/rank",
              "/wishlist",
            ].indexOf(req.route.path) > -1
          ) {
            if (req.query.featured == "true") {
              /* sort = {
							"feature_sorting": 1
						}; */
              pipeline.push({
                $addFields: {
                  featureSorting: {
                    $ifNull: ["$features.sorting", "$feature_sorting"],
                  },
                },
              });
              sort = {
                featureSorting: 1,
              };
            } else {
              pipeline.push({
                $addFields: {
                  order: {
                    $filter: {
                      input: "$prod_n_categoryArr",
                      as: "p",
                      cond: {
                        $eq: ["$$p.category_id", ObjectID(req.params.Id)],
                      },
                    },
                  },
                },
              });

              sort = {
                "order.sorting": 1,
              };
            }
          }

          if (
            !req.custom.hasOwnProperty("sort_after") ||
            !req.custom.sort_after
          ) {
            pipeline.push({
              $sort: sort,
            });
          }

          pipeline.push({
            $skip: req.custom.skip,
          });
          console.log("req.custom.limit", req.custom.limit);
          console.log("req.custom.skip", req.custom.skip);
          if (req.custom.limit > 0) {
            pipeline.push({
              $limit: req.custom.limit,
            });
          }

          if (
            req.custom.isVIP == true &&
            (req.custom.isProducts == true || collectionName == "product")
          ) {
            projection["vip_price"] = 1;
            projection["vip_old_price"] = 1;
            projection["vip_discount_price_valid_until"] = 1;
          }

          pipeline.push({
            $project: projection,
          });

          const options = {
            allowDiskUse: true,
          };

          if (
            req.custom.hasOwnProperty("sort_after") &&
            req.custom.sort_after
          ) {
            pipeline.push({
              $sort: sort,
            });
          }

          collection.aggregate(pipeline, options).toArray((e, results) => {
            if (e) {
              console.error(req.originalUrl, e);
              return res.out(
                {
                  message: e.message,
                },
                status_message.UNEXPECTED_ERROR
              );
            }

            const promises = [];
            results = results
              ? results.map((i) => {
                  if (i.picture) {
                    i.picture = `${req.custom.config.media_url}${i.picture}`;
                  }

                  /* if (req.custom.isVIP == true) {
							i.price = i.old_price && i.old_price > 0 && i.old_price;
							i.old_price = 0;
						} */

                  if (
                    req.custom.isProducts == true ||
                    collectionName == "product"
                  ) {
                    promises.push(
                      resetPrice(req, i).catch((e) => {
                        console.error(req.originalUrl, e);
                        res.out(
                          {
                            message: req.custom.local.unexpected_error,
                          },
                          status_message.UNEXPECTED_ERROR
                        );
                      })
                    );

                    if (
                      i.old_price &&
                      i.discount_price_valid_until &&
                      i.discount_price_valid_until < new Date()
                    ) {
                      const oldPrice = parseFloat(i.old_price);
                      i.price = oldPrice;
                    }

                    if (req.custom.isVIP == true) {
                      if (
                        i.vip_old_price &&
                        i.vip_old_price > 0 &&
                        (i.vip_discount_price_valid_until
                          ? i.vip_discount_price_valid_until < new Date()
                          : false)
                      ) {
                        i.vip_price = i.vip_old_price;
                        i.vip_old_price = 0;
                      }

                      if (i.vip_price && i.vip_price > 0) {
                        i.price = i.vip_price;
                        i.old_price = i.vip_old_price;
                      } else {
                        if (i.old_price && i.old_price > 0) {
                          i.price = i.old_price;
                          i.old_price = 0;
                        }
                      }
                    }

                    /* if (i.variants && i.variants.length > 0) {
								i.variants = i.variants.map(v => {
									if (v.old_price && v.discount_price_valid_until && v.discount_price_valid_until < new Date()) {
										v.price = v.old_price;
									}
									return v;
								});
							} */
                  }

                  if (req.custom.isProducts == true) {
                    if (
                      i.fast_shipping &&
                      i.fast_shipping == true &&
                      i.fast_shipping_cost > 0
                    ) {
                      i.price += parseFloat(i.fast_shipping_cost);
                    }

                    if (i.prod_n_storeArr && i.prod_n_storeArr.length > 0) {
                      i.prod_n_storeArr = i.prod_n_storeArr.map((p) => ({
                        ...p,
                        quantity: parseInt(p.quantity?.toString() || "0"),
                      }));
                    }

                    i.price = common.getFixedPrice(i.price);
                    i.old_price = common.getFixedPrice(i.old_price || 0);

                    const quantity_store =
                      i.availability && req.custom.authorizationObject.store_id
                        ? i.availability.find((p_n_s) => {
                            if (
                              !p_n_s.feed_from_store_id &&
                              p_n_s.store_id &&
                              p_n_s.store_id.toString() ===
                                req.custom.authorizationObject.store_id.toString()
                            ) {
                              return p_n_s;
                            } else if (p_n_s.feed_from_store_id) {
                              const temp_store = i.availability.find(
                                (t_s) =>
                                  t_s.store_id &&
                                  t_s.store_id.toString() ==
                                    p_n_s.feed_from_store_id.toString()
                              );
                              p_n_s.quantity = temp_store
                                ? parseInt(temp_store.quantity)
                                : 0;
                              return p_n_s;
                            }
                          })
                        : null;

                    i.availability =
                      quantity_store &&
                      quantity_store.status &&
                      quantity_store.quantity > 0;
                    const prod_exists_in_cart =
                      Object.keys(user.cart).indexOf(i.sku.toString()) > -1;
                    i.cart_status = {
                      is_exists: prod_exists_in_cart,
                      quantity: prod_exists_in_cart ? user.cart[i.sku] : 0,
                    };
                    i.wishlist_status = {
                      is_exists: user.wishlist.indexOf(i.sku.toString()) > -1,
                    };
                  }

                  return i;
                })
              : [];

            if (req.custom.isProducts == true && promises.length > 0) {
              Promise.all(promises);
            }

            const out = {
              total: total,
              count: results.length,
              per_page: req.custom.limit,
              current_page: req.query.skip || 1,
              data: results,
            };
            if (callback) {
              callback(out);
            } else {
              if (req.custom.cache_key && results.length > 0) {
                cache
                  .set(
                    req.custom.cache_key,
                    out,
                    req.custom.config.cache.life_time
                  )
                  .catch((e) => console.error(req.originalUrl, e));
              }
              const message =
                results.length > 0
                  ? status_message.DATA_LOADED
                  : status_message.NO_DATA;
              res.out(out, message);
            }
          });
        }
      });
    })
    .catch((e) => {
      console.error(req.originalUrl, e);
      res.out({ message: e.message }, status_message.UNEXPECTED_ERROR);
    });
};

/**
 * List all categories
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list_all = function (
  req,
  res,
  collectionName,
  projection,
  callback
) {
  if (req.custom.isAuthorized === false) {
    return res.out(
      req.custom.UnauthorizedObject,
      status_message.UNAUTHENTICATED
    );
  }
  const cache = req.custom.cache;
  const is_cached = new Promise((resolve, reject) => {
    if (req.custom.cache_key) {
      return cache
        .get(req.custom.cache_key)
        .then((cached_data) => {
          if (cached_data) {
            res.out(cached_data);
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .catch((e) => {
          console.error(req.originalUrl, e);
          resolve(false);
        });
    } else {
      resolve(false);
    }
    resolve(false);
  });

  is_cached
    .then((_is_cached) => {
      if (_is_cached) {
        return;
      }
      const collection = req.custom.db.collection(collectionName);
      const filter = req.custom.clean_filter;
      filter.status = true;

      const sort =
        Object.keys(req.custom.clean_sort).length > 0
          ? req.custom.clean_sort
          : {
              sorting: 1,
              name: 1,
            };

      // Pipeline
      const pipeline = [
        // Stage 1
        {
          $match: filter,
        },
        // Stage 2
        {
          $sort: sort,
        },
        // Stage 3
        {
          $project: projection,
        },
      ];
      const options = {
        allowDiskUse: true,
      };

      collection.aggregate(pipeline, options).toArray((e, results) => {
        if (e) {
          console.error(req.originalUrl, e);
          return res.out(
            {
              message: e.message,
            },
            status_message.UNEXPECTED_ERROR
          );
        }
        const out = {
          count: results.length,
          data: results
            ? results.map((i) => {
                if (i.picture) {
                  i.picture = `${req.custom.config.media_url}${i.picture}`;
                }
                return i;
              })
            : [],
        };
        const message =
          results.length > 0
            ? status_message.DATA_LOADED
            : status_message.NO_DATA;

        if (callback) {
          callback(out);
        } else {
          if (req.custom.cache_key && results.length > 0) {
            cache
              .set(req.custom.cache_key, out, req.custom.config.cache.life_time)
              .catch((e) => console.error(req.originalUrl, e));
          }

          res.out(out, message);
        }
      });
    })
    .catch((e) => {
      console.error(req.originalUrl, e);
      res.out(
        {
          message: e.message,
        },
        status_message.UNEXPECTED_ERROR
      );
    });
};

/**
 * Read category by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (
  req,
  res,
  collectionName,
  projection,
  callback
) {
  if (req.custom.isAuthorized === false) {
    return res.out(
      req.custom.UnauthorizedObject,
      status_message.UNAUTHENTICATED
    );
  }
  if (!ObjectID.isValid(req.params.Id) && !req.custom.isProducts) {
    return res.out(
      {
        message: req.custom.local.id_not_valid,
      },
      status_message.INVALID_URL_PARAMETER
    );
  }

  const cache = req.custom.cache;
  const is_cached = new Promise((resolve, reject) => {
    if (req.custom.cache_key) {
      return cache
        .get(req.custom.cache_key)
        .then((cached_data) => {
          if (cached_data) {
            res.out(cached_data);
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .catch((e) => {
          console.error(req.originalUrl, e);
          resolve(false);
        });
    } else {
      resolve(false);
    }
    resolve(false);
  });

  is_cached.then((_is_cached) => {
    if (_is_cached) {
      return;
    }

    const city_id =
      req.custom.authorizationObject && req.custom.authorizationObject.city_id
        ? req.custom.authorizationObject.city_id.toString()
        : "";
    /* if (!city_id && req.custom.ignoreCity != true) {
			return res.out({
				'message': req.custom.local.choose_city_first
			}, status_message.CITY_REQUIRED);
		} */

    const id_key = req.custom.isProducts ? "sku" : "_id";
    const id_value = req.custom.isProducts
      ? req.params.sku
      : ObjectID(req.params.Id);
    const collection = req.custom.db.collection(collectionName);
    // Pipeline
    const pipeline = [
      // Stage 1
      {
        $match: {
          [id_key]: id_value,
          status: true,
        },
      },
      // Stage 2
      {
        $project: projection,
      },
      // Stage 3
      {
        $limit: 1,
      },
    ];
    const options = {
      allowDiskUse: true,
    };
    collection.aggregate(pipeline, options).toArray((e, results) => {
      if (e) {
        return res.out(
          {
            error: e.message,
          },
          status_message.UNEXPECTED_ERROR
        );
      }
      const row = results[0] || {};
      if (row.picture) {
        row.picture = `${req.custom.config.media_url}${row.picture}`;
      }

      if (callback) {
        callback(row);
      } else {
        if (req.custom.cache_key && Object.keys(row).length > 0) {
          cache
            .set(req.custom.cache_key, row, req.custom.config.cache.life_time)
            .catch((e) => console.error(req.originalUrl, e));
        }

        const message =
          Object.keys(row) > 0
            ? status_message.DATA_LOADED
            : status_message.NO_DATA;
        res.out(row, message);
      }
    });
  });
};
