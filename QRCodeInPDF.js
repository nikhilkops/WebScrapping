let minimist = require("minimist"); //For Input in a ordered way
let input = minimist(process.argv); //taking input with help of minimist
let axios = require("axios"); //to download web page
let pdf = require("pdf-lib"); //to work with pdf files
let excel4node = require("excel4node"); //to fill excel file
let jsdom = require("jsdom"); //for JSON format
let path = require("path"); //to create files
let fs = require("fs"); //reading and writing files
let QRCode = require("qrcode");
//node QRCodeInPDF.js --url=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results --excel=Worldcup.csv --folder=worldcup;
let Cric_Info = axios.get(input.url);
Cric_Info.then(function (response) {
  let html = response.data; //html code of url
  let dom = new jsdom.JSDOM(html); // ?
  let document = dom.window.document; // ?

  let DivOfMatch = document.querySelectorAll("div.match-score-block"); //to select block of match from html code
  let Matches = []; //making matches array to store all  match

  for (let i = 0; i < DivOfMatch.length; i++) {
    //loop in every match from div of matches from html
    let MInfo = DivOfMatch[i];

    let Match = {
      //Match object to store info about each match
      t1: "",
      t2: "",
      t1Score: "",
      t2Score: "",
      result: "",
    };

    let team = MInfo.querySelectorAll("div.name-detail > p.name");
    Match.t1 = team[0].textContent;
    Match.t2 = team[1].textContent;

    let result = MInfo.querySelector("div.status-text>span");
    Match.result = result.textContent;
    let score = MInfo.querySelectorAll("div.score-detail > span.score");
    let l = score.length;
    //Checkinng if match was played between two team 1 team or none
    if (l == 2) {
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

  prepareExcel(TeamInWorldcup, input.excel);//function to prepare Excel File

  prepareFolder(TeamInWorldcup, input.folder);//function to prepare foldres
  // console.log("pdf ended");
}).catch(function (err) {
  //if html code is not loaded then print error
  console.log(err);
});

function prepareFolder(team, folder) {
  if (fs.existsSync(folder) == true) {
    fs.rmdirSync(folder, {//if folder exist then delete it
      recursive: true,
    });
  }
  fs.mkdirSync(folder);//make new folder(worldcup as per input given above)

  for (let i = 0; i < team.length; i++) {
    let teamfolder = path.join(folder, team[i].Name);
    fs.mkdirSync(teamfolder);//making folder innside worldcup
    // console.log(teamfolder);
    for (let j = 0; j < team[i].Matches.length; j++) {
      InsertingPDF(teamfolder, team[i].Name, team[i].Matches[j]);//insert content inside pdf
    }
  }
}

//
function InsertingPDF(folder, self, match) {
  let tpdf = path.join(folder, match.vs);//set path for pdf file
  let templateFileBytes = fs.readFileSync("Template.pdf");//reading template file
  let pdfdocKaPromise = pdf.PDFDocument.load(templateFileBytes);//loading psd bytes

  pdfdocKaPromise.then(async function (pdfdoc) {//using async function to use await inside
      let page = pdfdoc.getForm();//gettting pdf as form
      //getting text field inside pdf
      let team1 = page.getTextField("Team 1");
      let team2 = page.getTextField("Team 2");
      let t1S = page.getTextField("Team1Score");
      let t2S = page.getTextField("Team2Score");
      let result = page.getTextField("Result");
      let QR=page.getButton("QR");//getting image
      
      let content = self +" : " +match.t1Score +" , " +match.vs +" : " +match.t2Score +", Result : " +match.Result +".";
      let QRPath=self + " (vs) " + match.vs + ".png";
      let pos = path.join(folder, QRPath);//worldcup-->countryfolder-->png file
      
      

      if (fs.existsSync(pos) == true) {
        QRpath=self + " (vs) " + match.vs +"[2]Match"+ ".png";
        pos = path.join(folder,QRPath);
      }
      let imp=path.join("QR",folder);//--.qr fiol.der -->wolrdcup-->country folder --> .pnmg fole
      let ImageBytes=fs.readFileSync(path.resolve(path.join(imp,QRPath) ));//readinf qr code in png formatt       
      
      let Image = await pdfdoc.embedPng(ImageBytes);
      team1.setText(self);//setting text at apppropriate place
      team2.setText(match.vs);
      t1S.setText(match.t1Score);
      t2S.setText(match.t2Score);
      result.setText(match.Result);
      QR.setImage(Image);//seting qr images at approprioate places
   
      page.flatten();//removing editing capablities of pdf
      let pdfBytes = pdfdoc.save();
      pdfBytes
        .then(function (changedBytes) {
          if (fs.existsSync(tpdf + ".pdf") == true) {
            fs.writeFileSync(tpdf + "1.pdf", changedBytes);
          } else {
            fs.writeFileSync(tpdf + ".pdf", changedBytes);
          }
        })
        .catch(function (err) {
          console.log(err);
        });
    })
    .catch(function (err) {
      console.log("error:");
      console.log(err);
    });
}

function prepareExcel(team, excelFileName) {
  let wb = new excel4node.Workbook();
  for (let i = 0; i < team.length; i++) {
    let ws = wb.addWorksheet(team[i].Name);
    ws.cell(1, 1).string("vs");//writing data in appropriate cell in excel files
    ws.cell(1, 2).string("Selfscore");
    ws.cell(1, 3).string("OpponentScore");
    ws.cell(1, 4).string("Result");
    // console.log(team)
    for (let j = 0; j < team[i].Matches.length; j++) {
      ws.cell(2 + j, 1).string(team[i].Matches[j].vs);
      ws.cell(2 + j, 2).string(team[i].Matches[j].t1Score);
      ws.cell(2 + j, 3).string(team[i].Matches[j].t2Score);
      ws.cell(2 + j, 4).string(team[i].Matches[j].Result);
    }
  }
  wb.write(excelFileName);
}

function MatchesPlayed(Team, Match) {
  let t1Index = -1;
  for (let i = 0; i < Team.length; i++) {
    //checking if team 1 exist in Team array
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
    Result: Match.result,
  });
  let t2Index = -1;
  for (let i = 0; i < Team.length; i++) {
    //checking if team  exists in team array
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
    Result: Match.result,
  });
}

function InsertingTeams(Team, Match) {
  //Insertign Teams
  let t1Index = -1;
  for (let i = 0; i < Team.length; i++) {
    //checking if team 1 exist in Team array
    if (Team[i].Name == Match.t1) {
      t1Index = i;
      break;
    }
  }
  let t2Index = -1;
  for (let i = 0; i < Team.length; i++) {
    //checking if team  exists in team array
    if (Team[i].Name == Match.t2) {
      t2Index = i;
      break;
    }
  }
  if (t1Index == -1) {
    //if team dont exist then insert t1
    putTeam(Team, Match.t1);
  }
  if (t2Index == -1) {
    //if team dont exist the insert t2
    putTeam(Team, Match.t2);
  }
}

function putTeam(Team, Country) {
  //method for inserting team in teams played array with Macthes they played
  let t = {
    Name: Country,
    Matches: [],
  };
  Team.push(t);
}
