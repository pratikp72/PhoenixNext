import Packery from  'packery';
import moment from 'moment';
import {helper} from '../helpers/helper';


export class Globals {

  packery=null;

  fullSizeSchedule = false;
  scheduleLocation;
  scheduleProvider;
  scheduleDate;
  workflowDate;
  admin=null;
  mobileView=false;
  isTouchDevice = false;
  selfHosted=true;

  alertManager=[];

  getFileNameWithPath(filepath){
    var indexOf = this.selfHosted ? "\\" : "/";
    var slashIndex = filepath.lastIndexOf(indexOf) + 1
    var docName = filepath.slice(slashIndex, filepath.length);
    return decodeURI(docName);
  }

  add_patient_alert(patientId){
    //exists??
    var pat = window.localStorage.getItem(patientId);
    if(!pat){
      window.localStorage.setItem(patientId, "alert")
    }
  }

  check_patient_alert(patientId){
    return window.localStorage.getItem(patientId)
  }

  clear_patient_alerts(){
    window.localStorage.clear();
  }

  checkConversationResultIsSender(conversationResult, userId){
    let isSender =false;
    if(conversationResult.User != null){
      isSender = conversationResult.User.UserID == userId ? true : false;
    }else{
      isSender = false;
    }
    return isSender;
  }

    determineGender(macro, patient)
    {
      var txtGender = "";

      switch (macro)
      {
        case "[he/she]":
          if (patient.data.Sex == "M")
            txtGender = "He";
          else
            txtGender = "She";
          break;
        case "[his/her]":
          if (patient.data.Sex == "M")
            txtGender = "His";
          else
            txtGender = "Her";
          break;
        case "[him/her]":
          if (patient.data.Sex == "M")
            txtGender = "Him";
          else
            txtGender = "Her";
          break;
      }

      return txtGender;
    }



  replaceMacros(txt, pat, provider, bodySide){
      var self = this;

    if (txt == null) return "";

    var genderList = [];
    var heShe = "[he/she]";
    var hisHer = "[his/her]";
    var himHer = "[him/her]";
    var patient = "[patient]";
    var side = "[side]";
    var postOpDays= "[PostOpDays]";
    var age = "[AGE]";
    var gender = "[Gender]";
    var currentProvider = "[Current Provider]";
    var handDom = "[Hand Dominance]";
    genderList.push(himHer);
    genderList.push(heShe);
    genderList.push(hisHer);
    var txtGender = "";
    var results = txt;
    var tempVal = "";
    var genderLoc;

    //current provider
    results = results.replace(currentProvider, provider.ProviderEntity);

    //age
    if(results.indexOf(age) > -1 && pat.data.DOB != undefined && pat.data.DOB != null)
    {
      var today =  moment();//.format('MM/DD/YYYY');
      var patDob = moment(pat.data.DOB, "MM/DD/YYYY");//helper.getDateWithFormat(patient.data.DOB, 'MM/DD/YYYY');//  moment().format() Convert.ToDateTime(clsUtility.Patient.DOB);

      //diff
      // var diff = today.subtract(patDob);
      var diff = moment.duration(today.diff(patDob));
      var years = diff.years();
      var patientAge = years;

      // var patientAge = (int)Math.Floor((DateTime.Now - patDob).TotalDays / 365.25D);
      results = results.replace(age, patientAge);
    }

    //replace gender stuff
    results = results.replace(gender, pat.data.Sex.toUpperCase() == "M" ? "male" : "female");

    for (var i = 0; i < txt.length; i++)
    {
      for (var g =0; g < genderList.length; g++)
      {
        var s = genderList[g];

        genderLoc = results.indexOf(s);
        if (genderLoc > -1)
        {
          if (genderLoc == 0)//beginning of sentence
          {
            // results = results.slice(0, s.length);
            results = results.slice(s.length, results.length - s.length);
            txtGender = self.determineGender(s, pat);
            results = txtGender + results;// results.Insert(0, txtGender);
          }
          else // if not at beginning
          {
            var sIndex = genderLoc - 2;
            var eIndex = sIndex + 1;
            tempVal = results.substring(sIndex, eIndex);//check for period

            //results = results.slice(genderLoc, s.length);
            txtGender = self.determineGender(s, pat);

            // if (tempVal == ".")
            // {
            //   results = results.slice(genderLoc, s.Length);
            //   txtGender = determineGender(s);
            //
            //
            //   results = results.Insert(genderLoc, txtGender);
            // }
            // else
            // {
            //   results = results.Remove(genderLoc, s.Length);
            //   txtGender = determineGender(s);
            //   results = results.Insert(genderLoc, txtGender.ToLower());
            // }

            if(tempVal != "."){
              txtGender = txtGender.toLowerCase();
            }


            //results = results.Insert(genderLoc, txtGender.ToLower());
            //remove macro...
            results = results.replace(s, "");
            results = results.slice(0, genderLoc) + txtGender + results.slice(genderLoc);

          }
        }
        //else
        //    break;
      }
    }

    //replace patient name
    results = results.replace(patient, pat.data.NameFirst + " " + pat.data.NameLast);

    const regex =  new RegExp(RegExp.quote(side),'g'); // correct way
    results = results.replace(regex, bodySide.toLowerCase()); // it works


    //replace hand dom
    // var dbHx = PhoenixDB.GetPatientHXInstance();
    // var socHx = dbHx.GetPatientLatestSocialHistory(localPatientID);
    // if(socHx != null && (socHx.hand_dom_L.HasValue || socHx.hand_dom_R.HasValue))
    // {
    //   bool isLeft = false, isRight = false;
    //   if(socHx.hand_dom_L.HasValue && socHx.hand_dom_L.Value == true)
    //   {
    //     isLeft = true;
    //   }
    //   if (socHx.hand_dom_R.HasValue && socHx.hand_dom_R.Value == true)
    //   {
    //     isRight = true;
    //   }
    //   string hand = null;
    //   if(isLeft && isRight)
    //   {
    //     hand = "ambidextrous";
    //   }
    //   else if (isLeft)
    //   {
    //     hand = "left";
    //   }
    //   else if (isRight)
    //   {
    //     hand = "right";
    //   }
    //
    //   if(hand != null)
    //     results = results.Replace(handDom, hand);
    // }
    //
    // //search for postOpDate
    // if (results.Contains(postOpDays))
    // {
    //   var db = PhoenixDB.GetSurgeryScheduleInstance();
    //   OD_Surg_Schedule schedRes = db.GetPreviousBySurgDate(localPatientID, localDateTime);
    //   int days = 0;
    //   if (schedRes != null && schedRes.SurgDate.HasValue &&
    //     schedRes.SurgDate.Value.CompareTo(DateTime.MinValue) != 0)
    //   {
    //     TimeSpan ts = localDateTime - schedRes.SurgDate.Value;
    //     days = (int)ts.TotalDays;
    //   }
    //   results = results.Replace(postOpDays, days.ToString());
    // }

    return results;
  }



  constructor(){
    //console.log("GLOBALS");

    RegExp.quote = function(str) {
      return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
    };


    Packery.prototype.getShiftPositions = function( attrName ) {
      attrName = attrName || 'id';
      var _this = this;
      return this.items.map( function( item ) {
        return {
          attr: item.element.getAttribute( attrName ),
          x: item.rect.x / _this.packer.width
          //x: Math.round(((item.rect.x / _this.packer.width) + Number.EPSILON) * 100) / 100
        }
      });
    };

    Packery.prototype.initShiftLayout = function( positions, attr ) {
      if ( !positions ) {
        // if no initial positions, run packery layout
        this.layout();
        return;
      }
      // parse string to JSON
      if ( typeof positions == 'string' ) {
        try {
          positions = JSON.parse( positions );
        } catch( error ) {
          console.error( 'JSON parse error: ' + error );
          this.layout();
          return;
        }
      }

      attr = attr || 'id'; // default to id attribute
      this._resetLayout();
      // set item order and horizontal position from saved positions
      this.items = positions.map( function( itemPosition ) {
        var selector = '[' + attr + '="' + itemPosition.attr  + '"]'
        var itemElem = this.element.querySelector( selector );
        var item = this.getItem( itemElem );
        item.rect.x = itemPosition.x * this.packer.width;
        //try this...
        //item.rect.y = 0;
        return item;
      }, this );
      this.shiftLayout();
    };
  }
}

