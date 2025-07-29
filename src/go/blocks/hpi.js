import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Home} from '../home';
import {Data} from '../../data/go/data';
import {EventAggregator} from 'aurelia-event-aggregator';
import {Globals} from '../globals';
import { observable } from 'aurelia-framework';
import {PreferenceHelper} from '../preferenceHelper';
import {PopupHelper} from "../popupHelper";


@inject(helper,http, Home, Data, EventAggregator, Globals, PreferenceHelper, PopupHelper)
export class Hpi {

  data=null;
  patientId;
  providerId;
  userId;
  bodypart;
  date;
  boardType;
  prefClicked = false;
  locked = false;

  title="HPI";


  @observable hpiText = "";

  speechId = 'hpi-speech';

  board=null;
  fromPrevious = false;
  //previousDate=null;
  fromPreviousDate=null;
  fromPreviousProviderId=null;
  fromPreviousBodyPart = null;
  loadData = true;

  block = null;

  dataLoadedEvent=null;

  element=null;

  textareaHeight=0;

  signalRConnection

  backgroundColor = '#fff'

  constructor(helper, http, Home, Data, EventAggregator, Globals, PreferenceHelper, PopupHelper){
    this.helper = helper;
    this.http = http;
    this.home = Home;
    this.goData = Data;
    this.eventAggregator = EventAggregator;
    this.globals = Globals;
    this.prefHelper = PreferenceHelper;
    this.popupHelper = PopupHelper;
  }

  toggleBackgroundColor(){
    this.backgroundColor = this.backgroundColor == "#fff" ? "#fff3cd" : "#fff";
  }

  activate(model){
    this.block = model;
    this.block.childModel = this;

    if(model.hasOwnProperty('fromPrevious')){
      this.fromPrevious = true;
      //this.previousDate = model.previousDate;
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
    this.loadData = model.loadData;
  }

  hasValue(){
    let self = this;
    if(self.hpiText != null && self.hpiText.length > 0){
      return true;
    }
    return false;
  }

  openHpiIntake() {
    let self = this;
    let viewPath = './hpi/hpiIntake';

    const windowHeight = window.innerHeight - 100;
    const windowWidth = window.innerWidth;

    let width = (windowWidth / 3) * 2;
    let left = (windowWidth / 5);

    let options={
      displayHeader: false,
      //bodyPadding: 0
      //scrollHeight: 228
    }


    this.popupHelper.openViewModelPop(viewPath, self, 'Tell us about the history of your illness', width, windowHeight, 50, left, options, function(res){

      if(!res.hasOwnProperty('cancelled')){
        self.hpiText = res.text;
      }

      // if(self.element){
      //   setTimeout(function(){
      //     self.auto_grow(self.element);
      //   },500);
      // }
    });
  }

  hpiTextChanged(newValue, oldValue) {

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

  previousClick(){
    this.loadPrevious();
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
     // self.bodypart = self.home.currentBoard.visitInfo.bodypart;
      self.boardType = self.home.currentBoard.visitInfo.typeForSave;
      if(self.home.currentBoard.visitInfo.locked != null)
        self.locked = self.home.currentBoard.visitInfo.locked == 0 ? false : true;




      self.eventAggregator.publish("hpiNewBlockAttached", self);

      if(self.loadData){
        if(!self.fromPrevious){
          self.load();
        }else{
          self.loadPrevious();
        }
      }

      self.eventAggregator.publish("modelAttached", self);

      if(self.block.loadPreferenceCallback){
        self.block.loadPreferenceCallback(self.block);
      }

    }

    //new signalR logic...
    self.signalRConnection = new signalR.HubConnectionBuilder().withUrl(self.helper._server + "/signalr/hpihub").build();

    self.signalRConnection.on("ReceiveUpdate", (data)=>{
      //alert(`NOTIFIACTION:${message}`);
      self.hpiText = data.HpiText;
      self.toggleBackgroundColor();
    });

    self.signalRConnection.start().then(function(success){
      self.signalRConnection.invoke("JoinGroup", self.helper._user.TenantId);
    }, function(failure){

    });

  }

  detached(){
    this.trySave();

   // this.dataLoadedEvent.dispose();
  }

  trySave(){
    var self = this;

    if(self.block.dontSave){
      return;
    }

    if(self.board != null  && !self.locked) {
      self.home.saveQueue.addItem(self);
    }
  }


  save(callback){
    var self = this;
    var url = 'hpis';

    if((self.data == null || self.data.HPIID == 0) && self.hpiText && self.hpiText.length > 0){

      //create new...
      self.goData.getNewHpi(function(newHpi){

        newHpi.PatientID = self.patientId;
        newHpi.VisitDate = self.date;
        newHpi.ProviderID = self.providerId;
        newHpi.UserID = self.userId;
        newHpi.BodyPart = self.bodypart;
        newHpi.IsOrigin=true;
        newHpi.HpiType = self.boardType;
        newHpi.HpiText = self.hpiText;

        self.http.post(self.helper.getApiUrl(url), newHpi, (returnData) => {

          if(returnData==null){
            if(callback) callback(false);
            return;
          }

          self.data = returnData;

          //update the block...
          self.block.objectId = returnData.HPIID;
          self.goData.saveVisitBoard(self.board);

           if(callback) callback(true);
        }, null, (error) => {
          //alert(error.responseText);
          if(callback) callback(false);
        });


      });
    } else if(self.data != null){

      self.data.HpiText = self.hpiText;

      //update the block if needed...
      if(self.block.objectId == 0){
        self.block.objectId = self.data.HPIID;
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

  populateWithPreference(text, bodypart, title){
    let self = this;
    self.prefClicked = true;
    self.bodypart = bodypart;
    self.hpiText = text;
    self.title =  title + ": "+ bodypart;
  }

  loadPrevious(){
    var self = this;

    var formattedDate = self.helper.getDateWithFormat(self.date, "MM-DD-YYYY");
    let formattedBp = self.board.visitInfo.getFirstAvailBodypartForExam('hpi').part;
    let proId = self.providerId;

    if(self.fromPreviousDate){
      formattedDate = self.fromPreviousDate;
      formattedBp = self.fromPreviousBodyPart;
      proId = self.fromPreviousProviderId;
    }

    //var formattedBp = self.goData.formatBodypart(self.bodypart);
    var url = `hpi/previous?patientId=${self.patientId}&bodypart=${formattedBp}&priorToDate=${formattedDate}&providerId=${proId}`;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      if(json != null){

        self.bodypart = formattedBp;

        json.UserID = self.userId;
        json.ProviderID = self.providerId;
        json.VisitDate = self.date;
        json.DateCreated = null;
        json.DateModified = null;
        json.HPIID = self.data == null ? 0 : self.data.HPIID;

        self.data = json;
        self.hpiText = json.HpiText;

        let tTitle = json.HpiType.toUpperCase() == 'FOLLOW' ? 'FOLLOW UP' : json.HpiType.toUpperCase();

        self.title = tTitle + " HPI: "+ self.bodypart;
        //self.bodypart
      }
    });
  }

  load(){
    var self = this;
    var url ="";
    if(self.block.objectId != 0){
      url ="hpis/"+self.block.objectId;
    }else{
      var formattedDate = self.helper.getDateWithFormat(self.date, "MM-DD-YYYY");
      url = "hpis/patients/"+self.patientId+"/providers/"+self.providerId+"/date/"+formattedDate;
    }

    self.http.get(self.helper.getApiUrl(url), function (json) {
      if(json != null){
        if(Array.isArray(json)){
          if(json.length > 0){
            for (let i = 0; i < json.length; i++) {
              self.populateData(json[i]);
            }
          }else{
            self.populateData(null);
          }
        }else{
          self.populateData(json);
        }
      }
    });
  }

  createNewBlockWithData(hpi, board){
    let self = this;

    //does this block already exist??
    let existingPlan = board.getBlockWithTypeAndObjectId('hpi', hpi.HPIID);
    if(existingPlan){
      return;
    }


    let newBlock = board.addBlockCopyExistingSize('hpi', {soapSort: true});
    newBlock.objectId = hpi.HPIID;

    self.eventAggregator.subscribeOnce("hpiNewBlockAttached", function(model){
      //populate hpi data..
      model.loadData = false;
      model.data = hpi;
      model.hpiText = hpi.HpiText;
      model.block = newBlock;

      self.prefHelper.addPreferenceCallbackObject(model);

      board.providerId = board.visitInfo.providerId;





      if (hpi.BodyPart != null && self.board.visitInfo.hasBodypartToLoad('hpi', hpi.BodyPart)) {
        self.board.visitInfo.removeBodypartToLoad('hpi', hpi.BodyPart);
        model.bodypart = hpi.BodyPart;
      } else {
        model.bodypart = self.board.visitInfo.getFirstAvailBodypartForExam('hpi').part;
      }

      let tTitle = hpi.HpiType.toUpperCase() == 'FOLLOW' ? 'FOLLOW UP' : hpi.HpiType.toUpperCase();
      model.title = tTitle + " HPI: " + model.bodypart;

      //update visitBoard layout to db...
      self.goData.saveVisitBoard(board, function(res){
        board.visitInfo.visitCode.VisitBoardId = res == true ? board.id : res.id;
        //update VisitBodyParts...
        board.visitInfo.visitCode.VisitBodyParts = self.goData.bodypartsToString(board.visitInfo.bodyparts);
        self.goData.updateVisitCode(board.visitInfo.visitCode);
      });
    });
  }

  populateData(hpi){
    let self = this;

    if (self.data != null &&
      hpi.HPIID != self.data.HPIID) {
      //this is another plan, create new block...
      if(!self.loadData){
        self.createNewBlockWithData(hpi, self.home.currentBoard);
      }
      return;
    }

    if(!self.loadData)return;

    if( hpi != null){
      if(hpi.BodyPart != null && self.board.visitInfo.hasBodypartToLoad('hpi', hpi.BodyPart)){
        self.board.visitInfo.removeBodypartToLoad('hpi', hpi.BodyPart);
        self.bodypart = hpi.BodyPart;
      }else{
        self.bodypart = self.board.visitInfo.getFirstAvailBodypartForExam('hpi').part;
      }
      self.loadData = false;
      self.data = hpi;
      self.hpiText = hpi.HpiText;

      let tTitle = "FOLLOW UP";
      if(hpi.HpiType){
        //hpi.HpiType.toUpperCase() == 'FOLLOW' ? 'FOLLOW UP' : hpi.HpiType.toUpperCase();
        tTitle = hpi.HpiType.toUpperCase() == 'FOLLOW' ? 'FOLLOW UP' : hpi.HpiType.toUpperCase();
      }
      self.title = tTitle + " HPI: "+ self.bodypart;
    }else{
      //new exam...
      self.bodypart = self.board.visitInfo.getFirstAvailBodypartForExam('hpi').part;
      self.title = "HPI: "+ self.bodypart;
    }
  }


}
