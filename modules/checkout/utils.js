/**
 * This functions is used to merge the delivery times of settings and city in a specific day
 * @param {Array} settingTimes - The delivery times in settings
 * @param {Array} cityTimes - The delivery times in city
 * @returns 
 */
module.exports.mergeDeliveryTimes = function (settingTimes, cityTimes) {
    if (!cityTimes || cityTimes.length < 1) return settingTimes;

    let deliveryTimes = settingTimes;

    for (let [index, time] of cityTimes.entries()) {
        if (time.is_enabled) {
            // Update a specific delivery time with the city's
            deliveryTimes[index] = time;
        }
    }

    return deliveryTimes;

}