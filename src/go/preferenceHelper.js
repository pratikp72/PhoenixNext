import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Data} from '../data/go/data';
import {EventAggregator} from 'aurelia-event-aggregator';
import * as _ from 'lodash';
import {observable} from "aurelia-binding";
import {PopupHelper} from './popupHelper';


@inject(helper,http,Data,EventAggregator, PopupHelper)
export class PreferenceHelper {


  board = null;
  selectedPreference = null;
  preferenceCallbackCounter = 0;
  preferenceCallbackObjects=[];

  newBlocks=[];

  modelAttachedEvent = null;

  objectsToPopulate = [];

  newPreferenceCallbackObjects=[];

  constructor(helper,http,Data,EventAggregator, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.eventAggregator = EventAggregator;
    this.popupHelper = PopupHelper;

    this.setup();
  }

  clearPreferenceObjects(){
    this.preferenceCallbackObjects =[];
    this.selectedPreference = null;
    this.preferenceCallbackCounter = 0;
    this.newBlocks=[];
  }

  setup(){
    let self = this;
    self.eventAggregator.subscribe("modelAttached", function(data){


      //do we have the preference object already??
      if(data.block.blockType === 'plan'){
        let foundPlan = self.getPreferenceCallbackObjectWithBlockTypeAndBodypart(data.block.blockType);
        if(!foundPlan){
          self.addPreferenceCallbackObject(data);
        }
      }else{
        self.addPreferenceCallbackObject(data);
      }

      //self.addPreferenceCallbackObject(data);

      if(self.selectedPreference == null)return;

      self.preferenceCallbackCounter = self.preferenceCallbackCounter - 1;

      if(self.preferenceCallbackCounter == 0){

        //get newly added objects w/ block array...
        // let objectsToPopulate = [];
        for(let i = 0; i < self.newBlocks.length; i++){
          let aBlock = self.newBlocks[i];
          for(let c = 0; c < self.preferenceCallbackObjects.length; c++){
            let aObj = self.preferenceCallbackObjects[c];
            if(aObj.block.id == aBlock.id){
              self.objectsToPopulate.push(aObj);
            }
          }
        }

        self.newBlocks=[];

        self.populatePreferenceCallbackObjectsWithPreference(self.objectsToPopulate, self.selectedPreference);//self.preferenceCallbackObjects

        self.board.providerId = self.board.visitInfo.providerId;

        //update visitBoard layout to db...
        self.updateVisitBoardLayout();
        // self.data.saveVisitBoard(self.board, function(res){
        //   self.board.visitInfo.visitCode.VisitBoardId = res == true ? self.board.id : res.id;
        //   //update VisitBodyParts...
        //   self.board.visitInfo.visitCode.VisitBodyParts = self.data.bodypartsToString(self.board.visitInfo.bodyparts);
        //   self.data.updateVisitCode(self.board.visitInfo.visitCode);
        // });
      }
    });
  }

  getPreferenceCallbackObjectWithBlockTypeAndBodypart(blockType, bodypart){
    let self = this;
    if(blockType === 'plan'){
      if(bodypart){
        let planObj = _.find(self.preferenceCallbackObjects, function(p){return p.block.blockType == blockType});
        if(planObj){
           return _.find(planObj.rows, function(p){return p.bodypart == bodypart});
        }else{
          return undefined;
        }
      }else{
        return _.find(self.preferenceCallbackObjects, function(p){return p.block.blockType == blockType});
      }
    }else{
      return _.find(self.preferenceCallbackObjects, function(p){return p.block.blockType == blockType && p.bodypart == bodypart});
    }
  }

  addPreferenceCallbackObject(o){
    let self = this;
    self.preferenceCallbackObjects.push(o);
  }

  populatePreference(pref, board){
    var self = this;

    self.board = board;

    //is this a map pref???
    if(pref.isMap){
      //check each protocol to see if we have a block for it...
      self.addNewBlocksForPreferenceWithIMapProtocolsBodypartPatientIdProviderIdandDate(pref.data.OD_IMap_Protocols, 
        pref.data.BodyPart, self.board.visitInfo.patientId, 
        self.board.visitInfo.providerId, self.board.visitInfo.date);
      return;
    }

    //check for a block of each type AND bodypart in preferenceObjects...
    //if we dont have one ADD it.
    //ONLY ONE PLAN ALLOWED!!!!
    let foundBodypartObject = self.followupBlocksExistForBodypart(pref.data.BodyPart);

    if(!foundBodypartObject){

      self.selectedPreference = pref;//set preference for boardLoaded subscribed message...
      self.preferenceCallbackCounter = 3;

      //add new bodypart to visit if we dont have it...
      if(!self.board.visitInfo.hasBodypart(pref.data.BodyPart)){
        self.board.visitInfo.addBodypartSide(self.data.getBodypartSide(pref.data.BodyPart, self.board.visitInfo.bodyside));
      }

      //add new blocks to board...
      self.addNewBlocksForPreference(pref.data.BodyPart);
    }else{

      //find objects in preferenceCallbackObjects to update with preference...
      let updateObjects=[];
      for(let i = 0; i < self.preferenceCallbackObjects.length; i++){
        let obj = self.preferenceCallbackObjects[i];
        let type = obj.block.blockType.toLowerCase();

        if(type== 'exam' &&
          obj.bodypart == pref.data.BodyPart){
            updateObjects.push(obj);
        }
        if(type == 'hpi' &&
          obj.bodypart == pref.data.BodyPart){
          updateObjects.push(obj);
        }
        if(type == 'plan'){
          //find plan row...
          let planPartRow = obj.getPlanRowWithBodypart(pref.data.BodyPart);
          if(planPartRow != null){
            obj.selectedRow = planPartRow;
            updateObjects.push(obj);
          }else {
            //create new one...
            let newRow = obj.addNewRow(pref.data.BodyPart, null);
            updateObjects.push(obj);
          }
        }
        // if(type == 'diagnosis'){
        //   obj.addRow(id, code, description, date, isHistorical, obj);
        // }
      }

      if(updateObjects.length > 0){
        self.populatePreferenceCallbackObjectsWithPreference(updateObjects, pref);
      }else{
        //create new set of blocks
        self.selectedPreference = pref;//set preference for boardLoaded subscribed message...
        self.preferenceCallbackCounter = 3;
        self.addNewBlocksForPreference();
      }
    }
  }

  followupBlocksExistForBodypart(bodypart){
    let self = this;
    let blocktypes=['hpi', 'exam', 'plan'];
    for(let i = 0; i < blocktypes.length; i++){
      let aBlockType = blocktypes[i];
      let foundBlockPref = self.getPreferenceCallbackObjectWithBlockTypeAndBodypart(aBlockType, bodypart);
      if(foundBlockPref){
        return true;
      }
    }
    return false;
  }

  sendPreferenceToBlock(prefId, block){
    if(block.childModel){
      block.childModel.addPreferenceWithId(prefId);
    }
  }

  sendPreferencesToBlock(preferences, block){
    if(block.childModel){
      for(var i = 0; i < preferences.length; i++){
        if(preferences[i].TableName == 'OD_ICD10Codes'){
          block.childModel.addPreferenceWithChildCode(preferences[i].PreferenceId);
        }else{
          block.childModel.addPreferenceWithId(preferences[i].PreferenceId);
        }
      }
    }
  }

  addNewBlocksForPreferenceWithIMapProtocolsBodypartPatientIdProviderIdandDate(protocols, bodypart, patientId, providerId, date){
    let self = this;

    for(let i = 0; i< protocols.length; i++){
      let aProto = protocols[i];
      let blockName = null;
      let autoTaskId = aProto.AutoTaskId;
      let found_protocols=[];

      if(aProto.TableName == 'OD_PostOp_Pref' ||
        aProto.TableName == 'OD_HPI_Pref' ||
        aProto.TableName == 'OD_Plan_Preference'){

        //try to copy existing block sizes...
        let valuesExist = false; 

        let tExamBlock = _.find(self.board.blocks, function(b){return b.blockType == 'exam'});
        let tPlanBlock = _.find(self.board.blocks, function(b){return b.blockType == 'plan'});
        let tHpiBlock = _.find(self.board.blocks, function(b){return b.blockType == 'hpi'});

        if(tExamBlock){
          //check if value exists...
          if(!valuesExist){
            valuesExist = tExamBlock.childModel.hasValue();
          }
        }
        if(tHpiBlock){
          //check if value exists...
          if(!valuesExist){
            valuesExist = tHpiBlock.childModel.hasValue();
          }
        }
        //self.newBlocks.push(hpiBlock);

        if(tPlanBlock){
          //check if value exists...
          if(!valuesExist){
            valuesExist = tPlanBlock.childModel.hasValue();
          }
        }

        //get followup data...
        self.data.getFollowUpPrefPopulated(aProto.PreferenceId, 
          patientId, providerId, date, 
          function(fuRes){

            let addExam = false;
            let addPLan = false;
            let addHpi = false;

            //check each populated pref for values...
            if(fuRes.NoteHistory != null &&
              fuRes.NoteHistory.length > 0){
                //add to callback counter...
                self.preferenceCallbackCounter++;
                addHpi = true;
              }

            if(fuRes.NoteExam != null &&
              fuRes.NoteExam.length > 0){
                //add to callback counter...
                self.preferenceCallbackCounter++;
                addExam = true;
              }

            if(fuRes.NotePlan != null &&
              fuRes.NotePlan.length > 0){
                //add to callback counter...
                self.preferenceCallbackCounter++;
                addPLan = true;
              }

            if(addExam){
              self.queueBlockForAddCompletionAndPopulate(tExamBlock, 'exam', valuesExist, fuRes, bodypart, autoTaskId);
            }
            if(addPLan){
              self.queueBlockForAddCompletionAndPopulate(tPlanBlock, 'plan', valuesExist, fuRes, bodypart, autoTaskId);
            }
            if(addHpi){
              self.queueBlockForAddCompletionAndPopulate(tHpiBlock, 'hpi', valuesExist, fuRes, bodypart, autoTaskId);
            }

        });

        continue;

      }else if(aProto.TableName == 'OD_Lab_Order'){
        blockName = 'order';
      }else if(aProto.TableName == 'VW_Diagnosis' || aProto.TableName == 'OD_ICD10Codes'){
        blockName = 'diagnosis';

        //get all diagnosis...
        found_protocols = _.filter(protocols, function(p){return p.TableName =='VW_Diagnosis' || p.TableName == 'OD_ICD10Codes'});

      }else if(aProto.TableName == 'OD_Procedures'){
        blockName = 'procedure';
      }else if(aProto.TableName == 'OD_Inject_Pref'){
        blockName = 'jointInjection';
      }else if(aProto.TableName == 'OD_Go_Forms_Pref'){
        blockName = 'exam';
        //no block - generate form here...
        var goFormPrefSaveObj={
          PreferenceId: aProto.PreferenceId,
          PatientId: patientId,
          Date: date
        }
        var url = `goforms/instance/pref`
        self.data.postWithUrlAndData(url, JSON.stringify(goFormPrefSaveObj), function(res){
          //refresh document tray here??
          var aBlock = self.data.getNewBlock();
          aBlock.description = res.Description;
          aBlock.blockType = 'goForm';
          aBlock.widthMult = 1;
          aBlock.heightMult = 1;
          aBlock.data = {'CreateDate': res.Date};
          aBlock.id = res.Id;
          self.board.documents.push(aBlock);


          //check for exam block...
          var examBlock = self.board.getBlockWithType('exam');
          if(!examBlock){
            var options={
              loadData: false,
              widthMult: 2,
              heightMult: 2,
              x: 0,
              editing: false,
              soapSort: true
            }
            examBlock = self.board.addBlock('exam', options);
            examBlock.loadData=false;
            examBlock.goFormDetails = res.Description;
            examBlock.dontSave =true;
          }else{
            //update exisitng...
            //updateExamData
            //this.setExamData("See document tray for details.", bp, 'EXAM', false);//model.goFormDetails
            var examData={
              details: "See document tray for details.",
              title: "Exam"
            }
            self.eventAggregator.publish('updateExamData', examData);
          }


        });

        continue;
      }

      let aBlock = _.find(self.board.blocks, function(b){return b.blockType == blockName});
      if(!aBlock){
        //if it doesnt exist, add it...
        self.board.addBlock(blockName, 
          {
            editing:false,
            widthMult : 2,
            soapSort: true,
            loadPreferenceCallback:function(newBlock){
              if(found_protocols.length > 0){
                self.sendPreferencesToBlock(found_protocols, newBlock)
              }else{
                self.sendPreferenceToBlock(aProto.PreferenceId, newBlock)
              }
            }
          });
      }else{
        if(aBlock.childModel){
          if(aProto.TableName == 'OD_ICD10Codes'){
            aBlock.childModel.addPreferenceWithChildCode(aProto.PreferenceId);
          }else{
            aBlock.childModel.addPreferenceWithId(aProto.PreferenceId);
          }
        }
      }
    }
  }


  queueBlockForAddCompletionAndPopulate(blockToAdd, blockType, valuesExist, preference, bodypart, autoTaskId){
    let self = this;
    if(!blockToAdd){
      blockToAdd = self.board.addBlock(blockType, 
      {editing:false, 
        loadData:false,
        widthMult : 2,
        soapSort: true,
        loadPreferenceCallback:function(newBlock){

          if(blockType == 'plan'){
            //add new row...
            newBlock.childModel.addNewRow(bodypart,'');
          }

          //add autoTaskId...
          newBlock.childModel.autoTaskId = autoTaskId;

          self.newPreferenceCallbackObjects.push(newBlock.childModel);
          self.checkBlockAddCompletionAndPopulate(valuesExist, preference);
        }
      });

    }else{
      //update...
      if(blockType == 'plan'){
        //make sure plan row is selected...
        //do we have rows???
        if(blockToAdd.childModel.rows.length == 0){
          //add new row...
          blockToAdd.childModel.addNewRow(bodypart,'');
        }else{
          blockToAdd.childModel.setSelectedRowWithIndex(blockToAdd.childModel.selectedRowIndex);
        }
      }

      //add autoTaskId...
      blockToAdd.childModel.autoTaskId = autoTaskId;

      self.newPreferenceCallbackObjects.push(blockToAdd.childModel);
      self.checkBlockAddCompletionAndPopulate(valuesExist, preference);
    }
  }

  updateVisitBoardLayout(){
    let self = this;
    //update visitBoard layout to db...
    self.data.saveVisitBoard(self.board, function(res){
      self.board.visitInfo.visitCode.VisitBoardId = res == true ? self.board.id : res.id;
      //update VisitBodyParts...
      self.board.visitInfo.visitCode.VisitBodyParts = self.data.bodypartsToString(self.board.visitInfo.bodyparts);
      self.data.updateVisitCode(self.board.visitInfo.visitCode);
    });
  }

  checkBlockAddCompletionAndPopulate(displayPopup, preference){
    let self = this;

    //counter complete??
    self.preferenceCallbackCounter--;
    if(self.preferenceCallbackCounter <= 0){

      //update / overwrite??
      if(displayPopup){
        //show update overwrite...
        self.displayAppendOverwritePopupWithObjectsAndPreference(self.newPreferenceCallbackObjects, preference);
      }else{
        self._populateCallbackObjectsWithData(self.newPreferenceCallbackObjects, preference);
      }

      //TODO: autotasking here...
      self.doAutoTaskingForIMap(self.newPreferenceCallbackObjects);

      self.newPreferenceCallbackObjects=[];
      self.preferenceCallbackCounter = 0;

      self.updateVisitBoardLayout();
    }
  }

  doAutoTaskingForIMap(newPreferenceCallbackObjects){
    let self = this;
    for(let i = 0; i < newPreferenceCallbackObjects.length; i++){
      if(newPreferenceCallbackObjects.autoTaskId != null){
        //do auto tasking...
      }
    }
  }


  addNewBlocksForPreference(bodypart){
    let self = this;

    //try to copy existing block sizes...
    let tExam = _.find(self.board.blocks, function(b){return b.blockType == 'exam'});
    let tPlan = _.find(self.board.blocks, function(b){return b.blockType == 'plan'});
    let tHpi = _.find(self.board.blocks, function(b){return b.blockType == 'hpi'});

    let examBlock = self.board.addBlock('exam', {editing:false, loadData:false});
    if(tExam){
      examBlock.widthCls = tExam.widthCls;
      examBlock.widthMult = tExam.widthMult;
      examBlock.heightMult = tExam.heightMult;
      examBlock.heightClass = tExam.heightCls;
    }
    self.newBlocks.push(examBlock);
    let hpiBlock = self.board.addBlock('hpi', {editing:false, loadData:false});
    if(tHpi){
      hpiBlock.widthCls = tHpi.widthCls;
      hpiBlock.widthMult = tHpi.widthMult;
      hpiBlock.heightMult = tHpi.heightMult;
      hpiBlock.heightClass = tHpi.heightCls;
    }
    self.newBlocks.push(hpiBlock);

    //only add PLAN block if it DOESN'T exist...
    if(!tPlan){
      let planBlock = self.board.addBlock('plan', {editing:false, loadData:false});
      self.newBlocks.push(planBlock);
    }else{
      let planObj = self.getPreferenceCallbackObjectWithBlockTypeAndBodypart('plan');
      if(planObj){
        let newRow = planObj.addNewRow(bodypart, null);
        self.objectsToPopulate.push(planObj);
        planObj.eventAggregator.publish("modelAttached", planObj);
      }
    }
  }

  displayAppendOverwritePopupWithObjectsAndPreference(objs, pref){
    let self = this;
    self.popupHelper.openAppendOverwitePop('Add Preference', 'Would you like to append the preference to the existing visit or overwrite it?', function(r){
      if(r.result == 'append'){
        self._populateCallbackObjectsWithAppendData(objs, pref);
      }else if(r.result == 'overwrite'){
        self._populateCallbackObjectsWithData(objs, pref);
      }
    });
  }

  populatePreferenceCallbackObjectsWithPreference(callbackObjects, preference){
    let self = this;
    self.selectedPreference = null;

    //get postOpId...
    let postOpId = 0;
    if(!preference.isMap){
      postOpId = preference.data.PostOpID;
    }else{
      //map object. Get PreferenceID from OD_IMap_Protocols where TableName = OD_PostOp_Pref
      let foundProtocol = _.find(preference.data.OD_IMap_Protocols, function(p){return p.TableName == 'OD_PostOp_Pref'});
      if(foundProtocol){
        postOpId = foundProtocol.PreferenceId;
      }
    }

    self.data.getFollowUpPrefPopulated(postOpId, self.board.visitInfo.patientId, self.board.visitInfo.providerId, self.board.visitInfo.date, function(res){

      let displayAppendOverwrite = false;

      for(let i = 0; i < callbackObjects.length; i++){

        let type = callbackObjects[i].block.blockType.toLowerCase();

        if(type == 'hpi'){
          if(callbackObjects[i].hpiText != null && callbackObjects[i].hpiText.length > 0){
            displayAppendOverwrite = true;
            break;
          }
        }else if(type == 'plan'){
          if(callbackObjects[i].rows.length > 0 && callbackObjects[i].rows[callbackObjects[i].selectedRowIndex].text != null){
            displayAppendOverwrite = true;
            break;
          }
        }else{
          //exam
          if(callbackObjects[i].examText != null && callbackObjects[i].examText.length > 0){
            displayAppendOverwrite = true;
            break;
          }
        }
      }

      if(displayAppendOverwrite){
        self.displayAppendOverwritePopupWithObjectsAndPreference(callbackObjects, res);
        // self.popupHelper.openAppendOverwitePop('Add Preference', 'Would you like to append the preference to the existing visit or overwrite it?', function(r){
        //   if(r.result == 'append'){
        //     self._populateCallbackObjectsWithAppendData(callbackObjects, res);
        //   }else if(r.result == 'overwrite'){
        //     self._populateCallbackObjectsWithData(callbackObjects, res);
        //   }
        // });
      }else{
        self._populateCallbackObjectsWithData(callbackObjects, res);
      }

      self.preferenceCallbackCounter = 0;
      //self.preferenceCallbackObjects=[];
      self.objectsToPopulate=[];
    });
  }

  _populateCallbackObjectsWithData(callbackObjects, data){
    for(let i = 0; i < callbackObjects.length; i++){

      let tTitle = data.Type.toUpperCase() == 'FOLLOW' ? 'FOLLOW UP' : data.Type.toUpperCase();
      let type = callbackObjects[i].block.blockType.toLowerCase();

      if(type == 'hpi'){
        callbackObjects[i].populateWithPreference(data.NoteHistory, data.BodyPart, tTitle + " HPI");
      }else if(type == 'plan'){
        callbackObjects[i].populateWithPreference(data.NotePlan, data.BodyPart, tTitle);
      }else{
        //exam
        callbackObjects[i].populateWithPreference(data.NoteExam, data.BodyPart, tTitle + " EXAM");
      }
    }
  }

  _populateCallbackObjectsWithAppendData(callbackObjects, data){
    for(let i = 0; i < callbackObjects.length; i++){

      let tTitle = data.Type.toUpperCase() == 'FOLLOW' ? 'FOLLOW UP' : data.Type.toUpperCase();

      let type = callbackObjects[i].block.blockType.toLowerCase();

      if(type == 'hpi'){
        let finalHpi = "";
        //check to make sure text is NOT NULL before concat, else overwrite...
        if(callbackObjects[i].hpiText == null){
          finalHpi = data.NoteHistory;
        }else{
          finalHpi = callbackObjects[i].hpiText.concat(" "+ data.NoteHistory);
        }
        callbackObjects[i].populateWithPreference(finalHpi, data.BodyPart, tTitle + " HPI");
      }else if(type == 'plan'){
        //check to make sure text is NOT NULL before concat, else overwrite...
        let finalPlan = "";
        if(callbackObjects[i].selectedRow.text == null){
          finalPlan = data.NotePlan;
        }else{
          finalPlan = callbackObjects[i].selectedRow.text.concat(" "+ data.NotePlan, tTitle);
        }
        // if(callbackObjects[i].planText == null){
        //   finalPlan = data.NotePlan;
        // }else{
        //   finalPlan = callbackObjects[i].planText.concat(" "+ data.NotePlan, tTitle + " PLAN");
        // }
        callbackObjects[i].populateWithPreference(finalPlan, data.BodyPart, tTitle);
      }else{
        //exam
        //check to make sure text is NOT NULL before concat, else overwrite...
        let finalExam = "";
        if(callbackObjects[i].examText == null){
          finalExam = data.NoteExam;
        }else{
          finalExam = callbackObjects[i].examText.concat(" "+ data.NoteExam);
        }
        callbackObjects[i].populateWithPreference(finalExam, data.BodyPart, tTitle + " EXAM");
      }
    }
  }

}
