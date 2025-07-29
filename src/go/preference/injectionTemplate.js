import {inject, bindable, observable} from 'aurelia-framework';
import * as _ from 'lodash';
import {Data} from '../../data/go/data';

@inject(Data)
export class InjectionTemplate {

  section=null;
  selectedPref=null;
  prefList=[];
  providerId;
  bodypart;

  constructor(Data) {
    this.data = Data;
  }

  activate(params) {
    var self = this;
    self.section = params;

    self.providerId = self.section.parent.editor.currentProvider.ProviderID;
    self.bodypart = self.section.parent.editor.selectedBodyPart;

    self.data.getWithUrl(`injections/preferences?providerid=${self.providerId}&bodypart=${self.bodypart}`, function(prefs){
      self.prefList = prefs;
    });
  }

  addPref(){
    let self = this;

    // constructor(id, name, details, type){
    //   this.name = name;
    //   this.details = details;
    //   this.id = id;
    //   this.type = type;
    //   this.autotask = null;
    //   this.modifier = null;
    //   this.displayDelete = false;
    //   this.data = null;
    // }
    //json.PrefID, json.Description, json.CPTCode);

    let proto={
      Id: 0,
      IMapId: self.section.parent.prefId,
      PreferenceId: self.selectedPref.PrefID,
      TableName: 'OD_Inject_Pref',
      PreferenceIdColumn: 'PrefID',
      AutoTaskId: null,
      Modifier: null
    }

    let pref={
      id: self.selectedPref.PrefID,
      name: self.selectedPref.Description,
      details: self.selectedPref.CPTCode,
      data: self.selectedPref,
      imapProtocol: proto
    }

    //var aInj = new Item(self.selectedPref.PrefID, self.selectedPref.Description, self.selectedPref.CPTCode);
    //aInj.data = pref;
    self.section.items.push(pref);
  }
}
