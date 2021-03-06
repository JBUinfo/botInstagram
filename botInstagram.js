const request = require('request');
const mysql = require('mysql');

const USER_IG = '';
const PASS_IG = "";

const USER_DB = "";
const PASS_DB = "";
const HOST_DB = "";
const NAME_DB = "";
const TABLE_NAME_DB = "";
const COLUMN_NAME_DB = "";

const MINUTES_LIKES = 8;
const MINUTES_FOLLOW = 30;
const MINUTES_COMMENT = 33;

const connection = mysql.createConnection({
  host     : HOST_DB,
  user     : USER_DB,
  password : PASS_DB,
  database : NAME_DB
});

connection.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});


const hastaggs = ['car','car','car','car','car','car','car','car','car','car','car','car','car'];
const comments = ['cool','cool','cool','cool','cool','cool','cool','cool','cool','cool','cool','cool','cool','cool','cool'];
let photosHastags = [];
let peopleHastags = [];
let flagLikes = true;
let flagFollows = true;
let flagComments = true;
let userid = '';
let followers = [];
let following = [];
let mutualFollow = [];
let header = {
  url: '',
  headers: {
    'method': 'POST',
    'scheme': 'https',
    'accept': '*/*',
    'accept-encoding': 'deflate, br',
    'content-type': '*/*',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
    'X-Instagram-AJAX': '1',
    'content-type': 'application/x-www-form-urlencoded',
    'x-requested-with': 'XMLHttpRequest'
  }
};
function sleep(ms) {
  return new Promise(resolve=>{
    setTimeout(resolve,ms);
  })
}

async function login() {
  header.headers.cookie='';
  header.headers['x-csrftoken']='';
  header.headers['X-Instagram-AJAX']='';
  let flag = true;
  let csrf = '';
  let rollout_hash = '';
  let cookies = '';
  let headerTemporal = header;
  headerTemporal.url = 'https://www.instagram.com/accounts/login/?source=auth_switcher';
  headerTemporal.headers.method = 'GET';
  try {
    request(headerTemporal, async function(error, response, body) {
      let substr = response.body.substring(response.body.indexOf('"csrf_token":"')+14,response.body.length);
      csrf = substr.substring(0,substr.indexOf('"'));
      rollout_hash = substr.substring(substr.indexOf('"rollout_hash":"'+16),substr.indexOf('"'));
      flag = false;
    });

    while(flag) {
      console.log('Getting csrf');
      await sleep(2000);
    }
    flag= true;

    headerTemporal.url = 'https://www.instagram.com/accounts/login/ajax/?hl=es';
    headerTemporal.headers['x-csrftoken'] = csrf
    headerTemporal.form = {
      'username': USER_IG,
      'password': PASS_IG,
      'enc_password': '',
      'queryParams': {"hl":"es","source":"auth_switcher"},
      'optIntoOneTap': 'false'
    }

    request.post(headerTemporal, function(error, response, body) {
      let cookieOne= response.headers['set-cookie'][7];//csrftoken
      let cookieTwo= response.headers['set-cookie'][response.headers['set-cookie'].length-4];//rur
      let cookieThree= response.headers['set-cookie'][response.headers['set-cookie'].length-3];//mid
      let cookieFour= response.headers['set-cookie'][response.headers['set-cookie'].length-2];//userid
      let cookieFive= response.headers['set-cookie'][response.headers['set-cookie'].length-1];//sessionid
      cookieOne=cookieOne.substring(0,cookieOne.indexOf(";")+1);
      csrf = cookieOne.substring(cookieOne.indexOf("=")+1,cookieOne.indexOf(";"));
      cookieTwo=cookieTwo.substring(0,cookieTwo.indexOf(";")+1);
      cookieThree=cookieThree.substring(0,cookieThree.indexOf(";")+1);
      cookieFour=cookieFour.substring(0,cookieFour.indexOf(";")+1);
      userid=cookieFour.substring(cookieFour.indexOf("=")+1,cookieFour.indexOf(";"));
      cookieFive=cookieFive.substring(0,cookieFive.indexOf(";")+1);
      header.headers.cookie=cookieOne+cookieTwo+cookieThree+cookieFour+cookieFive;
      header.headers['x-csrftoken']=csrf;
      header.headers['X-Instagram-AJAX']=rollout_hash;
      delete header.form
      flag=false;
    });

    while (flag) {
      console.log('Getting cookies');
      await sleep(2000);
    }
  } catch (e) {
    console.log(e);
    console.log('Fallo login');
  }
}

function follow(id) {
  let headerTemporal = header;
  headerTemporal.url = `https://www.instagram.com/web/friendships/${id}/follow/`;
  try {
    request.post(headerTemporal, getError);
  } catch (e) {
    console.log(e);
    console.log('Fallo follow');
  }
}

function unfollow(id) {
  let headerTemporal = header;
  headerTemporal.url = `https://www.instagram.com/web/friendships/${id}/unfollow/`;
  try {
    request.post(headerTemporal, getError);
  } catch (e) {
    console.log(e);
    console.log('Fallo unfollow');
  }
}

function like(id) {
  let headerTemporal = header;
  headerTemporal.url = `https://www.instagram.com/web/likes/${id}/like/`;
  try {
    request.post(headerTemporal, getError);
  } catch (e) {
    console.log(e);
    console.log('Fallo like');
  }
}

function addComment(id,comment) {
  let headerTemp = header;
  headerTemp.url = `https://www.instagram.com/web/comments/${id}/add/`;
  headerTemp.form = {};
  headerTemp.form.comment_text = comment;
  connection.query(`SELECT ${COLUMN_NAME_DB} from ${TABLE_NAME_DB} where idPhoto like "${id}"`, function (error, results, fields) {
    if (error) throw error;
    if (results == []) {
      try {
        request.post(headerTemp, async function(error, response, body) {
          await getError(error, response, body);
          connection.query(`INSERT INTO ${COLUMN_NAME_DB} VALUES ("${id}")`, function (err, result) {if (err) throw err;});
        });
      } catch (e) {
        console.log(e);
        console.log('Fallo addComment');
      }
    } else {
      console.log('Already commented');
    }
  });

}

async function loadMoreOnHastag(word, hashNext) {
  let flag = true;
  let flagTwo = true;
  let headerTemporal = header;
  try {
    for (let i = 0; i < 7; i++) {
      flagTwo = true;
      headerTemporal.url = `https://www.instagram.com/graphql/query/?query_hash=174a5243287c5f3a7de741089750ab3b&variables=%7B%22tag_name%22%3A%22${word}%22%2C%22first%22%3A4%2C%22after%22%3A%22${hashNext}%22%7D`;
      request(headerTemporal, async function(error, response, body) {
        if (response.statusCode == 200) {
          try {
            if (body = JSON.parse(body)) {
              for (let i = 0; i < Object.keys(body.data.hashtag.edge_hashtag_to_top_posts.edges).length; i++) {
                photosHastags[body.data.hashtag.edge_hashtag_to_top_posts.edges[i].node.id] = null;
                peopleHastags[body.data.hashtag.edge_hashtag_to_top_posts.edges[i].node.owner.id] = null;
              }
              for (let i = 0; i < Object.keys(body.data.hashtag.edge_hashtag_to_media.edges).length; i++) {
                photosHastags[body.data.hashtag.edge_hashtag_to_media.edges[i].node.id] = null;
                peopleHastags[body.data.hashtag.edge_hashtag_to_media.edges[i].node.owner.id] = null;
              }
              hashNext = body.data.hashtag.edge_hashtag_to_media.page_info.end_cursor;
            }
          } catch (e) {
            console.log(e);
          }
        }
        flagTwo=false;
      });
      while (flagTwo) {
        await sleep(2000);
      }
    }
  } catch (e) {
    console.log(e);
    console.log('Fallo loadMoreOnHastag');
  }
}

async function searchHastag(word) {
  let flag = true;
  let headerTemporal = header;
  headerTemporal.url = `https://www.instagram.com/explore/tags/${word}/?__a=1`;
  try {
    request(headerTemporal, async function(error, response, body) {
      if (response.statusCode == 200) {
        await getError(error, response, body);
        body = JSON.parse(body);
        for (let i = 0; i < Object.keys(body.graphql.hashtag.edge_hashtag_to_top_posts.edges).length; i++) {
          photosHastags[body.graphql.hashtag.edge_hashtag_to_top_posts.edges[i].node.id] = null;
          peopleHastags[body.graphql.hashtag.edge_hashtag_to_top_posts.edges[i].node.owner.id] = null;
        }
        for (let i = 0; i < Object.keys(body.graphql.hashtag.edge_hashtag_to_media.edges).length; i++) {
          photosHastags[body.graphql.hashtag.edge_hashtag_to_media.edges[i].node.id] = null;
          peopleHastags[body.graphql.hashtag.edge_hashtag_to_media.edges[i].node.owner.id] = null;
        }
        await loadMoreOnHastag(word, body.graphql.hashtag.edge_hashtag_to_media.page_info.end_cursor)
      }
      flag=false;
    });
    while (flag) {
      console.log(`Searching Hastag: ${word}`);
      await sleep(2000);
    }
  } catch (e) {
    console.log(e);
    console.log('Fallo searchHastag');
  }
}

async function getFollowers() {
  let flag = true;
  let headerTemporal = header;
  headerTemporal.url = `https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=%7B%22id%22%3A%22${userid}%22%2C%22include_reel%22%3Atrue%2C%22fetch_mutual%22%3Atrue%2C%22first%22%3A100000%7D`;
  headerTemporal.headers.method = 'GET';
  headerTemporal.headers['accept-encoding'] = 'deflate, br';
  try {
    request(headerTemporal, async function(error, response, body){
      await getError(error, response, body);
      body = JSON.parse(body);
      for (let i = 0; i < Object.keys(body.data.user.edge_followed_by.edges).length; i++) {
        followers[i] = body.data.user.edge_followed_by.edges[i].node.id;
      }
      for (let i = 0; i < Object.keys(body.data.user.edge_mutual_followed_by.edges).length; i++) {
        mutualFollow[i] = body.data.user.edge_mutual_followed_by.edges[i].node.id;
      }
      flag=false;
    });
    while (flag) {
      console.log('Getting List of followings');
      await sleep(2000);
    }
  } catch (e) {
    console.log(e);
    console.log('Fallo getFollowers');
  }
}

async function getFollowing() {
  let flag = true;
  let headerTemporal = header;
  headerTemporal.url = `https://www.instagram.com/graphql/query/?query_hash=d04b0a864b4b54837c0d870b0e77e076&variables=%7B%22id%22%3A%22${userid}%22%2C%22include_reel%22%3Atrue%2C%22fetch_mutual%22%3Afalse%2C%22first%22%3A100000%7D`;
  headerTemporal.headers.method = 'GET';
  headerTemporal.headers['accept-encoding'] = 'deflate, br';
  try {
    request(headerTemporal, async function(error, response, body){
      await getError(error, response, body);
      body = JSON.parse(body);
      for (let i = 0; i < Object.keys(body.data.user.edge_follow.edges).length; i++) {
        following[i] = body.data.user.edge_follow.edges[i].node.id;
      }
      flag=false;
    });
    while (flag) {
      console.log('Getting List of followings');
      await sleep(2000);
    }
  } catch (e) {
    console.log(e);
    console.log('Fallo getFollowing');
  }
}

async function unfollowFollowers() {
  await getFollowers();
  for (let i = 0; i < followed.length; i++) {
    if (!mutualFollow[followed[i]]) {
      unfollow(followed[i]);
      await sleep(60000);
    }
  }
}

async function likeHastags() {
  for (let e of Object.keys(photosHastags)) {
    console.log('dando like');
    like(e);
    await sleep(1000*60*MINUTES_LIKES);
  };
  flagLikes = false;
}

async function commentHastags() {
  for (let e of Object.keys(photosHastags)) {
    console.log('Dejando comentario');
    addComment(e,comments[Math.floor(Math.random() * comments.length-1)]);
    await sleep(1000*60*MINUTES_COMMENT);
  };
  flagComments = false;
}

async function followHastags() {
  for (let e of Object.keys(peopleHastags)) {
    console.log('dando follow');
    follow(e);
    await sleep(1000*60*MINUTES_FOLLOW);
  }
  flagFollows = false;
}

async function getError(error, response, body) {
  if (error || response.statusCode != 200) {
    if (response.statusCode == 400 && body != 'Sorry, this photo has been deleted') {
      if(JSON.parse(response.body).checkpoint_url != undefined){
        let flag = true;
        let headerTemp = header;
        headerTemp.url = JSON.parse(response.body).checkpoint_url;
        request(headerTemp, async function(error, response, body) {
          await login();
          flag=false;
        });
        while (flag) {
          sleep(1000);
        }
      }
    }
  }
}

(async () => {
  try {
    setInterval(async function() {
      await unfollowFollowers();
    },1000*60*60*24*7);

    let contador = 0;
    while (true) {
      contador++
      console.log(`Times finished: ${contador}`);
      await login();
      for (let i = 0; i < hastaggs.length; i++) {
        await searchHastag(hastaggs[i]);
      }
      await getFollowing();
      for (let i = 0; i < following.length; i++) {
        if (peopleHastags[following[i]]) {
          peopleHastags.splice(0, 1, following[i]);
        }
      }
      if (peopleHastags.length < 50) {
        continue;
      }
      likeHastags();
      followHastags();
      commentHastags();
      while (flagLikes || flagFollows || flagComments ) {
        console.log('Esperando 30min');
        await sleep(1000*60*30);
      }
      flagLikes = true;
      flagFollows = true;
      flagComments = true;
      photosHastags = [];
      peopleHastags = [];
      followers = [];
      following = [];
    }
  } catch (e) {
    console.log(e);
  }
})();
