require('dotenv').config()

module.exports = {
  twitterKeys: {
    consumer_key: "2pZ9N4ixmeRuCOLgnpCXwH1kd",
    consumer_secret: "VaNggm335iSfIK9AIbJuUxvPi8aAnONA6Nps1Ahxe9TY3M3s0x",
    access_token: "1313380879805292545-U3ntrpyK6S8Xsq6s6p7p8wGsiylX1r",
    access_token_secret: "16zpkinA2VAv6fbn6pq7FgYFZ2CUKQwExUQ2WIsgU4YoQ"
  },
  twitterConfig: {
    queryString: process.env.QUERY_STRING,
    resultType: process.env.RESULT_TYPE,
    language: process.env.TWITTER_LANG,
    username: process.env.TWITTER_USERNAME,
    retweet: process.env.TWITTER_RETWEET_RATE * 1000 * 60,
    like: process.env.TWITTER_LIKE_RATE * 1000 * 60,
    quote: process.env.TWITTER_QUOTE_RATE * 1000 * 60,
    searchCount: process.env.TWITTER_SEARCH_COUNT,
    randomReply: process.env.RANDOM_REPLY
  }
}
