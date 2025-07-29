import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Home} from '../home';
import {Data} from '../../data/go/data';
import * as _ from 'lodash';
import {EventAggregator} from 'aurelia-event-aggregator';


class Substance{
  constructor(type, value){
    this.typeOptions=this.getTypeOptions(type);
    this.usageOptions=this.getUsageOptions(type);
    this.selectedUsageOption=null;
    this.selectedValue = value ? value : this.typeOptions[0];
    this.substanceType = type;
  }

  getUsageOptions(name){
    if(name == 'Substances'){
      return [];
    }
    if(name=='Tobacco'){
      return ['Never', 'Occasionally','Daily','Former'];//['Never', 'Sometimes', 'Daily', 'Unknown', 'Heavy', 'Light'];
    }else{
      return ['Never', 'Occasionally','Daily'];
    }
  }

  getTypeOptions(type){
    if(type=='Caffeine'){
      return ["Coffee",
      "Soft Drink",
      "Tea",
      "Chocolate"]};

    if(type=='Illicit Drugs'){
      return ["Marijuana",
      "Cocaine",
      "PCP",
      "LSD",
      "Heroin",
      "Crack",
      "Crystal Meth",
      "Ecstasy",
      "Opium"]};

    if(type=='Tobacco'){
      return ["Cigarettes",
      "Cigars",
      "Pipe",
      "Snuff",
      "Dip",
      "Vaping"]};

    if(type=='Alcohol'){
      return ["Beer",
      "Wine",
      "Liquor"]};
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




@inject(helper,http, Data, Home, EventAggregator)
export class SocialHistory {

  history;
  socHxData=null;
  //substances=[];

  //objectsToSave=[];




  selectedSubstance='Substances';
  substanceList=['Tobacco', 'Alcohol', 'Caffeine', 'Illicit Drugs']
  appearanceList=["The patient appears to be well nourished, oriented x3 with normal mood and affect.",
    "The patient appears to be well nourished and in good health.",
    "The patient appears to be in good health, with normal cognition.",
    "The patient appears to be in good health, with poor cognition.",
    "The patient appears to be well nourished but in poor health.",
    "The patient appears to be in poor health and with poor cognition.",
    "The patient appears older than stated age."];
  dietList=['Normal','High Protein','Low Carb','ADA Diet','Vegan'];
  activityLevelList=['High','Moderate','Low'];
  exerciseFrequencyList=['daily','3 x week', '1 x week', '1 x month', 'none'];
  exerciseTypeList=["Weights",
    "Running",
    "Jogging",
    "Walking",
    "Aerobics",
    "Sports",
    "Yoga",
    "Pilates",
    "Other"];
  hobbiesList=["Animal Training",
    "Auto Mechanics ",
    "Baseball/Softball ",
    "Basketball",
    "Bicycling",
    "Boating",
    "Bowling",
    "Camping",
    "Crafts ",
    "Computer related",
    "Cooking",
    "Entertaining",
    "Exercise ",
    "Football",
    "Gardening",
    "Golf",
    "Hiking",
    "Hockey",
    "Hunting/Fishing",
    "Music",
    "Racket Sports",
    "Running",
    "Swimming ",
    "Team Sports",
    "Traveling",
    "Water Sports",
    "Weight Training",
    "Winter Sports",
    "Woodworking"];

  caffeineList=["Coffee",
    "Soft Drink",
    "Tea",
    "Chocolate"];

  drugList=["Marijuana",
    "Cocaine",
    "PCP",
    "LSD",
    "Heroin",
    "Crack",
    "Crystal Meth",
    "Ecstasy",
    "Opium"];

  tobbaccoList=["Cigarettes",
    "Cigars",
    "Pipe",
    "Snuff",
    "Dip",
    "Vaping"];

  alcoholList=["Beer",
    "Wine",
    "Liquor"];
  
  
  occupationList=[
    'Accounting', 
    'Admin & Clerical', 
    'Arts/Media', 
    'Athlete', 
    'Automotive', 
    'Banking & Financing', 
    'Business Owner', 
    'Construction', 
    'Consultant', 
    'Customer Service', 
    'Design', 
    'Education', 
    'Engineering', 
    'Entertainer', 
    'Executive', 
    'Food Service', 
    'General Business', 
    'General Labor', 
    'Health Care', 
    'Hospitality', 
    'Human Resources', 
    'Information Technology', 
    'Legal', 
    'Management', 
    'Manufacturing', 
    'Physician', 
    'Retail', 
    'Sales & Marketing', 
    'Science & Biotech', 
    'Other'
  ]


  activityLevel;
  exerciseFrequency;
  exerciseType;
  hobbies;
  dietHx;
  occupation;
  //employer;
  education;
  appearance;
  parent;

  constructor(helper, http, Data, Home, EventAggregator) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.event = EventAggregator;
  }

  activate(model){
    let self = this;
    self.history = model.history;
    self.socHxData = model.socHxData;//uncommented
    self.parent = model;


    self.populateSocHxObjectWithData(self.history.sochx, model.socHxData);

    self.event.subscribe("historyEdit", function(editing){
      self.setEditing(editing);
    });
  }

  detached(){
    let self = this;
    self.updateDataObject();
  }

  setVisibility(value, object){
    if(object.visible == true || (value != null && value.length > 0)){
      object.visible = true;
    }else{
      object.visible = false;
    }
  }

  updateDataObject(){
    let self = this;
    self.socHxData.Appearance = self.history.sochx.Appearance.selectedOption;
    self.socHxData.activity_level = self.history.sochx.activity_level.selectedOption;
    self.socHxData.exercise_freq = self.history.sochx.exercise_freq.selectedOption;
    self.socHxData.exercise_val = self.history.sochx.exercise_val.selectedOption;
    self.socHxData.hobbies = self.history.sochx.hobbies.selectedOption;
    self.socHxData.dietHx = self.history.sochx.dietHx.selectedOption;
    self.socHxData.education = self.history.sochx.education.selectedOption;
    self.socHxData.occupation = self.history.sochx.occupation.selectedOption;
    self.socHxData.Employer = self.history.sochx.Employer.selectedOption;
  }

  populateSocHxObjectWithData(sochx, data){
    let self = this;

    if(data == null)return;

    sochx.Appearance.selectedOption=data.Appearance;
    sochx.Appearance.options=self.appearanceList;
    this.setVisibility(data.Appearance, sochx.Appearance);

    sochx.activity_level.selectedOption=data.activity_level;
    sochx.activity_level.options=self.activityLevelList;
    this.setVisibility(data.activity_level, sochx.activity_level);

    sochx.exercise_freq.selectedOption=data.exercise_freq;
    sochx.exercise_freq.options=self.exerciseFrequencyList;
    this.setVisibility(data.exercise_freq, sochx.exercise_freq);

    sochx.exercise_val.selectedOption=data.exercise_val;
    sochx.exercise_val.options=self.exerciseTypeList;
    this.setVisibility(data.exercise_val, sochx.exercise_val);

    sochx.hobbies.selectedOption=data.hobbies;
    sochx.hobbies.options=self.hobbiesList;
    this.setVisibility(data.hobbies, sochx.hobbies);

    sochx.dietHx.selectedOption=data.dietHx;
    sochx.dietHx.options=self.dietList;
    this.setVisibility(data.dietHx, sochx.dietHx);

    sochx.education.selectedOption=data.education;
    sochx.education.options=['College','GED','High School','Junior College','Post Grad','Trade School' ];
    this.setVisibility(data.education, sochx.education);

    sochx.occupation.selectedOption=data.occupation;
    sochx.occupation.options=self.occupationList;
    this.setVisibility(data.occupation, sochx.occupation);

    sochx.Employer.selectedOption=data.Employer;
    this.setVisibility(data.Employer, sochx.Employer);


    //load substances...
    if(data.drug_Y==1 &&
      data.drug_type != null &&
      data.drug_type.length > 0){
      let sub = self.addSubstance(self.substanceList[3], data.drug_type);
      if(data.drug_occ == 1){
        sub.selectedUsageOption = 'Occasionally';
      }
      if(data.drug_never == 1){
        sub.selectedUsageOption = 'Never';
      }
      if(data.drug_daily == 1){
        sub.selectedUsageOption = 'Daily';
      }
    }



    if(data.caffine_Y==1 &&
      data.Caffeine_Type != null &&
      data.Caffeine_Type.length > 0){
      let sub = self.addSubstance(self.substanceList[2], data.Caffeine_Type);
      if(data.caff_occ == 1){
        sub.selectedUsageOption = 'Occasionally';
      }
      if(data.caff_never == 1){
        sub.selectedUsageOption = 'Never';
      }
      if(data.caff_daily == 1){
        sub.selectedUsageOption = 'Daily';
      }
    }
    


    if(data.alcohol_Y==1 &&
      data.Alcohol_Type != null &&
      data.Alcohol_Type.length > 0){
      let sub = self.addSubstance(self.substanceList[1], data.Alcohol_Type);
      if(data.alc_occ == 1){
        sub.selectedUsageOption = 'Occasionally';
      }
      if(data.alc_never == 1){
        sub.selectedUsageOption = 'Never';
      }
      if(data.alc_daily == 1){
        sub.selectedUsageOption = 'Daily';
      }
    }



    if(data.tobacco_Y==1 &&
      data.tobacco_type != null &&
      data.tobacco_type.length > 0){
      let sub = self.addSubstance(self.substanceList[0], data.tobacco_type);
      if(data.tob_occ == 1){
        sub.selectedUsageOption = 'Occasionally';
      }
      if(data.tob_never == 1){
        sub.selectedUsageOption = 'Never';
      }
      if(data.tob_daily == 1){
        sub.selectedUsageOption = 'Daily';
      }
      if(data.tob_light == 1){
        sub.selectedUsageOption = 'Light';
      }
      if(data.tob_heavy == 1){
        sub.selectedUsageOption = 'Heavy';
      }
      if(data.tob_unknown == 1){
        sub.selectedUsageOption = 'Unknown';
      }
      if(data.tobacco_Form == 1){
        sub.selectedUsageOption = 'Former';
      }
    }

  }

  setEditing(editing){
    let self = this;
    self.history.sochx.Appearance.editing = editing;
    self.history.sochx.activity_level.editing = editing;
    self.history.sochx.exercise_freq.editing = editing;
    self.history.sochx.exercise_val.editing = editing;
    self.history.sochx.hobbies.editing = editing;
    self.history.sochx.dietHx.editing = editing;
    self.history.sochx.education.editing = editing;
    self.history.sochx.occupation.editing = editing;
    self.history.sochx.Employer.editing = editing;
  }

  addSubstance(substanceType, value){

    let self = this;


    self.history.sochx.All_Sub_Neg.selected = false;
    self.history.sochx.All_Sub_Neg.visible = true;

    if(substanceType == undefined){
      if(self.selectedSubstance == 'Substances')return;

      let found = _.find(self.history.sochx.substances, function(s){return s.substanceType == self.selectedSubstance});
      if(found){
        alert("Substance for type: " + self.selectedSubstance + " already exists.");
        return;
      }

      let sub =new Substance(self.selectedSubstance);
      self.history.sochx.substances.push(sub);
      return sub;
    }else{
      let sub = new Substance(substanceType);
      if(value){
        sub.selectedValue = value;
      }
      self.history.sochx.substances.push(sub);
      return sub;
    }
  }

  selectSubstance(s){
    this.selectedSubstance = s;
  }

  removeSubstance(s){
    for(let i = 0; i < this.history.sochx.substances.length; i++){
      if(this.history.sochx.substances[i].selectedValue==s.selectedValue){
        this.history.sochx.substances.splice(i, 1);
      }
    }
  }

}
