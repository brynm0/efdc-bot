// listen on port so now.sh likes it
const { createServer } = require('http')

// bot features
// due to the Twitter ToS automation of likes
// is no longer allowed, so:
const Twit = require('twit')
const config = require('./config')
const consoleLol = require('console.lol')

//Google sheets API stuff
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
console.log(process.cwd())
fs.readFile("../credentials.json", (err, content) => {
  if (err) return console.log('Error reading client credentials:', err);
  authorize(JSON.parse(content), listMajors);
})

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
const folder_id = '1Ce2aBkdkCHmwhBR7bFPk0SaXnfm6kPev'
const spreadsheet_id = '1nly9dgOZrf_0D9jAmDyNaX010P3rtnQyNF5llDXris0'
const spreadsheet_path = "tweets.json"
var spreadsheet_data;

function listMajors(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  var spreadsheet_time_last_modified = null
  drive.files.get({ fileId: spreadsheet_id, fields: 'modifiedTime', }, (metadata_error, metadata_result) => {
    if (metadata_error) return console.log('Drive API has returned an error: ' + metadata_error);
    //console.log(metadata_result)
    spreadsheet_time_last_modified = metadata_result.data.modifiedTime
    console.log(process.cwd())
    console.log(fs.existsSync(spreadsheet_path));
    spreadsheet_data = get_tweets_spreadsheet(drive, sheets, spreadsheet_time_last_modified)

  });

}

function get_tweets_spreadsheet(drive, sheets, spreadsheet_time_last_modified) {
  var data
  sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheet_id,
    range: 'Sheet1!A2:B24',
  }, (err, res) => {
    if (err) {
      return console.log('The Sheets API returned an error: ' + err)
    }
    const rows = res.data.values;
    if (rows.length) {
      var tweets_json = {
        time: spreadsheet_time_last_modified,
        tweets: []
      }
      // Print columns A and B, which correspond to indices 0 and 1.
      rows.map((row) => {
        tweets_json.tweets.push({ text: row[0], is_posted: row[1] })
      });
      data = tweets_json;
      run_bot(sheets, drive, data);

    }
    else {
      console.log('No data found.');
    }
  })
}

function update_spreadsheet(sheets, drive, spreadsheet_data) {
  var array = new Array(spreadsheet_data.tweets.length);
  for (var i = 0; i < spreadsheet_data.tweets.length; i++) {
    array[i] = spreadsheet_data.tweets[i].is_posted;
  }
  var data_2d_array = [array, ]
  var value_range = {
    values: data_2d_array,
    majorDimension: "COLUMNS",
  };
  var result = sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheet_id,
    range: 'Sheet1!B2:B24',
    valueInputOption: 'RAW',
    resource: value_range,
  }, (err, result) => {
    if (err) {
      console.log("Encountered error when updating spreadsheet: " + err)
    }
    else {
      console.log("Spreadsheet updated.")
    }
  });

}

function get_random_int_in_range(range) {
  return Math.floor(Math.random() * range);
}

function run_bot(sheets, drive, spreadsheet_data) {
  const bot = new Twit(config.twitterKeys)

  //const retweet = require('./api/retweet')
  //const reply = require('./api/reply')

  console.log('Bot starting...')

  console.log("Finding something to tweet...")
  var tweet_index
  for (tweet_index = 0; tweet_index < spreadsheet_data.tweets.length; tweet_index++) {
    if (spreadsheet_data.tweets[tweet_index].is_posted != 'TRUE') {
      spreadsheet_data.tweets[tweet_index].is_posted = 'TRUE';
      break;
    }
  }
  var tweet_object = spreadsheet_data.tweets[tweet_index];
  const bot_image_path = "Twitter Bot Images";
  var dirs = fs.readdirSync(bot_image_path);
  var length = dirs.length;
  var randomIndex = get_random_int_in_range(length);
  var selected_path = bot_image_path + "/" + dirs[randomIndex];
  console.log(selected_path);

  var images = fs.readdirSync(selected_path);
  console.log(images);
  var image_index = get_random_int_in_range(images.length);
  var selected_image = selected_path + "/" + images[image_index];
  console.log(selected_image);
  var buf = fs.readFileSync(selected_image, 'base64');
  bot.post('media/upload', { media: buf }, (err, twitter_upload_data, response) => {
    if (!err) {
      console.log(twitter_upload_data.media_id_string);
      var meta_params = { media_id: twitter_upload_data.media_id_string, alt_text: { text: "Alt text for image unavailable" } };

      bot.post('media/metadata/create', meta_params, (m_data_err, m_data_data, m_data_response) => {
        if (m_data_err) {
          console.log("error setting image metadata: " + m_data_err);
        }
        else {
          var params = { status: tweet_object.text, media_ids: [twitter_upload_data.media_id_string] }
          bot.post('statuses/update', params, (tweet_error, tweet_data, tweet_response) => {
            if (tweet_error) {
              console.log("error sending tweet: " + tweet_error);
            }
            else {
              console.log("Posted tweet @ index: " + tweet_index)
              update_spreadsheet(sheets, drive, spreadsheet_data);
              bot.post('statuses/update', {
                status: "@efdc_pty_ltd Image credit: " + dirs[randomIndex],
                in_reply_to_status_id: tweet_data.id_str,
              })
            }
          })
        }
      })
    }
    else {
      console.log("error uploading image: " + selected_image + " " + err);
    }
  })
}
/*
var drive_json = { folders: [] };
var file_ids = [];
drive.files.list({
  fields: 'nextPageToken, files(id, name),files/parents',
  q: `'${folder_id}' in parents`
}, async(err, results) => {
  if (err) {
    console.log("Error when listing files: " + err)
  }
  else {
    let drive_json_promise = new Promise(async(resolve, reject) => {
      for (var i = 0; i < results.data.files.length; i++) {
        var item_json = {
          name: results.data.files[i].name,
          files: []
        };
        let for_promise = new Promise((resolve_for, reject_for) => {

          drive.files.list({
            fields: 'nextPageToken, files(id, name),files/parents',
            q: `'${results.data.files[i].id}' in parents`
          }, (nested_err, nested_results) => {
            if (nested_err) {
              console.log("Error when listing files: " + nested_err);
              resolve_for("Done with internal loop")

            }
            else {
              for (var j = 0; j < nested_results.data.files.length; j++) {
                item_json.files.push(nested_results.data.files[j].id);
                file_ids.push(nested_results.data.files[j].id)

              }
              drive_json.folders.push(item_json)
              resolve_for("Done with internal loop")

            }

          });
        })
        let a = await for_promise;
      }
      resolve("Done!")

    });
    let await_result = await drive_json_promise; // wait until the promise resolves (*)
    console.log(await_result)
    var drive_json_string = JSON.stringify(drive_json, null, '\t');
    fs.writeFileSync('files.json', drive_json_string)
    var random_file_index = Math.floor(Math.random() * file_ids.length)
    var random_file_id = file_ids[random_file_index];
    drive.files.get({
        fileId: random_file_id,
        field: "name, fileExtension, files/parents",
      },
      (random_file_error, random_file_info_result) => {
        console.log("Trying to download file: " + random_file_info_result.data.name)

        drive.files.get({
            fileId: random_file_id,
            alt: 'media'
          },
          (random_file_data_error, random_file_data_result) => {
            if (random_file_data_error) {
              console.log("Error downloading file from Google Drive" + random_file_data_error)
            }
            else {

              // var buffer = Buffer.from(random_file_data_result.data); // Buffer.from(random_file_data_result.data);
              // var base64data = buffer.toString('base64');
              // fs.writeFile("test.txt", random_file_data_result.data, (write_err) => {
              //   console.log(err);
              // })
              var buf = Buffer.from(random_file_data_result.data).toString('base64')
              bot.post('media/upload', { media: buf }, (err, twitter_upload_data, response) => {
                if (!err) {
                  console.log(twitter_upload_data.media_id_string);
                  var meta_params = { media_id: twitter_upload_data.media_id_string, alt_text: { text: "Alt text for image unavailable" } };

                  bot.post('media/metadata/create', meta_params, (m_data_err, m_data_data, m_data_response) => {
                    if (m_data_err) {
                      console.log("error setting image metadata: " + m_data_err);
                    }
                    else {
                      var params = { status: tweet_message, media_ids: [twitter_upload_data.media_id_string] }
                      bot.post('statuses/update', params, (tweet_error, tweet_data, tweet_response) => {
                        if (tweet_error) {
                          console.log("error sending tweet: " + tweet_error);
                        }
                        else {
                          console.log("Posted tweet @ index: " + tweet_index)
                          update_spreadsheet(sheets, drive, spreadsheet_data);
                        }
                      })
                    }
                  })
                }
                else {
                  console.log("error uploading image: " + random_file_id + " " + random_file_info_result.data.name + " " + err);
                }
              })
            }
          });


      });
  }
});

    */
/*
bot.post('statuses/update', tweet_message, (err, data, response) => {
  if (err) {
    console.log("Something went wrong")
    console.log(err)
  }
  else {
    console.log("Tweet successful")
  }

})
*/
// retweet on keywords
//retweet()
//setInterval(retweet, config.twitterConfig.retweet)

// reply to new follower
//const userStream = bot.stream('user')
//userStream.on('follow', reply)

// This will allow the bot to run on now.sh
/*
const server = createServer((req, res) => {
  res.writeHead(302, {
    Location: `https://twitter.com/${config.twitterConfig.username}`
  })
  res.end()
})
*/
/*
var tweet_message =
{
  status: 'hello, world!'
}

bot.post('statuses/update', tweet_message, tweeted)

function tweeted(err, data, response)
{
  if (err)
  {
    console.log("Something went wrong")
    console.log(err)
  }
  else
  {
    console.log("Tweet successful")
  }
}
*/
//server.listen(3000)
