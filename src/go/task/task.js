/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject, observable} from 'aurelia-framework';
import {http} from '../../helpers/http';
import {helper} from '../../helpers/helper';
import moment from 'moment';
import {DialogService} from 'aurelia-dialog';
import * as _ from 'lodash';
import {Data} from '../../data/go/data';
import {TaskHelper} from './taskHelper';




class OD_Task{
  constructor(id, date, data){
    this.id = id;
    this.date = date;
    this.selected = false;
    this.data = data;
  }
}

class bubble{
  constructor(description, isSender, data, date){
    this.color = isSender ? '#007bff':'#e6e6e6';
    this.textColor = isSender ? 'white' : 'black';
    this.isSender = isSender;
    this.description = description;
    this.isRight = isSender;
    this.data = data;
    this.date= date;
    this.sortdate = moment(date).format();
    this.displayDate = true;
    this.isTask = false;
    this.canLaunchTask = false;
    this.senderName = null;
    this.setSenderNameWithData(data);
  }

  setSenderNameWithData(data){
    if(data.Patient != null){
      this.senderName = data.Patient.NameFirst + " " + data.Patient.NameLast;
    }else if(data.User != null){
      this.senderName = data.User.FirstName + " " + data.User.LastName;
    }else if(data.Group != null){
      //group...
      this.senderName = data.Group.GroupName;
    }
  }
}

class message{
  constructor(patientId, date, data, targets){
    this.bubbles=[];
    this.patientId = patientId;
    this.date=date;
    this.sortdate = moment(date).format();
    this.data = data
    this.selected = false;
    this.id = data.ConversationID;
    this.detail = null;
    this.subjectName=null;
    this.targetList= targets==null ? [] : targets;
    this.alt = null;
    this.showAlt = false;
    this.imagePath=null;
    this.read = false;
    this.selectedForArchive = false;
    this.setImageAlt();
  }

  setDate(date){
    this.date = moment(date).format('MM/DD/YYYY');
    this.sortdate = moment(date).format();
  }

  setImageAlt(){
    var self = this;
    if(self.targetList.length > 0){

      //check for patient first??
      if(self.patientId != null){
        var foundPatient = _.find(self.targetList, function(t){return t.id == self.patientId});
        self.imagePath = '/images/photos/'+ foundPatient.photo;
      }else{
        //get first target that is NOT logged in user...
        //var firstTarget = _.reject(self.targetList, function(t){t.id == });


        var firsttarget = self.targetList[0];
        self.alt = firsttarget.firstName.substr(0,1).toUpperCase() + firsttarget.lastName.substr(0,1).toUpperCase();
        self.showAlt = true;
      }
    }else{
      self.imagePath = `${helper.goFileUrl}images/blank.png`;//'/images/photos/blank.png';
    }
  }

  removeBubbleWithId(id){
    for(var i = 0; i < this.bubbles.length; i++){
      var aBubble = this.bubbles[i];
      if(aBubble.data.hasOwnProperty('TaskID') && aBubble.data.TaskID == id){
        this.bubbles.splice(i, 1);
        break;
      }
    }
  }

}

@inject(DialogController, http, helper, DialogService, Data, TaskHelper)
export class Task {


  selectedTask=null;
  messageResults=[];
  archivedMessageResults=[];
  filteredMessages=[];
  taskStatusList=["ASSIGNED","COMPLETED"];
  taskResults=[];

  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;
  openPatientOnClose = false;
  launchPatientId=null;
  bodyHeight=0;
  gridHeight=0;
  tobarGridHeight=0;
  detailHeight=0;
  ogDetailHeight = 0;

  tasksToUpdate=[];

  filterStatus='assigned';

  //test message...
  currentMessage = null;

  scrollTop = 0;
  //providerId = 0;
  messageText=null;
  displayToBar = false;
  popHelper = null;
  displayMessageTasks = true;//false;
  filterMessagesByUser = true;
  editingMessages = false;
  archiveList=[];

  refreshTimer = null;
  editMode = false;

  displayIcon = 'fa-comment';//fa-thumb-tack fa-archive
  displayText = 'Tasks';//'Messages';
  showTasks = true;//false;
  showMessages = false;//true;
  showArchive = false;

  providerList=[];
  userList=[];
  filteredUserList=[];

  // selectedUserId=null;
  // selectedUserName;

  constructor(DialogController, http, helper, DialogService, Data, TaskHelper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
    this.dialogService = DialogService;
    this.goData = Data;
    this.taskHelper = TaskHelper;
  }

  scrollLastBubbleIntoView(){
    window.setTimeout(function(){
      let el = $( ".message-bubble" ).last();
      if(el.length == 1){
         el[0].scrollIntoView();
      }
    }, 500);
  }

  filterPriority(priority){
    let self = this;
    self.filteredMessages = [];

    self.getTasksWithUserId(self.taskHelper.filterUserId, priority, function(res){
      var orderedTasks = _.orderBy(res, 'sortdate', 'desc');
      self.taskResults = orderedTasks;
      self.filteredMessages = _.orderBy(self.taskResults, function(s){return s.subjectName});
      self.currentMessage = self.filteredMessages[0];

      self.scrollLastBubbleIntoView();
    });
  }

  filterUsers(e){
    let self = this;
    let search = e.target.value.toLowerCase();

    if(search.toString().length == 0){
      self.filteredUserList = self.userList;
      return;
    }

    self.filteredUserList = _.filter(self.userList, function(b){return b.UserName.toLowerCase().startsWith(search)});
  }

  filter(e){
    let self = this;
    if(this.displayMessageTasks){
      self.filterTasks(e);
    }else{
      self.filterMessages(e);
    }
  }

  filterTasks(e){
    let self = this;
    let search = e.target.value.toLowerCase();
    self.taskHelper.search = search;

    if(search.toString().length == 0){
      self.filteredMessages = self.taskResults;
      return;
    }

    let res =[];
    let initialFilter = self.taskResults;
    self.filteredMessages = [];

    let filterIndex = 0;

    //current...
    for(let i = 0; i < initialFilter.length; i++){
      let aMsg = initialFilter[i];
      let bubs = aMsg.bubbles;
      let bubbleRes = _.filter(bubs, function(b){return b.description.toLowerCase().includes(search)});

      for(let m =0; m < bubbleRes.length; m++){
        let foundBubble = bubbleRes[m];
        //create conversation for each found result...
        let foundConv = new message(null, null, {"ConversationID": 0}, null);
        foundConv.alt = aMsg.alt;
        foundConv.data = aMsg.data;
        foundConv.date = aMsg.date;
        foundConv.detail = foundBubble.description;//aMsg.detail;
        foundConv.id = filterIndex;//aMsg.id;
        foundConv.patientId = aMsg.patientId;
        foundConv.imagePath = aMsg.imagePath;
        foundConv.read = aMsg.read;
        foundConv.selected = false;
        foundConv.selectedForArchive = aMsg.selectedForArchive;
        foundConv.showAlt = aMsg.showAlt;
        foundConv.sortdate = aMsg.sortdate;
        foundConv.subjectName = aMsg.subjectName;
        foundConv.targetList = aMsg.targetList;
        foundConv.bubbles.push(foundBubble);

        res.push(foundConv);

        filterIndex++;
      }
    }



    self.filteredMessages = _.orderBy(res, function(s){return s.subjectName});

    //self.scrollLastBubbleIntoView();
  }

  filterMessages(e){
    let self = this;
    let search = e.target.value;

    let targetType = self.filterMessagesByUser ? self.goData.TARGETTYPE.USER : self.goData.TARGETTYPE.PATIENT;

    //reset back to current filter if no search text...
    if(search.length == 0){
      self.filteredMessages = self.getMessageResultsWithTargetType(targetType);
      return;
    }

    let res =[];
    let initialFilter = self.getMessageResultsWithTargetType(targetType);
    self.filteredMessages = [];

    //current...
    for(let i = 0; i < initialFilter.length; i++){
      let aMsg = initialFilter[i];
      let msgRes = _.filter(aMsg.targetList, function(t){return t.firstName.toLowerCase().startsWith(search) || t.lastName.toLowerCase().startsWith(search)});
      if(msgRes.length > 0){
        //add it to results...
        res.push(aMsg);
      }
    }

    //archived...
    let archiveSet = self.getMessageResultsWithTargetTypeAndResults(targetType, self.archivedMessageResults);
    for(let i = 0; i < archiveSet.length; i++){
      let aMsg = archiveSet[i];
      let msgRes = _.filter(aMsg.targetList, function(t){return t.firstName.toLowerCase().startsWith(search) || t.lastName.toLowerCase().startsWith(search)});
      if(msgRes.length > 0){
        //add it to results...
        res.push(aMsg);
      }
    }



    self.filteredMessages = _.orderBy(res, function(s){return s.subjectName});

    self.scrollLastBubbleIntoView();
  }

  filterConversationTargetsByTargetype(conversationTargets, targettype){
    var self = this;
    if(targettype == self.goData.TARGETTYPE.USER){
      //remove patients
      var convIdsToRemove=[];
      for(var t = 0; t < conversationTargets.length; t++){
        var aConv = conversationTargets[t];
        //find patients first...
        var patientTargets = _.filter(aConv.Targets, function(p){return p.Patient != null});
        if(patientTargets.length > 0){
          convIdsToRemove.push(aConv.ConversationId);
        }
      }
      //remove found patient-related convIds...
      var final = _.reject(conversationTargets, function(c){return convIdsToRemove.includes(c.ConversationId)});
      return final;
    }else if(targettype == self.goData.TARGETTYPE.PATIENT){
        //return anything WITH a patient target...
      var conversationsToKeep = [];
      for(var t = 0; t < conversationTargets.length; t++){
        var aConv = conversationTargets[t];
        //find patients first...
        var patientTargets = _.filter(aConv.Targets, function(p){return p.Patient != null});
        if(patientTargets.length > 0){
          conversationsToKeep.push(aConv);
        }
      }
      return conversationsToKeep;
    }
  }

  getTasksWithUserId(userId, priority, callback){
    var self = this;
    self.taskResults=[];
    self.filteredMessages=[];
    var url = 'tasks?userId='+userId;
    self.http.get(self.helper.getApiUrl(url), function (tasks) {
      //get only assigned tasks...
      var assignedTasks = _.filter(tasks, function(t){return t.Status.toUpperCase()=='ASSIGNED'});

      if(priority != undefined && priority.toLowerCase() != 'all'){
        assignedTasks = _.filter(assignedTasks, function(t){return t.Priority.toUpperCase()==priority.toUpperCase()});
      }

      var conversationList=[];
      self.populateConversationsWithTasks(assignedTasks, conversationList);

      var resultResponseCount = 0;

      for(var i = 0; i < conversationList.length; i++) {
        var aMsg = conversationList[i].messages[0];//get first item...
        //is this a lone task??
        if(aMsg.hasOwnProperty('TaskID')){
          self.getConversationTargetsWithTask(aMsg, aMsg, i, function(res, index, ogConversation){

            //resultResponseCount++;
            //self.manipulateConversationTargetResults(res, index, ogConversation, conversationList, resultResponseCount, callback);

            //add targets???
            conversationList[index].targets = res;

            self.addToResults(aMsg, conversationList[index], self.taskResults);

            if(index == conversationList.length -1){
              callback(self.taskResults);
            }

          });
        }
      }

      //callback
      // callback(self.taskResults);
    });
  }



  getMessagesByUserId(userId, callback){
    var self = this;
    self.messageResults=[];
    self.archivedMessageResults=[];
    self.filteredMessages=[];


    self.goData.getMessageConversationsWithUserId(userId, function(res){

      //create conversation list...
      let sorted = res;//_.groupBy(sorted, 'ConversationID');
      sorted = _.groupBy(sorted, 'ConversationID');
      let conversationList=[];
      let groupKeys = Object.keys(sorted);

      self.goData.getConversationTargetsWithConversationIds(groupKeys, function(res){

        var filteredConversationTargets = res;

        //populate conversationList...
        for(var i = 0; i < filteredConversationTargets.length; i++){
          var k = filteredConversationTargets[i].ConversationId;

          //get messages for this conversation...
          //var tMsgs = sorted[k];
          //try removing where Reply == NULL
          var tMsgs = _.filter(sorted[k], function(m){return m.Reply != null});

          var messageList = _.orderBy(tMsgs, 'ReplyID', 'desc');
          var targetList = _.find(filteredConversationTargets, function(t){return t.ConversationId == k});
          var conversation={
            messages: messageList,
            targets: targetList.Targets,
            id: targetList.ConversationId
          }
          conversationList.push(conversation);
        }

        // var resultResponseCount = 0;

        for(var i = 0; i < conversationList.length; i++){
          var aMsg = conversationList[i].messages[0];//get first item...


          if(aMsg.Status == 'ARCHIVED'){
            self.addToResults(aMsg, conversationList[i], self.archivedMessageResults);
          }else{
            self.addToResults(aMsg, conversationList[i], self.messageResults);
          }
        }

        //callback
        if(self.showMessages){
          callback(self.messageResults);
        }else{
          callback(self.archivedMessageResults);
        }

      });


    });
  }

  doneClick(){
    var self = this;
    self.editMode = false;
    self.editingMessages = false;
  }

  toggleMessageEdit(){
    var self = this;
    self.editingMessages = self.editingMessages ? false : true;
    self.editMode = self.editingMessages;
  }

  displayArchivedMessages(){
    var self = this;
    self.filteredMessages = self.archivedMessageResults;
    self.editMode = false;
    self.setDisplayInfo('Archive');
  }

  displayActiveMessages(){
    var self = this;

    let targetType = self.filterMessagesByUser ? self.goData.TARGETTYPE.USER : self.goData.TARGETTYPE.PATIENT;
    self.filteredMessages = self.getMessageResultsWithTargetType(targetType);
    //self.filteredMessages = self.messageResults;
    self.editMode = false;
    self.setDisplayInfo('Messages');
  }


  archiveConversationClick(){
    //archive each conversation in archive list...

    var self = this;
    var ids = [];
    for(var i = 0; i < self.archiveList.length; i++){
      ids.push(self.archiveList[i].id);
    }

    self.goData.updateConversationStatusWithIdsAndStatus(ids, 'ARCHIVED', function(res){

      var success = res;
      if(success){
        self.archiveList = [];
        self.editingMessages = false;
      }

    });
  }

  messageClickForArchive(message){
    var self = this;
    var tArchive = message.selectedForArchive;
    message.selectedForArchive = tArchive ? false : true;
    //manage archive list...

    if(message.selectedForArchive){
      //add it to archive list...
      self.archiveList.push(message);
    }else{
      //remove from archive list...
      for(var i = 0; i < self.archiveList.length; i++){
        if(self.archiveList[i].id == message.id){
          self.archiveList.splice(i, 1);
          break;
        }
      }
    }
  }

  toggleFilterPatientUserMessages(){
    let self = this;
    //self.filterMessagesByUser
    //showMessages
    let messagesTofilter = self.showMessages ? self.messageResults : self.archivedMessageResults;
    self.filterMessagesByUser = self.filterMessagesByUser ? false : true;
    let tType = self.filterMessagesByUser ? self.goData.TARGETTYPE.USER : self.goData.TARGETTYPE.PATIENT;
    //self.filteredMessages = self.getMessageResultsWithTargetType();
    self.filteredMessages = self.getMessageResultsWithTargetTypeAndResults(tType, messagesTofilter);
  }

  filterPatientMessages(){
    let self = this;
    //showMessages
    self.taskHelper.filterPatientOrUser = 'patient';
    let messagesTofilter = self.showMessages ? self.messageResults : self.archivedMessageResults;
    self.filterMessagesByUser = false;
    let tType = self.goData.TARGETTYPE.PATIENT;
    self.filteredMessages = self.getMessageResultsWithTargetTypeAndResults(tType, messagesTofilter);
  }

  filterUserMessages(){
    let self = this;
    //showMessages
    self.taskHelper.filterPatientOrUser = 'user';
    let messagesTofilter = self.showMessages ? self.messageResults : self.archivedMessageResults;
    self.filterMessagesByUser = true;
    let tType = self.goData.TARGETTYPE.USER;
    self.filteredMessages = self.getMessageResultsWithTargetTypeAndResults(tType, messagesTofilter);
  }

  getMessageResultsWithTargetTypeAndResults(optionalTargetType, results){
    let self = this;
    let res = [];
    if(optionalTargetType != undefined){
      self.filterMessagesByUser = optionalTargetType == self.goData.TARGETTYPE.USER ? true : false;
    }else {
      self.filterMessagesByUser = self.filterMessagesByUser ? false : true;
    }

    for(let i = 0; i < results.length; i++){
      let msg = results[i];

      if(!self.filterMessagesByUser){
        //patients...
        if(msg.patientId != null){
          res.push(msg);
        }
      }else{
        //users...
        if(msg.patientId == null){
          res.push(msg);
        }
      }
    }

    return res;
  }


  getMessageResultsWithTargetType(optionalTargetType){
    let self = this;
    let results = [];
    if(optionalTargetType != undefined){
      self.filterMessagesByUser = optionalTargetType == self.goData.TARGETTYPE.USER ? true : false;
    }else {
      self.filterMessagesByUser = self.filterMessagesByUser ? false : true;
    }

    for(let i = 0; i < self.messageResults.length; i++){
      let msg = self.messageResults[i];

      if(!self.filterMessagesByUser){
        //patients...
        if(msg.patientId != null){
          results.push(msg);
        }
      }else{
        //users...
        if(msg.patientId == null){
          results.push(msg);
        }
      }
    }

    return results;
  }

  populateConversationsWithTasks(assignedTasks, conversationList){

    var self = this;

    //add tasks to proper conversation...
    for(var t = 0; t < assignedTasks.length; t++){
      var aTask = assignedTasks[t];

      //update DateCreated w/ DateModified for sorting...
      aTask.DateCreated = aTask.DateModified;

      var foundtask = false;

      //does this patientId exist in any conversation??
      for(var cl = 0; cl < conversationList.length; cl++){
        var cList = conversationList[cl];

        //query targetList...
        // var foundPatient = _.find(cList.targets, function (p) {
        //   return p.PatientId == aTask.PatientID;
        // });
        var foundPatient = _.find(cList.targets, function (p) {
          return p.id == aTask.PatientID;
        });

        if(foundPatient != undefined){
          //FOUND iT!
          cList.messages.push(aTask);
          foundtask = true;
        }

        if(foundtask){
          break;
        }
      }

      if(!foundtask){
        //if we havent found a place to put task,
        //look for conversation between users = task.CreatedByID and AssignedToID
        for(var ct = 0; ct < conversationList.length; ct++){
          var cListTask = conversationList[ct];

          //query targetList...
          // var foundUsers = _.filter(cListTask.targets, function (p) {
          //   return p.UserId == aTask.CreatedByID || p.UserId == aTask.AssignedToID;
          // });
          var foundUsers = _.filter(cListTask.targets, function (p) {
            return p.id == aTask.CreatedByID || p.UserId == aTask.AssignedToID;
          });

          if(foundUsers.length > 0 && //foundUsers != undefined
              foundUsers.length == cListTask.targets.length){
            //FOUND iT!
            cListTask.messages.push(aTask);
            foundtask = true;
          }
        }
      }

      //create one if we dont have it...
      if(!foundtask){
        var conversation={
          messages: [],
          targets: [],
          id: 0
        }
        conversation.messages.push(aTask);

        //add target...
        //split patient_name...
        // let nameSplit = aTask.Patient_Name.split(' ');
        // var tgt = self.goData.getNewMessageTarget(aTask.PatientID, nameSplit[0], nameSplit[1], self.goData.TARGETTYPE.PATIENT, aTask.TaskID);
        // conversation.targets.push(tgt);

        let foundUser = self.getUserFromListByUserId(aTask.CreatedByID);
        if(foundUser == undefined){
          foundUser={};
          foundUser.FirstName = '';
          foundUser.LastName = '';
        }
        var tgt = self.goData.getNewMessageTarget(aTask.CreatedByID, foundUser.FirstName, foundUser.LastName, self.goData.TARGETTYPE.USER, aTask.TaskID);
        conversation.targets.push(tgt);

        conversationList.push(conversation);
      }
    }
  }

  getUserFromListByUserId(userId){
    let self = this;
    return _.find(self.userList, function(u){return u.UserID == userId});
  }

  addTargetToConversation(conversation, target){
    let self = this;
    //does target exist??

    var target =  _.find(conversation.targets, function(t){return t.id == target.id && t.targetType == target.targetType});
    if(target == undefined){
      //add to conversation list...
    }

    // if(target.targetType == self.goData.TARGETTYPE.USER){
    //   var aUsr =  _.find(conversation.targets, function(t){return t.id == target.id});
    // }else if(target.targetType == self.goData.TARGETTYPE.PATIENT){
      
    // }else{
    //   //group
    // }
    // for(var i = 0; i < conversationList.length; i++){
    //   //User, Patient, Group
    //   var reply = conversationList[i];
    //   if(reply.User != null){
    //     var aUsr =  _.find(targetList, function(t){return t.id == reply.User.UserID});
    //     if(aUsr == undefined){
    //       var tgt = self.goData.getNewMessageTarget(reply.User.UserID, reply.User.FirstName, reply.User.LastName, self.goData.TARGETTYPE.USER, reply.Id);
    //       targetList.push(tgt);
    //     }
    //   }
    //   if(reply.Patient != null){
    //     var aPat =  _.find(targetList, function(t){return t.id == reply.Patient.PatientID});
    //     if(aPat == undefined){
    //       var tgt = self.goData.getNewMessageTarget(reply.Patient.PatientID, reply.Patient.NameFirst, reply.Patient.NameLast, self.goData.TARGETTYPE.PATIENT, reply.Id, reply.Patient.Photo);
    //       targetList.push(tgt);
    //     }
    //   }
    //   if(reply.Group != null){
    //     var aGrp =  _.find(targetList, function(t){return t.id == reply.Group.GroupID});
    //     if(aGrp == undefined){
    //       var tgt = self.goData.getNewMessageTarget(reply.Group.GroupID, reply.Group.GroupName, null, self.goData.TARGETTYPE.GROUP, reply.Id);
    //       targetList.push(tgt);
    //     }
    //   }

    //add to targets...
  }

  addToResults(_message, conversation, resultsArray){

    // var conversation={
    //   messages: messageList,
    //   targets: targetList.Targets,
    //   id: targetList.ConversationId
    // }


    var self = this;

    var date = self.helper.getISODateToFormat(_message.ReplyDateCreated, "MM/DD/YYYY");

    //tasks for conversation....
    var conversationTasks = [];

    //get targetList...
    var targets =  self.getTargetListFromConversationList(conversation.targets);

    //do we have a patient in targetList???
    var targetPatient = _.find(targets, function(p){return p.targetType == 'patient'});

    //create new message...
    var aPatientId = targetPatient != undefined ? targetPatient.id : null;

    var aMessage = new message(aPatientId, date, _message, targets);

    //check if this is a Task-based conversation, if so get a bogus conversation id for it...
    if(aMessage.id == undefined){
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      aMessage.id = array[0];
    }

    //who is the subject???
    aMessage.subjectName = self.getMessageSubject(aMessage);

    resultsArray.push(aMessage);

    //list of replies AND conversation tasks...
    var replyList = conversation;//conversationList[index];

    var objectsForBubbles = replyList.messages;//.concat(conversationTasks);

    //sort...
    objectsForBubbles = _.orderBy(objectsForBubbles, 'ReplyDateCreated','asc');



    for(var r = 0; r < objectsForBubbles.length; r++){
      var rep = objectsForBubbles[r];
      //create bubbles...
      //what is this?
      if(rep.hasOwnProperty('ReplyID')){
        //od_message_reply...
        var aBubble = self.getNewBubbleWithReply(rep, aMessage);
        //update message with most recent reply....
        aMessage.detail = rep.Reply;
        if(rep.ReplyDateCreated != null){
          aMessage.setDate(rep.ReplyDateCreated);
        }

        //if most recent reply is NOT logged in user, we havent READ message...
        aMessage.read = aBubble.isSender ? true : false;

        aMessage.bubbles.push(aBubble);
      }else{
        //task...
        var taskBubble = self.getNewBubbleWithTask(rep, aMessage);
        aMessage.detail = rep.Description;
        if(rep.DateModified != null) {
          aMessage.setDate(rep.DateModified);
        }

        //if most recent reply is NOT logged in user, we havent READ message...
        aMessage.read = taskBubble.isSender ? true : false;

        aMessage.bubbles.push(taskBubble);
      }
    }
  }



  getConversationTargetsWithTask(task, originalConversation, optionalIndex, callback){
    var self = this;
    self.goData.getUser(task.CreatedByID, function(usr){

      var conversationTarget={
        'ConversationId':0,
        'User': usr
      }

      var result =[];
      result.push(conversationTarget);

      callback(result, optionalIndex, originalConversation);
    });
    // aMsg, function(res, index, originalConversationResult){
  }




  getTargetListFromConversationList(conversationList){
    var self = this;
    var targetList = [];

    //data = _.filter(data, function(c){return c.ConversationID == conversationId});

    for(var i = 0; i < conversationList.length; i++){
      //User, Patient, Group
      var reply = conversationList[i];
      if(reply.User != null){
        var aUsr =  _.find(targetList, function(t){return t.id == reply.User.UserID});
        if(aUsr == undefined){
          var tgt = self.goData.getNewMessageTarget(reply.User.UserID, reply.User.FirstName, reply.User.LastName, self.goData.TARGETTYPE.USER, reply.Id);
          targetList.push(tgt);
        }
      }
      if(reply.Patient != null){
        var aPat =  _.find(targetList, function(t){return t.id == reply.Patient.PatientID});
        if(aPat == undefined){
          var tgt = self.goData.getNewMessageTarget(reply.Patient.PatientID, reply.Patient.NameFirst, reply.Patient.NameLast, self.goData.TARGETTYPE.PATIENT, reply.Id, reply.Patient.Photo);
          targetList.push(tgt);
        }
      }
      if(reply.Group != null){
        var aGrp =  _.find(targetList, function(t){return t.id == reply.Group.GroupID});
        if(aGrp == undefined){
          var tgt = self.goData.getNewMessageTarget(reply.Group.GroupID, reply.Group.GroupName, null, self.goData.TARGETTYPE.GROUP, reply.Id);
          targetList.push(tgt);
        }
      }
    }

    return targetList;
  }

  getNewBubbleWithTask(OD_Task, message){

    var self = this;

    var tsk = OD_Task;
    //create bubbles...
    var bubbleDate =  self.helper.getISODateToFormat(tsk.DateModified, "MMM D, YYYY, h:mm a");

    //check for sender...
    var isSender = self.checkIsTaskSender(tsk);

    //new bubble...
    var aBubble = new bubble(tsk.Description, isSender, tsk, bubbleDate);

    //color from priority...
    if(OD_Task.Priority == 'Med'){
      aBubble.color = '#ffc107;'
      aBubble.textColor = 'black';
    }
    if(OD_Task.Priority == 'High'){
      aBubble.color = '#dc3545';
    }
    // if(OD_Task.Priority == 'Low'){
    //
    // }

    //is this a task???
    aBubble.isTask = true;

    //launchable???
    var launchable = self.taskHelper.canOpen(tsk.TypeID);
    if(launchable != undefined){
      aBubble.canLaunchTask = true;
    }

    //do we display date???
    var foundDate = _.find(message.bubbles, function(b){
      return b.date == bubbleDate;
    });

    if(foundDate != undefined){
      aBubble.displayDate = false;
    }
    return aBubble;
  }

  getNewBubbleWithReply(OD_Message_Reply, message, isSenderOverride){

    var self = this;

    var rep = OD_Message_Reply;
    //create bubbles...
    var bubbleDate =  self.helper.getISODateToFormat(rep.ReplyDateCreated, "MMM D, YYYY, h:mm a");

    //check for sender...
    var isSender = isSenderOverride != undefined ? isSenderOverride : self.checkIsSender(rep);

    //new bubble...
    var aBubble = new bubble(rep.Reply, isSender, rep, bubbleDate);

    //is this a task???
    aBubble.isTask = false;

    //do we display date???
    var foundDate = _.find(message.bubbles, function(b){
      return b.date == bubbleDate;
    });

    if(foundDate != undefined){
      aBubble.displayDate = false;
    }
    return aBubble;
  }

  getNewBubble(detail, message){

    var self = this;

    var rep = null;
    //create bubbles...
    var bubbleDate =  moment().format("MMM D, YYYY, h:mm a");

    //check for sender...
    var isSender = true;

    //new bubble...
    var aBubble = new bubble(detail, isSender, rep, bubbleDate);

    //is this a task???
    aBubble.isTask = false;

    //do we display date???
    var foundDate = _.find(message.bubbles, function(b){
      return b.date == bubbleDate;
    });

    if(foundDate != undefined){
      aBubble.displayDate = false;
    }
    return aBubble;
  }

  getMessageSubject(msg){

    var self = this;

    //try get subject name from targetList,
    //else get it from Subject properties
    if(msg.hasOwnProperty('targetList')){

      var finalListToCheck=[];
      //IF we have more than 1 in target list, remove current user from results...

      finalListToCheck = _.reject(msg.targetList, function(u){return u.targetType == self.goData.TARGETTYPE.USER && u.id == self.helper._user.UserID});

      //if more than one target, concat targets FIRST NAME only...
      if(finalListToCheck.length > 1){
        var concatTargets = '';
        for(var i = 0; i < finalListToCheck.length; i++){
          var target = finalListToCheck[i];
          //comma or &???
          let spacer = ', ';
          if(i == finalListToCheck.length - 2){
            spacer = ' & '
          }
          concatTargets = concatTargets.concat(target.firstName + spacer);
        }
        concatTargets = concatTargets.substr(0, concatTargets.length - 2);
        return  concatTargets;
      }else if(finalListToCheck.length == 1){
        return  finalListToCheck[0].firstName + " " + finalListToCheck[0].lastName;
      }
      else{
        return "";
      }
    }
  }

  checkIsTaskSender(OD_Task){
    var self = this;
    var isSender =false;
    if( OD_Task.CreatedByID != null){
      //what sender type???
      isSender = OD_Task.CreatedByID == self.helper._user.UserID ? true : false;
      // }else if(aMsg.SenderType == 'GROUP'){
      //
      // }else{
      //   //patient...
      // }
    }else{
      isSender = false;
    }

    return isSender;
  }

  checkIsSender(conversationResult){
    let self = this;
    let isSender =false;

    // if(conversationResult.User != null){
    //   isSender = conversationResult.User.UserID == self.helper._user.UserID ? true : false;
    // }else{
    //   isSender = false;
    // }

    return conversationResult.SenderUserID == self.helper._user.UserID ? true : false;
  }

  selectMessage(message){
    var self = this;
    for(var i = 0; i < self.filteredMessages.length; i++){
      if(self.filteredMessages[i].id == message.id){
        self.filteredMessages[i].selected = true;
      }else{
        self.filteredMessages[i].selected = false;
      }
    }
  }

  messageButtonClick(){
    var self = this;
    if(self.displayToBar){
      //hide search bar when we click send button...
      self.toggleToBar();
      //update current message conversation info...

      self.currentMessage.date = moment().format("MM/DD/YYYY");
      self.currentMessage.selected = true;
      self.currentMessage.detail = self.messageText;
      self.currentMessage.subjectName = self.getMessageSubject(self.currentMessage);

    }

    self.addConversation(function(res){

      if(res == null)return;

      //send bubble message...
      self.addMessage();
    });
  }

  addConversation(callback){

    var self = this;

    //do we have targets???
    if(self.currentMessage.targetList.length == 0)
    {
      callback(null);
      return;
    }

    //does the conversation need to be created???
    if(self.currentMessage.id != 0){
      callback(self.currentMessage);
      return;
    }

    //create new conversation...
    var OD_Message_Conversation={
      "ConversationID": self.currentMessage.id,
      'DateCreated': moment().format('MM/DD/YYYY'),
      // 'AuthorUserId': self.helper._user.UserID,
      // 'AuthorGroupId': null,
      // 'AuthorPatientId': null,
      // 'SubjectUserId': null,
      // 'SubjectGroupId': null,
      // 'SubjectPatientId': null,
      'NotifyPatient': false,
      'NotifyResponsible': false,
      'Status': 'UNREAD',
      // 'PatientID': '.............'
    }

    //who is the target???
    // var firstTarget = self.currentMessage.targetList[0];
    // if(firstTarget.isPatient){
    //   OD_Message_Conversation.SubjectPatientId=firstTarget.id;
    //   OD_Message_Conversation.NotifyPatient = true;
    // }else{
    //   OD_Message_Conversation.SubjectUserId=firstTarget.id;
    // }

    var url = 'message/new'
    self.http.post(self.helper.getApiUrl(url), OD_Message_Conversation, (messageRes) => {

      self.currentMessage.id = messageRes.ConversationID;

      //add current user to targetList....
      var usrTarget = self.goData.getNewMessageTarget(self.helper._user.UserID,"","",self.goData.TARGETTYPE.USER, 0);
      self.currentMessage.targetList.push(usrTarget);


      //save targets...
      var tUrl = 'targets/new';
      var tObj=[];
      for(var t = 0; t < self.currentMessage.targetList.length; t++){
        var aTarget=self.currentMessage.targetList[t];
        var newTarget={
          'Id':0,
          'ConversationId': messageRes.ConversationID,
          'UserId':null,
          'GroupId':null,
          'PatientId':null
        }
        if(aTarget.targetType == self.goData.TARGETTYPE.USER){
          newTarget.UserId = aTarget.id;
        }
        if(aTarget.targetType == self.goData.TARGETTYPE.PATIENT){
          newTarget.PatientId = aTarget.id;
        }
        if(aTarget.targetType == self.goData.TARGETTYPE.GROUP){
          newTarget.GroupId = aTarget.id;
        }
        tObj.push(newTarget);
      }

      self.http.post(self.helper.getApiUrl(tUrl),JSON.stringify(tObj), function (res) {

        //update target ids...
        self.updateCurrentMessageTargetIdsWithPostResult(res, self.currentMessage.targetList);

        //update img / alt...
        self.currentMessage.setImageAlt();

        //add message to list...
        self.filteredMessages.splice(0, 0, self.currentMessage);
        self.selectMessage(self.currentMessage);
        callback(self.currentMessage);

      },{ contentType: "application/json" },
      function(err){
        var e = 'oops';
      });
    });
  }

  updateCurrentMessageTargetIdsWithPostResult(result, targetlist){
    for(var i = 0; i < result.length; i++){
      var aRes = result[i];
      //what typeis it?
      var tType = null;
      var searchId = null;
      if(aRes.UserId != null){
        tType = this.goData.TARGETTYPE.USER;
        searchId = aRes.UserId;
      }else if(aRes.PatientId != null){
        tType = this.goData.TARGETTYPE.PATIENT;
        searchId = aRes.PatientId;
      }else{
        tType = this.goData.TARGETTYPE.GROUP;
        searchId = aRes.GroupId;
      }

      //find associated targetList item...
      var targetToUpdate = _.find(targetlist, function(t){return t.id == searchId && t.targetType == tType});
      targetToUpdate.targetId = aRes.Id;

    }
  }


  addMessage(){
    var self  =this;
    if(self.messageText != null && self.currentMessage != null){

      //get sender...
      var sender = _.find(self.currentMessage.targetList, function(s){return s.id == self.helper._user.UserID && s.targetType == self.goData.TARGETTYPE.USER});

      //create new reply...
      var reply={
        "ReplyID":0,
        "ConversationID": self.currentMessage.id,
        'Reply': self.messageText,
        'PatientReply': 0,
        'DateCreated': moment().format(),
        'IsSecure': null,
        'SenderId': sender.targetId
        // 'TaskID': null,
        // 'AuthorUserId': self.helper._user.UserID,
        // 'AuthorGroupId': null,
        // 'AuthorPatientId': null
      }

      //save reply...
      var url = 'message/reply'
      self.http.post(self.helper.getApiUrl(url), reply, (returnData) => {
        if(returnData != null){
          //add new bubble to conversation...

          //update conversation date...
          //self.currentMessage.date = self.helper.getISODateToFormat(returnData.DateCreated, "MM/DD/YYYY");

          self.currentMessage.setDate(returnData.DateCreated);

          var newBubble = self.getNewBubbleWithReply(returnData, self.currentMessage, true);
          self.currentMessage.bubbles.push(newBubble);

          //update current message...
          self.currentMessage.detail = newBubble.description;

          self.currentMessage.read = newBubble.isSender ? true : false;

          self.messageText = "";//clear out message text

          self.sortFilteredMessagesByNewest();

          //this.scrollTop = this.bubbleFrame.clientHeight;

          //send email alert to patient...
          var reciever = _.find(self.currentMessage.targetList, function(s){return s.targetType.toLowerCase() == 'patient'});
          if(reciever){
            let msgUrl = `patientportal/sendmessageemail?patientId=${reciever.id}`;
            self.http.getWithUrl(msgUrl, function(messageRes){

            });
          }

        }else{
          alert('Reply not created');
        }

      }, null, (error) => {
        alert(error.responseText);
      });

    }
  }

  sortFilteredMessagesByNewest(){
    var self = this;
    var orderedMessages = _.orderBy(self.filteredMessages, 'sortdate', 'desc');
    self.filteredMessages = orderedMessages;
  }

  newConversation(){
    var self = this;
    self.currentMessage = new message(null, null, {"ConversationID": 0}, null);
    self.toggleToBar();
  }

  toggleToBar(){
    var self = this;
    self.displayToBar = self.displayToBar ? false : true;
    var height = 62;
    if(self.displayToBar){
      self.detailHeight = self.ogDetailHeight - height;
    }else{
      self.detailHeight = self.ogDetailHeight;
    }
  }

  setDetailHeight(height){
    var self = this;
    self.detailHeight = height;
  }

  cancelTobar(){
    var self = this;
    self.toggleToBar();
    self.currentMessage = self.filteredMessages.length > 0 ? self.filteredMessages[0] : null;
  }

  userSearchClick(){
    var self = this;
    self.popHelper.openUserSearchPop(function(res){

    });
  }


  setDisplayInfo(displayType){
    var self = this;
    self.displayText = displayType;
    if(displayType == 'Tasks'){
      self.displayIcon = 'fa-thumb-tack';
      self.showTasks = true;
      self.showArchive = false;
      self.showMessages = false;
    }
    if(displayType == 'Messages'){
      self.displayIcon = 'fa-message';
      self.showTasks = false;
      self.showArchive = false;
      self.showMessages = true;
    }
    if(displayType == 'Archive'){
      self.displayIcon = 'fa-archive';
      self.showTasks = false;
      self.showArchive = true;
      self.showMessages = false;
    }
  }


  toggleTaskClick(){
    var self = this;
    self.displayMessageTasks = self.displayMessageTasks ? false : true;

    self.taskHelper.displayTaskOrMessage = self.displayMessageTasks ? 'Tasks' : 'Messages';

    if(this.displayMessageTasks){
      //show tasks...
      self.filteredMessages = self.taskResults;
      self.setDisplayInfo('Tasks');

    }else{
      //show messages...
      let targetType = self.filterMessagesByUser ? self.goData.TARGETTYPE.USER : self.goData.TARGETTYPE.PATIENT;
      self.filteredMessages = self.getMessageResultsWithTargetType(targetType);

     // self.filteredMessages = self.messageResults;
      self.setDisplayInfo('Messages');
    }

    //set current message....
    //is there a message already selected???
    var selectedMEssage = _.find(self.filteredMessages, function(m){return m.selected});
    if(selectedMEssage){
      self.currentMessage = selectedMEssage;
    }else{
      self.currentMessage = self.filteredMessages.length > 0 ? self.filteredMessages[0] : null;
      if(self.currentMessage != null){
        self.currentMessage.selected = true;
      }
    }

    self.scrollLastBubbleIntoView();
  }


  close(){
    let self = this;
    self.dialogController.close(true, {'taskToOpen': self.launchPatientId });
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }

  launchTask(bubble, e){
    var self = this;
    if(bubble.isTask && bubble.canLaunchTask){
      this.dialogController.close(true, {'taskToOpen': bubble.data });
    }
  }

  addToUpdate(task){
    var index =  _.findIndex(this.tasksToUpdate, function(o) { return o.TaskID == task.id; });
    if(index == -1){
      this.tasksToUpdate.push(task.data);
    }else{
      this.tasksToUpdate.splice(index, 1, task.data);
    }
  }


  saveAndClose(){
    var self = this;

    //stop refresh timer...
    clearInterval(self.refreshTimer);
    //self.refreshTimer.clearInterval();

    //self.saveTasks(function (res) {
      self.close();
    //});
  }

  saveTasks(callback){
    let self = this;

    if(self.tasksToUpdate.length == 0){
      callback();
      return;
    }

    let url = "tasks";

    var toUpdate = {
      'tasks' : []
    }

    for(var i = 0; i < self.tasksToUpdate.length; i++){
      var aTask = {
        'Id': self.tasksToUpdate[i].TaskID,
        'Description': self.tasksToUpdate[i].Description,
        'Status': self.tasksToUpdate[i].Status,
        'AssignedToID': self.tasksToUpdate[i].AssignedToID
      };
      toUpdate.tasks.push(aTask);
    }

    self.http.put(self.helper.getApiUrl(url), toUpdate, function (res) {
      if(callback != undefined && callback != null){
        callback(res);
      }
      //clear out tasks on success...
      self.tasksToUpdate = [];
    }, function(err){
      if(callback != undefined && callback != null){
        callback(err);
      }
    });
  }

  activate(obj){
    let self = this;

    //self.providerId = obj.providerId;
    self.popHelper = obj.popupHelper;
    self.popupWidth = obj.popupWidth * .8;
    self.popupHeight = (obj.popupHeight - 75) * .8;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;
    self.bodyHeight = self.popupHeight - 62;

    self.home = obj.home;

    // self.selectedUserId = self.helper._user.UserID;
    // self.selectedUserName = self.helper._user.UserName;

    if(self.taskHelper.filterUserId == 0){
      self.taskHelper.filterUserId = self.helper._user.UserID;
      self.taskHelper.filterUserName = self.helper._user.UserName;
    }

    self.filterMessagesByUser = self.taskHelper.filterPatientOrUser == 'patient' ? false : true;

    self.displayMessageTasks = self.taskHelper.displayTaskOrMessage == 'Tasks' ? true : false;
    self.setDisplayInfo(self.taskHelper.displayTaskOrMessage);


    self.loadMessages(self.taskHelper.filterUserId, true, function(res){


      window.setTimeout(function(){
        if(self.taskHelper.search.length > 0){
          let event = {target:{
            value: self.taskHelper.search.toLowerCase()
          }}
          self.filter(event);
        }
      },500);

      // if(self.taskHelper.search.length > 0){
      //   let event = {target:{
      //     value: self.taskHelper.search.toLowerCase()
      //   }}
      //   self.filter(event);
      // }

    });

    // self.refreshTimer = window.setInterval(function(){

    //   //dont refresh messages if we are creating a new one (toBar is displayed)...
    //   if(!self.displayToBar){
    //     self.loadMessages.call(self, self.selectedUserId);
    //   }
    // }, 60000);

    self.goData.getProviders(false, function(pros){
      self.providerList = pros;
    })

    self.goData.getAllUsers(function(usrs){
      self.userList = usrs;//_.sortBy(usrs, 'UserName');// usrs;
      self.filteredUserList = self.userList;
    })

  }


  filterByProvider(provider){

    let self = this;
    self.taskHelper.filterUserId = provider.UserID;
    self.taskHelper.filterUserName = provider.ProviderEntity;
    // this.selectedUserId = provider.UserID;
    // this.selectedUserName = provider.ProviderEntity;
    this.loadMessages(provider.UserID);
  }

  filterByUser(user){
    let self = this;
    // this.selectedUserId = user.UserID;
    // this.selectedUserName = user.UserName;
    self.taskHelper.filterUserId = user.UserID;
    self.taskHelper.filterUserName = user.UserName;
    this.loadMessages(user.UserID);
  }

  loadMessages(userId, loadAll, callback){
    var self = this;
    if(!self.displayMessageTasks || loadAll != undefined){
      self.getMessagesByUserId(userId, function(res){
        //order message results by date...
        var orderedMessages = _.orderBy(res, 'sortdate', 'desc');

        if(self.showMessages){
          self.messageResults = orderedMessages;
        }else{
          self.archivedMessageResults = orderedMessages;
        }

        if(!self.displayMessageTasks) {
          if(self.showMessages){

            let targetType = self.filterMessagesByUser ? self.goData.TARGETTYPE.USER : self.goData.TARGETTYPE.PATIENT;
            self.filteredMessages = self.getMessageResultsWithTargetType(targetType);

            //self.filteredMessages = self.messageResults;
          }else{
            self.filteredMessages = self.archivedMessageResults;
          }

          if(self.filteredMessages.length > 0){
            self.currentMessage = self.filteredMessages[0];
            self.currentMessage.selected = true;
            if(callback){
              callback(self.currentMessage);
            }
          }else{
            self.currentMessage = null;
            if(callback){
              callback(self.currentMessage);
            }
          }
        }
      });
    }
    if(self.displayMessageTasks || loadAll != undefined){
      self.getTasksWithUserId(userId, undefined, function(res){
        var orderedTasks = _.orderBy(res, 'sortdate', 'desc');
        self.taskResults = orderedTasks;

        if(self.displayMessageTasks){
          self.filteredMessages = self.taskResults;
          if(self.filteredMessages.length > 0){
            self.currentMessage = self.filteredMessages[0];
            self.currentMessage.selected = true;
            if(callback){
              callback(self.currentMessage);
            }
          }else{
            self.currentMessage = null;
            if(callback){
              callback(self.currentMessage);
            }
          }
        }
      });
    }
  }

  attached(){
    var self = this;
     var res = $(this.taskdialog).closest('ux-dialog-container');
     var uxDx = res[0];
     uxDx.style.setProperty("z-index", "2001", "important");

    self.gridHeight = self.popupHeight - (self.messagetoolbar.clientHeight + self.messageheader.clientHeight + 4);
    self.ogDetailHeight = self.gridHeight -11;
    self.detailHeight = self.ogDetailHeight;
  }

  setStatus(task, status){
    task.data.Status = status;
    this.addToUpdate(task);
  }

  toggleFilterStatus(){
    var self = this;
    self.filterStatus = self.filterStatus == 'assigned' ? 'completed' : 'assigned';
    self.refreshFilteredTasks(self.filterStatus);
  }

  refreshFilteredTasks(status){
    var self = this;
    var tStatus = status == undefined ? 'assigned' : self.filterStatus;
    var filtered = _.filter(self.messageResults, function(t){ return t.data.Status.toLowerCase() == tStatus; });
    self.filteredMessages = filtered;
  }

  setDescription(task){
    //task.data.Description = description;
    this.addToUpdate(task);
  }

   getElementoffset(el) {
    var rect = el.getBoundingClientRect(),
      scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
      scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return { top: rect.top + scrollTop, left: rect.left + scrollLeft }
  }

  completeTask(OD_task, event) {
    var self = this;

    //set task to COMPLETE...
    OD_task.Status = 'COMPLETED';

    self.goData.updateTask(OD_task, function (res) {

      if(res != null){
        //on success, remove task from conversation...
        self.currentMessage.removeBubbleWithId(res.TaskID);
      }
    });

    event.stopPropagation();//stop from launching task...
  }


  forwardTask(bubble, event){
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth / 2;

    var self = this;

    self.popHelper.openTaskPop(null,null,null, null, null, self.home,
      function (res) {
        var doSomething = res;
        if(res != null){
          //remove bubble from conversatiopn...
          self.currentMessage.removeBubbleWithId(bubble.data.TaskID);
        }
      },
      bubble.data);

    event.stopPropagation();//stop from launching task...
  }

  // getTaskByUserId(){
  //   var self = this;
  //   self.messageResults=[];
  //   self.filteredMessages=[];
  //   var url = 'tasks?userId='+self.helper._user.UserID;
  //   self.http.get(self.helper.getApiUrl(url), function (res) {
  //
  //     for(var i = 0; i < res.length; i++){
  //       var aTask = res[i];
  //       var date = self.helper.getISODateToFormat(aTask.DateCreated, "MM/DD/YYYY");
  //       self.messageResults.push(new OD_Task(aTask.TaskID, date, aTask));
  //     }
  //
  //     //display ONLY assigned...
  //     self.refreshFilteredTasks('assigned');
  //   });
  // }

  rowClicked(r){
    this.selectedTask = r;
    for(var i = 0; i < this.filteredMessages.length; i++){
      if(this.filteredMessages[i].id == r.id){
        this.filteredMessages[i].selected = true;
      }else{
        this.filteredMessages[i].selected = false;
      }
    }
  }

  messageClicked(r){
    this.currentMessage = r;
    for(var i = 0; i < this.filteredMessages.length; i++){
      if(this.filteredMessages[i].id == r.id){
        this.filteredMessages[i].selected = true;
      }else{
        this.filteredMessages[i].selected = false;
      }
    }

    //this.scrollTop = this.bubbleFrame.clientHeight;
    this.scrollLastBubbleIntoView();

  }

}
