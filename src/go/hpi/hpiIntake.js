import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Home} from '../home';
import {Data} from '../../data/go/data';
import * as _ from 'lodash';
import {EventAggregator} from 'aurelia-event-aggregator';
import {observable} from "aurelia-binding";
import moment from 'moment';

class hpiObject{
  constructor(){
    this.sections=[];
  }
  addSection(s){
    let id = this.sections.length + 1;
    s.id = id;
    this.sections.push(s);
  }
}

class Section{
  constructor(description){
    this.description = description;
    this.detail="";
    this.groups=[];
    this.selected = false;
    this.id=0;
    this.groupIndex = 0;
    this.displayFirstGroupOnly=false;
  }

  addGroup(group){
    this.groups.push(group);
  }

  insertGroup(group, index){
    this.groups.splice(index, 0, group);
  }

  deselectGroups(){
    for(let i = 0; i < this.groups.length; i++){
      this.groups[i].selected = false;
      this.groups[i].displayInNavigation = false;
    }
  }

  select(){
    this.selected = true;
    for(let g = 0; g < this.groups.length; g++){
      let aGroup = this.groups[g];

      if(!aGroup.suppressNavigation){
        if(this.displayFirstGroupOnly){
          if(g == 0){
            aGroup.displayInNavigation = true;
          }else{
            aGroup.displayInNavigation = false;
          }
        }
        if(!this.displayFirstGroupOnly){
          aGroup.displayInNavigation = true;
        }
      }


      // if(g == 0){
      if(g == this.groupIndex){
        aGroup.selected = true;
        aGroup.visible = true;
      }
    }
  }

  selectGroupWithIndex(index){
    for(let i = 0; i < this.groups.length; i++){
      if(index == i){
        this.groups[i].selected = true;
        this.groups[i].visible = true;
        this.groupIndex = index;
      }else{
        this.groups[i].selected = false;
        this.groups[i].visible = false;
      }
    }
  }

  nextGroup(displayFirstOnly){
    let aIndex = this.groupIndex + 1;
    if(aIndex <= this.groups.length - 1){
      this.groupIndex++;
      for(let g = 0; g < this.groups.length; g++){

        if(!displayFirstOnly){
          this.groups[g].displayInNavigation = true;
        }else{
          if(g == 0){
            this.groups[g].displayInNavigation = true;
          }
        }

        if(g == this.groupIndex){
          this.groups[g].selected = true;
          this.groups[g].visible = true;
        }else{
          this.groups[g].selected = false;
          this.groups[g].visible = false;
        }
      }
    }
  }

  previousGroup(displayFirstOnly){
    let aIndex = this.groupIndex - 1;
    if(aIndex >= 0){
      this.groupIndex--;
      for(let g = 0; g < this.groups.length; g++){

        if(!displayFirstOnly){
          this.groups[g].displayInNavigation = true;
        }else{
          if(g == 0){
            this.groups[g].displayInNavigation = true;
          }
        }

        if(g == this.groupIndex){
          this.groups[g].selected = true;
          this.groups[g].visible = true;
        }else{
          this.groups[g].selected = false;
          this.groups[g].visible = false;
        }
      }
    }
  }

}

class Group{
  constructor(description){
    this.description = description;
    this.details="";
    this.items=[];
    this.visible = false;
    this.cols = 1;
    this.selected = false;
    this.displayInNavigation=false;
    this.suppressNavigation = false;
    this.stringBuilder=null;
    this.isAppender = false;
    this.prependingText="";
    this.postAppendMethod=null;
  }

  buildString(intake){

    if(this.stringBuilder != null){
      if(this.items[0].isCalendar ||
        this.description == 'Quality' ||
        this.description == 'Frequency' ||
        this.description == "Pain" ||
        this.description == 'Swelling'){
        return this.stringBuilder(intake);
      }else{
        return this.stringBuilder(this);
      }
    }

    return "";
  }

  addItem(item){
    this.items.push(item);
  }
}


class item{
  constructor(object){
    this.object = object;
    this.isCheckbox = true;
    this.isCalendar =false;
    this.detail="";
  }
}

class PicklistItem{
  constructor(data, options, value, editing){
    this.name = data.ColumnFriendlyName;
    this.options=options;
    this.selectedOption= value ? value : null;
    this.data = data;
    this.visible = value ? true : false;
    this.editing = editing ? editing : false;
  }
}

class HistoryButton{

  @observable selected;

  constructor(name, data, visible, editing){
    this.name = name;
    this.data = data;
    this.selected = false;
    this.visible = visible == undefined ? false : visible;
    this.editing = editing ? editing : false;
    this.callback=null;
    this.exclusive = false;
    this.exclusiveText = "";
    this.makeLowercase = true;
  }

  select(item, intake, section, group){
    this.selected = this.selected ? false : true;
    if(this.callback != null){
      this.callback();
    }

    intake.buildHpiText();
  }

  selectedChanged(newvalue, oldvalue){
    let v = newvalue;
  }
}



@inject(helper,http, Data, Home, EventAggregator)
export class HpiIntake {


  @bindable onsetdatepicker;
  @observable onsetdate;

  onsetdateChanged(newvalue, oldvalue){
    this.buildHpiText();
  }

  hpiObject = new hpiObject();

  currentSection=null;

  sectionIndex = 0;

  bodyHeight;

  nextButtonDescription='Next';

  hpitext="";
  initialHpiText="";

  // hpitextChanged(newvalue, oldvalue){
  //   this.mytextarea.scrollTop = this.mytextarea.scrollHeight;
  // }

  parent;

  patient;

  constructor(helper, http, Data, Home, EventAggregator) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.event = EventAggregator;
  }

  activate(model){
    let self = this;
    self.parent = model;

    self.initialHpiText = model.hpiText;
    self.hpitext = model.hpiText;

    self.patient = self.parent.home.patient.data;

    // self.event.subscribe("historyEdit", function(editing){
    //   self.setEditing(editing);
    // });
  }

  attached(){
    let self = this;

     $('ux-dialog-body').css('padding-bottom', 0);

    //get dialog header height...
    // let totalPopupContent = $('ux-dialog-header').height();
    let totalPopupContent = self.hpiHeader.clientHeight;
    //add top padding...
    totalPopupContent += 18;
    //get intakebody height...
    let tBodyHeight = self.intakebody.clientHeight;
    let footerHeight = self.footer.clientHeight;
    totalPopupContent += tBodyHeight;
    totalPopupContent += footerHeight;
    //totalPopupContent += 32//more padding...

    //get popup height...
    let popupHeight = $('ux-dialog').height();

    //subtract totalPopupContent from popupHeight
    let heightToAdd = popupHeight - totalPopupContent;

    self.bodyHeight = tBodyHeight + heightToAdd;

    self.setupHpiObject();

  }

  getCommaAndWithItems(group){
    let str = "";

    for(let i = 0 ; i < group.items.length; i++){
      let itm = group.items[i];
      if(itm.object != undefined && itm.object.selected){

        //check for exclusivity...
        if(itm.object.exclusive){
          str = itm.object.exclusiveText;
          return str;
        }

        var itemName = itm.object.makeLowercase ? itm.object.name.toLowerCase() : itm.object.name;

        // str = str.concat(itm.object.name, ", ");
        str = str.concat(itemName, ", ");
      }
    }

    //trim last comma and space...
    str = str.trim();
    str = str.substr(0, str.length - 1);

    //replace last comma w/ 'and'...
    let lastCommaIndex = str.lastIndexOf(',');
    if(lastCommaIndex > -1){
      let startStr = str.substr(0, lastCommaIndex);
      let endStr = str.substr(lastCommaIndex + 2, str.length);
      str = startStr + ' and ' + endStr;
    }
    return str;
  }

  checkForExclusivityInGroup(group){
    return _.find(group.items, function(i){return i.object.exclusive && i.object.selected}) ? true : false;
  }

  buildStringWithGroup(group){
    let str = this.getCommaAndWithItems(group);//.toLowerCase();
    if(str.length > 0){
      let final = "";
      let isExclusive = this.checkForExclusivityInGroup(group);

      if(isExclusive){
        return str;
      }else if(group.prependingText.length > 0){
        final = group.prependingText;
      }

      // return  final + this.getCommaAndWithItems(group).toLowerCase() + ". ";
      return  final + this.getCommaAndWithItems(group) + ". ";
    }
    return "";
  }


  buildHpiText(){
    let self = this;
    self.hpitext = "";

    self.hpitext = self.getPatientInfo();

    for(let s = 0; s < self.hpiObject.sections.length; s++){
      let section = self.hpiObject.sections[s];
      for(let g = 0; g < section.groups.length; g++){
        let group = section.groups[g];
        let txtString = group.buildString(self);
        if(group.isAppender && txtString.length > 0){
          //remove previous period...
          self.hpitext = self.hpitext.substr(0, self.hpitext.length - 2) + " ";
        }

        if(group.postAppendMethod != null){
          let str = group.postAppendMethod(self, txtString);
          if(str.length > 0){
            self.hpitext = str;
          }
        }else{
          self.hpitext += txtString;
        }
      }
    }

    self.hpitext = self.initialHpiText.trimEnd() + " " + self.hpitext;

    setTimeout(self.updateTextareaScroll.bind(self), 100);
  }

  buildHpiText2(){
    let self = this;
    self.hpitext = "";

    self.hpitext = self.getPatientInfo();

    for(let s = 0; s < self.hpiObject.sections.length; s++){
      let section = self.hpiObject.sections[s];
      for(let g = 0; g < section.groups.length; g++){
        let group = section.groups[g];
        let txtString = group.buildString(self);
        if(group.isAppender && txtString.length > 0){
          //remove previous period...
          self.hpitext = self.hpitext.substr(0, self.hpitext.length - 2) + " ";
        }

        if(group.postAppendMethod != null){
          let str = group.postAppendMethod(self, txtString);
          if(str.length > 0){
            self.hpitext = str;
          }
        }else{
          self.hpitext += txtString;
        }
      }
    }
    setTimeout(self.updateTextareaScroll.bind(self), 100);
  }

  buildOnsetString(group){
    //what was selected???
    if(group.items[0].object.selected == true){
      //YES
      return `The onset was sudden with injury. `;
    }else if(group.items[1].object.selected == true){
      //NO
      return  `The onset was gradual without injury. `;
    }else{
      return '';
    }
  }

  buildSwellingString(intake) {
    let bpSection = _.find(intake.hpiObject.sections, function (s) {
      return s.description == 'Body Part(s)'
    });
    let bpGroup = bpSection.groups[0];
    let bpStr = intake.getCommaAndWithItems(bpGroup).toLowerCase();

    let finalStr = "";

    if (bpStr.length > 0) {
      finalStr = "The " + bpStr + " ";
    }else{
      finalStr = "The injury ";
    }

    //get swelling...
    let swellingSec = _.find(intake.hpiObject.sections, function (s) {
      return s.description == 'Swelling'
    });
    let swellGrp = swellingSec.groups[0];
    let swellStr = "";
    for(let i = 0 ; i < swellGrp.items.length; i++){
      let itm = swellGrp.items[i];
      if(itm.object != undefined && itm.object.selected){
        if(itm.object.name == 'No Swelling'){
          swellStr += 'did not swell. '
          break;
        }else{
          swellStr += "swelled " + itm.object.name.toLowerCase() + ". ";
          break;
        }
      }
    }

    if(swellStr.length > 0){
      finalStr += swellStr;
      return finalStr;
    }

    return "";
  }

  buildSymptomString(intake){
    let final = ' who presents with complaints of ';
    let painSection= _.find(intake.hpiObject.sections, function(s){return s.description == 'Pain'});
    let group = painSection.groups[0];
    let str = intake.getCommaAndWithItems(group).toLowerCase();
    if(str.length > 0){
      //get bodyparts
      let bpSection = _.find(intake.hpiObject.sections, function(s){return s.description == 'Body Part(s)'});
      let bpGroup = bpSection.groups[0];
      let bpStr = intake.getCommaAndWithItems(bpGroup).toLowerCase();
      if(bpStr.length > 0){
        final += str + " pain in the "  + bpStr;
      }else{
        final += str;
      }
      return final;
    }else{
      return '';
    }
  }

  symptomsPostAppend(intake, textToAdd){
    let txt = intake.hpitext;

    if(textToAdd.length > 0){
      let sex = 'female';
      if(intake.patient.Sex.toUpperCase()=='M' ||
        intake.patient.Sex.toUpperCase() == 'MALE'){
        sex = 'male';
      }
      let indexOfSex = txt.indexOf(sex);
      let firstHalfStr = txt.substr(0, indexOfSex + sex.length);
      let lastHalfStr = txt.substr(indexOfSex + sex.length, txt.length);
      return firstHalfStr + textToAdd + lastHalfStr;

    }else{
      return "";
    }
  }

  buildFrequencyString(intake){
    let painSection= _.find(intake.hpiObject.sections, function(s){return s.description == 'Pain'});
    let freqGroup = _.find(painSection.groups, function(g){return g.description == 'Frequency'});

    let str = "";

    for(let i = 0 ; i < freqGroup.items.length; i++){
      let itm = freqGroup.items[i];
      if(itm.object != undefined && itm.object.selected){
        str = str.concat(itm.object.name.toLowerCase(), "ly, ");
      }
    }

    //trim last comma and space...
    str = str.trim();
    str = str.substr(0, str.length - 1);

    //replace last comma w/ 'and'...
    let lastCommaIndex = str.lastIndexOf(',');
    if(lastCommaIndex > -1){
      let startStr = str.substr(0, lastCommaIndex);
      let endStr = str.substr(lastCommaIndex + 2, str.length);
      str = startStr + ' and ' + endStr;
    }

    if(str.length > 0) {
      //get bodyparts
      let bpSection = _.find(intake.hpiObject.sections, function (s) {
        return s.description == 'Body Part(s)'
      });
      let bpGroup = bpSection.groups[0];
      let bpStr = intake.getCommaAndWithItems(bpGroup).toLowerCase();
      if (bpStr.length > 0) {
        return ' that occurs ' + str + ". ";
      }else{
        return  'The pain occurs ' + str + ". ";
      }
    }else{
      return "";
    }
  }

  frequencyPostAppend(intake, textToAdd){
    let txt = intake.hpitext;

    if(textToAdd.length > 0){
      let bpSection = _.find(intake.hpiObject.sections, function (s) {
        return s.description == 'Body Part(s)'
      });
      let bpGroup = bpSection.groups[0];
      //get last selected bodypart...
      let bpIndex = -1;
      for(let i = 0; i < bpGroup.items.length; i++){
        let itm= bpGroup.items[i];
        if(itm.object.selected == true){
          bpIndex = i;
        }
      }
      if(bpIndex > -1){
        let bodypart = bpGroup.items[bpIndex].object.name.toLowerCase();
        let indexOfBp = txt.indexOf(bodypart);
        let firstHalfStr = txt.substr(0, indexOfBp + bodypart.length);
        let lastHalfStr = txt.substr(indexOfBp + bodypart.length, txt.length);
        //remove period and space...
        textToAdd = textToAdd.substr(0, textToAdd.length - 2);
        return firstHalfStr + textToAdd + lastHalfStr;
      }else{
        //no bodypart selected???
        return txt + textToAdd;
      }

    }else{
      return "";
    }
  }

  buildPrevTreatmentString(group){
    let str = "";
    for(let i = 0 ; i < group.items.length; i++){
      let itm = group.items[i];
      if(itm.object != undefined && itm.object.selected){
        if(itm.object.name == 'None'){
          return "The patient has tried no previous treatments. ";
        }else{
          str = str.concat(itm.object.name.toLowerCase(), ", ");
        }
      }
    }

    //trim last comma and space...
    str = str.trim();
    str = str.substr(0, str.length - 1);

    //replace last comma w/ 'and'...
    let lastCommaIndex = str.lastIndexOf(',');
    if(lastCommaIndex > -1){
      let startStr = str.substr(0, lastCommaIndex);
      let endStr = str.substr(lastCommaIndex + 2, str.length);
      str = startStr + ' and ' + endStr;
    }

    if(str.length > 0){
      return "The patient has tried "+ str + ". ";
    }
    return str;
  }

  prevTreatmentResultPostAppend(intake, textToAdd){
    let txt = intake.hpitext;
    if(textToAdd.length > 0){
      let bpSection = _.find(intake.hpiObject.sections, function (s) {
        return s.description == 'Previous Treatments'
      });
      let bpGroup = bpSection.groups[0];
      //get last selected treatment...
      let tIndex = 0;
      for(let i = 0; i < bpGroup.items.length; i++){
        let itm= bpGroup.items[i];
        if(itm.object.selected == true){
          tIndex = i;
        }
      }
      if(tIndex > 0){
        let treatment = bpGroup.items[tIndex].object.name.toLowerCase();
        let indexOfTreat = txt.indexOf(treatment);
        let firstHalfStr = txt.substr(0, indexOfTreat + treatment.length);
        let lastHalfStr = txt.substr(indexOfTreat + treatment.length, txt.length);
        //remove period and space...
        textToAdd = textToAdd.substr(0, textToAdd.length - 2);
        return firstHalfStr +  " with " + textToAdd + lastHalfStr;
      }else{
        //NONE selected...???
      }
    }else{
      return "";
    }
  }

  severityPostAppend(intake, textToAdd){

    let txt = intake.hpitext;

    if(textToAdd.length > 0) {
      let painSection = _.find(intake.hpiObject.sections, function (s) {
        return s.description == 'Pain'
      });
      let painGrp = _.find(painSection.groups, function (s) {
        return s.description == 'Quality'
      });
      //get first severity item...
      let tIndex = -1;
      for(let i = 0; i < painGrp.items.length; i++){
        let itm= painGrp.items[i];
        if(itm.object.selected == true){
          tIndex = i;
          break;
        }
      }
      if(tIndex > -1){
        //we selected quality...
        let quality = painGrp.items[tIndex].object.name.toLowerCase();
        let indexOfQuality = txt.indexOf(quality);
        let firstHalfStr = txt.substr(0, indexOfQuality);
        let lastHalfStr = txt.substr(indexOfQuality, txt.length);
        //remove period and space...
        textToAdd = textToAdd.substr(0, textToAdd.length - 2);
        return firstHalfStr + textToAdd + " " + lastHalfStr;
      }else{
        //no quality selected...
        let final = ' who presents with complaints of ';
        //remove period and space...
        let str = textToAdd.substr(0, textToAdd.length - 2);
        //get bodyparts
        let bpSection = _.find(intake.hpiObject.sections, function(s){return s.description == 'Body Part(s)'});
        let bpGroup = bpSection.groups[0];
        let bpStr = intake.getCommaAndWithItems(bpGroup).toLowerCase();
        if(bpStr.length > 0){
          final += str + " pain in the "  + bpStr;
        }
        //find sex...
        let sex = 'female';
        if(intake.patient.Sex.toUpperCase()=='M' ||
          intake.patient.Sex.toUpperCase() == 'MALE'){
          sex = 'male';
        }
        let indexOfSex = txt.indexOf(sex);
        let firstHalfSexStr = txt.substr(0, indexOfSex + sex.length);
        let lastHalfSexStr = txt.substr(indexOfSex + sex.length, txt.length);
        return firstHalfSexStr + final + lastHalfSexStr;
      }

    }else{
      return "";
    }
  }

  buildInjuredAtString(group){
    for(let i = 0; i < group.items.length; i++){
      if(group.items[i].object.selected == true){
        let str = 'The injury occurred ';
        let item = group.items[i].object;
        if(item.name == 'Athletics'){
          str += 'during ' + item.name.toLowerCase() + '. ';

          //display athletics list...
          if(group.parentSection.groups[3].description != 'Sports'){
            group.parentSection.insertGroup(group.sportsGroup, 3);
            group.parentSection.nextGroup(false);
          }

        }else if(item.name =='Motor Vehicle Accident'){
          str += 'in a ' + item.name.toLowerCase() + '. ';
        }else{
          str += 'at ' + item.name.toLowerCase() + '. ';
        }
        return str;
      }
    }
    return "";
  }

  athleticsPostAppend(intake, textToAdd){
    let txt = intake.hpitext;

    if(textToAdd.length > 0){
      let athleticsStr = 'athletics';
      let indexOfAthletics = txt.indexOf(athleticsStr);
      let firstHalfStr = txt.substr(0, indexOfAthletics);
      let lastHalfStr = txt.substr(indexOfAthletics + athleticsStr.length, txt.length);

      //remove period and space...
      textToAdd = textToAdd.substr(0, textToAdd.length - 2);
      return firstHalfStr + textToAdd + lastHalfStr;
    }else{
      return "";
    }
  }

  buildOnsetDateString(o){
    return o.onsetdate == undefined ? '' : `which occured on ${o.onsetdate}. `;
  }

  buildEmptyString(){
    return "";
  }

  getPatientInfo(){
    let self = this;
    // let patient = self.parent.home.patient.data;
    let dob = self.patient.DOB;
    let age = moment().diff(self.helper.getDateWithFormat(dob, "MM-DD-YYYY"), 'years');
    let sex = 'male';
    if(self.patient.Sex.toUpperCase() == 'F' || self.patient.Sex.toUpperCase() == 'FEMALE'){
      sex = 'female';
    }
    return `The patient is a ${age} year old ${sex}. `;
  }

  buildSportsGroup(callback){
    let self = this;
    let onsetAthleticsGroup = new Group('Sports');
    onsetAthleticsGroup.cols = 2;
    onsetAthleticsGroup.visible = true;
    onsetAthleticsGroup.displayInNavigation = true;
    onsetAthleticsGroup.detail = 'What sport was being played?';
    onsetAthleticsGroup.stringBuilder = self.buildStringWithGroup.bind(self, onsetAthleticsGroup);
    onsetAthleticsGroup.postAppendMethod = self.athleticsPostAppend;
    self.data.getListWithProviderId('HPI', 0, function(res){
      //get sports...
      let sports = _.filter(res, function(s){return s.Description2 == 'Sport'});
      for(let i = 0; i < sports.length; i++){
        let aButton = new HistoryButton(sports[i].Description1, null, true, true);
        onsetAthleticsGroup.addItem(new item(aButton));
      }
      //onsetSection.addGroup(onsetAthleticsGroup);
      callback(onsetAthleticsGroup);
    });
  }

  setupHpiObject(){
    let self = this;

    //BODYPARTS...***************
    let bodyPartSection = new Section('Body Part(s)');
    bodyPartSection.detail = 'What Body Part(s) are involved?';

    let bodypartPartGroup = new Group('Body Part(s)');
    bodypartPartGroup.cols = 2;
    bodypartPartGroup.selected = true;
    bodypartPartGroup.visible = true;
    bodypartPartGroup.stringBuilder = self.buildEmptyString;
    bodypartPartGroup.addItem(new item(new HistoryButton('Left Hip', null, true, true)));
    bodypartPartGroup.addItem(new item(new HistoryButton('Right Hip', null, true, true)));

    bodypartPartGroup.addItem(new item(new HistoryButton('Left Knee', null, true, true)));
    bodypartPartGroup.addItem(new item(new HistoryButton('Right Knee', null, true, true)));

    bodypartPartGroup.addItem(new item(new HistoryButton('Left Ankle/Foot', null, true, true)));
    bodypartPartGroup.addItem(new item(new HistoryButton('Right Ankle/Foot', null, true, true)));

    bodypartPartGroup.addItem(new item(new HistoryButton('Left Hand/Wrist', null, true, true)));
    bodypartPartGroup.addItem(new item(new HistoryButton('Right Hand/Wrist', null, true, true)));

    bodypartPartGroup.addItem(new item(new HistoryButton('Left Elbow', null, true, true)));
    bodypartPartGroup.addItem(new item(new HistoryButton('Right Elbow', null, true, true)));

    bodypartPartGroup.addItem(new item(new HistoryButton('Left Shoulder', null, true, true)));
    bodypartPartGroup.addItem(new item(new HistoryButton('Right Shoulder', null, true, true)));

    bodypartPartGroup.addItem(new item(new HistoryButton('Back/Neck', null, true, true)));
    bodyPartSection.addGroup(bodypartPartGroup);

    self.hpiObject.addSection(bodyPartSection);

    self.currentSection = bodyPartSection;//select first section...
    self.currentSection.selected = true;


    //Was there an Injury? If So, When did the injury Happen? ********************
    let onsetSection = new Section('Onset');
    onsetSection.detail = 'Was there an Injury?';
    onsetSection.displayFirstGroupOnly = true;
    let onsetGroup = new Group('Injury?');//'Injury'
    //onsetGroup.detail = 'Was there an Injury?';
    onsetGroup.stringBuilder=self.buildOnsetString;
    onsetGroup.cols = 2;
    let onsetYesButton = new HistoryButton('YES', null, true, true);
    onsetYesButton.callback = self.toggleOnsetDateGroup.bind(self, onsetYesButton);
    let onsetNoButton = new HistoryButton('NO', null, true, true);
    onsetNoButton.callback = self.toggleOnsetDateGroup.bind(self, onsetNoButton);
    onsetGroup.addItem(new item(onsetYesButton));
    onsetGroup.addItem(new item(onsetNoButton));
    onsetSection.addGroup(onsetGroup);

    //WHEN DID IT HAPPEN???
    let onsetDateGroup = new Group('When?');
    onsetDateGroup.detail='When did the injury Happen?';
    onsetDateGroup.visible = false;
    onsetDateGroup.stringBuilder = self.buildOnsetDateString;
    onsetDateGroup.isAppender = true;
    let calItem = new item();
    calItem.isCheckbox = false;
    calItem.isCalendar = true;
    onsetDateGroup.addItem(calItem);//calendar placeholder...
    onsetSection.addGroup(onsetDateGroup);
    self.hpiObject.addSection(onsetSection);

    //where did it happen??
    let onsetWhereGroup = new Group('Where?');
    onsetWhereGroup.cols = 2;
    onsetWhereGroup.visible = false;
    onsetWhereGroup.detail = 'Where did the injury happen?';
    onsetWhereGroup.stringBuilder = self.buildInjuredAtString;
    let onsetWorkButton = new HistoryButton('Work', null, true, true);
    let onsetHomeButton = new HistoryButton('Home', null, true, true);
    let onsetAthleticsButton = new HistoryButton('Athletics', null, true, true);
    let onsetMvaButton = new HistoryButton('Motor Vehicle Accident', null, true, true);
    onsetWhereGroup.addItem(new item(onsetWorkButton));
    onsetWhereGroup.addItem(new item(onsetHomeButton));
    onsetWhereGroup.addItem(new item(onsetAthleticsButton));
    onsetWhereGroup.addItem(new item(onsetMvaButton));
    onsetSection.addGroup(onsetWhereGroup);
    //hacky shizz for sports...
    onsetWhereGroup.parentSection = onsetSection;
    self.buildSportsGroup(function(res){
      onsetWhereGroup.sportsGroup = res;
    });

    //athletics??
    // self.buildSportsGroup()
    // let onsetAthleticsGroup = new Group('Sports');
    // onsetAthleticsGroup.cols = 2;
    // onsetAthleticsGroup.visible = false;
    // onsetAthleticsGroup.detail = 'What sport was being played?';
    // onsetAthleticsGroup.stringBuilder = self.buildStringWithGroup.bind(self, onsetAthleticsGroup);
    // onsetAthleticsGroup.postAppendMethod = self.athleticsPostAppend;
    // self.data.getListWithProviderId('HPI', 0, function(res){
    //   //get sports...
    //   let sports = _.filter(res, function(s){return s.Description2 == 'Sport'});
    //   for(let i = 0; i < sports.length; i++){
    //     let aButton = new HistoryButton(sports[i].Description1, null, true, true);
    //     onsetAthleticsGroup.addItem(new item(aButton));
    //   }
    //   onsetSection.addGroup(onsetAthleticsGroup);
    // });

    //How did it happen (Mechanics):
    let onsetHowGroup = new Group('How?');
    onsetHowGroup.cols = 2;
    onsetHowGroup.visible = false;
    onsetHowGroup.detail = 'How did the injury happen?';
    onsetHowGroup.prependingText = 'The injury was caused by ';
    onsetHowGroup.stringBuilder=self.buildStringWithGroup.bind(self, onsetHowGroup);
    let onsetHowTwistingButton = new HistoryButton('Twisting Motion', null, true, true);
    let onsetHowRunnningButton = new HistoryButton('Running', null, true, true);
    let onsetHowJumpingButton = new HistoryButton('Jumping', null, true, true);
    let onsetHowDirectButton = new HistoryButton('Direct Blow', null, true, true);
    let onsetHowFallButton = new HistoryButton('Fall', null, true, true);
    let onsetHowFallArmExtendedButton = new HistoryButton('Fall, Arm Extended', null, true, true);
    let onsetHowLiftingOverheadButton = new HistoryButton('Lifting Overhead', null, true, true);
    let onsetHowLiftingWeightButton = new HistoryButton('Lifting Weight', null, true, true);
    let onsetHowBendingButton = new HistoryButton('Bending', null, true, true);
    let onsetHowReachingButton = new HistoryButton('Reaching', null, true, true);
    let onsetHowThrowingButton = new HistoryButton('Throwing', null, true, true);
    onsetHowGroup.addItem(new item(onsetHowTwistingButton));
    onsetHowGroup.addItem(new item(onsetHowRunnningButton));
    onsetHowGroup.addItem(new item(onsetHowJumpingButton));
    onsetHowGroup.addItem(new item(onsetHowDirectButton));
    onsetHowGroup.addItem(new item(onsetHowFallButton));
    onsetHowGroup.addItem(new item(onsetHowFallArmExtendedButton));
    onsetHowGroup.addItem(new item(onsetHowLiftingOverheadButton));
    onsetHowGroup.addItem(new item(onsetHowLiftingWeightButton));
    onsetHowGroup.addItem(new item(onsetHowBendingButton));
    onsetHowGroup.addItem(new item(onsetHowReachingButton));
    onsetHowGroup.addItem(new item(onsetHowThrowingButton));
    onsetSection.addGroup(onsetHowGroup);


    //PAIN QAUILITY*************
    // Tell us about your Pain Quality:
    //   None
    // Sharp
    // shooting
    // stabbing
    // throbbing
    // electric
    // burning
    // aching
    // deep
    // dull
    let painQualitySection = new Section('Pain');
    painQualitySection.detail = 'Tell us about your Pain...';
    painQualitySection.displayFirstGroupOnly = false;
    let painQualityGroup = new Group('Quality');//'Injury'
    painQualityGroup.cols = 2;
    painQualityGroup.detail = 'Quality of Pain?';
    painQualityGroup.stringBuilder = self.buildSymptomString;
    painQualityGroup.postAppendMethod = self.symptomsPostAppend;
    let painQualityNone = new HistoryButton('None', null, true, true);
    let painQualitySharp = new HistoryButton('Sharp', null, true, true);
    let painQualityShooting =  new HistoryButton('Shooting', null, true, true);
    let painQualityStabbing =  new HistoryButton('Stabbing', null, true, true);
    let painQualityThrobbing =  new HistoryButton('Throbbing', null, true, true);
    let painQualityElectric =  new HistoryButton('Electric', null, true, true);
    let painQualityBuring =  new HistoryButton('Burning', null, true, true);
    let painQualityAching =  new HistoryButton('Aching', null, true, true);
    let painQualityDeep =  new HistoryButton('Deep', null, true, true);
    let painQualityDull =  new HistoryButton('Dull', null, true, true);
    painQualityGroup.addItem(new item(painQualityNone));
    painQualityGroup.addItem(new item(painQualitySharp));
    painQualityGroup.addItem(new item(painQualityShooting));
    painQualityGroup.addItem(new item(painQualityStabbing));
    painQualityGroup.addItem(new item(painQualityThrobbing));
    painQualityGroup.addItem(new item(painQualityElectric));
    painQualityGroup.addItem(new item(painQualityBuring));
    painQualityGroup.addItem(new item(painQualityAching));
    painQualityGroup.addItem(new item(painQualityDeep));
    painQualityGroup.addItem(new item(painQualityDull));
    painQualitySection.addGroup(painQualityGroup);
    self.hpiObject.addSection(painQualitySection);

    // Tell us about your Pain Severity:
    //   Mild
    // Moderate
    // Severe
    let painSeverityGroup = new Group('Severity');
    painSeverityGroup.detail = 'Severity of Pain?';
    painSeverityGroup.cols = 1;
    painSeverityGroup.stringBuilder = self.buildStringWithGroup.bind(self, painSeverityGroup);
    painSeverityGroup.postAppendMethod = self.severityPostAppend;
    let painSeverityMild = new HistoryButton('Mild', null, true, true);
    let painSeverityMod = new HistoryButton('Moderate', null, true, true);
    let painSeveritySevere = new HistoryButton('Severe', null, true, true);
    painSeverityGroup.addItem(new item(painSeverityMild));
    painSeverityGroup.addItem(new item(painSeverityMod));
    painSeverityGroup.addItem(new item(painSeveritySevere));
    painQualitySection.addGroup(painSeverityGroup);

    // Duration, Pain Frequency:
    //   Constant
    // Frequent
    // Occasional
    let painFrequencyGroup = new Group('Frequency');
    painFrequencyGroup.detail = 'Frequency of Pain?';
    painFrequencyGroup.cols = 1;
    painFrequencyGroup.stringBuilder = self.buildFrequencyString;
    painFrequencyGroup.postAppendMethod = self.frequencyPostAppend;
    let painFreqConstant = new HistoryButton('Constant', null, true, true);
    let painFreqFrequent = new HistoryButton('Frequent', null, true, true);
    let painFreqOccasional = new HistoryButton('Occasional', null, true, true);
    painFrequencyGroup.addItem(new item(painFreqConstant));
    painFrequencyGroup.addItem(new item(painFreqFrequent));
    painFrequencyGroup.addItem(new item(painFreqOccasional));
    painQualitySection.addGroup(painFrequencyGroup);

    // What makes Pain Better
    // Rest
    // Activity
    // Heat
    // Ice
    // Elevation
    // Pain Medicine
    // Compression
    // No Relief
    let painBetterGroup = new Group('Makes Better?');
    painBetterGroup.detail = 'What makes pain better?';
    painBetterGroup.cols = 2;
    painBetterGroup.prependingText = "The patient's symptoms are relieved by ";
    painBetterGroup.stringBuilder = self.buildStringWithGroup.bind(self, painBetterGroup);
    let painBetterRest = new HistoryButton('Rest', null, true, true);
    let painBetterActivity = new HistoryButton('Activity', null, true, true);
    let painBetterHeat = new HistoryButton('Heat', null, true, true);
    let painBetterIce = new HistoryButton('Ice', null, true, true);
    let painBetterElevation = new HistoryButton('Elevation', null, true, true);
    let painBetterMeds = new HistoryButton('Medication', null, true, true);
    let painBetterCompression = new HistoryButton('Compression', null, true, true);
    let painBetterNo = new HistoryButton('No Relief', null, true, true);
    painBetterNo.exclusive = true;
    painBetterNo.exclusiveText = "The patient reports no relief from symptoms.";

    painBetterGroup.addItem(new item(painBetterRest));
    painBetterGroup.addItem(new item(painBetterActivity));
    painBetterGroup.addItem(new item(painBetterHeat));
    painBetterGroup.addItem(new item(painBetterIce));
    painBetterGroup.addItem(new item(painBetterElevation));
    painBetterGroup.addItem(new item(painBetterMeds));
    painBetterGroup.addItem(new item(painBetterCompression));
    painBetterGroup.addItem(new item(painBetterNo));
    painQualitySection.addGroup(painBetterGroup);

    // What makes Pain Worse
    // Daily activities
    // Stairs
    // bending
    // going up stairs
    // going down stairs
    // kneeling
    // sitting
    // squatting
    // standing
    // walking
    // running
    // throwing
    // lifting overhead
    let painWorseGroup = new Group('Makes Worse?');
    painWorseGroup.detail = 'What makes pain worse?';
    painWorseGroup.cols = 2;
    painWorseGroup.prependingText = "The patient's symptoms are aggravated by ";
    painWorseGroup.stringBuilder = self.buildStringWithGroup.bind(self, painWorseGroup);
    let painWorseDailyactivities = new HistoryButton('Daily activities', null, true, true);
    let painWorseStairs = new HistoryButton('Stairs', null, true, true);
    let painWorsebending = new HistoryButton('Bending', null, true, true);
    let painWorseUpStairs = new HistoryButton('Going up stairs', null, true, true);
    let painWorseDownStairs = new HistoryButton('Going down stairs', null, true, true);
    let painWorsekneeling = new HistoryButton('Kneeling', null, true, true);
    let painWorsesitting = new HistoryButton('Sitting', null, true, true);
    let painWorsesquatting = new HistoryButton('Squatting', null, true, true);
    let painWorsestanding = new HistoryButton('Standing', null, true, true);
    let painWorsewalking = new HistoryButton('Walking', null, true, true);
    let painWorserunning = new HistoryButton('Running', null, true, true);
    let painWorsethrowing = new HistoryButton('Throwing', null, true, true);
    let painWorselifting = new HistoryButton('Lifting Overhead', null, true, true);
    painWorseGroup.addItem(new item(painWorseDailyactivities));
    painWorseGroup.addItem(new item(painWorseStairs));
    painWorseGroup.addItem(new item(painWorsebending));
    painWorseGroup.addItem(new item(painWorseUpStairs));
    painWorseGroup.addItem(new item(painWorseDownStairs));
    painWorseGroup.addItem(new item(painWorsekneeling));
    painWorseGroup.addItem(new item(painWorsesitting));
    painWorseGroup.addItem(new item(painWorsesquatting));
    painWorseGroup.addItem(new item(painWorsestanding));
    painWorseGroup.addItem(new item(painWorsewalking));
    painWorseGroup.addItem(new item(painWorserunning));
    painWorseGroup.addItem(new item(painWorsethrowing));
    painWorseGroup.addItem(new item(painWorselifting));
    painQualitySection.addGroup(painWorseGroup);



    // Tell us about your Symptoms:
    //   Bruising
    // Tingling
    // Numbness
    // Popping
    // Grinding
    // Can’t Bear weight
    // Loss of motion
    let symptomsSection = new Section('Symptoms');
    symptomsSection.detail = 'Tell us about your Symptoms...';
    symptomsSection.displayFirstGroupOnly = false;
    let symptomsGroup = new Group('Symptoms');
    symptomsGroup.cols = 2;
    //symptomsGroup.detail = 'Symptoms?';
    symptomsGroup.suppressNavigation = true;
    symptomsGroup.prependingText = "Patient complains of ";
    symptomsGroup.stringBuilder = self.buildStringWithGroup.bind(self, symptomsGroup);
    let symptomsBruising = new HistoryButton('Bruising', null, true, true);
    let symptomsTingling = new HistoryButton('Tingling', null, true, true);
    let symptomsNumbness = new HistoryButton('Numbness', null, true, true);
    let symptomsPopping = new HistoryButton('Popping', null, true, true);
    let symptomsGrinding = new HistoryButton('Grinding', null, true, true);
    let symptomsNoWeight = new HistoryButton('Can’t Bear weight', null, true, true);
    let symptomsLossMotion = new HistoryButton('Loss of motion', null, true, true);
    symptomsGroup.addItem(new item(symptomsBruising));
    symptomsGroup.addItem(new item(symptomsTingling));
    symptomsGroup.addItem(new item(symptomsNumbness));
    symptomsGroup.addItem(new item(symptomsPopping));
    symptomsGroup.addItem(new item(symptomsGrinding));
    symptomsGroup.addItem(new item(symptomsNoWeight));
    symptomsGroup.addItem(new item(symptomsLossMotion));
    symptomsSection.addGroup(symptomsGroup);
    self.hpiObject.addSection(symptomsSection);

    // Swelling when:
    //   Immediately
    // Within a few hours
    // The Next Day
    let swellingSection = new Section('Swelling');
    swellingSection.detail = 'Swelling?';
    swellingSection.displayFirstGroupOnly = false;
    let swellingGroup = new Group('Swelling');
    swellingGroup.cols = 1;
    //swellingGroup.detail = 'Swelling?';
    swellingGroup.suppressNavigation = true;
    swellingGroup.stringBuilder = self.buildSwellingString;
    let swellingNo = new HistoryButton('No Swelling', null, true, true);
    let swellingImmediatly = new HistoryButton('Immediately', null, true, true);
    let swellingWithinHour = new HistoryButton('Within a few hours', null, true, true);
    let swellingNextDay = new HistoryButton('The next day', null, true, true);
    swellingGroup.addItem(new item(swellingNo));
    swellingGroup.addItem(new item(swellingImmediatly));
    swellingGroup.addItem(new item(swellingWithinHour));
    swellingGroup.addItem(new item(swellingNextDay));
    swellingSection.addGroup(swellingGroup);
    self.hpiObject.addSection(swellingSection);

    // Previous Treatments
    // None
    // Physical Therapy
    // Home exercise
    // Injections
    // Splinting
    // TENS
    // Ice/Heat
    let prevTreatmentSection = new Section('Previous Treatments');
    prevTreatmentSection.displayFirstGroupOnly = true;
    prevTreatmentSection.detail = 'Previous Treatments?';
    let previousTreatmentGroup = new Group('Previous');
    previousTreatmentGroup.cols = 1;
    //previousTreatmentGroup.detail = 'Previous?';
    previousTreatmentGroup.suppressNavigation = true;
    previousTreatmentGroup.prependingText = "The patient has tried ";
    previousTreatmentGroup.stringBuilder = self.buildPrevTreatmentString.bind(self, previousTreatmentGroup);
    let prevTreatNone = new HistoryButton('None', null, true, true);
    prevTreatNone.callback = self.showPreviousTreatmentResults.bind(self, prevTreatNone);
    let prevTreatPhysTher = new HistoryButton('Physical Therapy', null, true, true);
    prevTreatPhysTher.callback = self.showPreviousTreatmentResults.bind(self, prevTreatPhysTher);
    let prevTreatHomeEx = new HistoryButton('Home Exercise', null, true, true);
    prevTreatHomeEx.callback = self.showPreviousTreatmentResults.bind(self, prevTreatHomeEx);
    let prevTreatInject = new HistoryButton('Injections', null, true, true);
    prevTreatInject.callback = self.showPreviousTreatmentResults.bind(self, prevTreatInject);
    let prevTreatSplint = new HistoryButton('Splinting', null, true, true);
    prevTreatSplint.callback = self.showPreviousTreatmentResults.bind(self, prevTreatSplint);
    let prevTreatTENS = new HistoryButton('TENS', null, true, true);
    prevTreatTENS.callback = self.showPreviousTreatmentResults.bind(self, prevTreatTENS);
    let prevTreatIceHeat = new HistoryButton('Ice/Heat', null, true, true);
    prevTreatIceHeat.callback = self.showPreviousTreatmentResults.bind(self, prevTreatIceHeat);
    previousTreatmentGroup.addItem(new item(prevTreatNone));
    previousTreatmentGroup.addItem(new item(prevTreatPhysTher));
    previousTreatmentGroup.addItem(new item(prevTreatHomeEx));
    previousTreatmentGroup.addItem(new item(prevTreatInject));
    previousTreatmentGroup.addItem(new item(prevTreatSplint));
    previousTreatmentGroup.addItem(new item(prevTreatTENS));
    previousTreatmentGroup.addItem(new item(prevTreatIceHeat));
    prevTreatmentSection.addGroup(previousTreatmentGroup);
    self.hpiObject.addSection(prevTreatmentSection);

    // Improvement on Prior Treatments
    // No relief
    // Mild Relief
    // Moderate relief
    // Significant relief
    let improvementGroup = new Group('Improvement on Prior Treatments?');
    improvementGroup.cols = 1;
    improvementGroup.visible = false;
    improvementGroup.detail = 'Improvements?';
    improvementGroup.stringBuilder = self.buildStringWithGroup.bind(self, improvementGroup);
    improvementGroup.postAppendMethod = self.prevTreatmentResultPostAppend;
    let improveNoRelief = new HistoryButton('No Relief', null, true, true);
    let improveMildRelief = new HistoryButton('Mild Relief', null, true, true);
    let improveModRelief = new HistoryButton('Moderate Relief', null, true, true);
    let improveSignifRelief = new HistoryButton('Significant Relief', null, true, true);
    improvementGroup.addItem(new item(improveNoRelief));
    improvementGroup.addItem(new item(improveMildRelief));
    improvementGroup.addItem(new item(improveModRelief));
    improvementGroup.addItem(new item(improveSignifRelief));
    prevTreatmentSection.addGroup(improvementGroup);


    // Prior Studies:
    //   _MRI
    // _CT Scan
    // _EMG
    // _Ultrasound
    // _Bone Scan
    // _Blood Study

    let priorStudiesSection = new Section('Prior Studies');
    priorStudiesSection.detail = 'Prior Studies?';
    //priorStudiesSection.displayFirstGroupOnly = false;
    let proirStudiesGroup = new Group('Prior Studies');
    proirStudiesGroup.cols = 1;
    //proirStudiesGroup.detail = 'Prior?';
    proirStudiesGroup.suppressNavigation = true;
    proirStudiesGroup.prependingText = "The patient reports prior studies: ";
    proirStudiesGroup.stringBuilder = self.buildStringWithGroup.bind(self, proirStudiesGroup);
    let priorStudiesMri = new HistoryButton('MRI', null, true, true);
    priorStudiesMri.makeLowercase = false;
    let priorStudiesXray = new HistoryButton('XRay', null, true, true);
    priorStudiesXray.makeLowercase = false;
    let priorStudiesCt = new HistoryButton('CT Scan', null, true, true);
    priorStudiesCt.makeLowercase = false;
    let priorStudiesEmg = new HistoryButton('EMG', null, true, true);
    priorStudiesEmg.makeLowercase = false;
    let priorStudiesUltrasound = new HistoryButton('Ultrasound', null, true, true);
    priorStudiesUltrasound.makeLowercase = false;
    let priorStudiesBoneScan = new HistoryButton('Bone Scan', null, true, true);
    priorStudiesBoneScan.makeLowercase = false;
    let priorStudiesBlood = new HistoryButton('Blood Study', null, true, true);
    priorStudiesBlood.makeLowercase = false;
    proirStudiesGroup.addItem(new item(priorStudiesMri));
    proirStudiesGroup.addItem(new item(priorStudiesXray));
    proirStudiesGroup.addItem(new item(priorStudiesCt));
    proirStudiesGroup.addItem(new item(priorStudiesEmg));
    proirStudiesGroup.addItem(new item(priorStudiesUltrasound));
    proirStudiesGroup.addItem(new item(priorStudiesBoneScan));
    proirStudiesGroup.addItem(new item(priorStudiesBlood));
    priorStudiesSection.addGroup(proirStudiesGroup);
    self.hpiObject.addSection(priorStudiesSection);

  }

  updateTextareaScroll(){
    this.mytextarea.scrollTop = this.mytextarea.scrollHeight;
  }

  openCalendar(){
    this.onsetdatepicker.methods.toggle();
  }

  toggleOnsetDateGroup(item){
    let self = this;
    //find onset date group...
    for(let s = 0; s < self.hpiObject.sections.length; s++){
      let aSection = self.hpiObject.sections[s];
      if(aSection.description == 'Onset'){

        if(item.name == 'YES'){

          aSection.displayFirstGroupOnly = false;

          for(let g = 0; g < aSection.groups.length; g++){
            let aGroup = aSection.groups[g];
            //find onsetGroup...
            if(aGroup.description == 'Injury?'){
              //make sure NO is unchecked...
              let noButton = _.find(aGroup.items, function(i){ return i.object.name == 'NO'});
              noButton.object.selected = false;
            }
            if(!aGroup.suppressNavigation){
              aGroup.displayInNavigation = true;
            }
          }
        }else{

          aSection.displayFirstGroupOnly = true;

          for(let g = 0; g < aSection.groups.length; g++){
            let aGroup = aSection.groups[g];

            //find onsetGroup...
            if(aGroup.description == 'Injury?'){
              //make sure NO is unchecked...
              let noButton = _.find(aGroup.items, function(i){ return i.object.name == 'YES'});
              noButton.object.selected = false;
            }

            //set section index to max, so we can move to next section on NEXT click...
            aSection.groupIndex = aSection.groups.length - 1;

            if(!aGroup.suppressNavigation){
              aGroup.displayInNavigation = false;
            }
          }
        }
      }
    }
  }

  showPreviousTreatmentResults(item){
    let self = this;
    //find onset date group...
    for(let s = 0; s < self.hpiObject.sections.length; s++){
      let aSection = self.hpiObject.sections[s];
      if(aSection.description == 'Previous Treatments'){

        if(item.name == 'None'){
          //set section index to max, so we can move to next section on NEXT click...
          aSection.groupIndex = aSection.groups.length - 1;
        }else{
          for(let g = 0; g < aSection.groups.length; g++){
            let aGroup = aSection.groups[g];
            if(!aGroup.suppressNavigation){
              aGroup.displayInNavigation = true;
            }
          }
        }
      }
    }
  }

  previousSection(){
    //does section have multiple groups???
    let currentSection = this.hpiObject.sections[this.sectionIndex];
    if(currentSection.groups.length > 1 &&
      currentSection.groupIndex > 0){
      currentSection.previousGroup(false);
    }else {
      //hide first group item of current section before moving on...
      currentSection.groups[currentSection.groupIndex].visible = false;

      let nextIndex = this.sectionIndex - 1;
      if (nextIndex >= 0) {
        this.sectionIndex--;

        this.nextButtonDescription = 'Next';

        //check for ONSET...
        let prevSection = this.hpiObject.sections[this.sectionIndex];
        if(prevSection.description == 'Onset'){
          if(prevSection.displayFirstGroupOnly){
            prevSection.groupIndex = 0;
          }else{
            prevSection.groupIndex = prevSection.groups.length - 1;
          }
        }

        this.sectionClick(this.hpiObject.sections[this.sectionIndex]);
      }
    }
  }

  nextSection(){
    //does section have multiple groups???
    let currentSection = this.hpiObject.sections[this.sectionIndex];
    if(currentSection.groups.length > 1 &&
      currentSection.groupIndex < currentSection.groups.length - 1){
      currentSection.nextGroup(false);
    }else{
      //hide last group item of current section before moving on...
      currentSection.groups[currentSection.groupIndex].visible = false;

      //check for DONE button index...
      if(this.sectionIndex == this.hpiObject.sections.length - 1){
        this.doneClick();
        return;
      }

      let nextindex = this.sectionIndex + 1;
      if(nextindex <= this.hpiObject.sections.length - 1){
        this.sectionIndex++;
        this.sectionClick(this.hpiObject.sections[this.sectionIndex]);

        //check for DONE index...
        if(this.sectionIndex == this.hpiObject.sections.length - 1){
          this.nextButtonDescription = 'Done';
        }
      }
    }
  }

  close(){
    let self = this;

    self.doneClick();
  }

  doneClick(){
    let self = this;
    self.parent.dialog.close(true, {text: self.hpitext});
  }

  groupClick(section, index){
    section.selectGroupWithIndex(index);
  }

  sectionClick(s){
    let self = this;
    self.sectionIndex = s.id - 1;
    self.currentSection = s;
    self.selectSection(s);
  }

  selectSection(s){
    let self = this;
    for(let i = 0; i < self.hpiObject.sections.length; i++){
      let sec = self.hpiObject.sections[i];
      if(s.id == sec.id){
        //sec.selected = true;
        sec.select();
      }else{
        sec.selected = false;
        sec.deselectGroups();
      }
    }
  }

  setVisibility(value, object){
    if(object.visible == true || (value != null && value.length > 0)){
      object.visible = true;
    }else{
      object.visible = false;
    }
  }


}
