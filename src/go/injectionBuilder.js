import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Home} from './home';
import {Data} from '../data/go/data';
import * as _ from 'lodash';
import {EventAggregator} from 'aurelia-event-aggregator';
import {PopupHelper} from './popupHelper';
import {observable} from "aurelia-binding";

class hpiObject{
  constructor(){
    this.sections=[];
  }
  addSection(s){
    let id = this.sections.length + 1;
    s.id = id;
    this.sections.push(s);
  }

  insertSection(s, index){
    let id = this.sections.length + 1;
    s.id = id;
    this.sections.splice(index, 0, s);
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

  buildString(form){

     if(this.stringBuilder != null){
    //   if(this.items[0].isCalendar ||
    //     this.description == 'Quality' ||
    //     this.description == 'Frequency' ||
    //     this.description == "Pain" ||
    //     this.description == 'Swelling'){
    //     return this.stringBuilder(intake);
    //   }else{
        return this.stringBuilder(form);
     // }
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
    this.isSlider =false;
    this.detail="";
  }
}

class HistoryButton{

  constructor(name, data, visible, editing){
    this.name = name;
    this.data = data;
    this.selected = false;
    this.visible = visible == undefined ? false : visible;
    this.editing = editing ? editing : false;
    this.callback=null;
  }

  select(injectionBuilder){
    this.selected = this.selected ? false : true;
    if(this.callback != null){
      this.callback();
    }

    injectionBuilder.buildInjectionText();

  }
}



@inject(helper,http, Data, Home, EventAggregator, PopupHelper)
export class InjectionBuilder {

  injectObject = new hpiObject();

  currentSection=null;

  sectionIndex = 0;

  bodyHeight;

  injectionListHeight;

  contentbodyHeight;

  injectionText="";

  parent;

  patient;

  injectionSiteList=[];

  selectedBodypart;
  bodyparts=[];
  selectedInjectionSites=[];

  aspirateValue=0;
  selectedInjectionSite;
  selectedJcode=null;
  disableContent = true;

  selectedPreference;
  filteredPreferences=[];

  providerId;

  injPxCodes=[];


  constructor(helper, http, Data, Home, EventAggregator, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.event = EventAggregator;
    this.popupHelper = PopupHelper;
  }

  activate(model){
    let self = this;
    self.parent = model;

    self.providerId = self.parent.home.currentProvider.ProviderID;

    self.patient = self.parent.home.patient.data;

    self.loadInjectionProcedureCodes();
  }

  loadInjectionProcedureCodes(){
    let self = this;
    self.data.getWithUrl(`procedures?type=injection`, function(res){
      //just the ones i want...
      //self.injPxCodes = _.filter(res, function(r){return r.Description.includes('INJECTION, Aspiration of Joint/Bursa')});
      // self.injPxCodes = _.sortBy(self.injPxCodes, 'CptKey');//sort low to high...
      self.injPxCodes = _.sortBy(res, 'CptKey');//sort low to high...
    });
  }

  preferenceClick(pref){
    let self = this;
    self.injectionText = pref.data.Instruction;
    self.selectedPreference = pref;
  }

  injectionSelected(inj){
    this.selectedInjectionSite = inj;

    this.disableContent = false;

    for(let i = 0; i < this.selectedInjectionSites.length; i++){
      if(this.selectedInjectionSites[i].name != inj.name){
        this.selectedInjectionSites[i].selected = false;
      }else{
        this.selectedInjectionSites[i].selected = true;
      }
    }
  }

  bodypartClick(){
    //select / deselect / load locations...
    let self = this;
    //self.selectedBodypart = btn;
    //load locations...
    let injections = _.filter(self.injectionSiteList, function(i){return i.BodyPart.toUpperCase() == self.selectedBodypart.toUpperCase()});
    self.selectedInjectionSites=[];
    for(let i = 0; i < injections.length; i++){
      self.selectedInjectionSites.push(new HistoryButton(injections[i].Description1, injections[i], true, true));
    }

    self.filterPreferences(self.selectedBodypart);
  }

  attached(){
    let self = this;

    $('ux-dialog-body').css('padding-bottom', 0);

    //get dialog header height...
    let totalPopupContent = $('ux-dialog-header').height();
    //add top padding...
    totalPopupContent += 18;
    //get intakebody height...
    let tBodyHeight = self.intakebody.clientHeight;
    let footerHeight = self.footer.clientHeight;
    totalPopupContent += tBodyHeight;
    totalPopupContent += footerHeight;
    totalPopupContent += 32//more padding...

    //get popup height...
    let popupHeight = $('ux-dialog').height();

    //subtract totalPopupContent from popupHeight
    let heightToAdd = popupHeight - totalPopupContent;

    self.bodyHeight = tBodyHeight + heightToAdd;

    self.preflength = self.bodyHeight -150;

    self.injectionListHeight = self.bodyHeight - 79;

    self.contentbodyHeight = self.bodyHeight - 16 - 84 - 65 - 47;

    //self.setupHpiObject();
    //let bpStr = self. ['Ankle', 'Cervical', 'Elbow','Foot', 'Hand','Hip', 'Knee', 'Lumbar', 'Shoulder', 'Thoracic', 'Wrist'];
    self.bodyparts = self.data.bodyparts;
    self.selectedBodypart = self.parent.home.currentBoard.visitInfo.bodypart;//self.bodyparts[0];
    self.loadInjectionSites();

    self.setupInjectObject();
  }

  filterPreferences(bodypart){
    let self = this;
    //filter by selected bodypart...
    self.filteredPreferences = _.filter(self.parent.preferences, function(p){return p.bodypart == bodypart});
    self.filteredPreferences = _.sortBy(self.filteredPreferences, function(f){return f.description});
    if(self.filteredPreferences.length > 0){
      self.selectedPreference = self.filteredPreferences[0];
    }
  }

  populatePrefObjectFromForm(pref, description, callback){
    let self = this;
    pref.ProviderID = self.providerId;
    pref.Description = description ? description : self.selectedPreference.description;
    pref.Instruction = self.injectionText;

    if(self.selectedJcode){
      pref.InjectionDesc = self.selectedJcode.Description;
      pref.JCode = self.selectedJcode.CptKey;
    }

    self.getCptCode(function(code){
      pref.CPTCode = code.code;
      pref.CPTDesc = code.description;

      pref.Part = self.selectedBodypart;

      self.popupHelper.openBodysidePickerPop(function(side){

        pref.Side = side;

        if(self.selectedInjectionSite){
          pref.InjectSite=self.selectedInjectionSite.name;
        }
    
        callback(pref);


      });

    });
  }

  createNewPrefClick(){
    let self = this;
    self.parent.popupHelper.openGenericInputPop("Create New Preference", ['Description'], null, false, function(res){
      let prefName = res.inputs[0];
      self.parent.goData.getWithUrl('injection/pref/new', function(pref){

        self.populatePrefObjectFromForm(pref, prefName.value, function(aPrefObj){

          let saveDescription = `Saving ${prefName.value}...`;
          let saveDialog = self.parent.helper.createNoty(saveDescription, 3000);
          saveDialog.show();
          self.parent.goData.postWithUrlAndData('injection/pref', JSON.stringify(aPrefObj), function(res){
            //add to parent prefernce list...
            let prefObj = self.parent.goData.getPreferenceObj(res.Description, res, res.Part);
            self.parent.preferences.push(prefObj);
            self.filterPreferences(self.selectedBodypart);
            saveDialog.close();
          });

        });

      });
    });
  }

  savePreferenceClick(){
    let self = this;
    if(self.selectedPreference){
      let updateDescription = `Update ${self.selectedPreference.description}?`;
      self.parent.popupHelper.openGenericMessagePop(updateDescription, 'Preference Update', ['OK'], false, function(res){

        let pref = self.selectedPreference.data;
        self.populatePrefObjectFromForm(pref, null, function(prefObj){

          let saveDescription = `Updating ${self.selectedPreference.description}...`;
          let saveDialog = self.parent.helper.createNoty(saveDescription, 3000);
          saveDialog.show();
          self.parent.goData.putWithUrlAndData('injection/pref', prefObj, function(res){
  
            saveDialog.close();
  
          });

        });

      });
    }
  }

  jcodeClick(procedure){
    let p = procedure;
  }

  // populatePrefObject(pref){
  //   let self = this;
  //   pref.ProviderID = self.providerId;
  //   pref.Description
  // }

  buildInjectionText(){
    let self = this;

    if(self.selectedInjectionSite == undefined){
      //ALERT??
      self.showErrorPopup();
      return;
    }

    self.injectionText = "";
    self.injectionText = `The ${self.selectedBodypart.toLowerCase()} was cleansed in preparation for procedure. `;

    for(let s = 0; s < self.injectObject.sections.length; s++){
      let section = self.injectObject.sections[s];
      for(let g = 0; g < section.groups.length; g++){
        let group = section.groups[g];
         let txtString = group.buildString(self);
        //let txtString = group.buildString(section, group);
        if(group.isAppender && txtString.length > 0){
          //remove previous period...
          self.injectionText = self.injectionText.substr(0, self.injectionText.length - 2) + " ";
        }

        if(group.postAppendMethod != null){
          let str = group.postAppendMethod(self, txtString);
          if(str.length > 0){
            self.injectionText = str;
          }
        }else{
          self.injectionText += txtString;
        }
      }
    }

    setTimeout(self.updateTextareaScroll.bind(self), 100);
  }

  getGroupWithNames(section, group){
    let self = this;
    let aSec= _.find(self.injectObject.sections, function(s){return s.description == section});
    return _.find(aSec.groups, function(g){return g.description == group});
  }

  getSelectedCheckboxesInGroup(group){
    let chx = [];
    for(let i = 0 ; i < group.items.length; i++){
      let itm = group.items[i];
      if(itm.object != undefined && itm.object.selected){
        chx.push(itm.object);
      }
    }
    return chx;
  }

  buildQualityGroup(form){
    if(form.selectedInjectionSite){

      let txt = `${form.aspirateValue} CC's of `;

      let qualityGroup = form.getGroupWithNames('Aspirant', 'Quality');
      let chkBxs = form.getSelectedCheckboxesInGroup(qualityGroup);

      if(chkBxs.length > 0){
        let first = chkBxs[0];
        if(first.name == 'Crystals present' || first.name == 'Crystals absent'){
          txt += 'fluid with ' + first.name.toLowerCase();
        }else{
          txt += first.name.toLowerCase() + ' fluid ';
        }

        txt += 'was aspirated from the ' + form.selectedInjectionSite.name.toLowerCase() + ". ";
        return  txt;
      }else{
        return "";
      }

    }else{
      //SOME ALERT???
      form.showErrorPopup();
      return "";
    }
  }

  buildInjectionGroup(form){
    if(form.selectedInjectionSite){
      let txt = `The ${form.selectedInjectionSite.name} was injected with `;
      let injGroup = form.getGroupWithNames('Injection', 'Injection');
      let chkBxs = form.getSelectedCheckboxesInGroup(injGroup);
      if(chkBxs.length > 0){
        let first = chkBxs[0];
        form.selectedJcode = first.data;
        txt += first.name.toLowerCase() + '. ';
        return  txt;
      }else{
        form.selectedJcode=null;
        return "";
      }
    }else{
      //SOME ALERT???
      form.showErrorPopup();
      return "";
    }
  }

  buildInstructionGroup(form){
    if(form.selectedInjectionSite){

      let txt = 'The patient was instructed to ';
      let instGroup = form.getGroupWithNames('Instruct', 'Instruct');
      let instTxt = form.getCommaAndWithItemsData(instGroup);
      if(instTxt.length > 0){
        return txt + instTxt + ". ";
      }
      return "";
    }else{
      //SOME ALERT???
      form.showErrorPopup();
      return "";
    }
  }

  buildSubjectiveGroup(form){
    if(form.selectedInjectionSite){

      let txt = 'The patient reports ';

      let subjGroup = form.getGroupWithNames('Subjective', 'Subjective');
      let subjTxt = form.getCommaAndWithItemsData(subjGroup);
      if(subjTxt.length > 0){
        return  txt + subjTxt + ". ";
      }
      return "";
    }else{
      //SOME ALERT???
      form.showErrorPopup();
      return "";
    }
  }

  buildGuidanceGroup(form){
    if(form.selectedInjectionSite){
      let txt = 'Performed with ';
      let guideGroup = form.getGroupWithNames('Guidance', 'Guidance');
      let guideTxt = form.getCommaAndWithItemsData(guideGroup);
      if(guideTxt.length > 0){
        return  txt + guideTxt + ". ";
      }
      return "";
    }else{
      //SOME ALERT???
      form.showErrorPopup();
      return "";
    }
  }

  getCommaAndWithItemsData(group){
    let str = "";

    for(let i = 0 ; i < group.items.length; i++){
      let itm = group.items[i];
      if(itm.object != undefined && itm.object.selected){
        str = str.concat(itm.object.data, ", ");
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

  getCommaAndWithItems(group){
    let str = "";

    for(let i = 0 ; i < group.items.length; i++){
      let itm = group.items[i];
      if(itm.object != undefined && itm.object.selected){
        str = str.concat(itm.object.name, ", ");
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

  add(){
    let self = this;
    self.getCptCode(function(code){

      let inject={
        cptObject: code,
        jcode: self.selectedJcode,
        text: self.injectionText,
        injectionSite: self.selectedInjectionSite,
        bodypart: self.selectedBodypart
      }
      self.parent.dialog.close(true, inject);

    });
  }

  setupInjectObject(){
    let self = this;
    let aspirantSection = new Section('Aspirant');
    aspirantSection.detail = "CC's of fluid aspirated...";
    let aspSliderGroup = new Group('Aspirant');
    aspSliderGroup.selected = true;
    aspSliderGroup.visible = true;
    let aspSliderItm = new item(null);
    aspSliderItm.isSlider =true;
    aspSliderItm.isCheckbox = false;
    aspSliderGroup.addItem(aspSliderItm);
    aspirantSection.addGroup(aspSliderGroup);
    self.injectObject.addSection(aspirantSection);

    self.currentSection = aspirantSection;//select first section...
    self.currentSection.selected = true;

    let qualityGroup = new Group('Quality');
    qualityGroup.selected = true;
    qualityGroup.visible = true;
    qualityGroup.cols = 2;
    qualityGroup.detail = 'Quality';
    qualityGroup.stringBuilder = self.buildQualityGroup;
    qualityGroup.addItem(new item(new HistoryButton('Blood tinged', null, true, true)));
    qualityGroup.addItem(new item(new HistoryButton('Bloody', null, true, true)));
    qualityGroup.addItem(new item(new HistoryButton('Clear', null, true, true)));
    qualityGroup.addItem(new item(new HistoryButton('Cloudy', null, true, true)));
    qualityGroup.addItem(new item(new HistoryButton('Crystals present', null, true, true)));
    qualityGroup.addItem(new item(new HistoryButton('Crystals absent', null, true, true)));
    qualityGroup.addItem(new item(new HistoryButton('Purulent', null, true, true)));
    qualityGroup.addItem(new item(new HistoryButton('Straw colored', null, true, true)));
    qualityGroup.addItem(new item(new HistoryButton('Turbid', null, true, true)));
    aspirantSection.addGroup(qualityGroup);

    let injectSection = new Section('Injection');
    injectSection.detail = "Injection...";
    let injectGroup = new Group('Injection');
    injectGroup.cols = 1;
    injectGroup.stringBuilder = self.buildInjectionGroup;
    self.data.getProceduresWithType('JCODE', function (res) {
      for(let i = 0; i < res.length; i++){
        let injButton=new HistoryButton(res[i].Description, res[i], true, true);
        //injButton.callback=self.jcodeClick.bind(self, res[i]);
        injectGroup.addItem(new item(injButton));
      }
      injectSection.addGroup(injectGroup);
      self.injectObject.insertSection(injectSection, 1);
    });


    let instructSection = new Section('Instruct');
    instructSection.detail = "Patient instructions...";
    let instructGroup = new Group('Instruct');
    instructGroup.cols = 2;
    instructGroup.selected = true;
    instructGroup.visible = true;
    instructGroup.stringBuilder = self.buildInstructionGroup;
    instructGroup.addItem(new item(new HistoryButton('R-I-C-E', 'rest, apply ice to the affected area, use a compressive wrap, and elevate the limb', true, true)));
    instructGroup.addItem(new item(new HistoryButton('Elevate limb', 'elevate the limb', true, true)));
    instructGroup.addItem(new item(new HistoryButton('Rest', 'rest', true, true)));
    instructGroup.addItem(new item(new HistoryButton('Compression', 'warm compress', true, true)));
    instructGroup.addItem(new item(new HistoryButton('Use ice', 'use ice', true, true)));
    instructGroup.addItem(new item(new HistoryButton('Tylenol', 'take tylenol as needed for pain', true, true)));
    instructGroup.addItem(new item(new HistoryButton('Stretching', 'stretch', true, true)));
    instructGroup.addItem(new item(new HistoryButton('Exercise', 'exercise', true, true)));
    instructGroup.addItem(new item(new HistoryButton('Default', 'rest, apply ice to the affected area, use a compressive wrap, elevate the limb and take tylenol as needed for pain', true, true)));
    instructSection.addGroup(instructGroup);
    self.injectObject.addSection(instructSection);


    let subjectiveSection = new Section('Subjective');
    subjectiveSection.detail = "Subjective...";
    let subjectiveGroup = new Group('Subjective');
    subjectiveGroup.selected = true;
    subjectiveGroup.visible = true;
    subjectiveGroup.stringBuilder = self.buildSubjectiveGroup;
    subjectiveGroup.addItem(new item(new HistoryButton('Mild improvement', 'mild relief from symptoms', true, true)));
    subjectiveGroup.addItem(new item(new HistoryButton('Marked improvement', 'marked relief from symptoms', true, true)));
    subjectiveGroup.addItem(new item(new HistoryButton('Mildly worse', 'symptoms are mildly worse', true, true)));
    subjectiveGroup.addItem(new item(new HistoryButton('Markedly worse', 'symptoms are markedly worse', true, true)));
    subjectiveSection.addGroup(subjectiveGroup);
    self.injectObject.addSection(subjectiveSection);



    let guidanceSection = new Section('Guidance');
    guidanceSection.detail = "Guidance used...";
    let guidanceGroup = new Group('Guidance');
    guidanceGroup.selected = true;
    guidanceGroup.visible = true;
    guidanceGroup.stringBuilder = self.buildGuidanceGroup;
    guidanceGroup.addItem(new item(new HistoryButton('US 20604, 20606, 20611', 'ultrasonic guidance', true, true)));
    guidanceGroup.addItem(new item(new HistoryButton('Fluoroscopic 77002', 'fluoroscopic guidance', true, true)));
    guidanceGroup.addItem(new item(new HistoryButton('Fluoroscopic 77003', 'fluoroscopic guidance', true, true)));
    guidanceSection.addGroup(guidanceGroup);
    self.injectObject.addSection(guidanceSection);
  }

  loadInjectionSites(){
    let self = this;
    self.data.getListWithProviderId("Injection Site", self.providerId, function(res){
      self.injectionSiteList = res;

      self.bodypartClick(self.selectedBodypart);
    });
  }

  updateTextareaScroll(){
    this.mytextarea.scrollTop = this.mytextarea.scrollHeight;
  }

  // doneClick(){
  //   let self = this;
  //   self.parent.dialog.close(true, {text: self.injectionText});
  // }

  groupClick(section, index){
    section.selectGroupWithIndex(index);
  }

  sectionClick(index, s){
    let self = this;
    self.sectionIndex = index;
    self.currentSection = s;
    self.selectSection(s);
  }

  selectSection(s){
    let self = this;
    for(let i = 0; i < self.injectObject.sections.length; i++){
      let sec = self.injectObject.sections[i];
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

  showErrorPopup(){
    let self = this;
    let message = `Please select an injection location to proceed.`;
    let header = 'No Injection Location!';
    let options=['OK'];
    self.popupHelper.openGenericMessagePop(message, header, options, false, function(res){
      return;
    });
  }

  checkForSpinePicker(bodypart, callback){
    let self = this;
    let part = bodypart.toUpperCase();

    let finalCode={
      code:'',
      description:'',
      id:0
    }

    if(part=="LUMBAR" || part == 'THORACIC' || part == 'CERVICAL'){
      //spine...
      //open CPT picker for spine...
      let spineCpts = _.filter(self.injPxCodes, function(px){return px.Body_Part == 'Spine'});
      let spineCptItems=[];
      for(let i = 0; i < spineCpts.length; i++){
        let codeDesc = `${spineCpts[i].CptKey} - ${spineCpts[i].Description}`;
        let pItm = self.data.getGenericPicklistItem(codeDesc, spineCpts[i]);
        spineCptItems.push(pItm);
      }
      self.popupHelper.openGenericPicklistPop("CPT Code", 'Please Select Code...', spineCptItems, false, function(cptRes) {    
        finalCode.code = cptRes.item.data.CptKey;
        finalCode.description = cptRes.item.data.Description;
        finalCode.id = cptRes.item.data.ProcedureID;

        callback(finalCode)
      });

    }else{
      callback(finalCode);
    }

  }

  getCptCode(callback){
    let self = this;
    if(self.selectedInjectionSite && self.selectedBodypart){
      // let res={
      //   code:'',
      //   description:'',
      //   id:0
      // }

      let finalCode=null;

      if(self.injPxCodes.length == 0){
        callback(null);
      }

      let part = self.selectedBodypart.toUpperCase();

      self.checkForSpinePicker(part, function(codeRes){

        finalCode = codeRes;

        if(codeRes.id == 0){
          if(self.selectedInjectionSite.data.Description1 == 'AC JOINT LINE'){
            let px = _.find(self.injPxCodes, function(p){return p.CptKey == '20605'});
            finalCode.code = px.CptKey;
            finalCode.description = px.Description;
            finalCode.id = px.ProcedureID;
          }else{
            if(part == 'HAND' || part == 'FOOT'){
              // res.code = '20600';
              // res.description = 'INJECTION/ASPIRATION, JOINT/BURSA, SML';
              let sml = _.find(self.injPxCodes, function(p){return p.CptKey == '20600'});
              finalCode.code = sml.CptKey;
              finalCode.description = sml.Description;
              finalCode.id = sml.ProcedureID;
            }else if(part == 'ANKLE' || part == 'ELBOW' || part == 'WRIST'){
              // res.code = '20605';
              // res.description = 'INJECTION/ASPIRATION, JOINT/BURSA, MED';
              let med = _.find(self.injPxCodes, function(p){return p.CptKey == '20605'});
              finalCode.code = med.CptKey;
              finalCode.description = med.Description;
              finalCode.id = med.ProcedureID;
            }else if(part == 'SHOULDER' || part == 'KNEE' || part == 'HIP'){
              // res.code = '20610';
              // res.description = 'INJECTION/ASPIRATION, JOINT/BURSA, MAJ';
              let maj = _.find(self.injPxCodes, function(p){return p.CptKey == '20610'});
              finalCode.code = maj.CptKey;
              finalCode.description = maj.Description;
              finalCode.id = maj.ProcedureID;
            }
          }
        }

        callback(finalCode);

      });
    }
    else{
      callback(null);
    }
  }
}
