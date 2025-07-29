import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Home} from './home';
import {CreateVisitPopup} from './createVisitPopup'
import {DialogService} from 'aurelia-dialog';
import {PopupHelper} from "./popupHelper";
import {Globals} from './globals';
import { Viewer } from '../formbuilder/viewer';

@inject(helper,http, Data, Home, DialogService, PopupHelper, Globals, Viewer)
export class VisitPicker {

  visits=[];
  filteredVisits=[];
  //z-index: 1000;
  zIndex=1000;
  listHeight = 0;
  patientName;
  //disablePrevious = false;

  previousMode = false;

  disableVisitCreation = false;

  canLockVisits = false;

  selectedVisitFilter='date';//provider, therapy
  ptFilter = false;
  searchText=null;

  constructor(helper, http, Data, Home, DialogService, PopupHelper, Globals, Viewer) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.dialogService = DialogService;
    this.popupHelper = PopupHelper;
    this.globals = Globals;
    this.goformViewer = Viewer;
  }

  activate(model){
    this.visits = model;
    this.filteredVisits = model;
    this.patientName = this.home.patient.PatientName();

    //can the user lock / unlock visits??
    if(this.helper._user.RoleDetails.hasOwnProperty("AdminAccess")){
      this.canLockVisits = this.helper._user.RoleDetails.AdminAccess;
    }

  }

  attached(){
    //this.listHeight = $('#demotop').height() - 28;
    let self = this;
    self.listHeight = self.listParentDiv.clientHeight;

    self.checkForExistingVisit(function(existingVisit){
      console.log('callback: ', existingVisit);
      //check for user license here as well...
      //Do we have an existing visit OR...
      //does the current scheduled provider have a license???
      var licenseValid = self.home.currentProvider;
      if(licenseValid != null){
        licenseValid = self.checkUserLicense(self.home.currentProvider.OD_Users.License, self.home.currentProvider.OD_Users.UserID)
      }
      console.log('licenseValid: ', licenseValid);

      if(existingVisit || !licenseValid){//!self.home.currentProvider.OD_Users.License){
        //disable new / previous visit buttons...
        self.disableVisitCreation = true;
      }
    });

    self.scrollSearchbarOutOfView();
  }

  scrollSearchbarOutOfView(){
    var divToScroll =this.listParentDiv.firstChild;
    divToScroll.scrollTop = 46;
  }

  checkUserLicense(license, userId){
    console.log(`checkUserLicense, ${license}, ${userId}`);

    if(license == null){
      return false;
    }

    var lic = this.helper.openToken(license);
    console.log(`lic: `, lic);
    /*
    if(lic.TenantId == this.globals.admin.TenantId &&
      lic.UserID == userId){
        return true;
      }
    return false;
     */
    return true;
  }

  filterVisits(visitFilter){
    let self = this;
    self.filteredVisits=[];
    self.selectedVisitFilter = visitFilter;
    if(self.selectedVisitFilter == 'date'){
      self.filteredVisits = self.visits;//return ALL visits...
    }else if (self.selectedVisitFilter == 'provider'){

      self.ptFilter = self.ptFilter ? false : true;

      for(let v = 0; v < self.visits.length; v++){
        let aVisit =self.visits[v];
        //check if provider's role == THERAPY...
        let aProvider = _.find(self.home.allProviders, function(p){return p.ProviderID == aVisit.ProviderID})

        if(aProvider){
          if(self.ptFilter && aProvider.ProviderRole.toUpperCase() == 'THERAPY'){
            self.filteredVisits.push(aVisit);
          }else if(!self.ptFilter && aProvider.ProviderRole.toUpperCase() != 'THERAPY'){
            self.filteredVisits.push(aVisit);
          }
        }

      }
    }
  }

  searchVisits(){

    let self = this;
    self.filteredVisits=[];
    var text = new RegExp(self.searchText, "i");// `/${self.searchText}/gi`;

    //no text, show all visits...
    if(text == null || text.length == 0){
      self.filteredVisits = self.visits;
      return;
    }

    //search the following...
    //ProviderName, Description, Part, Details, Documents.Descripotion, Xrays.Descripiton
    for(var i = 0; i < self.visits.length; i++){
      var found = self.visits[i].ProviderName.match(text);
      if(found){
        self.filteredVisits.push(self.visits[i]);
        continue;
      }

      if(self.visits[i].Description != null){
        found = self.visits[i].Description.match(text);
        if(found){
          self.filteredVisits.push(self.visits[i]);
          continue;
        }
      }

      if(self.visits[i].Part != null){
        found = self.visits[i].Part.match(text);
        if(found){
          self.filteredVisits.push(self.visits[i]);
          continue;
        }
      }

      if(self.visits[i].Details != null){
        found = self.visits[i].Details.match(text);
        if(found){
          self.filteredVisits.push(self.visits[i]);
          continue;
        }
      }

      //documents
      var foundDoc = false;
      for(var d = 0; d < self.visits[i].Documents.length; d++){
        found = self.visits[i].Documents[d].Description.match(text);
        if(found){
          self.filteredVisits.push(self.visits[i]);
          foundDoc = true;
          break;
        }
      }
      if(foundDoc){
        continue;
      }
      //xrays
      var foundXray = false;
      for(var x = 0; x < self.visits[i].Xrays.length; x++){
        found = self.visits[i].Xrays[x].Description.match(text);
        if(found){
          self.filteredVisits.push(self.visits[i]);
          foundXray = true;
          break;
        }
      }
      if(foundXray){
        continue;
      }
    }
  }

  checkForExistingVisit(callback){
    let self = this;
    let provId = self.home.currentProvider ? self.home.currentProvider.ProviderID : 0;
    console.log('check for existing visit: ', callback);
    if(provId == 0){
      callback()
    }
    let today = moment().format('MM-DD-YYYY');
    self.data.getVisitCodeWithPatientIdProviderIdAndDate(self.home.patient.data.PatientID, provId, today, function(res){
      callback(res);
    })
  }

  toggleVisitLock(visit, e){

    let self = this;
    let locked = false;
    if(visit.Locked == null){
      locked = true;
    }else{
      locked = visit.Locked ? false : true;
    }

    //get visit code...
    self.data.getVisitCode(visit.ObjectID, function(vc){

      //update lock status...
      vc.VisitLocked = locked;

      //update visit code...
      self.data.updateVisitCode(vc, function(update){
          if(update.VisitLocked == locked){
            //update local lock object...
            visit.Locked = locked;
          }
      });
    });

    e.stopPropagation();
  }

  setVisitSelected(visit){
    for(let v = 0; v < this.visits.length; v++){
      if(this.visits[v].ObjectID == visit.ObjectID){
        this.visits[v].selected = true;
      }else{
        this.visits[v].selected = false;
      }
    }
  }

  visitRowClicked(visit, event){
    var self = this;

    self.setVisitSelected(visit);
    
    var aDate = self.helper.getISODateToFormat(visit.ExamDateTime, "MM/DD/YYYY");
    let bodyparts = self.data.parseVisitBodyparts(visit.Part);
    var vi = self.data.getVisitInfo(aDate, self.home.patient.data.PatientID, visit.ProviderID, visit.Description, bodyparts, visit.BoardId, visit.ObjectID, visit.Locked);
    //vi.visitCodeId = visit.ObjectID;
    vi.providerName = self.home.getProviderName(visit.ProviderID);// visit.ProviderName;
    self.home.loadVisit(vi, function(){

    });
    self.home.hideDemographics();
  }

  documentClicked(document, e){
    let self = this;
    self.home.openDocument(document.ObjectID, document.TaskTypeID);
    self.home.hideDemographics();
    e.stopPropagation();
  }

  xrayClicked(xray, e){
    let self = this;
    self.popupHelper.openXrayPop(xray.DocPath, xray.ObjectID);
    //self.home.openDocument(document.ObjectID, document.TaskTypeID);
    self.home.hideDemographics();
    e.stopPropagation();
  }

  newVisitClick() {
    var self = this;
    var newDate = moment().format('MM-DD-YYYY');
    if(self.globals.scheduleDate){
      newDate = moment(self.globals.scheduleDate).format('MM-DD-YYYY');
    }

    var vInfo = self.data.getVisitInfo();
    vInfo.date = newDate;

    if(self.home.currentBoard.visitInfo != null){
      vInfo.bodypart = self.home.currentBoard.visitInfo.bodypart;
      vInfo.bodyside = self.home.currentBoard.visitInfo.bodyside;
      vInfo.visitType = self.home.currentBoard.visitInfo.visitType;
      vInfo.bodyparts = self.home.currentBoard.visitInfo.bodyparts;
      //vInfo.providerId = self.home.currentProvider ? self.home.currentProvider.ProviderID : 0;
      vInfo.locked = false;
    }

    self.displayVisitCreatePopup(vInfo);

    self.home.hideDemographics();
  }

  getPreviousVisitForProvider(providerId){
    let self = this;
    for(let i = 0; i < this.visits.length; i++){
      let visit = this.visits[i];
      if(visit.ProviderID === providerId){
        return visit;
      }
    }
    return null;
  }

  previousVisitClick(){
    this.previousMode = true;
  }

  showVisitTypePicker(callback){
    let self = this;
    let visitTypeList=[];
    let visitTypeStrings=self.data.getVisitTypes();

    for(let i = 0; i < visitTypeStrings.length; i++){
      let pItm = self.data.getGenericPicklistItem(visitTypeStrings[i], visitTypeStrings[i]);
      visitTypeList.push(pItm);
    }

    self.popupHelper.openGenericPicklistPop("Please select a type for this visit.", "Select Visit Type", visitTypeList, false, function(selectedVisitType){
      let sType = selectedVisitType.item;
      callback(sType);
    });
  }

  openFax(document, event){

    let self = this;

    event.stopPropagation();

    //get document description from DocPath
    var slashIndex = document.DocPath.lastIndexOf("\\") + 1
    var docName = document.DocPath.slice(slashIndex, document.DocPath.length);

    self.home.openFax(docName, document.ObjectID, 'DOCUMENT');
  }

  previousVisitSelected(prev, event){
    var self = this;

    event.stopPropagation();

      self.home.hideDemographics();

      //create visit???
      var patId = self.home.patient.data.PatientID;
      var proId = self.home.currentProvider == null ? 0 : self.home.currentProvider.ProviderID;
      var locId = self.home.locationId;

      var vInfo = self.data.getVisitInfo();
      let bodyparts = self.data.parseVisitBodyparts(prev.Part);
      vInfo.date = moment().format('MM-DD-YYYY');


      new Promise(function(resolve, reject) {
        resolve(proId);
      }).then(function(providerid){
        if(providerid == 0){
          return new Promise(function(reslove, reject){
            self.openProviderPickerPop(function (provider){
              proId = provider.data.ProviderID;
              reslove(proId);
            });
          });
        }else{
          return providerid;
        }
      }).then(function(){
        //self.showVisitTypePicker(function(res){

          // vInfo.visitType = res.description;
          vInfo.visitType = prev.Description;
    
          if(bodyparts.length > 0){
            vInfo.bodypart= bodyparts[0].part; //prev.Part;
            vInfo.bodyside = bodyparts[0].side;
          }
          vInfo.patientId = patId;
          vInfo.providerId = proId;
          vInfo.providerName = self.home.getProviderName(proId);
          vInfo.bodyparts = bodyparts;

          var prevDate = self.helper.getISODateToFormat(prev.ExamDateTime, "MM-DD-YYYY");
          let prevProviderId = prev.ProviderID;

          //try sneaking in previous info here...
          vInfo.fromPreviousProviderId = prevProviderId;
          vInfo.fromPreviousBodyPart = vInfo.bodypart;
          //increment the previous date by one, so the previous call will return this date...
          var splitDate = prevDate.split('-');
          var year = parseInt(splitDate[2]);
          var day = parseInt(splitDate[1]);
          //zero-based month...
          var month = parseInt(splitDate[0]);
          month = month - 1 < 0 ? 0 : month - 1;
          var prevDatePlusOne = new Date(year, month, day + 1);
          var frmPrevDate = self.helper.getMMDDYYYYDate(prevDatePlusOne.getFullYear(), prevDatePlusOne.getMonth(), prevDatePlusOne.getDate());
          vInfo.fromPreviousDate = frmPrevDate;//momentDate.format('MM-DD-YYYY');
    
          //get previous visitBoard data...
          self.data.getVisitBoardData(patId, prevProviderId, prevDate, function(boardRes){
            //create new visit from previous board data...
            //if we dont have previous blocks, use default...
            if(boardRes.blocks.length == 0){
              boardRes.blocks = self.data.getDefaultFollowUpBlocks();
            }

            //check load/save goforms...
            self.tryCreateGoFormsFromPrevious(patId, prevDate, proId, boardRes, function(res){

                //create visit...
                self.createVisitFromPrevious(patId, vInfo, proId, self.helper._user.UserID, locId, res, function(v,p){
                  self.home.loadVisitFromPrevious(v,p);
                });

            })
          });
        //});
      });
  }

  tryCreateGoFormsFromPrevious(patientId, date, newProviderId, board, callback){
    let self = this;
    //load goforms...
    let goFormsUrl = `goforms/instances?patientId=${patientId}&date=${date}`;//s&providerId=${providerId}`;
    self.data.getWithUrl(goFormsUrl, function(goRes){

      let goForms = [];
      if (goRes.length > 0) {

        var formCompleteCount = 0;

        // for(var i = 0; i < goRes.length; i++){

        //   var goForm = goRes[i];




          new Promise(function(resolve, reject) {


            for(var i = 0; i < goRes.length; i++){

              var goForm = goRes[i];


              let params ={
                //fromPrevious, instanceId, date
                fromPrevious: true,
                instanceId: goForm.Id,
                formId: goForm.FormId,
                fromPreviousNewProviderId: newProviderId,
                date: moment().format('MM/DD/YYYY')
              }
              self.goformViewer.silentSave(params, function(res){

                var aBlock = self.data.getNewBlock();
                aBlock.description = res.Description;
                aBlock.blockType = 'goForm';
                aBlock.widthMult = 1;
                aBlock.heightMult = 1;
                aBlock.data = {'CreateDate': res.Date, 'formId': res.formId, 'ObjectID': res.Id};
                aBlock.id = res.Id;

                goForms.push(aBlock);
                formCompleteCount++;

                if(formCompleteCount == goRes.length){
                  resolve(callback);
                }

              });   

            }


          }).then(function(callback){

            board.documents = goForms;
            callback(board);

          })

      }else{
        callback(board);
      }
    });
  }

  checkForPatientSchedule(patientId, date, callback){
    let self = this;
    let tDate =  moment(date).format('MM/DD/YYYY');

    self.data.getScheduleWithDateAndPatientId(date, patientId, function(res){
      //find patientId in results...
      //let foundPatient = _.find(res, function(p){return p.PatientID == patientId});
      callback(res);
    });
  }

  createNewScheduleObject(patient, providerId, userId){
    let self = this;
    let tDate = moment().add(15, 'minutes');//.utcOffset(0, false);//.format('MM/DD/YYYY');
    
    let schedObj = {
      "Time":tDate.format(),//.format('YYYY-MM-DD HH:mm:ss.SSS'),
      "Date":tDate.format('MM/DD/YYYY'),
      "Patient_Name":patient.NameFirst + " " + patient.NameLast,
      "ProviderID": providerId,
      'Type': "Office",
      "PatientID": patient.PatientID,
      "UserID": userId,
      "PatientLocation":"All"
    }

    return schedObj;
  }

  addPatientToSchedule(patient, providerId, userId, callback){
    let self = this;
    let newScheduleObj = self.createNewScheduleObject(patient, providerId, userId);
    self.data.createSchedule(newScheduleObj, function(res){
      callback(res);
    });
  }

  openProviderPickerPop(callback){
    let self = this;
    let providerList=[];
    for(let i = 0; i < self.home.providers.length; i++){
      //ignore "ALL" provider...
      if(i ==0)continue;
      let pItm = self.data.getGenericPicklistItem(self.home.providers[i].ProviderEntity, self.home.providers[i]);
      providerList.push(pItm);
    }
    self.popupHelper.openGenericPicklistPop("A provider must be selected for the visit.", "Select Visit Provider", providerList, false, function(providerRes){
      callback(providerRes.item);
    });
  }

  displayVisitCreatePopup(createVisitObj){
    let self = this;
    const windowHeight = window.innerHeight / 2;
    const windowWidth = window.innerWidth / 2;


    self.popupHelper.openCreateVisitPopup(createVisitObj, self.home, function(response){
      let res = response;//.output;
      if(res != null){

        //check patient on schedule...
        self.checkForPatientSchedule(self.home.patient.data.PatientID, res.visitObject.date, function(foundPatient){

          //create visit???
          var patId = self.home.patient.data.PatientID;
          var proId = self.home.currentProvider == null ? 0 : self.home.currentProvider.ProviderID;
          var locId = self.home.locationId;

          //if no provider is selected, display provider picker...
          if(proId == 0){
            self.openProviderPickerPop(function (provider){
              let selectedProvider = provider;
              proId = selectedProvider.data.ProviderID;

              self.createVisit(patId, res.visitObject, proId, self.helper._user.UserID, locId, res.boardId , function(v){
                self.home.loadVisit(v);
              });

              if(!foundPatient){
                self.addPatientToSchedule(self.home.patient.data, proId, self.helper._user.UserID, function(schedres){
    
                });
              }
            });

          }else{
            self.createVisit(patId, res.visitObject, proId, self.helper._user.UserID, locId, res.boardId , function(v){
              self.home.loadVisit(v);
            });

            if(!foundPatient){
              self.addPatientToSchedule(self.home.patient.data, proId, self.helper._user.UserID, function(schedres){
  
              });
            }
          }


        });
      }
    });
  }

  createVisitFromPrevious(patientId, visitObject, providerId, userId, locationId, previousBoard, callback) {
    var self = this;
    self._createVisit(patientId, visitObject, providerId, userId, locationId, 0, previousBoard, callback);
  }

  createVisit(patientId, visitObject, providerId, userId, locationId, boardId, callback){
    var self = this;
    self._createVisit(patientId, visitObject, providerId, userId, locationId, boardId, null, callback);
  }

  _createVisit(patientId, visitObject, providerId, userId, locationId, boardId, previousBoard, callback){
    let self = this;

    var n = self.helper.createNoty("Creating visit...", 10000);
    n.show();

    //get empty visitCode object...
    self.data.getVisitCodeObject(function (vc) {

      //update with data...
      vc.PatientID = patientId;
      vc.ProviderID = providerId;
      vc.UserID = userId;
      vc.LocationID = locationId;
      vc.Visit_Type = visitObject.visitType;
      vc.VisitBodyPart = visitObject.bodypart;
      vc.VisitLocked = false;

      //concat bodyparts...
      let strBodyparts = self.data.bodypartsToString(visitObject.bodyparts);

      vc.VisitBodyParts = strBodyparts;
      vc.VisitBodySide = visitObject.bodyside;

      let dateSplit = visitObject.date.split('-');
      let aDate = new Date();
      aDate.setMonth(dateSplit[0] - 1);
      aDate.setDate(dateSplit[1]);
      aDate.setFullYear(dateSplit[2]);
      let now = new Date();
      aDate.setHours(now.getHours());
      aDate.setMinutes(now.getMinutes());
      aDate.setSeconds(now.getSeconds());

      //let aDate = new Date(year, month, day, hours, minutes, seconds, milliseconds)
      let currentTime = moment().format('hh:mm:ss.SSS');
      // let dateAndTime = moment(visitObject.date + ' ' + currentTime).format('YYYY-MM-DD HH:mm:ss.SSS');
      let tDate = moment(aDate).format('YYYY-MM-DD');

      let dateAndTime = tDate + " " + currentTime;

      vc.ExamDateTime = dateAndTime;//visitObject.date;
      // vc.VisitBoardId = vObject.boardId;

      self.data.createVisitCode(vc, function(createVcRes){

        //save new visitBoard instance...
        var boardToSave = null;
        if(boardId != 0){
          boardToSave =self.home.getUserBoardById(boardId)
        }else if(previousBoard != null){
          boardToSave = previousBoard;
          //these help assign previousBodyParts to blocks when there are multiples...
          let hpiToBodypartIndex=0;
          let examToBodypartIndex=0;
          //set each blocks previous property...
          for(var b = 0; b < boardToSave.blocks.length; b++){
            var aBlock = boardToSave.blocks[b];
            aBlock.fromPrevious = true;
            aBlock.fromPreviousDate = visitObject.fromPreviousDate;
            aBlock.fromPreviousProviderId = visitObject.fromPreviousProviderId;
            // aBlock.fromPreviousBodyPart = visitObject.fromPreviousBodyPart;
            if(aBlock.blockType == 'hpi'){
              aBlock.fromPreviousBodyPart = visitObject.bodyparts[hpiToBodypartIndex].part;
              hpiToBodypartIndex++;
            }else if(aBlock.blockType == 'exam'){
              aBlock.fromPreviousBodyPart = visitObject.bodyparts[examToBodypartIndex].part;
              examToBodypartIndex++;
            }else{
              aBlock.fromPreviousBodyPart = visitObject.fromPreviousBodyPart;
            }
          }
        }else{
          boardToSave = self.data.getNewBoard();
        }

        boardToSave.providerId = providerId;
        boardToSave.patientId = patientId;
        boardToSave.date = vc.ExamDateTime;
        boardToSave.id = 0;//reset id for a new save...
        boardToSave.visitCodeId = createVcRes.VisitCodeID;

        //clear any existing objectIds from blocks...
        for(let b = 0; b < boardToSave.blocks.length; b++){
          let aBlock = boardToSave.blocks[b];
          aBlock.objectId = 0;
        }

        var finalDate = self.helper.getISODateToFormat(vc.ExamDateTime, 'MM/DD/YYYY');
        let bodyparts = self.data.parseVisitBodyparts(vc.VisitBodyParts);
        var viResult = self.data.getVisitInfo(finalDate, vc.PatientID, vc.ProviderID,
                                              vc.Visit_Type, bodyparts, boardToSave.id, vc.VisitCodeID);
        viResult.locked = vc.VisitLocked;
        viResult.visitCode = vc;
        viResult.visitCodeId = createVcRes.VisitCodeID;

        let providerName="";
        let aProvider = self.home.getProviderWithId(createVcRes.ProviderID);
        if(aProvider){
          providerName = aProvider ? aProvider.NameFirst.substring(0, 1) + " "  + aProvider.NameLast : "";
        }
        viResult.providerName = providerName;
        boardToSave.visitInfo = viResult;

        self.data.saveVisitBoard(boardToSave, function(boardRes){
          if(boardRes==false || boardRes == null){
            //some error...
          }else{
            //update OD_VisitCode.VisitBoardId...
            vc.VisitBoardId = boardRes.id;
            vc.VisitCodeID = boardRes.VisitCodeId;
            self.data.updateVisitCode(vc, function(updateVcRes){
            });

            //update returned board object w/ new id...
            boardToSave.id = boardRes.id;

            // let providerName="";
            // let aProvider = self.home.getProviderWithId(createVcRes.ProviderID);
            // if(aProvider){
            //   providerName = aProvider ? aProvider.NameFirst.substring(0, 1) + " "  + aProvider.NameLast : "";
            // }

            var vInfo={
              ExamDateTime: createVcRes.ExamDateTime,
              Description: createVcRes.Visit_Type,
              Details: createVcRes.Visit_Code_Selected,
              Part: createVcRes.VisitBodyParts,
              BoardId: boardRes.id,
              ObjectID: createVcRes.VisitCodeID,
              ProviderID: createVcRes.ProviderID,
              ProviderName: providerName,
              Locked: createVcRes.VisitLocked
            }

            self.home.patientVisits.splice(0, 0, vInfo);


            self.helper.notySuccess(n, "Visit Created!");
            n.close();

            if(callback){

              boardToSave.visitInfo.boardId = boardToSave.id;//update boardId here

              callback(viResult, boardToSave);
            }
          }
        });
      });
    });
  }

}
