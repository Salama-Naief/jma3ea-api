// Auth Controller

// Load required modules
const bcrypt = require("bcryptjs");
const common = require("../../libraries/common");
const status_message = require("../../enums/status_message");
const config = require("../../config");
const ObjectID = require("../../types/object_id");
const { v4: uuid } = require("uuid");

/**
 * Check auth
 * @param {Object} req
 * @param {Object} res
 */
module.exports.check = function (req, res) {
  const collection = req.custom.db.collection("application");
  console.log("collection", collection);
  const cache = req.custom.cache;
  const local = req.custom.local;

  if (!req.body.appId || !req.body.appSecret) {
    return res.out(
      {
        message: local.failed_create_auth_app,
      },
      status_message.INVALID_APP_AUTHENTICATION
    );
  }

  let appId = req.body.appId;
  let appSecret = req.body.appSecret;

  let where = {
    appId: appId,
  };

  collection
    .findOne(where)
    .catch((e) => {
      console.error(req.originalUrl, e);
      return res.out(
        { message: local.failed_create_auth_app },
        status_message.UNEXPECTED_ERROR
      );
    })
    .then((theapp) => {
      if (!theapp) {
        return res.out(
          {
            message: local.failed_auth_user,
          },
          status_message.UNEXPECTED_ERROR
        );
      }
      console.log("theapp", theapp);
      bcrypt.compare(appSecret, theapp.appSecret, function (err, valid) {
        console.log("err", err);
        console.log("valid", valid);
        if (err || !valid) {
          return res.out(
            {
              message: local.failed_auth_app,
            },
            status_message.INVALID_APP_AUTHENTICATION
          );
        }
        // create a token
        const userAgent = req.get("User-Agent");
        const token = "v_" + generateToken();

        const set_cache = function (_data) {
          cache
            .set(token, _data, req.custom.config.cache.life_time.token)
            .then(() =>
              res.out({
                token: token,
              })
            )
            .catch((e) => {
              console.error(req.originalUrl, e);
              res.out(
                {
                  message: local.failed_create_auth_app,
                },
                status_message.UNEXPECTED_ERROR
              );
            });
        };

        const data = {
          userAgent: userAgent,
          store_id: ObjectID("5d3827c683545d0366ac4285"),
          created: common.getDate(),
        };
        if (config.auto_load_city) {
          const cityCollection = req.custom.db.collection("city");
          cityCollection
            .findOne({
              status: true,
            })
            .then((cityObj) => {
              // TODO: Update 'meesage' to 'city_id' this after making sure it handled in apps
              if (!cityObj) {
                return res.out(
                  {
                    message: req.custom.local.city_is_not_exists,
                  },
                  status_message.CITY_REQUIRED
                );
              }

              const countryCollection = req.custom.db.collection("country");
              countryCollection
                .findOne({
                  _id: cityObj.country_id,
                })
                .then((countryObj) => {
                  data.city_id = cityObj._id;
                  data.city = cityObj;
                  data.store_id = cityObj.store_id;
                  data.country_id = cityObj.country_id;
                  data.currency = countryObj.currency;

                  set_cache(data);
                });
            });
        } else {
          set_cache(data);
        }
      });
    });
};

/**
 * Generate token
 * @param {Number} min
 * @param {Number} max
 * @returns {string}
 */
function generateToken() {
  return uuid().replace(/-/g, "_");
}
module.exports.generateToken = generateToken;
