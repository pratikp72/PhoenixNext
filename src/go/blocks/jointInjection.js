import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import moment from "moment";
import {Home} from '../home';
import {Data} from '../../data/go/data';
import {PxSearch} from "../pxSearch";
import {DialogService} from 'aurelia-dialog';
import * as _ from 'lodash';
import {PopupHelper} from "../popupHelper";
import {EventAggregator} from 'aurelia-event-aggregator';
import { Globals } from '../globals';

@inject(helper,http,Home, Data, DialogService, PopupHelper, EventAggregator, Globals)
export class JointInjection {

  orders=[];
  patientId;
  date;
  providerId;
  userId;
  bodypart;
  bodyside;
  board = null;
  block = null;
  openPopup = false;
  preferences=[];
  displayDeleteHeader=false;
  locked=false;

  block=null;

  constructor(helper, http, Home, Data, DialogService, PopupHelper, EventAggregator, Globals){
    this.helper = helper;
    this.http = http;
    this.home = Home;
    this.goData = Data;
    this.dialogService = DialogService;
    this.popupHelper = PopupHelper;
    this.eventAggregator = EventAggregator;
    this.globals = Globals;
  }

  activate(model) {
    this.block = model;
    this.block.childModel = this;
    if(model.hasOwnProperty('openPopup')){
      this.openPopup = model.openPopup;
    }
  }

  addPreferenceWithId(injId){
    let self = this;
    self.goData.getWithUrl(`injection/preference?id=${injId}`, function(res){
      if(res){
        let prefObj = self.goData.getPreferenceObj(res.Description, res, res.Part);
        self.newJointInjectionFromPref(prefObj);
      }
    });
  }

  attached(){

    var self = this;

    self.displayDeleteHeader = !self.globals.isTouchDevice ? true : false;

    if(self.home.currentBoard != null &&
      self.home.currentBoard.patientId != null){

      self.board = self.home.currentBoard;

      self.patientId = self.home.currentBoard.patientId;
      self.date = self.home.currentBoard.visitInfo.date;
      self.providerId= self.home.currentBoard.visitInfo.providerId;
      self.userId = self.home.currentBoard.userId;
      self.bodypart = self.home.currentBoard.visitInfo.bodypart;
      self.bodyside = self.home.currentBoard.visitInfo.bodyside;
      self.locked = self.home.currentBoard.visitInfo.locked == 0 ? false : true;

      this.load();

      if(self.block.loadPreferenceCallback){
        self.block.loadPreferenceCallback(self.block);
      }

      if(self.openPopup == true){
        self.openInjection();
      }

      self.loadPreferences(function(res){

      });
    }
  }

  preferenceSelected(p){
    this.newJointInjectionFromPref(p);
  }

  loadPreferences(callback){
    let self = this;
    self.preferences=[];
    self.goData.getJointInjectionPreferencesWithProviderId(self.providerId, function(res){
      if(res != null){
        for(let i = 0; i < res.length; i++){
          let aPref = res[i];
          let prefObj = self.goData.getPreferenceObj(aPref.Description, aPref, aPref.Part);
          self.preferences.push(prefObj);
        }
        callback();
      }
    });
  }

  openPrefPicker(){
    let self = this;
    let viewPath = './preferencePicker';

    const windowHeight = window.innerHeight - 100;
    const windowWidth = window.innerWidth;

    let quarter = windowWidth / 4;
    let width = windowWidth / 2;
    let left = quarter;

    let height = windowHeight / 2;
    let qHeight = windowHeight / 4;
    let top = qHeight;

    this.popupHelper.openViewModelPop(viewPath, self, 'Joint Injection Pref', width, height, top, left, null, function(res){
      self.newJointInjectionFromPref(res);

    });
  }

  openInjection(){
    let self = this;
    let viewPath = './injectionBuilder';

    const windowHeight = window.innerHeight - 100;
    const windowWidth = window.innerWidth;

    let quarter = windowWidth / 4;
    let width = quarter * 3;
    let left = quarter / 2;

    this.popupHelper.openViewModelPop(viewPath, self, 'Joint Injection', width, windowHeight, 50, left, null, function(res){

      if(res.cancelled){
        return;
      }

      self.addJointInjectionCard(res);

    });
  }


  addJointInjectionCard(data){
    let self = this;


    this.popupHelper.openBodysidePickerPop(function(side){



    //procedure code...
    let px = null;
    if(data.cptObject != null){
      px ={
        code: data.cptObject.code,
        description: data.cptObject.description,
        // patientId: self.patientId,
        // providerId: self.providerId,
        // date: self.date,
        modifier: null,
        id: 0,
        note: data.text,
        injectSite: data.injectionSite.name,
        bodypart: data.bodypart,//self.bodypart,
        bodyside: side,
        data:{
          Type:'injection',
          Body_Part:data.bodypart,//self.bodypart,
          BodySide: side,
          ProcedureID: data.cptObject.id
        }
      }
    }


    //jcode...
    let jcode = null;
    if(data.jcode != null){
      jcode ={
        code: data.jcode.CptKey,
        description: data.jcode.Description,
        // patientId: self.patientId,
        // providerId: self.providerId,
        // date: self.date,
        bodypart: data.bodypart,//self.bodypart,
        bodyside: side,
        modifier: null,
        id: 0,
        note: 'blank',
        data:{
          Type:'injection',
          Body_Part:data.bodypart,//self.bodypart,
          BodySide: side,
          ProcedureID: data.jcode.ProcedureID
        }
      }
    }

    let p = new Promise(function(resolve, reject){
      if(px != null){
        self.goData.saveProcedure(px, self.patientId, self.providerId, self.date, function(pxRes){
          var aPx = self.goData.getNewPx(pxRes.PatientCPTID, pxRes.CptCode, pxRes.NotePx, self.helper.getDateWithFormat(pxRes.ExamDateTime, "MM/DD/YYYY"), pxRes);
          aPx.index = self.orders.length;
          aPx.canDelete = true;
          self.orders.push(aPx);
  
          resolve(true);
  
        });
      }else{
        resolve(false);
      }

    }).then(function(res){
      if(jcode != null){
        self.goData.saveProcedure(jcode, self.patientId, self.providerId, self.date, function(jRes){
          let jCode = self.goData.getNewPx(jRes.PatientCPTID, jRes.CptCode, jRes.CodeDescr, self.helper.getDateWithFormat(jRes.ExamDateTime, "MM/DD/YYYY"), jRes);
          jCode.index = self.orders.length;
          jCode.canDelete = true;
          self.orders.push(jCode);
          return res;
        });
      }else{
        return res;
      }

    }).finally(()=>{
      self.eventAggregator.publish("refreshProcedures");
    });

  });
  }

  detached(){
    this.trySave();
  }

  trySave(){
    var self = this;

    if(self.block.dontSave){
      return;
    }


    if(self.board != null) {
      self.home.saveQueue.addItem(self);
    }
  }

  newJointInjectionFromPref(pref){
    let self = this;

    let cptCodeProcedureId = 0;
    let jcodeProcedureId = 0;
    let bPart = pref.bodypart;

      let p = new Promise(function(resolve, reject){

        //cptcode
        if(pref.data && 
          pref.data.CPTCode != null && pref.data.CPTCode.length > 0  &&
          pref.data.CPTDesc != null && pref.data.CPTDesc.length > 0){
            let url = `procedure?code=${pref.data.CPTCode}&description=${pref.data.CPTDesc}`;
            self.goData.getWithUrl(url, function(res){
  
              if(res == null){
                //TODO: open procedure picker??
                let search = `procedures/search?searchTerm=${pref.data.CPTCode}`;
                self.goData.getWithUrl(search, function(searchRes){
  
                  let searchResultItems=[];
                  for(let i = 0; i < searchRes.length; i++){
                    let pItm = self.goData.getGenericPicklistItem(searchRes[i].Description, searchRes[i]);
                    searchResultItems.push(pItm);
                  }
                  self.popupHelper.openGenericPicklistPop("CPT Code", 'Please Select CPT Code', searchResultItems, true, function (res) {
                    cptCodeProcedureId = res.item.data.ProcedureID;
                    resolve(true);
                  });
  
                });
              }else{
                cptCodeProcedureId = res.ProcedureID;
                resolve(true);
              }
  
            });
          }else{
            resolve(false);
          }
  
      }).then(function(res){
  
        if(pref.data && 
          pref.data.JCode != null && pref.data.JCode.length > 0  &&
          pref.data.Description != null && pref.data.Description.length > 0){
  
  
            return new Promise(function(reslove, reject){
  
              //now get JCODE
              let jurl = `procedures/search?searchTerm=${pref.data.JCode}`;
              self.goData.getWithUrl(jurl, function(jcodeRes){
                if(jcodeRes.length > 0){
                  jcodeProcedureId = jcodeRes[0].ProcedureID;
                }
                reslove(true);
              });
            });
  
  
          }else{
            return res;
          }
      }).then(function(res){
  
  
        pref = pref.data;
  
        let inject={
          cptObject: {
            code:pref.CPTCode,
            description:pref.CPTDesc,
            id:cptCodeProcedureId
          },
          jcode: {
            CptKey: pref.JCode,
            Description: pref.InjectionDesc,
            ProcedureID: jcodeProcedureId
          },
          injectionDesc: pref.InjectionDesc,
          text: pref.Instruction,
          injectionSite: pref.InjectSite,
          bodypart: bPart
        }
        self.addJointInjectionCard(inject);
  
      });




    

  
  }

  load(){
    var self = this;
    var url = "patientprocedure/Query";

    let obj={
      PatientId: self.patientId,
      ProcedureTypes:['injection'],
      Date: self.date
    }

    self.http.post(self.helper.getApiUrl(url), obj, function(res){
        if (res != null) {
          var list=[];
          for(var i = 0; i < res.length; i++){
            var m = res[i];

            //get description based upon JCODE or not...
            let description;
            if(m.CptCode.substring(0, 1)=='J'){
              description = m.CodeDescr;
            }else{
              description = m.NotePx;
            }
            //let description = m.InjectSite == null ? m.CodeDescr : m.NotePx;

            var oDate = self.helper.getISODateToFormat(m.DateCreated, "MM/DD/YYYY");

            var aOrder = self.goData.getNewPx(m.PatientCPTID, m.CptCode, description, oDate, m);
            aOrder.index = i;

            //can delete???
            aOrder.canDelete = (oDate == self.date && !self.locked) ? true : false;

            list.push(aOrder);
          }
          self.orders = list;
        }
      },
      null,
      function(err){
        var e = 'oops';
      });
  }

  // pxChecked(px){
  //   var self = this;
  //
  //   if(px.selected){
  //     //remove
  //     for(var i = 0; i < self.orders.length; i++){
  //       var aPx= self.orders[i];
  //       if(aPx.id == px.id){
  //         self.orders.splice(i, 1);
  //       }
  //     }
  //   }
  //   else{
  //     var aPx = self.goData.getNewPx(px.id, px.code, px.description, self.date, px.data);
  //     aPx.selected = true;
  //     aPx.data.ExamDateTime = self.helper.getDateWithFormat(self.date, "MM/DD/YYYY");
  //     self.orders.splice(0,0,aPx);
  //   }
  // }

  save(callback){
    var self = this;
    let updateOrders=[];
    let saveOrders=[];

    // for(var i = 0; i < self.orders.length; i++){
    //   let aOrder = self.orders[i];

    //   if(aOrder.id == 0){
    //     //SAVE NEW

    //     // let orderToSave = self.getNewLabOrder(self.patientId, self.providerId, self.date, self.userId);
    //     // orderToSave.TestOrdered = aOrder.description;
    //     // orderToSave.Type = aOrder.data.hasOwnProperty('LNAMEID') ? 'LAB' : aOrder.data.Type;
    //     // orderToSave.Code = aOrder.code;
    //     // orderToSave.VisitType = self.board.visitInfo.visitType;
    //     // orderToSave.BodyPart = self.bodypart;
    //     // orderToSave.BodySide = self.bodyside;
    //     //
    //     // saveOrders.push(orderToSave);

    //   }else{
    //     //UPDATE
    //   }

    // }

    if(saveOrders.length > 0){
      //save orders...
      self.goData.saveLabOrders(saveOrders, function(res){
        if(callback){
          callback(true);
        }
      });
    }else{
      if(callback){
        callback(true);
      }
    }
  }


  rowSwipe(event, row) {

    if(!row.canDelete){
      return;
    }

    if (event.direction === 'left') {
      //display delete option...
      if(!row.displayDelete){
        row.displayDelete = true;
        this.displayDeleteHeader = true;
      }
    }else if(event.direction === 'right') {
      //display delete option...
      if(row.displayDelete){
        row.displayDelete = false;
        this.displayDeleteHeader = false;
      }
    }
  }

  displayDeleteAlert(callback) {
    let self = this;
    self.popupHelper.openGenericMessagePop("Do you wish to delete this injection?", 'Delete Injection?', ['YES','NO'], false, function(res){
      callback(res);
    });
  }

  deleteInjClick(index){
    let self = this;
    self.displayDeleteAlert(function(res){
      if(res.result== 'YES'){

        let id = self.orders[index].id;
        if(id==0){
          self.orders.splice(index, 1);
        }else{
          self.deleteInjection(id, function(res){
            if(res == true){
              self.orders.splice(index, 1);
            }
          })
        }
      }else{
        //reset row delete...
        self.orders[index].displayDelete = false;
      }
    });
  }

  deleteInjection(id, callback){
    let self = this;
    let url = `patientprocedures/${id}`;
    self.goData.deleteWithUrl(url, function(res){
      callback(res);
    });
  }


}
