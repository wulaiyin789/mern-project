// const axios = require('axios');

// const HttpError = require('../models/http-error');

// const API_KEY = process.env.REACT_APP_API_KEY;

// // Google API Map
// const getCoordsForAddress = async (address) => {
//     // return {
//     //     lat: 22.28588,
//     //     lng: 114.158131
//     // };

//     axios.get('')
//         .then(res => res.data)
//         .then(res => {
//             if(!res || res.status === 'ZERO_RESULTS') {
//                 const error = new HttpError('Cannot find the location for specific location.', 422);

//                 throw error;}
//             });

//     const coordinates = data.results[0].geometry.location;

//     return coordinates;
// };

// module.exports = getCoordsForAddress;

// Mapbox GL
const axios = require('axios');

const HttpError = require('../models/http-error');

const API_KEY = process.env.MAPBOX_API_KEY;

const getCoordsForAddress = async (address) => {
    let data;

    try {
        const url = 'https://api.mapbox.com/geocoding/v5';
        const endpoint = 'mapbox.places';
        const searchText = encodeURIComponent(address);

        const response = await axios({
            method: 'GET',
            url: `${url}/${endpoint}/${searchText}.json/?access_token=${API_KEY}`
        });
        
        data = response.data;
    } catch (e) {
        throw new HttpError('Something went wrong', 500);
    }

    if (!data || data.status === 'ZERO_RESULTS') {
        throw new HttpError('Could not find location for the specified address.', 422);
    }

    const [lng, lat] = data.features[0].center;

    return { lat, lng };
};

module.exports = getCoordsForAddress;
