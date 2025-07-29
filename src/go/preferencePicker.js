import {inject, bindable} from 'aurelia-framework';
import * as _ from 'lodash';
import { Data } from '../data/go/data';

@inject(Data)
export class PreferencePicker {

  preferences=[];
  filteredPreferences=[];
  selectedBodyPart;
  bodyparts;// = ['Ankle','Knee', 'Hip', 'Wrist', 'Elbow', 'Shoulder', 'Cervical', 'Lumbar'];
  home=null;
  parent;

  selectedPreference=null;

  constructor(Data){
    this.data = Data;
  }

  setup(){
    let self = this;
    self.bodyparts = self.data.bodyparts;
    let bp = self.home.currentBoard.visitInfo.bodypart;//self.selectedBodyPart ? self.selectedBodyPart : self.bodyparts[0];
    self.selectedBodyPart = bp ? bp : self.bodyparts[0];
    self.filterByBodypart();
  }

  activate(model) {
    this.home = model.home;
    this.parent = model;
    this.preferences = model.preferences;
  }

  attached(){
    let self = this;
    self.setup();
  }

  attachClick(){
    let self = this;
    self.filterByBodypart();
  }

  prefSelected(p){
    let self = this;
    self.selectedPreference = p;

    //select
    for(let p = 0; p < self.filteredPreferences.length; p++){
      if(self.filteredPreferences[p].description == self.selectedPreference.description){
        self.filteredPreferences[p].selected = true;
      }else{
        self.filteredPreferences[p].selected = false;
      }
    }
  }

  add(){
    let self = this;
    if(self.selectedPreference != null){
      self.parent.dialog.close(true, self.selectedPreference);
    }
  }

  filterByBodypart(){
    let self = this;
    self.filteredPreferences = _.filter(self.preferences, function(p){return p.bodypart == self.selectedBodyPart});
  }
}
