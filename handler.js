'use strict';

const SpotifyWebApi = require('spotify-web-api-node');
const AWS = require('aws-sdk');


const spotifyApi = new SpotifyWebApi(
    {
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        redirectUri: process.env.SPOTIFY_CALLBACK_URL,
    }
);
const dynamo = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const DynamoRepository = require('./tokenRepo');
const tokenRepo = new DynamoRepository(dynamo, process.env.DYNAMODB_TABLE_NAME);

const errResponse = {
    statusCode: 500,
    headers: {
        'content-type': 'text/html',
    },
    body: "<html><body>Something went wrong.</body></html>"
};


// redirects to Spotify login page to get access and requests playlists modification permisions
module.exports.login = async event => {
    if (await tokenRepo.tokenExists()) {
        return errResponse;
    }

    return {
        statusCode: 301,
        headers: {
            location: spotifyApi.createAuthorizeURL(["playlist-modify-public", "playlist-modify-private"], 'login'),
        }
    };
};


// Spotify redirects user here with a onetime code which can be used to exchange for auth token
module.exports.callback = async event => {
    if (await tokenRepo.tokenExists()) {
        return errResponse;
    }

    if (event.queryStringParameters.state === 'login' &&
        event.queryStringParameters.code &&
        event.queryStringParameters.code.length > 0
    ) {
        try {
            const tokenData = await spotifyApi.authorizationCodeGrant(event.queryStringParameters.code);
            await tokenRepo.saveToken(tokenData);

            return {
                statusCode: 200,
                headers: {
                    'content-type': 'text/html',
                },
                body: "<html><body>You are logged in now</body></html>"
            }
        } catch (err) {
            console.log(err);

            return errResponse;
        }
    } else {
        return errResponse;
    }
};

// Refreshes auth token. Should be shedulled every 59 minutes or so
module.exports.refreshToken = async event => {
    const tokensLoaded = await loadTokens();

    if (!tokensLoaded) {
        console.log('Failed to load tokens from db');

        return;
    }

    try {
        const tokenData = await spotifyApi.refreshAccessToken();
        await tokenRepo.saveToken(tokenData);
    } catch (err) {
        console.log(err)
    }
};

// Shuffles Spotify playlist like a card deck
module.exports.shuffle = async event => {
    const tokensLoaded = await loadTokens();

    if (!tokensLoaded) {
        console.log('Failed to load tokens from db');

        return;
    }

    try {
        const playlistId   = process.env.PLAYLIST_ID,
              playlist     = await spotifyApi.getPlaylist(playlistId, {}),
              totalTracks  = playlist.body.tracks.total,
              playlistName = playlist.body.name,
              // Move 1% to 100 (that's the limit!) tracks at once.
              rangeLength  = getRandomInt(Math.floor((totalTracks > 10000) ? 100 : totalTracks * 0.01), 100),
              // 50% of times change the start of the playlist, because that's where everyone starts playing it.
              // Other 50% get a random start position
              start        = getRandomInt(0, 1) ? getRandomInt(0, totalTracks) : 0,
              position     = getRandomInt(0, totalTracks);

        console.log(
            'Moving ' +
            rangeLength +
            ' songs from position ' +
            start +
            ' to position ' +
            position +
            ' in playlist "' +
            playlistName +
            '"'
        );

        const resp = await spotifyApi.reorderTracksInPlaylist(
          playlistId,
          start,
          position,
          {
              range_length: rangeLength
          },
        );

        console.log(resp);
    } catch (err) {
        console.log(err)

      throw err
    }
};

async function loadTokens() {
    const accessToken = await tokenRepo.getAccessToken();

    if (!accessToken) {
        return false;
    }

    const refreshToken = await tokenRepo.getRefreshToken();

    if (!refreshToken) {
        return false;
    }

    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refreshToken);

    return true;
}

function getRandomInt(min, max) {
    return Math.round(Math.random() * (max - min)) + min;
}
