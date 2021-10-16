let minimist = require("minimist"); //For Input in a ordered way
let input = minimist(process.argv); //taking input with help of minimist
let axios = require("axios"); //to download web page
let jsdom = require('jsdom'); //for JSON format 
let path = require("path"); //to create files
let fs = require("fs"); //reading and writing files 
let QRCode = require("qrcode");

//node qrcode.js --url=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results --folder=QR;

let Cric_Info = axios.get(input.url)//get Cricket Info URL
Cric_Info.then(function (response) {//IF URL is retrieved

  let html = response.data; //html code of url 
  let dom = new jsdom.JSDOM(html); 
  let document = dom.window.document; 

  let DivOfMatch = document.querySelectorAll("div.match-score-block"); //to select block of match from html code
  let Matches = []; //making matches array to store all  match

  for (let i = 0; i < DivOfMatch.length; i++) { //loop in every match from div of matches from html
    let MInfo = DivOfMatch[i];

    let Match = { //Match object to store info about each match
      t1: "",
      t2: "",
      t1Score: "",
      t2Score: "",
      result: ""
    };

    let team = MInfo.querySelectorAll("div.name-detail > p.name");//querySelectorAll to get all content
    Match.t1 = team[0].textContent;//text.conent to get content in team arry index
    Match.t2 = team[1].textContent;//text.conent to get content in team arry index

    let result = MInfo.querySelector("div.status-text>span");//querySelector for just one content
    Match.result = result.textContent;
    let score = MInfo.querySelectorAll("div.score-detail > span.score");
    let l = score.length;
    //Checkinng if match was played between two team one team or none or 
    if (l == 2)

    {
      Match.t1Score = score[0].textContent;
      Match.t2Score = score[1].textContent;
    } else if (l == 1) {
      Match.t1Score = score[0].textContent;
      Match.t2Score = "";
    } else {
      Match.t1Score = "";
      Match.t2Score = "";
    }
    Matches.push(Match); //pushing match in matches array
  }
  let TeamInWorldcup = []; // distinct teamArray --> played matches

  for (let i = 0; i < Matches.length; i++) {
    InsertingTeams(TeamInWorldcup, Matches[i]); //call method for Inserting Teams in distinct team Array
  }


  for (let i = 0; i < Matches.length; i++) {
    MatchesPlayed(TeamInWorldcup, Matches[i]); //call method for Inserting Matches palyed byTeams in distinct team Array
  }

  // console.log(JSON.stringify(TeamInWorldcup));
  fs.writeFileSync("team.json", JSON.stringify(TeamInWorldcup), "utf-8");

  prepareFolder(TeamInWorldcup, input.folder);//preparing folder for QR Codes

}).catch(function (err) { //if html code is not loaded then print error
  console.log(err);
})

function prepareFolder(team, folder) {
  if (fs.existsSync(folder) == true) {//if folder exist then deletes it
    fs.rmdirSync(folder, {
      recursive: true
    });
  }
  fs.mkdirSync(folder);//create new folder 
   let QRInside=path.join(folder,"worldcup");//path of folder-->worldcup
   fs.mkdirSync(QRInside);//making worldcup folder inside QR
  for (let i = 0; i < team.length; i++) {
    let teamfolder = path.join(QRInside, team[i].Name);
    fs.mkdirSync(teamfolder);//making folder inside worldcup whic is inside folder (QR as per input given at top in comments)
    // console.log(teamfolder);
    for (let j = 0; j < team[i].Matches.length; j++) {
      MakingQRCodes(teamfolder, team[i].Name, team[i].Matches[j]);//function to create QR Codes

    }
  }
}

function MakingQRCodes(folder, self, match) {
  let content = self + " : " + match.t1Score + " , " + match.vs + " : " + match.t2Score + ", Result : " + match.Result + "."; //Information (String) to put inside QR Codes
  
  let QRPath=self + " (vs) " + match.vs + ".png";//path for PNG file (QR code)
      let pos = path.join(folder, QRPath);
  
      if (fs.existsSync(pos) == true) {//if existing file exist then change
        QRpath=self + " (vs) " + match.vs +"[2]Match"+ ".png";
        pos = path.join(folder,QRPath);
      }
  QRCode.toFile(pos, content, { //QR file as png
    color: {
      dark: '#000', // Blue dots
      light: '#0000' // Transparent background
    }
  }, function (err) {
    if (err) throw err

  })

}

function MatchesPlayed(Team, Match) {
  let t1Index = -1;
  for (let i = 0; i < Team.length; i++) { //checking if team 1 exist in Team array
    if (Team[i].Name == Match.t1) {
      t1Index = i;
      break;
    }
  }
  let tm1 = Team[t1Index];
  tm1.Matches.push({
    vs: Match.t2,
    t1Score: Match.t1Score,
    t2Score: Match.t2Score,
    Result: Match.result
  });
  let t2Index = -1;
  for (let i = 0; i < Team.length; i++) { //checking if team  exists in team array
    if (Team[i].Name == Match.t2) {
      t2Index = i;
      break;
    }
  }


  let tm2 = Team[t2Index];
  tm2.Matches.push({
    vs: Match.t1,
    t1Score: Match.t2Score,
    t2Score: Match.t1Score,
    Result: Match.result
  });
}

function InsertingTeams(Team, Match) { //Insertign Teams
  let t1Index = -1;
  for (let i = 0; i < Team.length; i++) { //checking if team 1 exist in Team array
    if (Team[i].Name == Match.t1) {
      t1Index = i;
      break;
    }
  }
  let t2Index = -1;
  for (let i = 0; i < Team.length; i++) { //checking if team  exists in team array
    if (Team[i].Name == Match.t2) {
      t2Index = i;
      break;
    }
  }
  if (t1Index == -1) { //if team dont exist then insert t1 
    putTeam(Team, Match.t1);
  }
  if (t2Index == -1) { //if team dont exist the insert t2
    putTeam(Team, Match.t2);
  }
}

function putTeam(Team, Country) //method for inserting team in teams played array with Macthes they played
{
  let t = {
    Name: Country,
    Matches: []
  };
  Team.push(t);
}