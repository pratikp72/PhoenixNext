import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Home} from '../home';
import {Data} from '../../data/go/data';
import {EventAggregator} from 'aurelia-event-aggregator';
import {Globals} from '../globals';
import { observable } from 'aurelia-framework';
import {PreferenceHelper} from '../preferenceHelper';


@inject(helper,http, Home, Data, EventAggregator, Globals, PreferenceHelper)
export class Exam {

  data=null;
  patientId;
  providerId;
  userId;
  bodypart=null;
  date;
  boardType;
  prefClicked = false;
  locked = false;

  speechId = 'exam-speech';

  @observable examText=null;
  board=null;
  fromPrevious = false;
  fromPreviousDate=null;
  fromPreviousProviderId=null;
  fromPreviousBodyPart = null;
 // previousDate=null;
  title="EXAM";
  loadData = true;

  block = null;
  element=null;

 // dataLoadedEvent=null;

 textareaHeight=0;

  constructor(helper, http, Home, Data, EventAggregator, Globals, PreferenceHelper){
    this.helper = helper;
    this.http = http;
    this.home = Home;
    this.goData = Data;
    this.eventAggregator = EventAggregator;
    this.globals = Globals;
    this.prefHelper = PreferenceHelper;
  }

  activate(model){
    this.block = model;
    this.block.childModel = this;

    if(model.hasOwnProperty('fromPrevious')){
      this.fromPrevious = true;
      //this.previousDate=model.previousDate;
    }
    if(model.hasOwnProperty('fromPreviousProviderId')){
      this.fromPreviousProviderId = model.fromPreviousProviderId;
    }
    if(model.hasOwnProperty('fromPreviousDate')){
      this.fromPreviousDate = model.fromPreviousDate;
    }
    if(model.hasOwnProperty('fromPreviousBodyPart')){
      this.fromPreviousBodyPart = model.fromPreviousBodyPart;
    }
    // if(model.hasOwnProperty('goFormDetails')){
    //   var bp = "";
    //   if(this.home.currentBoard && this.home.currentBoard.visitInfo){
    //     bp = this.home.currentBoard.visitInfo.getFirstAvailBodypartForExam('exam').part;
    //   }
    //   this.setExamData("See document tray for details.", bp, 'EXAM', false);//model.goFormDetails
    // }
    this.loadData = model.loadData;
  }

  hasValue(){
    let self = this;
    if(self.examText != null && self.examText.length > 0){
      return true;
    }
    return false;
  }

  examTextChanged(newValue, oldValue) {

    // if(this.element){
    //   this.auto_grow(this.element);
    // }

    if(this.fromPrevious || this.prefClicked){
      if(newValue !== oldValue){
        this.trySave();
        this.fromPrevious = false;
        this.prefClicked = false;
      }
    }
  }

  auto_grow(element) {

    // element.style.height = "5px";

    // if(element.scrollHeight==0){
    //   setTimeout(function(){
    //     element.style.height = (element.scrollHeight)+"px";
    //   },500);
    // }else{
    //   element.style.height = (element.scrollHeight)+"px";
    // }
  }



  attached(){
    var self = this;

    self.textareaHeight = self.cardbody.clientHeight - 8;

    if(self.home.currentBoard != null &&
      self.home.currentBoard.visitInfo != null){

      self.board = self.home.currentBoard;
      self.patientId = self.home.currentBoard.visitInfo.patientId;
      self.date = self.home.currentBoard.visitInfo.date;
      self.providerId= self.home.currentBoard.visitInfo.providerId;// == undefined ? self.home.currentProvider.ProviderID : self.home.currentBoard.visitInfo.providerId;
      self.userId = self.home.currentBoard.userId;
     // self.bodypart = self.getFirstAvailBodypartForExam().part;
      self.boardType = self.home.currentBoard.visitInfo.typeForSave;
      if(self.home.currentBoard.visitInfo.locked != null)
        self.locked = self.home.currentBoard.visitInfo.locked == 0 ? false : true;

      self.eventAggregator.publish("examNewBlockAttached", self);

      if(self.loadData){
        if(!self.fromPrevious){
          self.load();
        }else{
          self.loadPrevious();
        }
      }

      self.eventAggregator.publish("modelAttached", self);

      self.eventAggregator.subscribe("updateExamData", function(examData){
        var bp = examData.bodypart ? examData.bodypart : self.bodypart
        var pref = examData.isPreference ? examData.isPreference : false;
        self.setExamData(examData.details, bp, examData.title, pref);
      });

      if(self.block.loadPreferenceCallback){
        self.block.loadPreferenceCallback(self.block);
      }
    }
  }

  detached(){
    this.trySave();

    //this.dataLoadedEvent.dispose();
  }

  trySave(){
    var self = this;

    if(self.block.dontSave){
      return;
    }


    if(self.board != null && !self.locked) {
      self.home.saveQueue.addItem(self);
    }
  }

  save(callback){
    var self = this;
    var url = 'examfollowup';

    if((self.data == null || self.data.PostOpID == 0) && self.examText != null){
      //create new...
      self.goData.getNewExam(function(newExam){
        newExam.PatientID = self.patientId;
        newExam.ExamDateTime = self.date;
        newExam.ProviderID = self.providerId;
        newExam.UserID = self.userId;
        newExam.BodyPart = self.bodypart;
        newExam.IsOrigin = true;
        newExam.TYPE = self.boardType;
        newExam.ChartNoteExam = self.examText;

        self.http.post(self.helper.getApiUrl(url), newExam, (res) => {

          if(res == null){
            callback(false);
            return;
          }

          self.data = res;

          //update the block...
          self.block.objectId = res.PostOpID;
          self.goData.saveVisitBoard(self.board);

           if(callback) callback(true);
        }, null, (error) => {
          //alert(error.responseText);
          if(callback) callback(false);
        });

      });
    }else if(self.data != null){
      //update...

      self.data.ChartNoteExam = self.examText;

      //update the block if needed...
      if(self.block.objectId == 0){
        self.block.objectId = self.data.PostOpID;
        self.goData.saveVisitBoard(self.board);
      }

      self.http.put(self.helper.getApiUrl(url), self.data, (returnData) => {
        //examData.plan = returnData;
        if(callback) callback(true);
      }, (error) => {
        //alert(error.responseText);
        if(callback) callback(false);
      });
    }else{
      if(callback) callback(false);
    }
  }

  load(){
    var self = this;
    var url ="";

    // if(self.block.hasOwnProperty('options')){
    //   if(self.block.options.isPt == true){
    //
    //   }
    // }

    if(self.block.objectId != 0){
      url ="examfollowup/"+self.block.objectId;
    }else{
      let formattedDate = self.helper.getDateWithFormat(self.date, "MM-DD-YYYY");
      url = `examfollowups/patients/${self.patientId}/providers/${self.providerId}/date/${formattedDate}`;
    }
    self.http.get(self.helper.getApiUrl(url), function (json) {

      if (json != null) {
        if (Array.isArray(json)) {
          if(json.length > 0){
            for (let i = 0; i < json.length; i++) {
              self.populateData(json[i]);
            }
          }else{
            self.populateData(null);
          }
        } else {
          self.populateData(json);
        }
      }

    });
  }



  createNewBlockWithData(exam, board){
    let self = this;

    //does this block already exist??
    let existingExam = board.getBlockWithTypeAndObjectId('exam', exam.PostOpID);
    if(existingExam){
      return;
    }

    let newBlock = board.addBlockCopyExistingSize('exam', {soapSort: true});
    newBlock.objectId = exam.PostOpID;

    self.eventAggregator.subscribeOnce("examNewBlockAttached", function(model){

      //populate exam data..
      model.loadData = false;
      model.data = exam;
      model.examText = exam.ChartNoteExam;
      model.block = newBlock;

      self.prefHelper.addPreferenceCallbackObject(model);

      board.providerId = board.visitInfo.providerId;

      if(exam.BodyPart != null && self.board.visitInfo.hasBodypartToLoad('exam', exam.BodyPart)) {
        self.board.visitInfo.removeBodypartToLoad('exam', exam.BodyPart);
        model.bodypart = exam.BodyPart;
      } else {
        model.bodypart = self.board.visitInfo.getFirstAvailBodypartForExam('exam').part;
      }

      let tTitle = exam.TYPE.toUpperCase() == 'FOLLOW' ? 'FOLLOW UP' : exam.TYPE.toUpperCase();
      model.title = tTitle + " EXAM: " + model.bodypart;

      //update visitBoard layout to db...
      self.goData.saveVisitBoard(board, function(res){
        board.visitInfo.visitCode.VisitBoardId = res == true ? board.id : res.id;
        //update VisitBodyParts...
        board.visitInfo.visitCode.VisitBodyParts = self.goData.bodypartsToString(board.visitInfo.bodyparts);
        self.goData.updateVisitCode(board.visitInfo.visitCode);
      });
    });
  }

  // loadPreferences(){
  //   var self = this;
  //   var url ="";
  //   self.http.get(self.helper.getApiUrl(url), function (json) {
  //
  //   });
  // }

  populateData(exam){
    let self = this;

    if (self.data != null &&
      exam.PostOpID != self.data.PostOpID) {
      //this is another plan, create new block...
      if(!self.loadData){
        self.createNewBlockWithData(exam, self.home.currentBoard);
      }
      return;
    }

    if(!self.loadData)return;

    if( exam != null){

      let tBodypart = null;

      if(exam.BodyPart != null && self.board.visitInfo.hasBodypartToLoad('exam', exam.BodyPart)) {
        self.board.visitInfo.removeBodypartToLoad('exam', exam.BodyPart);
        tBodypart = exam.BodyPart;
      }else{
        tBodypart = self.board.visitInfo.getFirstAvailBodypartForExam('exam').part;
      }
      self.loadData = false;
      self.data = exam;
      // self.examText = exam.ChartNoteExam;
      // self.title = ": "+ self.bodypart;

      let tTitle = exam.TYPE.toUpperCase() == 'FOLLOW' ? 'FOLLOW UP' : exam.TYPE.toUpperCase();

      self.setExamData(exam.ChartNoteExam, tBodypart, tTitle +' EXAM', false);

    }else{
      //new exam...
       let tBodypart = self.board.visitInfo.getFirstAvailBodypartForExam('exam').part;
      // self.title = ": "+ self.bodypart;

      self.setExamData(null, tBodypart, 'Exam', false);
    }
  }

  setExamData(text, bodypart, title, isPreference){
    let self = this;
    self.prefClicked = isPreference;
    self.bodypart = bodypart;
    self.examText = text;
    self.title = title + ": "+ bodypart;
  }

  populateWithPreference(text, bodypart, title){
    let self = this;

    self.setExamData(text, bodypart, title, true);

    // self.prefClicked = true;
    // self.bodypart = bodypart;
    // self.examText = text;
    // self.title = ": "+ bodypart;
  }

  previousClick(){
    this.loadPrevious();
  }

  loadPrevious(){
    var self = this;
    var formattedDate = self.helper.getDateWithFormat(self.date, "MM-DD-YYYY");
    let formattedBp = self.board.visitInfo.getFirstAvailBodypartForExam('exam').part;
    let proId = self.providerId;

    if(self.fromPreviousDate){
      formattedDate = self.fromPreviousDate;
      formattedBp = self.fromPreviousBodyPart;
      proId = self.fromPreviousProviderId;
    }

    //var formattedBp = self.goData.formatBodypart(self.bodypart);
    var url = `examfollowup/previous/patients/${self.patientId}/provider/${proId}/bodypart/${formattedBp}/date/${formattedDate}`;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      if(json != null){

        self.bodypart = formattedBp;

        var exam ={
          PostOpID: self.data == null ? 0 : self.data.PostOpID,
          PatientID: self.patientId,
          UserID: self.userId,
          ProviderID: self.providerId,
          ExamDateTime: self.date,
          DateSurgery: json.DateSurgery,
          CaseID: json.CaseID,
          PostOpDays: json.PostOpDays,
          Surgeron: json.Surgeron,
          PreOpDiag: json.PreOpDiag,
          PostOpDiag: json.PostOpDiag,
          Procedure: json.Procedure,
          Timeframe: json.Timeframe,
          TYPE: json.TYPE,
          IsComplete: json.IsComplete,
          // DateCreated: json.DateCreated,
          // DateModified: json.DateModified,
          BodyPart: json.BodyPart,
          ChartNoteExam: json.ChartNoteExam
        }


        self.data = exam;
        self.examText = exam.ChartNoteExam;

        let tTitle = json.TYPE.toUpperCase() == 'FOLLOW' ? 'FOLLOW UP' : json.TYPE.toUpperCase();
        self.title = tTitle + " EXAM: "+ self.bodypart;
      }
    });
  }


}
