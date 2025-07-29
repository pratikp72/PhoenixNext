import {inject, bindable, customElement, ObserverLocator} from 'aurelia-framework';
import * as _ from 'lodash';
import {Home} from '../home';
import { Data } from '../../data/go/data';


@customElement('block-preference')
@inject(ObserverLocator, Home, Data)
export class BlockPreferencePicker {

  @bindable callback;
  prefid;
  prefIdStr;
  @bindable preferences=[];
  filteredPreferences=[];
  selectedBodyPart;
  bodyparts;// = ['Ankle','Knee', 'Hip', 'Wrist', 'Elbow', 'Shoulder', 'Cervical', 'Lumbar'];


  constructor(ObserverLocator, Home, Data) {
    this.observerLocator = ObserverLocator;
    this.home = Home;
    this.data = Data;
  }

  setup(){
    let self = this;
    self.bodyparts = self.data.bodyparts;
    let bp = self.home.currentBoard.visitInfo.bodypart;//self.selectedBodyPart ? self.selectedBodyPart : self.bodyparts[0];
    self.selectedBodyPart = bp ? bp : self.bodyparts[0];
    // self.filterByBodypart();
    self.prefid = 'pref' + Math.floor(Math.random() * 10000);
    //self.prefIdStr = '#'+self.prefid;
  }

  attached(){
    let self = this;
    self.setup();

    setTimeout(self.attachClick.bind(self), 500);
  }

  attachClick(){
    let self = this;

    self.filterByBodypart();

    $('#'+self.prefid).on('click', function (e) {
      if(e.currentTarget.classList.contains('show')){

        if(e.target.classList.contains('list-group-item')){
          //e.stopPropagation();
        }else{
          e.stopPropagation();
        }
      }
    })

    $('#'+self.prefid).on('show.bs.dropdown', function () {
      if(self.filteredPreferences.length == 0){
        self.filterByBodypart();
      }
    })

  }

  prefSelected(p){
    let self = this;
    if(self.callback){
      self.callback({preference: p});
    }
  }

  filterByBodypart(){
    let self = this;
    self.filteredPreferences = _.filter(self.preferences, function(p){return p.bodypart == self.selectedBodyPart});
  }
}
