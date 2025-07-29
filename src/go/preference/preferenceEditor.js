import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable, observable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../../data/go/data';
import {Home} from '../home';
import {PopupHelper} from "../popupHelper";
import {EventAggregator} from 'aurelia-event-aggregator';

class Section{
  constructor(name, template, tableName, columnName, id){
    this.name = name;
    this.items=[];
    this.template = template;
    this.tableName = tableName;
    this.columnName = columnName;
    this.id = id;
    this.selectedItem = new Item(0, 'Select ' + name);
    this.parent=null;
    this.modifier=null;
  }
  setSelected(data){
    this.selectedItem=data;
  }

  _deleteItemWithIndex(deleteIndex){
    let self = this;

    self.items.splice(deleteIndex, 1);
    
    var itemCount = self.items.length;
    if(itemCount == 0){
        //remove this section
        var aSection =self.parent.getSection(self.name);
        if(aSection){
          self.parent.removeSection(aSection);
        }
    }
  }

  removeItem(pref, item){

    let self = this;

    let deleteIndex = _.findIndex(self.items, function(d){return d.id ==item.id});

    if(deleteIndex > -1 && item.imapProtocol){

      //check for PostOp items...
      if(item.imapProtocol.TableName=='OD_PostOp_Pref'){

        //do we have any more PostOP Sections???
        let postOpSections = _.filter(self.parent.sections, function(s){return s.tableName == 'OD_PostOp_Pref'});
        if(postOpSections.length > 1){
          //just remove text from OD_PostOp_pref...
          if(self.name == 'Exam'){
            self.parent.followup.data.NoteExam=null;
          }else if (self.name == 'HPI'){
            self.parent.followup.data.NoteHistory=null;
          }else if(self.name == 'Plan'){
            self.parent.followup.data.NotePlan=null;
          }
          // self.parent.savePostOpPref(self.parent.followup.data, function(pores){
          //   self.parent.removeSection(self);
          // });
          self.parent.removeSection(self);
        }else{
          //remove od_imap_protocol AND OD_PostOp_pref...
          // self.parent.editor.data.deleteWithUrl(`examfollowup/preferences?id=${item.imapProtocol.PreferenceId}`, function(delRes){
          //   self.parent.editor.deleteImpressionMapProtocolWithId(item.imapProtocol.Id, function(res){
          //     if(res == true){
          //       self._deleteItemWithIndex(deleteIndex);
          //     }
          //   });
          // });
          self._deleteItemWithIndex(deleteIndex);
        }

      }else{
        // self.parent.editor.deleteImpressionMapProtocolWithId(item.imapProtocol.Id, function(res){

        //   if(res == true){
        //     self._deleteItemWithIndex(deleteIndex);
        //   }
        // });
        self._deleteItemWithIndex(deleteIndex);
      }
    }
  }

}



class AutoTask{
  constructor(id, tasktypeId, userid, recepientid, isGroup, vcDisplay){
    this.AutoTaskID = id;
    this.TaskTypeID = tasktypeId;
    this.UserID = userid;
    this.RecipientID = recepientid;
    this.IsGroup = isGroup;
    this.DisplayOnVisitConsole = vcDisplay;
  }
}

class AutoTaskTarget{
  constructor(recipientId, name, isGroup){
    this.recipientId = recipientId;
    this.isGroup = isGroup;
    this.name = name;
  }
}

class Item{
  constructor(id, name, details, type){
    this.name = name;
    this.details = details;
    this.id = id;
    this.type = type;
    this.autotask = null;
    this.modifier = null;
    this.displayDelete = false;
    this.data = null;
    this.imapProtocol=null;
  }
  deleteTask(){
    this.autotask = null;
  }
}

class PreferenceObj{
  constructor(description, id, data, editor){
    this.description = description;
    this.data = data;
    this.prefId =id;
    this.sections=[];
    this.followup=null;
    this.selected = false;
    this.selectedProtocol=null;
    this.editor = editor;
    this.editingName = false;
    this.autotask=null;
  }

  toggleNameEdit(){
    this.editingName = this.editingName ? false : true;
    if(!this.editingName){
      //update name to Data...
      this.data.Description = this.description;
    }
  }

  getSection(name){
    return _.find(this.sections, function(s){return s.name == name});
  }

  removeSection(section){
    let self = this;
    for(let s = 0; s < self.sections.length; s++){
      let aSection = self.sections[s];
      if(aSection.name == section.name){
        self.sections.splice(s, 1);
      }
    }
  }

  setFollowUp(followup){
    this.followup = followup;
  }

  addNewProtocol(protocol){
    let self = this;
    if(protocol.TableName === 'VW_Diagnosis'){
      //open search...
      self.editor.displayDxPop(function(dxs){

        //does the dx section already exist?
        let dxSection = self.getSection("Diagnosis");
        if(!dxSection){
            dxSection = new Section("Diagnosis", "./dxTemplate", protocol.TableName, protocol.PreferenceIdColumn, 0);
            dxSection.parent = self;
            self.sections.push(dxSection);
        }

        for(var i = 0; i < dxs.length; i++){

          let protoTableName = protocol.TableName;
          let prefColumnId = protocol.PreferenceIdColumn; 
          var dx = dxs[i];
          let prefId = dx.id;   

          if(dx.data.hasOwnProperty('Descriptor')){
            protoTableName = 'OD_ICD10Codes';
            prefColumnId = 'Code';
            prefId = dx.code;
          }

          var aDx = new Item(0, dx.description, dx.code);
          aDx.imapProtocol = self.getNewIMapProtocolObject(self.data.Id, prefId, 
            protoTableName, prefColumnId, null, null);
          dxSection.items.push(aDx);
        }

        self.scrollSectionIntoView(protocol.description);

      });
    }else if(protocol.TableName == 'OD_Procedures' || protocol.TableName == 'OD_Lab_Order'){
      self.editor.displayPxPop(function(pxs){

        for(var i = 0; i < pxs.length; i++){
          var px = pxs[i];
          if(protocol.TableName == 'OD_Procedures'){
            //does the px section already exist?
            let pxSection = self.getSection("Procedure");
            if(!pxSection){
              pxSection = new Section("Procedure", "./pxTemplate", protocol.TableName, protocol.PreferenceIdColumn, 0);
              pxSection.parent = self;
              self.sections.push(pxSection);
            }
            var aPx = new Item(0, px.description, px.code);
            aPx.imapProtocol = self.getNewIMapProtocolObject(self.data.Id, px.id, 
              protocol.TableName, protocol.PreferenceIdColumn, 
                                  null, null);
            pxSection.items.push(aPx);
          }else{
            //does the order section already exist?
            let oSection = self.getSection("Order");
            if(!oSection){
              oSection = new Section("Order", "./pxTemplate", protocol.TableName, protocol.PreferenceIdColumn, 0);
              oSection.parent = self;
              self.sections.push(oSection);
            }
            var aO = new Item(0, px.description, px.code);
            aO.imapProtocol = self.getNewIMapProtocolObject(self.data.Id, px.id, 
              protocol.TableName, protocol.PreferenceIdColumn, 
                                  null, null);
            oSection.items.push(aO);
          }
          self.scrollSectionIntoView(protocol.description);
        }


      });
    }else if(protocol.description == 'HPI' ||
            protocol.description == 'Plan' ||
            protocol.description == 'Exam'){
      //does the section already exist?
      let aSection = self.getSection(protocol.description);
      if(!aSection){
        aSection = new Section(protocol.description, "./hpiPlanExamTemplate", protocol.TableName, protocol.PreferenceIdColumn, 0);
        self.sections.push(aSection);
      }

      //items exist?
      if(aSection.items.length > 0){
        //alert...
        self.editor.popHelper.openGenericMessagePop(`${protocol.description} already exists for this preference.`, 'Item Exists', ['OK'], false, function(res){

        });
        return;
      }

      var aItm = new Item(0, `New ${protocol.description} Preference`, null);
      aItm.imapProtocol = self.getNewIMapProtocolObject(self.data.Id, 0, 
        protocol.TableName, protocol.PreferenceIdColumn, 
                            null, null);
      aSection.items.push(aItm);    
      self.scrollSectionIntoView(protocol.description); 
    }else if(protocol.TableName == 'OD_Inject_Pref'){
        //does the section already exist?
        let iSection = self.getSection("Injection");
        if(!iSection){
          iSection = new Section("Injection", "./injectionTemplate", protocol.TableName, protocol.PreferenceIdColumn, 0);
          iSection.parent = self;
          self.sections.push(iSection);
        }
        self.scrollSectionIntoView(protocol.description);
    }else if(protocol.description == 'Follow Up'){
      //display preference picker here...
      self.editor.displayPreferencePicker(self, function(selectedPref){

        //set tableName, prefColumnId...
        let tProtocol={
          TableName: self.editor.selectedPrefType == 'PT' ? 'OD_PT_DaySheet_Pref' : 'OD_PostOp_Pref',
          PreferenceIdColumn: self.editor.selectedPrefType == 'PT' ? 'PrefID' : 'PostOpID',
          IMapId: 0,
          PreferenceId: 0,
          AutoTaskId: null,
          Modifier: null,
          Id: 0
        }

        self._addNewHpiExamPlanProtocolWithPreference(tProtocol, selectedPref);
      });
    }else if(protocol.description == 'Go Form Pref'){

        let iSection = self.getSection("Go Form");
        if(!iSection){
          iSection = new Section("Go Form", "./goFormTemplate", protocol.TableName, protocol.PreferenceIdColumn, 0);
          iSection.parent = self;
          self.sections.push(iSection);
        }
        self.scrollSectionIntoView(protocol.description);
    }
  }

  _addNewHpiExamPlanProtocolWithPreference(protocol, pref){
    let self = this;

    self.setFollowUp(pref);

    let hpiSection;
    let examSection;
    let planSection;

    if(pref.data.NoteHistory){
      hpiSection = self.getSection("HPI");
      if(!hpiSection){
        hpiSection = new Section("HPI", "./hpiPlanExamTemplate", protocol.TableName, protocol.PreferenceIdColumn, 0);
        hpiSection.parent = self;
          self.sections.push(hpiSection);
      }
    }

    if(pref.data.NoteExam){
      examSection = self.getSection("Exam");
      if(!examSection){
        examSection = new Section("Exam", "./hpiPlanExamTemplate", protocol.TableName, protocol.PreferenceIdColumn, 0);
        examSection.parent = self;
          self.sections.push(examSection);
      }
    }

    if(pref.data.NotePlan){
      planSection = self.getSection("Plan");
      if(!planSection){
        planSection = new Section("Plan", "./hpiPlanExamTemplate", protocol.TableName, protocol.PreferenceIdColumn, 0);
        planSection.parent = self;
          self.sections.push(planSection);
      }
    }

    let displayExisting = false;
    let existingText='';

    if(hpiSection){

      //items exist?
      if(hpiSection.items.length > 0){
        existingText += "HPI, ";      
        displayExisting = true;
      }else{
        var aHpi = new Item(pref.data.PostOpID, pref.data.PostOpProcedure, pref.data.NoteHistory);
        aHpi.autoTaskId=protocol.AutoTaskId;
        //aHpi.imapProtocol = protocol;
        aHpi.imapProtocol = self.getNewIMapProtocolObject(self.data.Id, pref.data.PostOpID, 
          protocol.TableName, protocol.PreferenceIdColumn, 
                              null, null);
        aHpi.imapProtocol.Id = protocol.Id;
        hpiSection.items.push(aHpi);
      }
    }

    if(planSection){

      //items exist?
      if(planSection.items.length > 0){
        existingText += "Plan, ";   
        displayExisting = true;   
      }else{
        var aPlan = new Item(pref.data.PostOpID, pref.data.PostOpProcedure, pref.data.NotePlan);
        aPlan.autoTaskId=protocol.AutoTaskId;
        aPlan.imapProtocol = self.getNewIMapProtocolObject(self.data.Id, pref.data.PostOpID, 
          protocol.TableName, protocol.PreferenceIdColumn, 
                              null, null);
        aPlan.imapProtocol.Id = protocol.Id;
        planSection.items.push(aPlan);
      }
    }

    if(examSection){
      //items exist?
      if(examSection.items.length > 0){
        existingText += "Exam, ";    
        displayExisting = true;  
      }else{
        var aExam = new Item(pref.data.PostOpID, pref.data.PostOpProcedure, pref.data.NoteExam);
        aExam.autoTaskId=protocol.AutoTaskId;
        aExam.imapProtocol = self.getNewIMapProtocolObject(self.data.Id, pref.data.PostOpID, 
          protocol.TableName, protocol.PreferenceIdColumn, 
                              null, null);
        aExam.imapProtocol.Id = protocol.Id;
        examSection.items.push(aExam);
      }
    }


    if(displayExisting){

      //remove trailing comma space...
      existingText = existingText.trimEnd();
      existingText = existingText.substring(0, existingText.length - 1);
      //alert...
      self.editor.popHelper.openGenericMessagePop(`${existingText} already exists for this preference.`, 'Item Exists', ['OK'], false, function(res){

      });
      return;
    }
  
  }

  scrollSectionIntoView(description){
    let self = this;
    window.setTimeout(function(){
      var noSpace = description.replace(/\s/g, '');
      let elId = noSpace.toLowerCase() + "Section";
      const element = document.getElementById(elId);
      element.scrollIntoView();
    }, 500);
  }

  getSectionWithTableName(table){
    let self = this;
    if(table === 'VW_Diagnosis' ||
      table === 'OD_ICD10Codes'){

      //does the dx section already exist?
      return self.getSection("Diagnosis");

    }else if(table === 'OD_PostOp_Pref') {

        // let fures = _.find(self.editor.followUpList, function(f){return f.prefId == aProto.PreferenceId});
        // self._addNewHpiExamPlanProtocolWithPreference(aProto, fures);

        // if(pref.data.NoteHistory){
        //   hpiSection = self.getSection("HPI");
        //   if(!hpiSection){
        //     hpiSection = new Section("HPI", "./hpiPlanExamTemplate", protocol.TableName, protocol.PreferenceIdColumn, 0);
        //     hpiSection.parent = self;
        //       self.sections.push(hpiSection);
        //   }
        // }
    
        // if(pref.data.NoteExam){
        //   examSection = self.getSection("Exam");
        //   if(!examSection){
        //     examSection = new Section("Exam", "./hpiPlanExamTemplate", protocol.TableName, protocol.PreferenceIdColumn, 0);
        //     examSection.parent = self;
        //       self.sections.push(examSection);
        //   }
        // }
    
        // if(pref.data.NotePlan){
        //   planSection = self.getSection("Plan");
        //   if(!planSection){
        //     planSection = new Section("Plan", "./hpiPlanExamTemplate", protocol.TableName, protocol.PreferenceIdColumn, 0);
        //     planSection.parent = self;
        //       self.sections.push(planSection);
        //   }
        // }



    }
    else if(table  === 'OD_Inject_Pref') {

      return self.getSection("Injection");

    }else if(table  === 'OD_Go_Forms_Pref') {

      return self.getSection("Go Form");
    }
    else if(table === 'OD_Procedures'){
    
        //does the dx section already exist?
        return self.getSection('Procedure');
    }
    else if(table === 'OD_Lab_Order'){//loads Procedures to be ORDERED
    
        //does the dx section already exist?
        return self.getSection('Order');
    }
  }

  setProtocolData(protocol, providerId, bodypart){

    let self = this;

    let aProto = protocol;

    let OD_IMap_Protocol_Id = 0;
    //get OD_IMap_Protocol Id if it has one
    if(aProto.hasOwnProperty('Id')){
        OD_IMap_Protocol_Id = aProto.Id;
    }

    if(aProto.TableName === 'VW_Diagnosis' ||
      aProto.TableName === 'OD_ICD10Codes'){

      //does the dx section already exist?
      let dxSection = self.getSection("Diagnosis");
      if(!dxSection){
          dxSection = new Section("Diagnosis", "./dxTemplate", aProto.TableName, aProto.PreferenceIdColumn, OD_IMap_Protocol_Id);
          dxSection.parent = self
          self.sections.push(dxSection);
      }

      let url="";
      if(aProto.TableName === 'VW_Diagnosis'){
        url = "Diagnosis/vw/" + aProto.PreferenceId;
      }else{
        url = "icd10codes?code=" + aProto.PreferenceId;
      }

      self.editor.data.getWithUrl(url, function(json){
        if(json){
          var aDx=null;
          if(aProto.TableName === 'VW_Diagnosis'){
            aDx = new Item(json.DiagnosisID, json.Description, json.DxKey);
          }else{
            aDx = new Item(json.Code, json.Descriptor, json.Code);
          }
          aDx.imapProtocol = aProto;
          dxSection.items.push(aDx);
        }
      });
    }else if(aProto.TableName   === 'OD_PostOp_Pref') {

        let fures = _.find(self.editor.followUpList, function(f){return f.prefId == aProto.PreferenceId});
        self._addNewHpiExamPlanProtocolWithPreference(aProto, fures);
    }
    else if(aProto.TableName  === 'OD_Inject_Pref') {

      let injectSection = self.getSection("Injection");
      if(!injectSection){
        injectSection = new Section("Injection", "./injectionTemplate", aProto.TableName, aProto.PreferenceIdColumn, OD_IMap_Protocol_Id);
        injectSection.parent = self
        self.sections.push(injectSection);
      }

      var injectUrl =  "injection/preference?id=" + aProto.PreferenceId;

      self.editor.data.getWithUrl(injectUrl, function(json){
        if(json){
            var aInj = new Item(json.PrefID, json.Description, json.CPTCode);
            aInj.data = json;
            aInj.imapProtocol = aProto;
            injectSection.items.push(aInj);
        }
      });

    }else if(aProto.TableName  === 'OD_Go_Forms_Pref') {

      let goFormSection = self.getSection("Go Form");
      if(!goFormSection){
        goFormSection = new Section("Go Form", "./goFormTemplate", aProto.TableName, aProto.PreferenceIdColumn, OD_IMap_Protocol_Id);
        goFormSection.parent = self
        self.sections.push(goFormSection);
      }

      var goFormUrl =  "goforms/pref?id=" + aProto.PreferenceId;

      self.editor.data.getWithUrl(goFormUrl, function(json){
        if(json){
            var aInj = new Item(json.Id, json.Description, null);
            aInj.data = json;
            aInj.imapProtocol = aProto;
            goFormSection.items.push(aInj);
        }
      });

    }
    else if(aProto.TableName === 'OD_Procedures'){
    
        //does the dx section already exist?
        var pxSection = self.getSection('Procedure');
        if(!pxSection){
            pxSection = new Section("Procedure", "./pxTemplate", aProto.TableName, aProto.PreferenceIdColumn, OD_IMap_Protocol_Id);
            pxSection.parent = self
            self.sections.push(pxSection);
        }
        var url = "Procedures/" + aProto.PreferenceId;
        self.editor.data.getWithUrl(url, function(json){
          if(json){
              var aPx = new Item(json.ProcedureID, json.Description, json.CptKey);
              aPx.modifier = aProto.Modifier;
              aPx.data = json;
              aPx.imapProtocol = aProto;
              pxSection.items.push(aPx);
          }
        });
    }
    else if(aProto.TableName === 'OD_Lab_Order'){//loads Procedures to be ORDERED
    
        //does the dx section already exist?
        var orderSection = self.getSection('Order');
        if(!orderSection){
          orderSection = new Section("Order", "./pxTemplate", aProto.TableName, aProto.PreferenceIdColumn, OD_IMap_Protocol_Id);
          orderSection.parent = self
          self.sections.push(orderSection);
        }
        var url = "Procedures/" + aProto.PreferenceId;
        self.editor.data.getWithUrl(url, function(json){
          if(json){
              var aOrd = new Item(json.ProcedureID, json.Description, json.CptKey);
              aOrd.modifier = aProto.Modifier;
              aOrd.data = json;
              aOrd.imapProtocol = aProto;
              orderSection.items.push(aOrd);
          }
        });
    }

  
  }

  _save(callback){
    let self = this;

    let iMap = self.getNewIMapObject(self.data.Description, self.data.ImpressionId, 
                                    self.data.ProviderId, self.data.BodyPart, 
                                    self.data.FollowUp, self.data.Maptype);
    iMap.Id = self.data.Id;

    let postOpPref = null;

    //add protocols...
    for(let s =0; s < self.sections.length; s++){
      let aSection = self.sections[s];

      if(aSection.name == 'Exam' || aSection.name == 'HPI' || aSection.name == 'Plan'){
        //this is for PostOpItems (HPI, PLAN, EXAM)...
        if(!postOpPref){
          if(self.followup){
            //existing PostOpPref...
            postOpPref = self.followup.data;
          }else{
            //new...
            postOpPref = self.getNewPostOpPrefObject(self.data.ProviderId, null, null, null, 
              self.data.Description, self.data.BodyPart, self.data.Maptype);
          }
        }
      }

      let autoTaskId = self.autotask ? self.autotask.AutoTaskID : null;

      for(let x = 0; x < aSection.items.length; x++){
        let aItm = aSection.items[x];

        let imapId = 0;
        let preferenceId = 0;
        let tableName = aItm.imapProtocol.TableName;//aSection.tableName;
        let preferenceIdColumn = aItm.imapProtocol.PreferenceIdColumn; aSection.columnName;
        let autoTaskId = autoTaskId;
        let mod = aItm.modifier;
        let protoId = 0;

        //existing??
        if(aItm.imapProtocol != null){
          tableName = aItm.imapProtocol.TableName;
          preferenceIdColumn = aItm.imapProtocol.PreferenceIdColumn;
          imapId = aItm.imapProtocol.IMapId;
          preferenceId = aItm.imapProtocol.PreferenceId;
          autoTaskId = autoTaskId == null ? aItm.imapProtocol.AutoTaskId : autoTaskId;
          mod = mod == null ? aItm.imapProtocol.Modifier : mod;
          protoId = aItm.imapProtocol.Id;
        }

        let aProtocol = self.getNewIMapProtocolObject(imapId, preferenceId, 
                                                      tableName, preferenceIdColumn, 
                                                      autoTaskId, mod);

        aProtocol.Id = protoId;
        iMap.OD_IMap_Protocols.push(aProtocol);

        //update exam, plan, hpi txt...
        if(postOpPref){
          if(aSection.name == 'Exam'){
            postOpPref.NoteExam = aItm.details;
          }else if(aSection.name == 'HPI'){
            postOpPref.NoteHistory = aItm.details;
          }else if(aSection.name == 'Plan'){
            //plan...
            postOpPref.NotePlan = aItm.details;
          }
        }
      }
    }
    
    // let saveDetail = self.description + " Preference...";
    // self.saveDialog = self.editor.helper.createNoty('Saving ' + saveDetail, 3000);
    // self.saveDialog.show();

    //save AutoTask if needed...
    self.saveAutoTask(self.autotask, function(autoTaskRes){

      if(autoTaskRes != null){
        //update protocol data w/ task id...
        for(let p = 0; p < iMap.OD_IMap_Protocols.length; p++){
          let pro = iMap.OD_IMap_Protocols[p];
          pro.AutoTaskId = autoTaskRes.AutoTaskID;
        }
      }

      self.savePostOpPref(postOpPref, function(pores){

        if(postOpPref){

          self.setFollowUp({ data: pores} );

          //update postop object with preferenceId...
          //keep only ONE instance of PostOp objects...
          let currentIndex = 0;
          let foundPo = false;
          for(currentIndex; currentIndex < iMap.OD_IMap_Protocols.length; currentIndex++){
            let aProto = iMap.OD_IMap_Protocols[currentIndex];
            if(aProto.TableName == "OD_PostOp_Pref"){
              if(!foundPo){
                aProto.PreferenceId = pores.PostOpID;
                foundPo = true;
              }else{
                //remove other...
                iMap.OD_IMap_Protocols.splice(currentIndex, 1);
                currentIndex--;
              }
            }
          }
        }

   
        //save imap...
        let imapUrl = 'impressionmap';
        if(iMap.Id == 0){
          //create...
          self.editor.data.postWithUrlAndData(imapUrl, JSON.stringify(iMap), function(saveRes){
            //update iMap id...
            self.data.Id = saveRes.Id; 
            self.updateItemProtocols(saveRes.OD_IMap_Protocols);
            callback(true);
          });
        }else{
          //update...
          self.editor.data.putWithUrlAndData(imapUrl, iMap, function(updateRes){
            callback(true);
          });
        }
      });
      

    });
  }

  saveAs() {
    let self = this;

    //save dialog...
    self.editor.popHelper.openGenericInputPop('Save New Preference As...', ['Name'], 'Save', false, function (res) {

      //clear data...
      self.data.Id = 0;
      self.data.Description= res.inputs[0].value;

      //clear out each item.imapProtocol...
      for(let s =0; s < self.sections.length; s++){
        let aSection = self.sections[s];
        for(let x = 0; x < aSection.items.length; x++){
          let aItm = aSection.items[x];
          aItm.imapProtocol = null;
        }
      }

      let saveDetail = self.description + " Preference...";
      self.saveDialog = self.editor.helper.createNoty('Saving ' + saveDetail, 3000);
      self.saveDialog.show();

      self._save(function(saveNewRes){
        self.editor.helper.notySuccess(self.saveDialog, saveDetail + ' saved!');

        self.editor.filterPreference();
      });

    });
  }

  save(){
    let self = this;

    let saveDetail = self.description + " Preference...";
    self.saveDialog = self.editor.helper.createNoty('Saving ' + saveDetail, 3000);
    self.saveDialog.show();

    let saveText = self.data.Id == 0 ? ' saved!' : ' updated!';

    self._save(function(res){
      self.editor.helper.notySuccess(self.saveDialog, saveDetail + saveText);
    });

  }

  

  updateItemProtocols(od_imap_protocols){
    let self = this;
    for(let i = 0; i < od_imap_protocols.length; i++){
      let aProto = od_imap_protocols[i];
      //find protocols to update...
      //check for diagnosis...
      let aSections;
      if(aProto.TableName == 'OD_ICD10Codes' || aProto.TableName == 'VW_Diagnosis'){
        aSections = _.filter(self.sections, function(s){return s.name == 'Diagnosis'});
      }else{
        aSections = _.filter(self.sections, function(s){return s.tableName == aProto.TableName});
      }

      //update each item...
      for(let s = 0; s < aSections.length; s++){
        for(let itm = 0; itm < aSections[s].items.length; itm++){
          let aItm = aSections[s].items[itm];
          aItm.imapProtocol = aProto;
        }
      }
    }
  }


  savePostOpPref(postOpPref, callback){
    let self = this;

    if(!postOpPref){
      callback();
      return;
    }

    let url = 'examfollowup/preferences';
    if(postOpPref.PostOpID == 0){
      //save new...
      self.editor.data.postWithUrlAndData(url, JSON.stringify(postOpPref), function(postres){
        callback(postres);
      });
    }else{
      //update
      self.editor.data.putWithUrlAndData(url, postOpPref, function(putres){
        callback(putres);
      });
    }
  }

  saveAutoTask(autotask, callback){
    let self = this;
    if(autotask != null && autotask.AutoTaskID == 0){
      self.data.postWithUrlAndData('autotask', self.autotask, function(res){
        callback(res);
      });
    }else{
      callback(null);
    }
  }

  getNewIMapObject(description, impressionId, providerId, bodypart, isFollowup, maptype){
    return {
      Id: 0,
      Description: description,
      ImpressionId: impressionId,
      ProviderId: providerId,
      BodyPart: bodypart,
      FollowUp: isFollowup,
      Maptype: maptype,
      OD_IMap_Protocols:[]
    }
  }

  getNewIMapProtocolObject(imapId, preferenceId, tableName, preferenceIdColumn, autotaskId, modifier){
    return{
      Id: 0,
      IMapId: imapId,
      PreferenceId: preferenceId,
      TableName: tableName,
      PreferenceIdColumn: preferenceIdColumn,
      AutoTaskId: autotaskId,
      Modifier: modifier
    }
  }

  getNewPostOpPrefObject(providerId, history, exam, plan, description, bodypart, type){
    return{
      ProviderID: providerId,
      NoteHistory: history,
      NoteExam: exam,
      NotePlan: plan,
      PostOpProcedure: description,
      BodyPart: bodypart,
      Type: type.toUpperCase(),
      PostOpID: 0
    }
  }

}

class Protocol{
  constructor(name, table, id, imapId, prefId, prefColumn){
    this.description = name;
    this.TableName = table;
    this.Id = id;
    this.IMapId= imapId;
    this.PreferenceId = prefId;
    this.PreferenceIdColumn = prefColumn;
    this.AutoTaskId=null;
    this.Modifier = null;
  }
}

@inject(helper,http, Data, Home, PopupHelper, EventAggregator)
export class PreferenceEditor {

  bodyparts;// = ['Foot','Ankle','Knee', 'Hip', 'Hand', 'Wrist', 'Elbow', 'Shoulder', 'Cervical', 'Lumbar'];
  selectedBodyPart;
  //providerId=0;
  providers=[];
  currentProvider;

  preferences=[];
  prefTypeButtonText = "Follow";
  selectedPrefType;
  prefTypes = ['Follow', 'Telemed', 'PT', 'OT'];
  prefTypeIndex = 0;
  @observable selectedPreference = null;

  protocolList=[];

  followUpList=[];
  goFormPrefs=[];

  autoTaskTargets=[];


  macroList=['[he/she]', '[his/her]', '[him/her]','[patient]', '[side]', '[PostOpDays]', '[AGE]', '[Gender]','[Hand Dominance]'];
  selectedMacro;

  planText;
  examText;
  hpiText;
  selectedTextarea;
  selectedTextareaType;

  daysheetVisible = false;

  home;

  constructor(helper, http, Data, Home, PopupHelper, EventAggregator) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.popHelper = PopupHelper;
    this.event = EventAggregator;
  }

  activate(params) {
    var self = this;

    self.bodyparts = self.data.bodyparts;

    self.home = params.home;

    self.daysheetVisible = params.home.displayDaysheet;

    self.followUpList = params.preferences;

    self.selectedPrefType = self.prefTypes[params.prefTypeIndex];

    self.providers = params.home.allProviders;

    self.selectedBodyPart = self.bodyparts[0];
    if(params.home.currentBoard){
      self.selectedBodyPart = params.home.currentBoard.visitInfo.bodypart;
    }
    if(params.home.currentProvider){
      self.currentProvider= params.home.currentProvider;
    }else{
      self.currentProvider= params.home.providers[0];
    }


    //create protocols...
    self.loadProtocols();

    self.filterPreference();

    //self.loadImpressionMaps(self.currentProvider.ProviderID, self.selectedBodyPart);

    self.loadAutoTaskTargets();

  }

  loadAutoTaskTargets(){
    let self = this;
    self.data.getAllUsers(function(usrs){

      usrs = _.orderBy(usrs, [user => user.UserName.toLowerCase()], ['UserName', 'asc']);

      for(let u = 0; u < usrs.length; u++){
        self.autoTaskTargets.push(new AutoTaskTarget(usrs[u].UserID, usrs[u].UserName, false));
      }
      self.data.getAllGroups(function(grps){

        grps = _.orderBy(grps, 'GroupName', 'asc');

        for(let g = 0; g < grps.length; g++){
          self.autoTaskTargets.push(new AutoTaskTarget(grps[g].GroupID, grps[g].GroupName, true));
        }
      });
    });
  }

  deleteImpressionMapProtocolWithId(id, callback){
    let self = this;
    self.data.deleteWithUrl(`impressionmapprotocol/${id}`, function(del){
      callback(del);
    });
  }

  loadProtocols(){
    let self = this;

    self.preferences=[];

    self.protocolList =[new Protocol('Diagnosis','VW_Diagnosis', 0, 0, 0, "DiagnosisID"),
        new Protocol('Exam', 'OD_PostOp_Pref', 0, 0, 0,"PostOpID"),
        new Protocol('HPI', 'OD_PostOp_Pref',0, 0, 0, "PostOpID"),
        new Protocol('Injection', 'OD_Inject_Pref',0, 0, 0, "PrefID"),
        new Protocol('Order', 'OD_Lab_Order', 0, 0, 0,"LabReqID"),
        new Protocol('Plan', 'OD_PostOp_Pref', 0, 0, 0,"PostOpID"),
        new Protocol('Procedure', 'OD_Procedures', 0, 0, 0,"ProcedureID"),
        new Protocol('Follow Up', 'OD_PostOp_Pref', 0, 0, 0,"PostOpID"),
        new Protocol('Go Form Pref', 'OD_Go_Forms_Pref', 0, 0, 0,"Id")];
  }

  loadImpressionMaps(providerId, bodypart, callback){
    let self = this;
    self.preferences=[];
    self.data.getImpressionMaps(providerId, bodypart, self.selectedPrefType, function(res){
      for(var i = 0; i < res.length; i++){
        var aPref = new PreferenceObj(res[i].Description, res[i].Id, res[i], self);
        if(i == 0){
          aPref.selected = true;
        }
        self.preferences.push(aPref);
        let fu = self.getFollowUpWithId(aPref.data.ImpressionId);
        aPref.setFollowUp(fu);

        for(let p = 0; p < aPref.data.OD_IMap_Protocols.length; p++){
          let aProto = aPref.data.OD_IMap_Protocols[p];
          aPref.setProtocolData(aProto, res[i].ProviderId, res[i].BodyPart);
        }
      }

      if(self.preferences.length > 0){
        window.setTimeout(function(){
          self.showHidePreferenceWithIndex(true, 0);
        }, 500);
      }

      if(callback){
        callback();
      }

    });
  }

  openDaysheetEditor(){

      var self = this;

      var provId = self.currentProvider ? self.currentProvider.ProviderID : null;
      provId = provId == 0 ? null : provId;//don't use ZERO provider...
  
      var daysheetParams = {
        patientid: null,
        providerid: provId,
        bodypart: self.selectedBodyPart,
        userid: self.helper._user.UserID,
        visitdate: null,
        type: 'PT',
        displayCloseButton: true,
        parent: self,
        displayPreferences: true,
        editMode: true,
        providers: self.providers
      }

      //filter PT...
      //self.event.publish('filterPreferencesWithProviderAndType', {providerId: provId, type: 'PT'});
  


      let path = '../ptdaysheet/datagrid';
      //let date = moment().format('MM/DD/YYYY');
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
  
      let options={
        displayHeader: true,
        bodyPadding: 0,
        closeActiveDialog: false
      }
  
      self.popHelper.openViewModelPop(path, daysheetParams, "Daysheet Preferences", windowWidth, windowHeight, 0, 0, options, function(res){
  
      });
      
  }

  filterPreference(callback){
    let self = this;
    self.getFollowUpPreferences(self.currentProvider.ProviderID, self.selectedBodyPart, self.selectedPrefType, function(){
      self.loadImpressionMaps(self.currentProvider.ProviderID, self.selectedBodyPart, function(){
        if(callback){
          callback();
        }
      });
    });
  }

  getFollowUpWithId(id){
    let self = this;
    return _.find(self.followUpList, function(f){return f.prefId == id});
  }

  selectPreference(pref){
    let self = this;
    self.selectedPreference = pref;
  }

  selectedPreferenceChanged(newVal, oldVal){
    let self = this;
    //select / deselect...
    for(let p = 0; p < self.preferences.length; p++){
      let aPref = self.preferences[p];
      aPref.selected = aPref.prefId == newVal.prefId ? true : false;
    }

    //this.preferenceClick(newVal);
  }

  providerSelected(){
    let self = this;
    self.filterPreference();
  }

  getFollowUpPreferences(providerId, bodypart, preftype, callback){
    let self = this;
    self.followUpList=[];

    if(preftype == 'PT' && self.daysheetVisible) {
      self.data.getPtDaysheetPref(providerId, bodypart, function (prefs) {
        let unique = _.uniqBy(prefs, 'PrefDescription');
        for(var i = 0; i < unique.length; i++){
          if(!self.doesFollowUpListPreferenceExist(unique[i].PrefDescription)){
            var aPref = new PreferenceObj(unique[i].PrefDescription, unique[i].PrefID, unique[i]);
            self.followUpList.push(aPref);
          }
        }
        //callback();//???
      });
    }else{
      self.data.getFollowUpPref(providerId, bodypart, preftype, function(prefs){
        for(var i = 0; i < prefs.length; i++){
          if(!self.doesFollowUpListPreferenceExist(prefs[i].PostOpProcedure)) {
            var aPref = new PreferenceObj(prefs[i].PostOpProcedure, prefs[i].PostOpID, prefs[i]);
            self.followUpList.push(aPref);
          }
        }
        callback();
      });
    }
  }

  // getGoFormPrefs(providerId, callback){
  //   let self = this;
  //   self.goFormPrefs=[];
  //   self.data.getWithUrl(`goforms/pref?providerId=${providerId}`, function(res){
  //     self.goFormPrefs = res;
  //     callback();
  //   });
  // }

  doesFollowUpListPreferenceExist(description){
    for(let i = 0; i < this.followUpList.length; i++){
      if(this.followUpList[i].description == description){
        return true;
      }
    }
    return false;
  }

  preferenceClick(pref){
    var self = this;

    if(self.locked)return;

    self.selectedPreference =pref;

  }

  togglePrefTypeClicked() {
    let self = this;

    var i = self.prefTypeIndex + 1;
    if(i == self.prefTypes.length){
      self.prefTypeIndex = 0;
    }else{
      self.prefTypeIndex = i;
    }
    self.filterExamPref(self.currentProvider.ProviderID);
  }

  _newPreferenceChecksReady(){
    let self = this;
    if(!self.currentProvider){
      self.popHelper.openGenericMessagePop('Please select a provider for preference.', 'No Provider Selected', ['OK'], true, function(res){

      });
      return false;
    }

    let bp = self.selectedBodyPart;
    if(!bp){
      self.popHelper.openGenericMessagePop('Please select a bodypart for preference.', 'Save Preference Requirements', ['OK'], true, function(res){

      });
      return false;
    }

    return true;
  }

  newPreferenceFromExisting(){
    let self = this;

    let ready = self._newPreferenceChecksReady();
    if(!ready){
      return;
    }


    //display preference picker here...
    self.displayPreferencePicker(self, function(selectedPref){

      //OD_PT_DaySheet_Pref OR OD_PostOp_Pref???
      const isPtDaysheet = self.selectedPrefType == 'PT' && self.daysheetVisible ? true : false;
      const tableName = isPtDaysheet ? 'OD_PT_DaySheet_Pref' : 'OD_PostOp_Pref';
      const prefIdColumn = isPtDaysheet ? 'PrefID' : 'PostOpID'

      //set tableName, prefColumnId...
      // let tProtocol={
      //   TableName: self.selectedPrefType == 'PT' ? 'OD_PT_DaySheet_Pref' : 'OD_PostOp_Pref',
      //   PreferenceIdColumn: self.selectedPrefType == 'PT' ? 'PrefID' : 'PostOpID',
      //   IMapId: 0,
      //   PreferenceId: 0,
      //   AutoTaskId: null,
      //   Modifier: null,
      //   Id: 0
      // }

      let tProtocol={
        TableName: tableName,
        PreferenceIdColumn: prefIdColumn,
        IMapId: 0,
        PreferenceId: 0,
        AutoTaskId: null,
        Modifier: null,
        Id: 0
      }

      selectedPref._addNewHpiExamPlanProtocolWithPreference(tProtocol, selectedPref);

      self._completeNewPreferenceCreation(selectedPref.description, selectedPref);
    });
  }

  newPreference(){
    let self = this;

    let ready = self._newPreferenceChecksReady();
    if(!ready){
      return;
    }

    // if(!this.currentProvider){
    //   self.popHelper.openGenericMessagePop('Please select a provider for preference.', 'No Provider Selected', ['OK'], true, function(res){

    //   });
    //   return;
    // }

    // let bp = self.selectedBodyPart;
    // if(!bp){
    //   self.popHelper.openGenericMessagePop('Please select a bodypart for preference.', 'Save Preference Requirements', ['OK'], true, function(res){

    //   });
    //   return;
    // }

    self.popHelper.openGenericInputPop('Create New Preference', ['Description'], 'New', false,
      function (res) {

        if(res.inputs[0].value == null){
          self.popHelper.openGenericMessagePop('Preferences require a description to save.', 'Preference Creation Failed', ['OK'], true, function(res){
            return;
          });
        }else{

          self._completeNewPreferenceCreation(res.inputs[0].value);
          // let iMap={
          //   Id: 0,
          //   Description: res.inputs[0].value,
          //   ImpressionId: 0,
          //   ProviderId: self.currentProvider.ProviderID,
          //   BodyPart: self.selectedBodyPart,
          //   FollowUp: 1,
          //   Maptype: 'follow'
          // }
  
          // let newPref = new PreferenceObj(res.inputs[0].value, 0, iMap, self);
          // self.preferences.push(newPref);
          // self.selectedPreference = newPref;
  
          // //collapse all other prefs...
          // let newIndex = self.preferences.length - 1;
          // for(let p = 0; p < self.preferences.length; p++){
          //   if(p != newIndex){
          //     //collapse...
          //     self.showHidePreferenceWithIndex(false, p);
          //   }
          // }
  
          // //expand new item...
          // window.setTimeout(function(){
          //   self.showHidePreferenceWithIndex(true, newIndex);
  
          //   //scroll into view...
          //   const element = document.getElementById('collapse'+ newIndex);
          //   element.scrollIntoView();
          // }, 500);
        }
      });
  }

  _completeNewPreferenceCreation(description, preferenceObj){
    let self = this;

    let iMap={
      Id: 0,
      Description: description,
      ImpressionId: preferenceObj ? preferenceObj.prefId : 0,
      ProviderId: self.currentProvider.ProviderID,
      BodyPart: self.selectedBodyPart,
      FollowUp: self.selectedPrefType.toLowerCase() == 'follow' ? 1 : 0,
      Maptype: self.selectedPrefType.toLowerCase()
    }

    // let newPref = null;
    // if(preferenceObj){
    //   newPref = preferenceObj;
    //   let fu = JSON.stringify(preferenceObj.data);
    //   newPref.prefId = 0;
    //   newPref.data = iMap;
    //   newPref.editor = self;
    //   newPref.followup = JSON.parse(fu);
    // }else{
    //   newPref = new PreferenceObj(description, 0, iMap, self);
    // }


    let newPref = new PreferenceObj(description, 0, iMap, self);
    if(preferenceObj){
      let fu = JSON.stringify(preferenceObj.data);
      newPref.followup={data: JSON.parse(fu)};
      newPref.sections = preferenceObj.sections;
    }

    self.preferences.push(newPref);
    self.selectedPreference = newPref;

    //collapse all other prefs...
    let newIndex = self.preferences.length - 1;
    for(let p = 0; p < self.preferences.length; p++){
      if(p != newIndex){
        //collapse...
        self.showHidePreferenceWithIndex(false, p);
      }
    }

    //expand new item...
    window.setTimeout(function(){
      self.showHidePreferenceWithIndex(true, newIndex);

      //scroll into view...
      const element = document.getElementById('collapse'+ newIndex);
      element.scrollIntoView();
    }, 500);
  }

  showHidePreferenceWithIndex(doShow, index){
    let newItem = $('#collapse'+ index);//.collapse('show');
    let method = doShow ? 'show' : 'hide'; 
    if(newItem.length > 0){
      newItem[0].collapse(method);
    }
  }



  addMacro(){
    let self = this;
    if(self.selectedMacro && self.selectedTextarea){

      let selectStart = self.selectedTextarea.selectionStart;
      let selectEnd = self.selectedTextarea.selectionEnd;

      let txt = self.selectedTextarea.value;
      let start = txt.substr(0, selectStart);
      let end = txt.substr(selectEnd, txt.length - selectEnd);



      if(self.selectedTextareaType == 'hpi'){
        self.hpiText = start + self.selectedMacro + end;
      }else if(self.selectedTextareaType == 'exam'){
        self.examText = start + self.selectedMacro + end;
      }else{
        self.planText = start + self.selectedMacro + end;
      }

    }else{
      //ERROR!
      if(!this.selectedMacro){
        self.popHelper.openGenericMessagePop('Please select a macro to add to preference.', 'No Macro Selected', ['OK'], true, function(res){

        });
        return;
      }

      if(!this.selectedTextarea){
        self.popHelper.openGenericMessagePop('Please click in a textarea to add macro.', 'No Textarea Selected', ['OK'], true, function(res){

        });
        return;
      }
    }
  }

  textareaFocus(textarea, e){
    let self = this;
    self.selectedTextarea = e.target;
    self.selectedTextareaType = textarea;
  }


 

  getSelectedFollowupPrefData(){
    let self = this;
    let obj = {}

    obj.type=self.selectedPrefType;
    obj.hpiText= self.hpiText;
    obj.planText= self.planText;
    obj.examText= self.examText;


    return  obj;
  }

  createFollowUpPrefObject(providerId, bodypart, type, prefDescription, hpiText, examText, planText, postopId){

    let preference = {
      ProviderID: providerId,
      BodyPart: bodypart,
      Type: type,//'Telemed',
      PostOpProcedure: prefDescription,
      NoteHistory: hpiText,
      NoteExam: examText,
      NotePlan: planText,
      Timeframe: '',
      visitCode: '',
      PostOpID: postopId
    };

    return preference;
  }


  displayDxPop(callback){
    let self = this;
    self.popHelper.openDxPop(self.bodypart, self.bodyside, undefined, function(res){
      callback(res);
    });
  }

  displayPxPop(callback){
    let self = this;
    self.popHelper.openProcedureSearchPop('X-RAY', false, function(pxs){
      callback(pxs);
    });
  }

  openAutoTask(preference){
    let self = this;
    let genericPicklistItems=[];
    for(let i = 0; i < self.autoTaskTargets.length; i++){
      let pItm = self.data.getGenericPicklistItem(self.autoTaskTargets[i].name, self.autoTaskTargets[i]);
      genericPicklistItems.push(pItm);
    }
    self.popHelper.openGenericPicklistPop("Please Select Recipient for AutoTask...", 'AutoTask', genericPicklistItems, false, function (res) {
      let autoTaskTarget = res.item.data;
      let taskType = self.home.taskHelper.getTaskTypeWithTypeAndDescription('Board', 'Board');
      let autotask = new AutoTask(0, taskType.Id, self.helper._user.UserID, 
                                  autoTaskTarget.recipientId, autoTaskTarget.isGroup, true);
      preference.autotask = autotask;
    });
  }

  displayPreferencePicker(pref, callback){
    let self = this;
    let prefItems=[];
    for(let i = 0; i < self.followUpList.length; i++){
      let pItm = self.data.getGenericPicklistItem(self.followUpList[i].description, self.followUpList[i]);
      prefItems.push(pItm);
    }
    self.popHelper.openGenericPicklistPop("Please select preference to add...", 'Select Preference', prefItems, false, function (res) {
      callback(res.item.data);
    });
  }

}
