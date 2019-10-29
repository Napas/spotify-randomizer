# Spotify Playlist Randomizer

Solves a famous Spotify shuffle issue, where only a handful of songs from the start of playlist is being shuffled:
* https://community.spotify.com/t5/Desktop-Mac/Shuffle-repeats-songs-too-often/td-p/22413
* https://www.saintlad.com/spotify-shuffle-play-is-not-random/
* https://www.independent.co.uk/life-style/gadgets-and-tech/news/why-random-shuffle-feels-far-from-random-10066621.html
* many nore

# Liked it? Buy me a beer :)
[![Donate](https://www.paypalobjects.com/en_US/GB/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=BUE2RUMBEK5YL&source=url)

## How does it work?

It setups multiple AWS functions:
1. Used to login to Spotify (only needed once to authorize access and retrieve token)
2. Used for authorization callback to save token in the DynamoDB
3. Used to refresh token (runs every 59 minutes)
4. Used to actually shuffle songs around playlist (run every 1 minute)

## How much does it cost?
It's about $0.2 per month per playlist if you are out of free tier, if not multiple playlist can be shuffled for free.

## Great - how do I use it?
### 0. Prerequisites
* [Node.js](https://nodejs.org/en/) and NPM.
* [Serverless](https://serverless.com/framework/docs/providers/aws/guide/installation/).
* [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html) installed and configured.

### 1. Installation
```bash
git clone git@github.com:Napas/spotify-randomizer.git
cd spotify-randomizer
npm install
```

### 2. Configuration
Go to https://developer.spotify.com/dashboard/applications register as a developer and create a new application.

You should get a client id and client secret tokens, which should be set in the [serverless.yml](serverless.yml) under `provider.environment.SPOTIFY_CLIENT_ID` and `provider.environment.SPOTIFY_CLIENT_SECRET`.

Go to https://open.spotify.com and select a playlist you want to shuffle, there should be an id in the url, which you need to set in the [serverless.yml](serverless.yml) under `functions.shuffle.environment.PLAYLIST_ID`.

Multiple playlist can be shuffled by configuring multiple shuffle functions:
```yaml
  shuffle1:
    handler: handler.shuffle
    environment:
      PLAYLIST_ID: "playlist_id_1"
    events:
      - schedule:
          rate: rate(1 minute)
  shuffle2:
    handler: handler.shuffle
    environment:
      PLAYLIST_ID: "playlist_id_2"
    events:
      - schedule:
          rate: rate(1 minute)
```

### 3. Deploying
Simple as ```bash sls deploy```

It will output 2 urls:
```bash
endpoints:
  GET - https://random-string.execute-api.eu-west-1.amazonaws.com/prod/login
  GET - https://random-string.execute-api.eu-west-1.amazonaws.com/prod/callback
```

go to the first one - https://random-string.execute-api.eu-west-1.amazonaws.com/prod/login .

It will redirect to the Spotify asking to login and give permissions to for the application to modify your playlists.

### 4. Profit

Now every minute lambda function will take between 1% and 100 (that's Spotify limit) songs and move them to a random place in the playlist.

Depending on a playlist size it will take some time for it to become completely random - I would give it a day or so but you'll start to notice effects pretty soon.

## Gotchas

Don't order playlists in a Spotify player after they were randomized as it will wipe away all the good work.

# License
<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.
